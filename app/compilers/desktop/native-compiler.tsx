"use client";

import { useState, useRef, useCallback } from "react";
import Script from "next/script";
import { compileNativeAction } from "./actions";
import ArchInstructions from "./arch-instructions";
// Loads the shared `window.turnstile` global augmentation.
import "@/lib/turnstile-global";

type Status = "idle" | "uploading" | "done" | "error";
type Arch = "x86-64" | "arm64" | "win64";

interface CompileResult {
  filename: string;
  url: string;
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

export default function NativeCompiler() {
  const [status, setStatus] = useState<Status>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<CompileResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [arch, setArch] = useState<Arch>("x86-64");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

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
  }, [handleTurnstileCallback, handleTurnstileExpired, handleTurnstileError]);

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
      if (TURNSTILE_SITE_KEY && !turnstileToken) {
        appendLog(["Please complete the human verification first."]);
        setStatus("error");
        return;
      }
      setStatus("uploading");
      setLog([]);
      setResult(null);

      const form = new FormData();
      form.append("png", file);
      form.append("arch", arch);
      if (turnstileToken) form.append("turnstileToken", turnstileToken);

      appendLog([`Uploading ${file.name} (${(file.size / 1024).toFixed(1)} KB) for ${arch}...`]);

      try {
        const res = await compileNativeAction(form);

        if (!res.ok) {
          appendLog(res.log);
          appendLog([`Error: ${res.error}`]);
          setStatus("error");
          resetTurnstile();
          return;
        }

        const buffer = base64ToArrayBuffer(res.base64);
        const isWindows = arch === "win64";
        const blob = new Blob([buffer], {
          type: isWindows ? "application/zip" : "application/gzip",
        });
        const url = URL.createObjectURL(blob);

        appendLog(res.log);
        appendLog([
          `Done — ${(blob.size / 1024).toFixed(1)} KB ${isWindows ? "Windows" : "Linux"} executable archive ready.`,
        ]);
        setResult({ filename: res.filename, url });
        setStatus("done");
        resetTurnstile();
      } catch (err: unknown) {
        appendLog([`Network error: ${err instanceof Error ? err.message : String(err)}`]);
        setStatus("error");
        resetTurnstile();
      }
    },
    [status, arch, turnstileToken, resetTurnstile],
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
    if (fileInputRef.current) fileInputRef.current.value = "";
    resetTurnstile();
  };

  const busy = status === "uploading";
  const turnstileReady = !TURNSTILE_SITE_KEY || !!turnstileToken;

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      {TURNSTILE_SITE_KEY && (
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
        <div className="flex flex-col gap-2">
          <label className="font-sans text-sm font-bold text-makecode-tan">
            Target architecture
          </label>
          <select
            value={arch}
            onChange={(e) => setArch(e.target.value as Arch)}
            disabled={busy}
            className="rounded-lg border-4 border-makecode-black bg-white p-2 font-sans text-sm font-bold text-makecode-black focus:outline-none disabled:opacity-50"
          >
            <option value="x86-64">x86-64 (Intel/AMD Linux)</option>
            <option value="arm64">ARM64 / aarch64 (Raspberry Pi 3/4/5, Apple Silicon Linux)</option>
            <option value="win64">Windows x86-64</option>
          </select>
          <ArchInstructions arch={arch} />
        </div>
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
