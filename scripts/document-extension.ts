/**
 * Document a MakeCode Arcade extension.
 *
 * Usage:
 *   npx tsx scripts/document-extension.ts <owner>/<repo> [--dry-run] [--output <path>]
 *
 * Examples:
 *   npx tsx scripts/document-extension.ts jwunderl/arcade-sprite-util --dry-run
 *   npx tsx scripts/document-extension.ts jwunderl/arcade-sprite-util
 *
 * Environment:
 *   GEMINI_KEY     - Gemini API key (required)
 *   GITHUB_TOKEN   - GitHub token for cloning repos (optional, for private repos / rate limits)
 *
 * This script is the local dry-run equivalent of what the Vercel Workflow
 * will run in production. The core logic lives in lib/extension-docs/ so
 * both this script and the workflow share the same code path.
 */

import { parseExtension } from "../lib/extension-docs/parse-extension";
import { generateDocumentation } from "../lib/extension-docs/generate";
import { writeExtensionDocFile, writeExtensionDocJson, updateExtensionsIndex } from "../lib/extension-docs/write-doc";

function parseArgs(argv: string[]): {
  ownerRepo: string;
  dryRun: boolean;
  outputDir?: string;
  maxIterations?: number;
} {
  const positional: string[] = [];
  let dryRun = false;
  let outputDir: string | undefined;
  let maxIterations: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--output" || arg === "-o") {
      outputDir = argv[++i];
    } else if (arg === "--max-iterations") {
      maxIterations = parseInt(argv[++i], 10);
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: npx tsx scripts/document-extension.ts <owner>/<repo> [options]

Options:
  --dry-run              Don't write files, just print what would be written
  --output <path>        Output directory (default: current working directory)
  --max-iterations <n>   Max reviewer loop iterations (default: 3)
  --help, -h             Show this help

Environment:
  GEMINI_KEY             Gemini API key (required)
  GITHUB_TOKEN           GitHub token (optional, for rate limits / private repos)
`);
      process.exit(0);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length === 0) {
    console.error("Error: missing <owner>/<repo> argument");
    console.error("Usage: npx tsx scripts/document-extension.ts <owner>/<repo> [--dry-run]");
    process.exit(1);
  }

  return { ownerRepo: positional[0], dryRun, outputDir, maxIterations };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Parse owner/repo
  const slashIdx = args.ownerRepo.indexOf("/");
  if (slashIdx === -1) {
    console.error(`Invalid repo format "${args.ownerRepo}". Expected <owner>/<repo>, e.g. jwunderl/arcade-sprite-util`);
    process.exit(1);
  }
  const owner = args.ownerRepo.slice(0, slashIdx);
  const repo = args.ownerRepo.slice(slashIdx + 1);

  // Validate environment
  if (!process.env.GEMINI_KEY && !process.env.GEMINI_API_KEY) {
    console.error("Error: GEMINI_KEY environment variable is required");
    process.exit(1);
  }

  console.log(`\n=== Documenting ${owner}/${repo} ===\n`);

  // Step 1: Parse the extension
  console.log("[1/3] Parsing extension source...");
  const parsed = await parseExtension(owner, repo);
  console.log(`  Found ${parsed.blocks.length} blocks, ${parsed.enums.length} enums`);
  console.log(`  Namespace: ${parsed.namespace}`);
  console.log(`  Source files: ${Object.keys(parsed.sourceFiles).join(", ")}`);
  if (Object.keys(parsed.docsFiles).length > 0) {
    console.log(`  Docs files: ${Object.keys(parsed.docsFiles).length} markdown files`);
  }

  // Step 2: Generate documentation with reviewer loop
  console.log("\n[2/3] Generating documentation with Gemini...");
  const { doc, iterations, finalScore } = await generateDocumentation(parsed, {
    maxIterations: args.maxIterations,
    onProgress: (msg) => console.log(`  ${msg}`),
  });
  console.log(`  Done: ${doc.tools.length} tools documented`);
  console.log(`  Reviewer iterations: ${iterations}, final score: ${finalScore}/10`);

  // Step 3: Write the file
  console.log("\n[3/3] Writing documentation file...");
  const basePath = args.outputDir ?? process.cwd();
  const filePath = await writeExtensionDocFile(doc, {
    basePath,
    dryRun: args.dryRun,
  });

  if (!args.dryRun) {
    await updateExtensionsIndex(doc, { basePath });
    // Also write JSON to the project's extensions-generated directory so the
    // /extensions-beta route can render it for visual comparison. This always
    // goes to the project root (not --output) so the dev server can find it.
    await writeExtensionDocJson(doc, { dryRun: false });
  }

  console.log(`\n=== Done ===`);
  console.log(`File: ${filePath}`);
  console.log(`Tools: ${doc.tools.length}`);
  console.log(`Score: ${finalScore}/10 after ${iterations} iteration(s)`);

  if (args.dryRun) {
    // In dry-run mode, print a preview of the first 2 tools
    console.log(`\n--- Preview (first 2 tools) ---\n`);
    for (const tool of doc.tools.slice(0, 2)) {
      console.log(`## ${tool.title} (${tool.slug})`);
      console.log(`Problem: ${tool.problem}`);
      console.log(`What it does: ${tool.whatItDoes}`);
      console.log(`Example:\n${tool.example}\n`);
      console.log("---");
    }
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
