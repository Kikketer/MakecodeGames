"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Script from "next/script";
// Loads the shared `window.turnstile` global augmentation.
import "@/lib/turnstile-global";
import { useTurnstileEnabled, turnstileSiteKey } from "@/lib/turnstile-client";

type Status = "idle" | "working" | "done" | "error";

interface PngResult {
  filename: string;
  url: string;
  projectName: string;
  repoRef: string;
}

export default function RepoToPng() {
  const turnstileActive = useTurnstileEnabled();
  const TURNSTILE_SITE_KEY = turnstileSiteKey();
  const [status, setStatus] = useState<Status>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<PngResult | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [ref, setRef] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const handleTurnstileCallback = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);
  const handleTurnstileExpired = useCallback(() => setTurnstileToken(null), []);
  const handleTurnstileError = useCallback(() => setTurnstileToken(null), []);
  const handleScriptLoad = useCallback(() => setScriptLoaded(true), []);

  useEffect(() => {
    if (!turnstileActive || !scriptLoaded) return;
    if (turnstileWidgetIdRef.current !== null) return;
    if (!TURNSTILE_SITE_KEY || !turnstileContainerRef.current) return;
    if (typeof window === "undefined" || !window.turnstile) return;
    turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: handleTurnstileCallback,
      "expired-callback": handleTurnstileExpired,
      "error-callback": handleTurnstileError,
      theme: "dark",
    });
  }, [
    turnstileActive,
    scriptLoaded,
    TURNSTILE_SITE_KEY,
    handleTurnstileCallback,
    handleTurnstileExpired,
    handleTurnstileError,
  ]);

  const appendLog = (lines: string[]) => {
    setLog((prev) => {
      const next = [...prev, ...lines];
      setTimeout(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
      }, 0);
      return next;
    });
  };

  const resetTurnstile = useCallback(() => {
    setTurnstileToken(null);
    if (turnstileWidgetIdRef.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
  }, []);

  const generate = useCallback(async () => {
    if (status === "working") return;
    if (!repoUrl.trim()) {
      appendLog(["Enter a GitHub repo URL first."]);
      setStatus("error");
      return;
    }
    if (turnstileActive && !turnstileToken) {
      appendLog(["Please complete the human verification first."]);
      setStatus("error");
      return;
    }
    setStatus("working");
    setLog([]);
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);

    appendLog([`Fetching ${repoUrl.trim()}${ref.trim() ? ` @ ${ref.trim()}` : ""}…`]);

    try {
      const resp = await fetch("/api/repo-to-png", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: repoUrl.trim(),
          ...(ref.trim() ? { ref: ref.trim() } : {}),
          ...(turnstileToken ? { turnstileToken } : {}),
        }),
      });

      if (!resp.ok) {
        const json = (await resp.json()) as { error: string; log?: string[] };
        appendLog(json.log ?? []);
        appendLog([`Error: ${json.error}`]);
        setStatus("error");
        resetTurnstile();
        return;
      }

      const projectName = resp.headers.get("X-Project-Name") ?? "game";
      const repoRef = resp.headers.get("X-Repo-Ref") ?? "";
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const filename = `${projectName.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;

      appendLog([
        `Done — ${(blob.size / 1024).toFixed(1)} KB PNG ready${repoRef ? ` (${repoRef})` : ""}.`,
      ]);
      setResult({ filename, url, projectName, repoRef });
      setStatus("done");
      resetTurnstile();
    } catch (err: unknown) {
      appendLog([`Network error: ${err instanceof Error ? err.message : String(err)}`]);
      setStatus("error");
      resetTurnstile();
    }
  }, [status, repoUrl, ref, turnstileToken, turnstileActive, resetTurnstile, result]);

  const onReset = () => {
    if (result) URL.revokeObjectURL(result.url);
    setStatus("idle");
    setLog([]);
    setResult(null);
  };

  const busy = status === "working";
  const turnstileReady = !turnstileActive || !!turnstileToken;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      {turnstileActive && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          onLoad={handleScriptLoad}
        />
      )}

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-sans text-sm font-bold text-makecode-brown">
            GitHub repo URL
          </span>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/you/your-arcade-game"
            disabled={busy}
            className="rounded-lg border-4 border-makecode-black bg-makecode-white px-3 py-2 font-mono text-sm text-makecode-black placeholder:text-makecode-tan disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-sans text-sm font-bold text-makecode-brown">
            Branch / tag / commit <span className="font-normal">(optional — defaults to the default branch)</span>
          </span>
          <input
            type="text"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="main"
            disabled={busy}
            className="rounded-lg border-4 border-makecode-black bg-makecode-white px-3 py-2 font-mono text-sm text-makecode-black placeholder:text-makecode-tan disabled:opacity-50"
          />
        </label>
      </div>

      {turnstileActive && (
        <div ref={turnstileContainerRef} className="min-h-[65px]" />
      )}

      {status !== "done" && (
        <button
          onClick={() => void generate()}
          disabled={busy || !turnstileReady || !repoUrl.trim()}
          className="rounded-lg border-4 border-makecode-black bg-makecode-cyan py-2 px-4 font-sans text-sm font-bold text-makecode-black transition-colors hover:bg-makecode-yellow disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Generating…" : "Generate PNG"}
        </button>
      )}

      {log.length > 0 && (
        <div
          ref={logRef}
          className="max-h-56 overflow-y-auto rounded-lg bg-makecode-black p-4 font-mono text-xs text-makecode-green"
        >
          {log.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          {busy && <div className="animate-pulse">▌</div>}
        </div>
      )}

      {status === "done" && result && (
        <div className="flex items-center gap-3">
          <a
            href={result.url}
            download={result.filename}
            className="flex-1 rounded-lg border-4 border-makecode-black bg-makecode-cyan py-2 px-4 text-center font-sans text-sm font-bold text-makecode-black transition-colors hover:bg-makecode-yellow"
          >
            Download {result.filename}
          </a>
          <button
            onClick={onReset}
            className="font-sans text-sm font-bold text-makecode-tan hover:underline"
          >
            Start over
          </button>
        </div>
      )}

      {status === "error" && (
        <button
          onClick={onReset}
          className="self-start font-sans text-sm font-bold text-makecode-pink hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
