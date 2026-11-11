"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
// Loads the shared `window.turnstile` global augmentation.
import "@/lib/turnstile-global";
import { turnstileSiteKey, useTurnstileEnabled } from "@/lib/turnstile-client";

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export interface TurnstileState {
  /** Whether Turnstile is in use on this client (site key set, not localhost). */
  active: boolean;
  token: string | null;
  /** True when a request may be sent: Turnstile is inactive or a token is held. */
  ready: boolean;
  /** Drop the current (single-use) token and ask the widget for a new one. */
  reset: () => void;
  /** The script tag + widget container; render it where the widget should appear. */
  widget: React.ReactNode;
}

/**
 * Renders the Cloudflare Turnstile widget as soon as the component mounts.
 *
 * Uses `<Script onReady>` rather than `onLoad`: `onLoad` fires only the first
 * time the script loads, so after a client-side navigation between compiler
 * pages the widget never rendered until a full refresh.
 */
export function useTurnstile(): TurnstileState {
  const active = useTurnstileEnabled();
  const siteKey = turnstileSiteKey();
  const [token, setToken] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active || !scriptReady || !siteKey) return;
    const container = containerRef.current;
    const turnstile = window.turnstile;
    if (!container || !turnstile) return;
    const id = turnstile.render(container, {
      sitekey: siteKey,
      callback: setToken,
      "expired-callback": () => setToken(null),
      "error-callback": () => setToken(null),
      theme: "dark",
    });
    widgetIdRef.current = id;
    return () => {
      widgetIdRef.current = null;
      try {
        turnstile.remove(id);
      } catch {}
    };
  }, [active, scriptReady, siteKey]);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  const onScriptReady = useCallback(() => setScriptReady(true), []);

  return useMemo(
    () => ({
      active,
      token,
      ready: !active || !!token,
      reset,
      widget: active ? (
        <>
          <Script src={TURNSTILE_SRC} strategy="afterInteractive" onReady={onScriptReady} />
          <div ref={containerRef} className="min-h-[65px]" />
        </>
      ) : null,
    }),
    [active, token, reset, onScriptReady],
  );
}
