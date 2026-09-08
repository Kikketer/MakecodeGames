"use server";

import { extensions, getTool } from "@/content/extensions";
import type { ExtensionDoc, ExtensionTool } from "@/content/extensions";
import { getAlgoliaSearchClient, EXTENSION_TOOLS_INDEX } from "@/lib/algolia";

const MAX_QUERY_LENGTH = 400;
const NO_MATCH_NOTE =
  "I didn't find an extension that does that — see if you can ask someone in the forums.";

export interface ToolMatch {
  /** Composite key: owner/repo/slug */
  id: string;
  /** Human-friendly tool title. */
  title: string;
  /** Short description used in search results. */
  blurb: string;
  /** Link to the per-tool doc page. */
  docUrl: string;
  /** The literal block string, for display. */
  blockString: string;
  /** Extension display name, for context in results. */
  extensionDisplayName: string;
  /** Copy-pasteable example snippet. */
  example: string;
}

export interface SearchResult {
  matches: ToolMatch[];
  note?: string;
}

function toMatch(tool: ExtensionTool, extension: ExtensionDoc): ToolMatch {
  return {
    id: `${extension.owner}/${extension.repo}/${tool.slug}`,
    title: tool.title,
    blurb: tool.whatItDoes,
    docUrl: `/extensions/${extension.owner}/${extension.repo}/${tool.slug}`,
    blockString: tool.blockString,
    extensionDisplayName: extension.displayName,
    example: tool.example,
  };
}

function localSearchExtensionTools(query: string): ToolMatch[] {
  const lower = query.toLowerCase();
  const terms = lower.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const scored: { match: ToolMatch; score: number }[] = [];
  for (const extension of extensions) {
    for (const tool of extension.tools) {
      const haystack = [
        tool.title,
        tool.problem,
        tool.whatItDoes,
        tool.blockString,
        extension.displayName,
        extension.description,
      ]
        .join(" ")
        .toLowerCase();

      let score = 0;
      for (const term of terms) {
        if (haystack.includes(term)) score++;
      }

      if (score > 0) {
        scored.push({ match: toMatch(tool, extension), score });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10).map((s) => s.match);
}

/**
 * Search extension tools by natural-language description.
 *
 * Uses Algolia when configured, and falls back to a simple local text
 * search over the static tool catalog. This keeps the search working in
 * development or if Algolia is not set up.
 */
export async function searchExtensionTools(
  query: string,
): Promise<SearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { matches: [] };
  }
  const cappedQuery = trimmed.slice(0, MAX_QUERY_LENGTH);

  const client = getAlgoliaSearchClient();
  if (client) {
    try {
      const { results } = (await client.search({
        requests: [
          {
            indexName: EXTENSION_TOOLS_INDEX,
            query: cappedQuery,
            hitsPerPage: 10,
            attributesToRetrieve: ["owner", "repo", "slug", "title"],
          },
        ],
      })) as unknown as {
        results: Array<{
          hits: Array<
            Record<string, unknown> & {
              owner?: string;
              repo?: string;
              slug?: string;
            }
          >;
        }>;
      };

      const hits = results[0]?.hits ?? [];
      const matches: ToolMatch[] = [];
      for (const hit of hits) {
        const owner = String(hit.owner ?? "");
        const repo = String(hit.repo ?? "");
        const slug = String(hit.slug ?? "");
        if (!owner || !repo || !slug) continue;

        const tool = getTool(owner, repo, slug);
        if (!tool) continue;

        const extension = extensions.find(
          (e) => e.owner === owner && e.repo === repo,
        );
        if (!extension) continue;

        matches.push(toMatch(tool, extension));
      }

      if (matches.length === 0) {
        return { matches: [], note: NO_MATCH_NOTE };
      }
      return { matches };
    } catch (error) {
      console.error(
        "Algolia extension search failed, falling back to local search:",
        error,
      );
    }
  }

  const matches = localSearchExtensionTools(cappedQuery);
  if (matches.length === 0) {
    return { matches: [], note: NO_MATCH_NOTE };
  }
  return { matches };
}
