"use client";

import { useState, useCallback, useMemo } from "react";
import {
  imageLiteralToJresEntry,
  imageLiteralToBitmap,
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
  "max-h-48 overflow-auto border-4 border-makecode-black bg-makecode-black p-3 font-mono text-xs text-makecode-green";
const copyButtonClass =
  "self-start font-sans text-sm font-bold text-makecode-cyan hover:underline";

export default function ImgToJresConverter() {
  const [imgInput, setImgInput] = useState<string>("");
  const [jresId, setJresId] = useState<string>("myImages.image0");
  const [displayName, setDisplayName] = useState<string>("Image0");

  const imgToJresPreview = useCallback(() => {
    if (!imgInput.trim()) return null;
    const { width, height, pixels } = imageLiteralToBitmap(imgInput);
    return { pixels, width, height, palette: DEFAULT_PALETTE };
  }, [imgInput]);
  const { canvasRef: imgCanvasRef, error: imgError } = useDebouncedPreview(imgToJresPreview);

  const imgToJresResult = useMemo(() => {
    if (!imgInput.trim()) return "";
    try {
      const entry = imageLiteralToJresEntry(imgInput, jresId, displayName);
      return JSON.stringify(entry, null, 2);
    } catch (err: unknown) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [imgInput, jresId, displayName]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>img literal</span>
          <textarea
            value={imgInput}
            onChange={(e) => setImgInput(e.target.value)}
            placeholder={"img`\n. . 1 1 1 .\n. 2 2 2 2 .\n`"}
            className={`${inputClass} h-64 resize-y p-3`}
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>id</span>
            <input
              type="text"
              value={jresId}
              onChange={(e) => setJresId(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>displayName</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelClass}>.jres entry</span>
          <pre className={preClass}>
            {imgToJresResult || "Paste an img literal to generate the .jres entry."}
          </pre>
          {imgToJresResult && !imgToJresResult.startsWith("Error") && (
            <button onClick={() => copy(imgToJresResult)} className={copyButtonClass}>
              Copy .jres JSON
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className={labelClass}>Preview</span>
        {imgError && (
          <p className="font-sans text-sm font-bold text-makecode-pink">{imgError}</p>
        )}
        <canvas
          ref={imgCanvasRef}
          className="self-start border-4 border-makecode-black bg-makecode-white"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
    </div>
  );
}
