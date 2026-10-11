"use client";

import { useState, useCallback, useMemo } from "react";
import {
  jresDataToImageLiteral,
  jresDataToBitmapData,
  DEFAULT_PALETTE,
} from "@/lib/makecode-image";
import { useDebouncedPreview } from "../pixel-preview";

function copy(text: string) {
  void navigator.clipboard.writeText(text);
}

const inputClass =
  "border-4 border-makecode-black bg-makecode-white p-2 font-mono text-xs text-makecode-black focus:outline-none focus:ring-2 focus:ring-makecode-yellow";
const labelClass = "font-sans text-sm font-bold text-makecode-tan";
const preClass =
  "max-h-80 overflow-auto border-4 border-makecode-black bg-makecode-black p-3 font-mono text-xs text-makecode-green";
const copyButtonClass =
  "self-start font-sans text-sm font-bold text-makecode-cyan hover:underline";

export default function JresToImgConverter() {
  const [jresInput, setJresInput] = useState<string>("");

  const jresToImgPreview = useCallback(() => {
    if (!jresInput.trim()) return null;
    try {
      const { width, height, pixels } = jresDataToBitmapData(jresInput.trim());
      return { pixels, width, height, palette: DEFAULT_PALETTE };
    } catch {
      return null;
    }
  }, [jresInput]);
  const { canvasRef: jresCanvasRef, error: jresError } = useDebouncedPreview(jresToImgPreview);

  const jresToImgResult = useMemo(() => {
    if (!jresInput.trim()) return "";
    try {
      return jresDataToImageLiteral(jresInput.trim());
    } catch (err: unknown) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [jresInput]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>.jres data (base64)</span>
          <textarea
            value={jresInput}
            onChange={(e) => setJresInput(e.target.value)}
            placeholder="hwQXABc..."
            className={`${inputClass} h-40 resize-y p-3`}
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className={labelClass}>img literal</span>
          <pre className={preClass}>
            {jresToImgResult || "Paste a .jres data string to decode it."}
          </pre>
          {jresToImgResult && !jresToImgResult.startsWith("Error") && (
            <button onClick={() => copy(jresToImgResult)} className={copyButtonClass}>
              Copy img literal
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className={labelClass}>Preview</span>
        {jresError && (
          <p className="font-sans text-sm font-bold text-makecode-pink">{jresError}</p>
        )}
        <canvas
          ref={jresCanvasRef}
          className="self-start border-4 border-makecode-black bg-makecode-white"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
    </div>
  );
}
