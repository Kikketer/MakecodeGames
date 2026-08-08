"use server";

import { extensions, getTool } from "@/content/extensions";
import { generateJson } from "@/lib/extension-docs/gemini";
import { verifyTurnstileToken } from "@/lib/turnstile";

const MAX_QUERY_LENGTH = 400;
const NO_MATCH_NOTE =
  "I didn't find an extension that does that — see if you can ask someone in the forums.";

export interface ToolMatch {
  /** Composite key: owner/repo/slug */
  id: string;
  /** Human-friendly tool title (re-attached from catalog, not from the model). */
  title: string;
  /** One-sentence usage note from the model. */
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

/** Shape returned by Gemini's structured output. */
interface GeminiMatchResult {
  matches: { id: string; blurb: string }[];
}

/** Lean catalog entry sent to Gemini — only what the model needs to judge relevance. */
interface LeanTool {
  id: string;
  title: string;
  problem: string;
  whatItDoes: string;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    matches: {
  type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          blurb: { type: "string" },
        },
        required: ["id", "blurb"],
      },
    },
  },
  required: ["matches"],
};

function buildLeanCatalog(): LeanTool[] {
  return extensions.flatMap((ext) =>
    ext.tools.map((tool) => ({
      id: `${ext.owner}/${ext.repo}/${tool.slug}`,
      title: tool.title,
      problem: tool.problem,
      whatItDoes: tool.whatItDoes,
    })),
  );
}

function buildSystemPrompt(catalog: LeanTool[]): string {
  return `You are an extension search assistant for MakeCode Arcade.
Your ONLY job is to match the user's description to available extension tools.

Rules:
- Return 1-3 tools that genuinely solve what the user is asking for, or return zero matches.
- NEVER answer the user's question directly. NEVER provide information, code, jokes, advice, or conversation.
- If the user's request is not about finding a MakeCode Arcade extension tool or block (e.g. "tell me a joke", "what is the weather", "write me a poem"), return zero matches.
- Do not stretch to find tangential matches. Only return a tool if it clearly addresses what the user described.
- For each match, write a one-sentence blurb explaining how the tool helps with the user's specific problem.

Available tools:
${JSON.stringify(catalog)}`;
}

/**
 * Search extension tools by natural-language description.
 * Sends the full lean catalog to Gemini in a single shot and returns
 * structured matches with re-attached real fields (no hallucinated links/names).
 */
export async function searchExtensionTools(
  query: string,
  turnstileToken: string,
): Promise<SearchResult> {
  // 1. Verify Turnstile (skipped on localhost when secret is absent)
  const verified = await verifyTurnstileToken(turnstileToken);
  if (!verified) {
    return { matches: [], note: "Verification failed. Please try again." };
  }

  // 2. Trim and validate query
  const trimmed = query.trim();
  if (!trimmed) {
    return { matches: [] };
  }
  const cappedQuery = trimmed.slice(0, MAX_QUERY_LENGTH);

  // 3. Build lean catalog
  const catalog = buildLeanCatalog();
  if (catalog.length === 0) {
    return { matches: [], note: NO_MATCH_NOTE };
  }

  // 4. Call Gemini with structured output
  const result = await generateJson<GeminiMatchResult>(
    {
      contents: [
        {
          role: "user",
          parts: [{ text: cappedQuery }],
        },
      ],
      systemInstruction: {
        role: "user",
        parts: [{ text: buildSystemPrompt(catalog) }],
      },
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    },
    { responseSchema: RESPONSE_SCHEMA },
  );

  // 5. Re-attach real fields by id (composite key: owner/repo/slug)
  const matches: ToolMatch[] = [];
  for (const geminiMatch of result.matches ?? []) {
    const [owner, repo, slug] = geminiMatch.id.split("/");
    if (!owner || !repo || !slug) continue;

    const tool = getTool(owner, repo, slug);
    if (!tool) continue;

    const extension = extensions.find((e) => e.owner === owner && e.repo === repo);
    if (!extension) continue;

    matches.push({
      id: geminiMatch.id,
      title: tool.title,
      blurb: geminiMatch.blurb,
      docUrl: `/extensions/${owner}/${repo}/${slug}`,
      blockString: tool.blockString,
      extensionDisplayName: extension.displayName,
      example: tool.example,
    });
  }

  if (matches.length === 0) {
    return { matches: [], note: NO_MATCH_NOTE };
  }

  return { matches };
}
