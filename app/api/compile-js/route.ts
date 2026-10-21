import { NextResponse } from "next/server";
import { getIngestUrl, ingestAuthHeaders, checkTurnstile } from "@/lib/compile-proxy";

export const maxDuration = 300;

/**
 * Proxies the PNG → game.js compile request to the MakeCodeGamesIngest
 * Chromebook at `${INGEST_URL}/api/compile-js`. Returns the generated
 * JavaScript as `application/javascript` with an `X-Project-Name` header.
 *
 * There is no local compile fallback — the Chromebook is the only place with
 * the PXT toolchain configured for this path.
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const turnstileToken = (formData.get("turnstileToken") as string | null) ?? "";
  const humanOk = await checkTurnstile(turnstileToken);
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

  const png = formData.get("png");
  if (!png || !(png instanceof Blob)) {
    return NextResponse.json({ error: "No PNG file uploaded" }, { status: 400 });
  }

  // Forward only the fields the Chromebook expects (drop the turnstile token).
  const upstreamForm = new FormData();
  upstreamForm.append("png", png, png instanceof File ? png.name : "upload.png");
  const simUrl = formData.get("simUrl");
  const cdnUrl = formData.get("cdnUrl");
  if (simUrl) upstreamForm.append("simUrl", simUrl);
  if (cdnUrl) upstreamForm.append("cdnUrl", cdnUrl);

  try {
    const upstream = await fetch(`${base}/api/compile-js`, {
      method: "POST",
      body: upstreamForm,
      headers: ingestAuthHeaders(),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      let parsed: { error?: string; log?: string[] } = {};
      try {
        parsed = JSON.parse(body);
      } catch {}
      return NextResponse.json(
        { error: parsed.error || `Compile service returned ${upstream.status}`, log: parsed.log },
        { status: upstream.status },
      );
    }

    const js = await upstream.text();
    return new NextResponse(js, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/javascript",
        "Content-Disposition": upstream.headers.get("Content-Disposition") || "",
        "X-Project-Name": upstream.headers.get("X-Project-Name") || "",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[compile-js] Proxy error:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
