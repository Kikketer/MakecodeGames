"use server";

import {
  proxyCompileNative,
  normalizeArch,
  checkTurnstile,
  type CompileNativeResult,
} from "@/lib/compile-proxy";

/**
 * Server Action for the PNG → native desktop compile path.
 *
 * Verifies the Turnstile token (skipped on localhost when
 * `TURNSTILE_SECRET_KEY` is unset), then proxies the PNG + arch to the
 * MakeCodeGamesIngest Chromebook at `${INGEST_URL}/api/compile-native` using
 * the unified Bearer + CF Access auth. There is no local compile fallback —
 * the Chromebook is the only place with the native build toolchain.
 */
export async function compileNativeAction(
  formData: FormData,
): Promise<CompileNativeResult> {
  const turnstileToken = (formData.get("turnstileToken") as string | null) ?? "";
  const humanOk = await checkTurnstile(turnstileToken);
  if (!humanOk) {
    return { ok: false, error: "Human verification required", log: [] };
  }

  const arch = normalizeArch(formData.get("arch"));
  return proxyCompileNative(formData, arch);
}
