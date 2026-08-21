"use client";

import { useSyncExternalStore } from "react";

/**
 * Client-side counterpart to `lib/turnstile.ts`.
 *
 * The server skips Turnstile verification when `TURNSTILE_SECRET_KEY` is
 * unset (localhost/dev). The client cannot read that server-only secret, so
 * it gates the widget on `NEXT_PUBLIC_TURNSTILE_SITE_KEY` instead. That
 * decouples the two skips: a developer who copies the public site key into
 * `.env.local` would see the widget render on localhost, where the
 * production site key is not registered for the `localhost` hostname and the
 * challenge errors out — blocking the form even though the server would
 * accept the request.
 *
 * This module closes that gap by also skipping the widget on localhost
 * hostnames, keeping the client and server skip semantics in sync.
 */

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function isLocalhostHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

/**
 * True when running in the browser on a localhost hostname. Returns false
 * during SSR and on non-localhost hosts.
 *
 * Accepts an optional hostname override for testability; in normal use it
 * reads `window.location.hostname`.
 */
export function isLocalhostClient(hostname?: string): boolean {
  if (typeof window === "undefined" && hostname === undefined) return false;
  const host = hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  return isLocalhostHostname(host);
}

/**
 * Whether a Turnstile site key is configured at build time. Exposed for
 * components that need the raw key value when rendering the widget.
 */
export function hasTurnstileSiteKey(): boolean {
  return !!TURNSTILE_SITE_KEY;
}

/**
 * The configured Turnstile site key (or undefined). Passed to
 * `window.turnstile.render({ sitekey })`.
 */
export function turnstileSiteKey(): string | undefined {
  return TURNSTILE_SITE_KEY;
}

/**
 * Pure decision: Turnstile is active only when a site key is configured AND
 * the page is not served from a localhost hostname. Extracted so the logic
 * is unit-testable without fighting jsdom's `window.location`.
 */
export function computeTurnstileEnabled(
  siteKey: string | undefined,
  hostname: string,
): boolean {
  return !!siteKey && !isLocalhostHostname(hostname);
}

/**
 * Hook: whether the Turnstile widget should be active for this client.
 *
 * Uses `useSyncExternalStore` so the value is `false` during SSR and the
 * first client render, then resolves to the real client value after
 * hydration — without a `setState`-in-effect and without a hydration
 * mismatch warning. This is the React-recommended way to read a
 * client-only value (here, `window.location.hostname`) in an SSR tree.
 *
 * Active only when a site key is configured AND the page is not served from
 * a localhost hostname.
 */
const NOOP_SUBSCRIBE = () => () => {};
const SERVER_SNAPSHOT = false;

export function useTurnstileEnabled(): boolean {
  return useSyncExternalStore(
    NOOP_SUBSCRIBE,
    getEnabledClientSnapshot,
    () => SERVER_SNAPSHOT,
  );
}

function getEnabledClientSnapshot(): boolean {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  return computeTurnstileEnabled(TURNSTILE_SITE_KEY, hostname);
}
