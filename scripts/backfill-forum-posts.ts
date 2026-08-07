import fs from "fs";
import path from "path";
import { backfillAll } from "../lib/ingest-games";

type CheckpointTopic = {
  id: number;
  title?: string;
};

type Checkpoint = {
  categoryId: number;
  since?: string;
  completedTopicIds: number[];
  skippedTopicIds: number[];
  inProgressTopicId?: number | null;
  startedAt: string;
};

const CHECKPOINT_PATH =
  process.env.BACKFILL_CHECKPOINT_PATH ||
  path.join(process.cwd(), ".backfill-checkpoint.json");
const CATEGORY_ID = 5;

function isSameSince(a?: string, b?: string): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);
}

function loadCheckpoint(): Checkpoint | null {
  try {
    const raw = fs.readFileSync(CHECKPOINT_PATH, "utf-8");
    const cp = JSON.parse(raw) as Checkpoint;
    if (cp.categoryId !== CATEGORY_ID) {
      console.warn("Checkpoint category mismatch, starting fresh.");
      return null;
    }
    return cp;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("Failed to read checkpoint, starting fresh:", e);
    }
    return null;
  }
}

function saveCheckpoint(cp: Checkpoint): void {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2));
}

function parseSkipTopicIds(raw: string): Set<number> {
  return new Set(
    raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0)
  );
}

async function main() {
  const categoryDelayMs = Number(process.env.BACKFILL_DELAY_MS || "2000");
  const categoryTopicDelayMs = Number(
    process.env.BACKFILL_TOPIC_DELAY_MS || "60000"
  );
  const jamDelayMs = Number(
    process.env.BACKFILL_JAM_DELAY_MS || String(categoryDelayMs)
  );
  const sinceDays = Number(process.env.BACKFILL_SINCE_DAYS || "7");
  const since =
    sinceDays > 0
      ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
      : undefined;
  const explicitSkipIds = parseSkipTopicIds(
    process.env.BACKFILL_SKIP_TOPIC_IDS || ""
  );

  const existingCheckpoint = loadCheckpoint();
  let checkpoint: Checkpoint;

  if (existingCheckpoint && isSameSince(existingCheckpoint.since, since?.toISOString())) {
    checkpoint = existingCheckpoint;
    // Always honor explicit skips, even on resume.
    for (const id of explicitSkipIds) {
      checkpoint.skippedTopicIds.push(id);
    }
    checkpoint.skippedTopicIds = [...new Set(checkpoint.skippedTopicIds)];
    console.log(
      `Resuming from checkpoint: ${checkpoint.completedTopicIds.length} topics done, skipping ${checkpoint.skippedTopicIds.length} topics.`
    );
  } else {
    checkpoint = {
      categoryId: CATEGORY_ID,
      since: since?.toISOString(),
      completedTopicIds: [],
      skippedTopicIds: [...explicitSkipIds],
      startedAt: new Date().toISOString(),
    };
    console.log(
      `Starting fresh forum backfill (batch delay ${categoryDelayMs}ms, topic delay ${categoryTopicDelayMs}ms, since ${sinceDays} days ago)...`
    );
  }

  const completedSet = new Set(checkpoint.completedTopicIds);
  const skippedSet = new Set(checkpoint.skippedTopicIds);
  const skipTopicIds = new Set([...completedSet, ...skippedSet]);

  const onTopicCompleted = (
    topic: CheckpointTopic,
    index: number,
    total: number
  ) => {
    completedSet.add(topic.id);
    checkpoint.completedTopicIds = [...completedSet];
    checkpoint.inProgressTopicId = null;
    saveCheckpoint(checkpoint);
    console.log(
      `[${index + 1}/${total}] Completed topic ${topic.id}: ${topic.title || "(no title)"}`
    );
  };

  try {
    const result = await backfillAll({
      since,
      categoryDelayMs,
      categoryTopicDelayMs,
      jamDelayMs,
      skipTopicIds,
      onProgress: (message) =>
        console.log(`[${new Date().toISOString()}] ${message}`),
      onTopicCompleted,
    });
    console.log("Backfill complete:", result);
    fs.unlinkSync(CHECKPOINT_PATH);
  } catch (err) {
    console.error("Backfill failed. Checkpoint saved at", CHECKPOINT_PATH, err);
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
