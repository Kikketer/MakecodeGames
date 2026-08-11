"use client";

import { useEffect, useRef, useState } from "react";
import type { ExtensionTool } from "@/content/extensions/types";

const RENDERER_URL = "https://arcade.makecode.com/--docs?render=1";
const TARGET_ORIGIN = "https://arcade.makecode.com";
/** Per-tool render timeout. The make-web renderer script uses 30s; match it. */
const RENDER_TIMEOUT_MS = 30_000;

type RenderState = "loading" | "ready" | "error";

/**
 * Client-side fallback block renderer.
 *
 * Used by `ToolDoc` when no static SVG exists for a tool. Loads the
 * MakeCode Arcade `--docs?render=1` iframe, requests a block render via
 * `postMessage`, and injects the returned SVG into the page.
 *
 * While waiting, shows the `blockString` in a styled placeholder so the
 * page never shows an empty section. If the render errors or times out,
 * falls back to the `<pre>` blockString display.
 */
export function BlockRenderer({
  packageSlug,
  repo,
  tool,
}: {
  packageSlug: string;
  repo: string;
  tool: ExtensionTool;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const renderIdRef = useRef<string>("");
  const [state, setState] = useState<RenderState>("loading");
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Generate a stable render ID inside the effect (not during render)
    if (!renderIdRef.current) {
      renderIdRef.current = `block-${tool.slug}-${Math.random().toString(36).slice(2)}`;
    }
    const renderId = renderIdRef.current;

    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      setState("error");
    }, RENDER_TIMEOUT_MS);

    function onMessage(event: MessageEvent) {
      if (event.origin !== TARGET_ORIGIN) return;
      const msg = event.data;
      if (msg?.source !== "makecode") return;

      if (msg.type === "renderready") {
        iframe!.contentWindow?.postMessage(
          {
            type: "renderblocks",
            id: renderId,
            code: tool.example,
            options: { package: `${repo}=${packageSlug}` },
          },
          TARGET_ORIGIN,
        );
      } else if (msg.type === "renderblocks" && msg.id === renderId) {
        if (timedOut) return;
        if (msg.error || !msg.svg) {
          window.clearTimeout(timeoutId);
          setState("error");
          return;
        }
        window.clearTimeout(timeoutId);
        setSvg(msg.svg);
        setState("ready");
      }
    }

    window.addEventListener("message", onMessage);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("message", onMessage);
    };
  }, [repo, packageSlug, tool.example, tool.slug]);

  return (
    <div>
      <iframe
        ref={iframeRef}
        src={RENDERER_URL}
        title={`Block renderer for ${tool.title}`}
        aria-hidden="true"
        style={{ position: "absolute", width: "1px", height: "1px", opacity: "0", border: "0" }}
      />
      {state === "ready" && svg ? (
        <div
          className="max-w-full overflow-x-auto border-2 border-makecode-white bg-white"
          role="img"
          aria-label={`${tool.blockString} block`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : state === "error" ? (
        <pre className="max-w-full overflow-x-auto border-2 border-makecode-white bg-white px-4 py-3 font-mono text-sm text-makecode-black">
          {tool.blockString}
        </pre>
      ) : (
        <pre className="max-w-full overflow-x-auto border-2 border-makecode-white bg-white px-4 py-3 font-mono text-sm text-makecode-black opacity-60">
          {tool.blockString}
        </pre>
      )}
    </div>
  );
}
