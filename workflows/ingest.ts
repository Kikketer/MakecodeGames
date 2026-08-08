import { defineHook, getWorkflowMetadata, sleep } from "workflow";
import { start } from "workflow/api";
import {
  countGameForumPostsStep,
  ingestJamTopic,
  ingestSingleCategoryTopic,
  listActiveCategoryTopics,
  listActiveJamTopics,
  readLastIngestAtStep,
  refreshGameDailyStatsStep,
  snapshotGameStatsStep,
  writeIngestLogStep,
  type DiscourseTopic,
} from "@/lib/ingest-games";

/**
 * Per-topic durability: each topic (the jam topic, and every active
 * category-5 topic) runs as its own child workflow with its own event log
 * and retry/failure boundary. If a mega-thread (or a single infamous
 * "chat" topic) blows up mid-crawl, it fails in isolation - the other
 * topics still finish and get written to Supabase independently, instead
 * of one bad thread poisoning the whole daily run.
 */

type ChildResult =
  | { status: "completed"; value: { games: number; errors: string[] } }
  | { status: "failed"; error: string };

const childCompletionHook = defineHook<ChildResult>();

function completionToken(parentRunId: string, key: string): string {
  return `ingest-child:${parentRunId}:${key}`;
}

async function resumeParentCompletionStep(token: string, result: ChildResult): Promise<void> {
  "use step";
  await childCompletionHook.resume(token, result);
}

async function runChildWithCompletion(
  runChild: () => Promise<{ games: number; errors: string[] }>,
  token: string
): Promise<void> {
  let result: ChildResult;
  try {
    const value = await runChild();
    result = { status: "completed", value };
  } catch (error) {
    result = { status: "failed", error: error instanceof Error ? error.message : String(error) };
  }
  await resumeParentCompletionStep(token, result);
}

// Spawnable child workflow exports - `start()` needs these registered as
// top-level exported "use workflow" functions.

export async function ingestJamTopicChildWorkflow(
  topicId: number,
  lastIngestAtIso: string | undefined,
  completionTokenArg: string
) {
  "use workflow";
  // Shows up in this run's Logs tab in Vercel Observability, so it's easy
  // to tell which topic a given child run is working on at a glance
  // (also visible in the run's recorded Input, but that requires opening
  // the run and inspecting the raw args).
  console.log(`[ingest] jam topic ${topicId}`);
  await runChildWithCompletion(
    () => ingestJamTopic(topicId, lastIngestAtIso ? new Date(lastIngestAtIso) : undefined, undefined, sleep),
    completionTokenArg
  );
}

export async function ingestCategoryTopicChildWorkflow(
  topic: DiscourseTopic,
  completionTokenArg: string
) {
  "use workflow";
  console.log(`[ingest] topic ${topic.id} "${topic.title}" (${topic.posts_count} posts)`);
  await runChildWithCompletion(() => ingestSingleCategoryTopic(topic, undefined, sleep), completionTokenArg);
}

async function spawnJamChild(topicId: number, lastIngestAtIso: string | undefined, token: string): Promise<void> {
  "use step";
  await start(ingestJamTopicChildWorkflow, [topicId, lastIngestAtIso, token]);
}

async function spawnCategoryTopicChild(topic: DiscourseTopic, token: string): Promise<void> {
  "use step";
  await start(ingestCategoryTopicChildWorkflow, [topic, token]);
}

async function startAndWaitForChild(
  key: string,
  spawnChild: (token: string) => Promise<void>
): Promise<{ games: number; errors: string[] }> {
  const { workflowRunId } = getWorkflowMetadata();
  const token = completionToken(workflowRunId, key);
  const hook = childCompletionHook.create({ token });

  await spawnChild(token);

  const completion = await hook;
  if (completion.status === "failed") {
    return { games: 0, errors: [`topic ${key} failed: ${completion.error}`] };
  }
  return completion.value;
}

/**
 * The daily ingest, as a durable workflow. Fans out one child workflow per
 * active jam topic and one per active category-5 topic, waits for all of
 * them (tolerating individual failures via Promise.allSettled), then
 * aggregates totals and runs the end-of-run bookkeeping (post count, stat
 * snapshots, ingest_log row) once everything has settled.
 */
export async function ingestOnceWorkflow() {
  "use workflow";

  const lastIngestAtIso = await readLastIngestAtStep();
  const lastIngestAt = lastIngestAtIso ? new Date(lastIngestAtIso) : undefined;
  const startedAt = new Date().toISOString();

  const activeJamTopics = await listActiveJamTopics(lastIngestAt);
  const activeTopics = await listActiveCategoryTopics(5, 20, lastIngestAt);
  console.log(
    `[ingest] fanning out to ${activeJamTopics.length + activeTopics.length} child workflows: ` +
      `${activeJamTopics.map((t) => `jam-${t.id} ("${t.title}")`).join(", ")}` +
      (activeJamTopics.length && activeTopics.length ? ", " : "") +
      `${activeTopics.map((t) => `topic-${t.id} ("${t.title}")`).join(", ")}`
  );

  const settled = await Promise.allSettled([
    ...activeJamTopics.map((topic) =>
      startAndWaitForChild(`jam-${topic.id}`, (token) => spawnJamChild(topic.id, lastIngestAtIso, token))
    ),
    ...activeTopics.map((topic) =>
      startAndWaitForChild(`topic-${topic.id}`, (token) => spawnCategoryTopicChild(topic, token))
    ),
  ]);

  let games = 0;
  const errors: string[] = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      games += outcome.value.games;
      errors.push(...outcome.value.errors);
    } else {
      errors.push(outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason));
    }
  }

  const posts = await countGameForumPostsStep();

  try {
    await snapshotGameStatsStep();
  } catch (error) {
    errors.push(`snapshot failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    await refreshGameDailyStatsStep();
  } catch (error) {
    errors.push(`refresh daily stats failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  await writeIngestLogStep({
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    games,
    posts,
    errors,
  });

  return { jams: activeJamTopics.length, games, posts, errors };
}
