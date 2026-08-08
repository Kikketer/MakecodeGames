import { defineHook, getWorkflowMetadata } from "workflow";
import { start } from "workflow/api";
import { parseExtension } from "@/lib/extension-docs/parse-extension";
import { generateDocumentation } from "@/lib/extension-docs/generate";
import {
  generateExtensionFileSource,
  applyIndexUpdate,
  DEFAULT_INDEX_CONTENT,
} from "@/lib/extension-docs/write-doc";
import type { ExtensionDoc } from "@/content/extensions/types";
import {
  createDocumentationPullRequest,
  readFileFromRepo,
  getDefaultBranchSha,
  type GitHubFile,
  type PullRequestResult,
} from "@/lib/extension-docs/github";
import {
  shouldRegenerateExtension,
  recordSuccessfulGeneration,
  recordFailedGeneration,
} from "@/lib/extension-docs/change-detection";

/**
 * Extension documentation workflow.
 *
 * Mirrors the ingest workflow's architecture: a batch orchestrator fans out
 * one child workflow per extension, each child runs the full
 * parse → generate → commit → PR pipeline in isolation. If one extension
 * fails (bad repo, Gemini error, etc.) the others still complete.
 *
 * The workflow writes files via the GitHub Git Database API (blobs → tree →
 * commit → ref) rather than local filesystem + git push, because the Vercel
 * Workflow sandbox filesystem is ephemeral and doesn't have git available.
 */

/** The initial batch of extensions to document. */
export const INITIAL_EXTENSIONS: { owner: string; repo: string }[] = [
  { owner: "Sonicblaston62", repo: "Sprite-Walls" },
  { owner: "The-Code-Zone", repo: "Raycasting-pxt-extension" },
  { owner: "jwunderl", repo: "arcade-tilemap-a-star" },
  { owner: "felixtsu", repo: "pxt-lantern" },
  { owner: "riknoll", repo: "arcade-shader" },
  { owner: "UnicycleDumpTruck", repo: "pxt-image-morph" },
  { owner: "riknoll", repo: "arcade-camera-offset" },
  { owner: "UnsignedArduino", repo: "TilemapPath" },
  { owner: "riknoll", repo: "arcade-split-screen" },
  { owner: "riknoll", repo: "arcade-overworld" },
  { owner: "CrzLe0723", repo: "RetroFx" },
  { owner: "robo-technical-group", repo: "pxt-arcade-vector-math" },
];

type ChildResult =
  | { status: "completed"; value: { owner: string; repo: string; pr?: PullRequestResult; tools: number; score: number } }
  | { status: "skipped"; owner: string; repo: string; sha: string }
  | { status: "failed"; error: string; owner: string; repo: string };

const childCompletionHook = defineHook<ChildResult>();

function completionToken(parentRunId: string, key: string): string {
  return `ext-docs-child:${parentRunId}:${key}`;
}

async function resumeParentCompletionStep(token: string, result: ChildResult): Promise<void> {
  "use step";
  await childCompletionHook.resume(token, result);
}

async function runChildWithCompletion(
  owner: string,
  repo: string,
  runChild: () => Promise<
    | { pr?: PullRequestResult; tools: number; score: number }
    | { skipped: true; sha: string }
  >,
  token: string,
): Promise<void> {
  let result: ChildResult;
  try {
    const value = await runChild();
    if ("skipped" in value) {
      result = { status: "skipped", owner, repo, sha: value.sha };
    } else {
      result = { status: "completed", value: { owner, repo, ...value } };
    }
  } catch (error) {
    result = {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      owner,
      repo,
    };
  }
  await resumeParentCompletionStep(token, result);
}

// --- Step wrappers (durable, non-deterministic work) ---

async function checkChangeDetectionStep(owner: string, repo: string) {
  "use step";
  return shouldRegenerateExtension(owner, repo);
}

async function recordSuccessStep(
  owner: string,
  repo: string,
  sha: string,
  prInfo: { number: number; url: string },
) {
  "use step";
  return recordSuccessfulGeneration(owner, repo, sha, prInfo);
}

async function recordFailureStep(owner: string, repo: string, sha: string, errorMessage: string) {
  "use step";
  return recordFailedGeneration(owner, repo, sha, errorMessage);
}

async function parseExtensionStep(owner: string, repo: string) {
  "use step";
  return parseExtension(owner, repo);
}

async function generateDocumentationStep(parsed: Awaited<ReturnType<typeof parseExtension>>) {
  "use step";
  return generateDocumentation(parsed, {
    onProgress: (msg) => console.log(msg),
  });
}

/**
 * Build the set of files to commit for a generated extension doc.
 * Fetches the current index.ts from the repo so the update is based on
 * the latest main, not a stale local copy.
 */
async function buildCommitFilesStep(
  doc: ExtensionDoc,
): Promise<GitHubFile[]> {
  "use step";

  const files: GitHubFile[] = [];

  // 1. The generated TypeScript doc file
  files.push({
    path: `content/extensions/${doc.owner}/${doc.repo}.ts`,
    content: generateExtensionFileSource(doc),
  });

  // 2. Updated index.ts — fetch current from repo, apply update
  const { branch } = await getDefaultBranchSha();
  const currentIndex = await readFileFromRepo("content/extensions/index.ts", branch);
  const indexContent = currentIndex ?? DEFAULT_INDEX_CONTENT;
  const updatedIndex = applyIndexUpdate(indexContent, doc);

  if (updatedIndex !== indexContent) {
    files.push({ path: "content/extensions/index.ts", content: updatedIndex });
  }

  return files;
}

async function createPullRequestStep(
  extensionOwner: string,
  extensionRepo: string,
  files: GitHubFile[],
  score: number,
  iterations: number,
): Promise<PullRequestResult> {
  "use step";

  const prBody = `## Automated extension documentation

This PR was auto-generated by the extension documentation workflow.

- **Extension:** \`${extensionOwner}/${extensionRepo}\`
- **Tools documented:** ${files.length > 0 ? "see files" : "0"}
- **Reviewer score:** ${score}/10
- **Reviewer iterations:** ${iterations}

### Files
${files.map((f) => `- \`${f.path}\``).join("\n")}

### Review
Review the generated documentation before merging.`;

  return createDocumentationPullRequest(extensionOwner, extensionRepo, files, {
    prBody,
    forceFresh: true,
  });
}

// --- Child workflow ---

export async function documentExtensionChildWorkflow(
  owner: string,
  repo: string,
  completionTokenArg: string,
) {
  "use workflow";
  console.log(`[ext-docs] documenting ${owner}/${repo}`);
  await runChildWithCompletion(
    owner,
    repo,
    () => documentSingleExtension(owner, repo),
    completionTokenArg,
  );
}

/**
 * The full pipeline for a single extension: check for changes → parse → generate → build files → create PR.
 * Exported as a standalone function so it can be called directly (e.g. by the CLI
 * script) or from within the child workflow.
 *
 * If the extension repo's HEAD SHA hasn't changed since the last successful
 * generation, the pipeline is skipped entirely (returns `{ skipped: true }`).
 */
export async function documentSingleExtension(
  owner: string,
  repo: string,
): Promise<
  | { pr?: PullRequestResult; tools: number; score: number }
  | { skipped: true; sha: string }
> {
  // Step 0: Change detection — skip if the extension repo hasn't changed
  console.log(`[ext-docs] checking for changes on ${owner}/${repo}...`);
  const { regenerate, currentSha, storedSha } = await checkChangeDetectionStep(owner, repo);
  if (!regenerate) {
    console.log(`[ext-docs] skipping ${owner}/${repo} — no changes since last generation (sha: ${currentSha})`);
    return { skipped: true, sha: currentSha };
  }
  if (storedSha) {
    console.log(`[ext-docs] ${owner}/${repo} changed (${storedSha.slice(0, 7)} → ${currentSha.slice(0, 7)}), regenerating`);
  } else {
    console.log(`[ext-docs] ${owner}/${repo} not yet documented, generating`);
  }

  try {
    // Step 1: Parse the extension source
    console.log(`[ext-docs] parsing ${owner}/${repo}...`);
    const parsed = await parseExtensionStep(owner, repo);
    console.log(`[ext-docs] found ${parsed.blocks.length} blocks, ${parsed.enums.length} enums`);

    // Step 2: Generate documentation with Gemini reviewer loop
    console.log(`[ext-docs] generating documentation...`);
    const { doc, iterations, finalScore } = await generateDocumentationStep(parsed);
    console.log(`[ext-docs] generated ${doc.tools.length} tools, score ${finalScore}/10`);

    // Step 3: Build the files to commit
    console.log(`[ext-docs] building commit files...`);
    const files = await buildCommitFilesStep(doc);

    // Step 4: Create branch, commit, and PR (forceFresh closes any stale PR + deletes old branch)
    console.log(`[ext-docs] creating pull request...`);
    const pr = await createPullRequestStep(owner, repo, files, finalScore, iterations);
    console.log(`[ext-docs] PR #${pr.number}: ${pr.url}`);

    // Step 5: Record successful generation in Supabase
    await recordSuccessStep(owner, repo, currentSha, { number: pr.number, url: pr.url });

    return { pr, tools: doc.tools.length, score: finalScore };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ext-docs] failed to document ${owner}/${repo}: ${errorMessage}`);
    // Record the failure so we can track it
    try {
      await recordFailureStep(owner, repo, currentSha, errorMessage);
    } catch (recordError) {
      console.error(`[ext-docs] failed to record failure status: ${recordError}`);
    }
    throw error;
  }
}

// --- Spawn helpers (step-wrapped, matching ingest pattern) ---

async function spawnExtensionChild(owner: string, repo: string, token: string): Promise<void> {
  "use step";
  await start(documentExtensionChildWorkflow, [owner, repo, token]);
}

async function startAndWaitForChild(
  owner: string,
  repo: string,
): Promise<ChildResult> {
  const { workflowRunId } = getWorkflowMetadata();
  const token = completionToken(workflowRunId, `${owner}/${repo}`);
  const hook = childCompletionHook.create({ token });

  await spawnExtensionChild(owner, repo, token);

  const completion = await hook;
  return completion;
}

// --- Batch orchestrator workflow ---

/**
 * The batch extension documentation workflow. Fans out one child workflow
 * per extension, waits for all of them (tolerating individual failures),
 * then aggregates results.
 *
 * Pass a custom list of extensions to document a subset; defaults to the
 * initial batch of 12.
 */
export async function documentExtensionsWorkflow(
  extensions?: { owner: string; repo: string }[],
) {
  "use workflow";

  const targets = extensions ?? INITIAL_EXTENSIONS;
  console.log(`[ext-docs] fanning out to ${targets.length} child workflows`);

  const settled = await Promise.allSettled(
    targets.map(({ owner, repo }) => startAndWaitForChild(owner, repo)),
  );

  const completed: { owner: string; repo: string; pr?: PullRequestResult; tools: number; score: number }[] = [];
  const skipped: { owner: string; repo: string; sha: string }[] = [];
  const failed: { owner: string; repo: string; error: string }[] = [];

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      if (outcome.value.status === "completed") {
        completed.push(outcome.value.value);
      } else if (outcome.value.status === "skipped") {
        skipped.push({ owner: outcome.value.owner, repo: outcome.value.repo, sha: outcome.value.sha });
      } else {
        failed.push({ owner: outcome.value.owner, repo: outcome.value.repo, error: outcome.value.error });
      }
    } else {
      // Shouldn't happen — child failures are caught inside runChildWithCompletion
      failed.push({ owner: "unknown", repo: "unknown", error: String(outcome.reason) });
    }
  }

  console.log(`[ext-docs] done: ${completed.length} succeeded, ${skipped.length} skipped, ${failed.length} failed`);

  return {
    completed: completed.map((c) => ({
      extension: `${c.owner}/${c.repo}`,
      pr: c.pr?.url,
      tools: c.tools,
      score: c.score,
    })),
    skipped: skipped.map((s) => ({
      extension: `${s.owner}/${s.repo}`,
      sha: s.sha,
    })),
    failed: failed.map((f) => ({
      extension: `${f.owner}/${f.repo}`,
      error: f.error,
    })),
  };
}

/**
 * Single-extension workflow (no fan-out). Use this when you want to
 * document just one extension without the batch orchestrator.
 */
export async function documentSingleExtensionWorkflow(owner: string, repo: string) {
  "use workflow";
  const result = await documentSingleExtension(owner, repo);
  return result;
}
