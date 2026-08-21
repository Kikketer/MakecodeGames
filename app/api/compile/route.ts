import { NextResponse } from "next/server";
import { getIngestUrl, ingestAuthHeaders, checkTurnstile } from "@/lib/compile-proxy";

export const maxDuration = 300;

/**
 * Proxies the PNG → Raspberry Pi ELF compile request to the
 * MakeCodeGamesIngest Chromebook at `${INGEST_URL}/api/compile`. Returns the
 * raw ELF binary as `application/octet-stream` with an `X-Project-Name`
 * header.
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

  try {
    const upstream = await fetch(`${base}/api/compile`, {
      method: "POST",
      body: upstreamForm,
      headers: ingestAuthHeaders(),
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({ error: "Compile service error" }));
      return NextResponse.json(err, { status: upstream.status });
    }
    const elfBuffer = await upstream.arrayBuffer();
    const filename =
      upstream.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "output.elf";
    const projectName = upstream.headers.get("x-project-name") ?? "";
    return new NextResponse(elfBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        ...(projectName ? { "X-Project-Name": projectName } : {}),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[compile] Proxy error:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
