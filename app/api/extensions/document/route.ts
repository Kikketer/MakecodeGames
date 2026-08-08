import { start } from "workflow/api";
import {
  documentExtensionsWorkflow,
  documentSingleExtensionWorkflow,
  INITIAL_EXTENSIONS,
} from "@/workflows/document-extension";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.INGEST_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const extension = url.searchParams.get("extension"); // e.g. "jwunderl/arcade-sprite-util"
  const force = url.searchParams.get("force") === "true";

  try {
    if (extension) {
      const slashIdx = extension.indexOf("/");
      if (slashIdx === -1) {
        return Response.json({ error: "invalid extension format, expected owner/repo" }, { status: 400 });
      }
      const owner = extension.slice(0, slashIdx);
      const repo = extension.slice(slashIdx + 1);

      // Fire-and-forget: the workflow can run longer than a single request timeout
      const run = await start(documentSingleExtensionWorkflow, [owner, repo, force]);
      return Response.json({ started: true, runId: run.runId, extension: `${owner}/${repo}`, force });
    }

    // Batch mode: document all extensions (or a subset via ?extensions=a/b,c/d)
    const extensionsParam = url.searchParams.get("extensions");
    let extensions: { owner: string; repo: string }[] | undefined;
    if (extensionsParam) {
      extensions = extensionsParam.split(",").map((pair) => {
        const idx = pair.indexOf("/");
        return { owner: pair.slice(0, idx), repo: pair.slice(idx + 1) };
      });
    }

    const run = await start(documentExtensionsWorkflow, extensions ? [extensions, force] : [undefined, force]);
    return Response.json({
      started: true,
      runId: run.runId,
      extensions: (extensions ?? INITIAL_EXTENSIONS).map((e) => `${e.owner}/${e.repo}`),
      force,
    });
  } catch (err) {
    console.error("extension docs workflow failed to start", err);
    return Response.json(
      { error: "workflow failed to start", details: String(err) },
      { status: 500 },
    );
  }
}
