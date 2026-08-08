/**
 * Cloudflare Turnstile server-side token verification.
 *
 * Verifies a Turnstile token by POSTing to Cloudflare's siteverify endpoint.
 * Returns true if the token is valid, false otherwise.
 *
 * When TURNSTILE_SECRET_KEY is not set in the environment (localhost/dev),
 * verification is skipped and this function returns true — see the assignment
 * for the rationale (no bot protection needed locally).
 */

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Returns true if Turnstile verification should be skipped (no secret key configured).
 * On localhost/dev the secret is intentionally absent, so we skip verification entirely.
 */
export function isTurnstileEnabled(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

/**
 * Verify a Turnstile token. Returns true if valid OR if Turnstile is not configured
 * (localhost skip behavior). Returns false only when the secret is present AND
 * verification fails.
 */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // localhost/dev: no secret configured → skip verification
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
      }),
    });

    const data = (await response.json()) as { success: boolean };
    return data.success === true;
  } catch {
    // Network error contacting Cloudflare — fail closed in production
    return false;
  }
}
