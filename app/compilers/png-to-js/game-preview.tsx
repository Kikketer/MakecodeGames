"use client";

import { useEffect, useRef } from "react";
import { parseGameJsMeta } from "@/lib/parse-game-meta";

interface ArcadeVersion {
  simulator: string;
  simUrl: string;
  cdnUrl: string;
  targetVersion: string;
}

interface GamePreviewProps {
  code: string;
  version?: ArcadeVersion | null;
  onError?: (message: string) => void;
}

/**
 * Renders the compiled game.js inside the MakeCode Arcade simulator iframe.
 *
 * make-web ships a custom slim simulator variant under
 * `/simulator/{version}/slim.html`. MakecodeGames does not vendor the
 * simulator assets, so we point the iframe at the public MakeCode simulator
 * runner (`https://arcade.makecode.com/--simulator`) and drive it with the
 * same `run` postMessage protocol. The cdnUrl / targetVersion embedded in the
 * generated game.js (via `parseGameJsMeta`) tell the simulator which runtime
 * to load.
 */
export default function GamePreview({ code, version, onError }: GamePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const simulator = version?.simulator ?? version?.targetVersion ?? "";
    const defaults = {
      cdnUrl: version?.cdnUrl ?? `https://cdn.makecode.com`,
      targetVersion: version?.targetVersion ?? simulator,
    };

    const meta = parseGameJsMeta(code, defaults);
    let readyTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleMessage = (ev: MessageEvent) => {
      if (ev.data?.type === "ready") {
        if (readyTimeout) {
          clearTimeout(readyTimeout);
          readyTimeout = null;
        }

        const runMsg = {
          type: "run",
          parts: [],
          code,
          partDefinitions: {},
          cdnUrl: meta.cdnUrl,
          version: meta.targetVersion,
          storedState: {},
          frameCounter: 1,
          options: { theme: "green", player: "" },
          id: "game-" + Math.random(),
        };

        iframe.contentWindow?.postMessage(runMsg, "*");
        setTimeout(() => iframe.contentWindow?.postMessage({ type: "mute", mute: false }, "*"), 300);
        // Give the iframe focus so keyboard/gamepad input works.
        setTimeout(() => iframe.focus(), 100);
        window.removeEventListener("message", handleMessage);
      }
    };

    window.addEventListener("message", handleMessage);
    iframe.src = "https://arcade.makecode.com/--simulator";

    readyTimeout = setTimeout(() => {
      window.removeEventListener("message", handleMessage);
      iframe.src = "";
      onError?.("Simulator did not become ready in time.");
    }, 10000);

    return () => {
      if (readyTimeout) clearTimeout(readyTimeout);
      window.removeEventListener("message", handleMessage);
      iframe.src = "";
    };
  }, [code, onError, version]);

  return (
    <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-black">
      <iframe
        ref={iframeRef}
        className="h-full w-full"
        allow="autoplay; fullscreen"
        title="MakeCode Arcade preview"
      />
    </div>
  );
}
