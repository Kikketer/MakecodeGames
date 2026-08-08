import { readdir, readFile } from "fs/promises";
import type { Dirent } from "fs";
import { join } from "path";
import type { ExtensionDoc, ExtensionTool } from "@/content/extensions/types";

/**
 * Runtime reader for AI-generated extension docs stored as JSON.
 *
 * Generated docs live at content/extensions-generated/[owner]/[repo].json
 * and are read at request time by the /extensions-beta routes so the dev
 * server picks up new output without recompiling.
 */

const GENERATED_DIR = join(process.cwd(), "content", "extensions-generated");

/** List all generated extension docs as {owner, repo} pairs. */
export async function listGeneratedExtensions(): Promise<{ owner: string; repo: string }[]> {
  let ownerDirs: Dirent[];
  try {
    ownerDirs = await readdir(GENERATED_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: { owner: string; repo: string }[] = [];
  for (const entry of ownerDirs) {
    if (!entry.isDirectory()) continue;
    let files: string[];
    try {
      files = await readdir(join(GENERATED_DIR, entry.name));
    } catch {
      continue;
    }
    for (const file of files) {
      if (file.endsWith(".json")) {
        results.push({ owner: entry.name, repo: file.slice(0, -5) });
      }
    }
  }
  return results;
}

/** Read a single generated extension doc by owner/repo. */
export async function readGeneratedExtension(owner: string, repo: string): Promise<ExtensionDoc | undefined> {
  const filePath = join(GENERATED_DIR, owner, `${repo}.json`);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    return undefined;
  }
  return JSON.parse(raw) as ExtensionDoc;
}

/** Get a single tool from a generated extension doc. */
export async function readGeneratedTool(
  owner: string,
  repo: string,
  slug: string,
): Promise<ExtensionTool | undefined> {
  const doc = await readGeneratedExtension(owner, repo);
  return doc?.tools.find((tool) => tool.slug === slug);
}

/** Sort tools by group then weight, matching the production sortedTools helper. */
export function sortedGeneratedTools(extension: ExtensionDoc): ExtensionTool[] {
  return [...extension.tools].sort((a, b) => {
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    return b.weight - a.weight;
  });
}
