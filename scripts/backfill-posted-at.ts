import { backfillPostedAt } from "../lib/ingest-games";

async function main() {
  const delayMs = Number(process.env.BACKFILL_POSTED_AT_DELAY_MS || "500");
  const includeExisting = process.env.BACKFILL_POSTED_AT_INCLUDE_EXISTING === "1";

  console.log(
    `Backfilling posted_at (delay ${delayMs}ms, includeExisting=${includeExisting})...`
  );

  const result = await backfillPostedAt({
    delayMs,
    includeExisting,
    onProgress: (message) => console.log(`[${new Date().toISOString()}] ${message}`),
  });

  console.log("Backfill complete:", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
