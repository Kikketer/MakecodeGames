import { start } from "workflow/api";
import { ingestOnceWorkflow } from "@/workflows/ingest";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.INGEST_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // Fire-and-forget: the workflow fans out one child workflow per topic
    // and can run far longer than any single function's timeout, so we
    // don't await its result here. Progress/results live in the
    // ingest_log table and the Vercel Workflows observability dashboard.
    const run = await start(ingestOnceWorkflow);
    return Response.json({ started: true, runId: run.runId });
  } catch (err) {
    console.error("ingest failed to start", err);
    return Response.json({ error: "ingest failed to start", details: String(err) }, { status: 500 });
  }
}
