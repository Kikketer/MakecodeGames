import { writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import type { ExtensionDoc, ExtensionTool } from "@/content/extensions/types";

/**
 * Generate the TypeScript source for an extension doc file,
 * matching the format of the existing hand-written files.
 */
export function generateExtensionFileSource(doc: ExtensionDoc): string {
  const exportName = camelCaseExportName(doc.owner, doc.repo);

  // Build the tools array with proper indentation
  const toolsSource = doc.tools.map((tool) => formatTool(tool, 4)).join(",\n");

  return `import type { ExtensionDoc } from "@/content/extensions/types";

export const ${exportName}: ExtensionDoc = {
  owner: ${JSON.stringify(doc.owner)},
  repo: ${JSON.stringify(doc.repo)},
  displayName: ${JSON.stringify(doc.displayName)},
  packageSlug: ${JSON.stringify(doc.packageSlug)},
  description: ${JSON.stringify(doc.description)},
  tools: [
${toolsSource}
  ],
};
`;
}

/** Format a single ExtensionTool as a TypeScript object literal. */
function formatTool(tool: ExtensionTool, indent: number): string {
  const pad = " ".repeat(indent);
  const pad2 = " ".repeat(indent + 2);

  const lines: string[] = [];
  lines.push(`${pad}{`);
  lines.push(`${pad2}slug: ${JSON.stringify(tool.slug)},`);
  lines.push(`${pad2}title: ${JSON.stringify(tool.title)},`);
  if (tool.blockId) lines.push(`${pad2}blockId: ${JSON.stringify(tool.blockId)},`);
  lines.push(`${pad2}blockString: ${JSON.stringify(tool.blockString)},`);
  lines.push(`${pad2}group: ${JSON.stringify(tool.group)},`);
  lines.push(`${pad2}weight: ${tool.weight},`);
  if (tool.deprecated) lines.push(`${pad2}deprecated: true,`);
  lines.push(`${pad2}problem: ${JSON.stringify(tool.problem)},`);
  lines.push(`${pad2}whatItDoes: ${JSON.stringify(tool.whatItDoes)},`);

  // Parameters
  if (tool.parameters.length === 0) {
    lines.push(`${pad2}parameters: [],`);
  } else {
    lines.push(`${pad2}parameters: [`);
    for (const param of tool.parameters) {
      const parts = [`name: ${JSON.stringify(param.name)}`, `type: ${JSON.stringify(param.type)}`];
      if (param.default !== undefined) parts.push(`default: ${JSON.stringify(param.default)}`);
      parts.push(`meaning: ${JSON.stringify(param.meaning)}`);
      lines.push(`${pad2}  { ${parts.join(", ")} },`);
    }
    lines.push(`${pad2}],`);
  }

  // Returns
  if (tool.returns) {
    lines.push(
      `${pad2}returns: { type: ${JSON.stringify(tool.returns.type)}, meaning: ${JSON.stringify(tool.returns.meaning)} },`,
    );
  }

  // Example — use a template literal for multi-line examples
  lines.push(`${pad2}example: ${formatExample(tool.example)},`);
  lines.push(`${pad}}`);

  return lines.join("\n");
}

/** Format an example string, using a template literal for multi-line code. */
function formatExample(example: string): string {
  if (!example.includes("\n")) {
    return JSON.stringify(example);
  }
  // Use a backtick template literal, escaping any backticks and ${} in the code
  const escaped = example
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
  const lines = escaped.split("\n");
  if (lines.length === 1) return JSON.stringify(example);
  return `\`${lines.join("\n")}\``;
}

/** Convert owner/repo to a camelCase export name (e.g. jwunderl/arcade-sprite-util → arcadeSpriteUtil). */
function camelCaseExportName(owner: string, repo: string): string {
  return repo
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .split("-")
    .filter(Boolean)
    .map((word, i) => (i === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join("");
}

/**
 * Write an extension doc to the filesystem as a TypeScript file.
 * Path: content/extensions/[owner]/[repo].ts
 */
export async function writeExtensionDocFile(
  doc: ExtensionDoc,
  options: { basePath?: string; dryRun?: boolean } = {},
): Promise<string> {
  const basePath = options.basePath ?? process.cwd();
  const filePath = join(basePath, "content", "extensions", doc.owner, `${doc.repo}.ts`);
  const source = generateExtensionFileSource(doc);

  if (options.dryRun) {
    console.log(`[dry-run] Would write to ${filePath} (${source.length} bytes)`);
    return filePath;
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, source, "utf-8");
  console.log(`Wrote ${filePath} (${source.length} bytes)`);
  return filePath;
}

/**
 * Write an extension doc as JSON to the generated-docs directory.
 * Path: content/extensions-generated/[owner]/[repo].json
 *
 * This is used by the /extensions-beta route for visual comparison
 * of AI-generated docs against the hand-written ones. The JSON format
 * lets the route read the file at request time without recompiling.
 */
export async function writeExtensionDocJson(
  doc: ExtensionDoc,
  options: { basePath?: string; dryRun?: boolean } = {},
): Promise<string> {
  const basePath = options.basePath ?? process.cwd();
  const filePath = join(basePath, "content", "extensions-generated", doc.owner, `${doc.repo}.json`);
  const source = JSON.stringify(doc, null, 2);

  if (options.dryRun) {
    console.log(`[dry-run] Would write JSON to ${filePath} (${source.length} bytes)`);
    return filePath;
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, source, "utf-8");
  console.log(`Wrote JSON ${filePath} (${source.length} bytes)`);
  return filePath;
}

/** Default index.ts content when the file doesn't exist yet. */
export const DEFAULT_INDEX_CONTENT = `import type { ExtensionDoc, ExtensionTool } from "@/content/extensions/types";

export const extensions: ExtensionDoc[] = [];

export function getExtension(owner: string, repo: string): ExtensionDoc | undefined {
  return extensions.find((extension) => extension.owner === owner && extension.repo === repo);
}

export function getTool(owner: string, repo: string, slug: string): ExtensionTool | undefined {
  return getExtension(owner, repo)?.tools.find((tool) => tool.slug === slug);
}

export function sortedTools(extension: ExtensionDoc): ExtensionTool[] {
  return [...extension.tools].sort((a, b) => {
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    return b.weight - a.weight;
  });
}

export type { ExtensionDoc, ExtensionTool } from "@/content/extensions/types";
`;

/**
 * Pure function: apply an index update for a new extension to the given
 * index file content. Idempotent — if the extension is already imported,
 * returns the content unchanged.
 *
 * Exported so the workflow can fetch index.ts from the GitHub API, apply
 * the update in-memory, and commit the result without local file I/O.
 */
export function applyIndexUpdate(content: string, doc: ExtensionDoc): string {
  const exportName = camelCaseExportName(doc.owner, doc.repo);
  const importPath = `@/content/extensions/${doc.owner}/${doc.repo}`;

  if (content.includes(importPath)) {
    return content;
  }

  const importLine = `import { ${exportName} } from "${importPath}";`;
  return content
    .replace(/^(import .*?;)$/m, (match) => `${match}\n${importLine}`)
    .replace(
      /export const extensions: ExtensionDoc\[\] = \[([^\]]*)\]/,
      (match, inner: string) => {
        const trimmed = inner.trim();
        if (trimmed) {
          return `export const extensions: ExtensionDoc[] = [\n  ${trimmed},\n  ${exportName},\n]`;
        }
        return `export const extensions: ExtensionDoc[] = [\n  ${exportName},\n]`;
      },
    );
}

/**
 * Update the extensions index file to import and register a new extension.
 * This is idempotent — if the extension is already registered, it's a no-op.
 */
export async function updateExtensionsIndex(
  doc: ExtensionDoc,
  options: { basePath?: string; dryRun?: boolean } = {},
): Promise<void> {
  const basePath = options.basePath ?? process.cwd();
  const indexPath = join(basePath, "content", "extensions", "index.ts");

  const { readFile } = await import("fs/promises");
  let content: string;
  try {
    content = await readFile(indexPath, "utf-8");
  } catch {
    content = DEFAULT_INDEX_CONTENT;
  }

  const updatedContent = applyIndexUpdate(content, doc);

  if (updatedContent === content) {
    console.log(`Index already imports ${doc.owner}/${doc.repo}, skipping`);
    return;
  }

  if (options.dryRun) {
    console.log(`[dry-run] Would update ${indexPath}`);
    return;
  }

  await writeFile(indexPath, updatedContent, "utf-8");
  console.log(`Updated ${indexPath}`);
}
