"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Script from "next/script";
import GamePreview from "./game-preview";
// Loads the shared `window.turnstile` global augmentation.
import "@/lib/turnstile-global";
import { useTurnstileEnabled, turnstileSiteKey } from "@/lib/turnstile-client";

type Status = "idle" | "uploading" | "done" | "error";

interface CompileResult {
  filename: string;
  url: string;
}

interface ArcadeVersion {
  simulator: string;
  simUrl: string;
  cdnUrl: string;
  targetVersion: string;
}

export default function JsCompiler() {
  const turnstileActive = useTurnstileEnabled();
  const TURNSTILE_SITE_KEY = turnstileSiteKey();
  const [status, setStatus] = useState<Status>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<CompileResult | null>(null);
  const [jsCode, setJsCode] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const [arcadeVersion, setArcadeVersion] = useState<ArcadeVersion | null>(null);

  useEffect(() => {
    fetch("/arcade-version.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setArcadeVersion(data as ArcadeVersion);
      })
      .catch(() => {});
  }, []);

  const handleTurnstileCallback = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);
  const handleTurnstileExpired = useCallback(() => setTurnstileToken(null), []);
  const handleTurnstileError = useCallback(() => setTurnstileToken(null), []);

  const handleScriptLoad = useCallback(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileContainerRef.current) return;
    if (typeof window === "undefined" || !window.turnstile) return;
    turnstileWidgetIdRef.current = window.turnstile.render(
      turnstileContainerRef.current,
      {
        sitekey: TURNSTILE_SITE_KEY,
        callback: handleTurnstileCallback,
        "expired-callback": handleTurnstileExpired,
        "error-callback": handleTurnstileError,
        theme: "dark",
      },
    );
  }, [TURNSTILE_SITE_KEY, handleTurnstileCallback, handleTurnstileExpired, handleTurnstileError]);

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

  const compile = useCallback(
    async (file: File) => {
      if (status === "uploading") return;
      if (turnstileActive && !turnstileToken) {
        appendLog(["Please complete the human verification first."]);
        setStatus("error");
        return;
      }
      setStatus("uploading");
      setLog([]);
      setResult(null);
      setJsCode("");
      setShowPreview(false);

      const form = new FormData();
      form.append("png", file);
      if (turnstileToken) form.append("turnstileToken", turnstileToken);
      if (arcadeVersion) {
        form.append("simUrl", `${window.location.origin}${arcadeVersion.simUrl}`);
        form.append("cdnUrl", `${window.location.origin}${arcadeVersion.cdnUrl}`);
      }

      appendLog([`Uploading ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`]);

      try {
        const resp = await fetch("/api/compile-js", { method: "POST", body: form });

        if (!resp.ok) {
          const json = (await resp.json()) as { error: string; log?: string[] };
          appendLog(json.log ?? []);
          appendLog([`Error: ${json.error}`]);
          setStatus("error");
          resetTurnstile();
          return;
        }

        const projectName = resp.headers.get("X-Project-Name") ?? "game";
        const filename = `${projectName.replace(/[^a-zA-Z0-9_-]/g, "_")}.js`;
        const code = await resp.text();
        const blob = new Blob([code], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);

        appendLog([`Done — ${(blob.size / 1024).toFixed(1)} KB JavaScript ready.`]);
        setResult({ filename, url });
        setJsCode(code);
        setStatus("done");
        resetTurnstile();
      } catch (err: unknown) {
        appendLog([`Network error: ${err instanceof Error ? err.message : String(err)}`]);
        setStatus("error");
        resetTurnstile();
      }
    },
    [status, turnstileToken, turnstileActive, resetTurnstile, arcadeVersion],
  );

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".png") && file.type !== "image/png") {
      setLog(["Only PNG files are accepted."]);
      setStatus("error");
      return;
    }
    void compile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const onReset = () => {
    if (result) URL.revokeObjectURL(result.url);
    setStatus("idle");
    setLog([]);
    setResult(null);
    setJsCode("");
    setShowPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    resetTurnstile();
  };

  const handlePreviewError = (message: string) => {
    appendLog([`Preview error: ${message}`]);
    setShowPreview(false);
  };

  const busy = status === "uploading";
  const turnstileReady = !turnstileActive || !!turnstileToken;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      {turnstileActive && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
            onLoad={handleScriptLoad}
          />
          <div ref={turnstileContainerRef} className="min-h-[65px]" />
        </>
      )}

      {turnstileReady && (
        <div
          className={[
            "cursor-pointer rounded-xl border-4 border-dashed border-makecode-black bg-makecode-white p-10 text-center transition-colors",
            dragOver ? "border-makecode-cyan bg-makecode-cyan" : "hover:border-makecode-teal",
            busy ? "pointer-events-none opacity-50" : "",
          ].join(" ")}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !busy && fileInputRef.current?.click()}
        >
          <p className="font-sans text-sm font-bold text-makecode-brown">
            {busy ? "Compiling…" : "Drop a .png file here, or click to browse"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,image/png"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
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
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <a
              href={result.url}
              download={result.filename}
              className="flex-1 rounded-lg border-4 border-makecode-black bg-makecode-cyan py-2 px-4 text-center font-sans text-sm font-bold text-makecode-black transition-colors hover:bg-makecode-yellow"
            >
              Download {result.filename}
            </a>
            {!showPreview && (
              <button
                onClick={() => setShowPreview(true)}
                className="flex-1 rounded-lg border-4 border-makecode-black bg-makecode-green py-2 px-4 text-center font-sans text-sm font-bold text-makecode-black transition-colors hover:bg-makecode-teal"
              >
                Play
              </button>
            )}
            <button
              onClick={onReset}
              className="font-sans text-sm font-bold text-makecode-tan hover:underline"
            >
              Start over
            </button>
          </div>

          {showPreview && jsCode && (
            <GamePreview code={jsCode} onError={handlePreviewError} version={arcadeVersion} />
          )}
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
