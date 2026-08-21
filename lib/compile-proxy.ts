import { verifyTurnstileToken } from "@/lib/turnstile";

/**
 * Shared proxy helpers for the client-facing compile pages.
 *
 * Every compile path proxies to the MakeCodeGamesIngest Chromebook server
 * (`INGEST_URL`) using the same unified auth the ingest/extension-docs
 * workflows already use:
 *   - `Authorization: Bearer $INGEST_SECRET`
 *   - `CF-Access-Client-Id` / `CF-Access-Client-Secret`
 *
 * There is NO local compile fallback in MakecodeGames — the Chromebook is the
 * only place with the native build toolchain, so we always proxy. For local
 * dev, point `INGEST_URL` at the Chromebook tunnel or a local
 * MakeCodeGamesIngest instance.
 */

export type CompileArch = "x86-64" | "arm64" | "win64";

export type CompileNativeResult =
  | { ok: true; base64: string; projectName: string; filename: string; log: string[] }
  | { ok: false; error: string; log: string[] };

/**
 * The headers every proxied compile request must send to the Chromebook.
 * These mirror the headers in `.github/workflows/daily-ingest.yml` and
 * `weekly-extension-docs.yml` exactly.
 */
export function ingestAuthHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.INGEST_SECRET ?? ""}`,
    "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID ?? "",
    "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET ?? "",
  };
}

/**
 * Returns the configured ingest base URL (trailing slash stripped) when both
 * `INGEST_URL` and `INGEST_SECRET` are set, otherwise null. A null return
 * means the proxy is not configured — callers should surface a clear error
 * rather than fall back to any local compile path.
 */
export function getIngestUrl(): string | null {
  const url = process.env.INGEST_URL;
  const secret = process.env.INGEST_SECRET;
  if (!url || !secret) return null;
  return url.replace(/\/$/, "");
}

/**
 * Verify the Cloudflare Turnstile human-verification token.
 *
 * Reuses MakecodeGames' existing `lib/turnstile.ts`: when
 * `TURNSTILE_SECRET_KEY` is unset (localhost/dev) verification is skipped and
 * this returns true. In production the token is verified against Cloudflare's
 * siteverify endpoint.
 */
export async function checkTurnstile(token: string): Promise<boolean> {
  return verifyTurnstileToken(token);
}

/**
 * Normalizes a raw arch form value into the three supported targets.
 * Defaults to x86-64 for anything unrecognized.
 */
export function normalizeArch(raw: FormDataEntryValue | null): CompileArch {
  if (raw === "arm64") return "arm64";
  if (raw === "win64") return "win64";
  return "x86-64";
}

/**
 * Proxies a native compile request to `${INGEST_URL}/api/compile-native`.
 *
 * The Chromebook returns JSON `{ ok, base64, projectName, filename, log }`.
 * Used by the `/compilers/desktop` Server Action.
 */
export async function proxyCompileNative(
  formData: FormData,
  arch: CompileArch,
): Promise<CompileNativeResult> {
  const base = getIngestUrl();
  if (!base) {
    return {
      ok: false,
      error: "Compile service is not configured (INGEST_URL / INGEST_SECRET missing).",
      log: [],
    };
  }

  const upstreamForm = new FormData();
  const png = formData.get("png");
  if (!png || !(png instanceof Blob)) {
    return { ok: false, error: "No PNG file uploaded", log: [] };
  }
  upstreamForm.append("png", png, png instanceof File ? png.name : "upload.png");
  upstreamForm.append("arch", arch);

  try {
    const upstream = await fetch(`${base}/api/compile-native`, {
      method: "POST",
      body: upstreamForm,
      headers: ingestAuthHeaders(),
    });
    const json = (await upstream
      .json()
      .catch(() => ({ ok: false, error: "Invalid upstream response", log: [] }))) as CompileNativeResult;
    if (!upstream.ok) {
      return {
        ok: false,
        error: json.ok === false ? json.error : `Upstream error ${upstream.status}`,
        log: json.ok === false ? json.log ?? [] : [],
      };
    }
    if (!json.ok) {
      return { ok: false, error: json.error, log: json.log ?? [] };
    }
    return json;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[compile-native] Service proxy error:", err);
    return { ok: false, error: message, log: [] };
  }
}
