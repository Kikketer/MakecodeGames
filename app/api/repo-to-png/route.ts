import { NextResponse } from "next/server";
import { getIngestUrl, ingestAuthHeaders, checkTurnstile } from "@/lib/compile-proxy";

export const maxDuration = 120;

/**
 * Proxies the GitHub repo URL → MakeCode project PNG request to the
 * MakeCodeGamesIngest Chromebook at `${INGEST_URL}/api/repo-to-png`.
 * Returns the generated PNG as `image/png` with `X-Project-Name` and
 * `X-Repo-Ref` headers.
 *
 * Body: JSON `{ "url": string, "ref"?: string, "turnstileToken"?: string }`.
 *
 * There is no local fallback — the Chromebook owns this path. This exists
 * because the MakeCode editor's GitHub import can silently revert project
 * code (microsoft/pxt-arcade#7781); generating the PNG server-side skips
 * the editor entirely.
 */
export async function POST(request: Request) {
  let body: { url?: unknown; ref?: unknown; turnstileToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const humanOk = await checkTurnstile(
    typeof body.turnstileToken === "string" ? body.turnstileToken : "",
  );
  if (!humanOk) {
    return NextResponse.json({ error: "Human verification required" }, { status: 403 });
  }

  const base = getIngestUrl();
  if (!base) {
    return NextResponse.json(
      { error: "Compile service is not configured (INGEST_URL / INGEST_SECRET missing)." },
      { status: 503 },
    );
  }

  if (typeof body.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ error: "Missing repo url" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${base}/api/repo-to-png`, {
      method: "POST",
      headers: { ...ingestAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        url: body.url.trim(),
        ...(typeof body.ref === "string" && body.ref.trim()
          ? { ref: body.ref.trim() }
          : {}),
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({ error: "PNG service error" }));
      return NextResponse.json(err, { status: upstream.status });
    }

    const png = await upstream.arrayBuffer();
    const response = new NextResponse(png, { status: 200 });
    response.headers.set("Content-Type", "image/png");
    for (const h of ["content-disposition", "x-project-name", "x-repo-ref"]) {
      const value = upstream.headers.get(h);
      if (value) response.headers.set(h, value);
    }
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[repo-to-png] Service proxy error:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
