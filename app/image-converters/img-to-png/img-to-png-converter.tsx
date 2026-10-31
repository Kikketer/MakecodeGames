"use client";

import { useState, useCallback, useMemo } from "react";
import {
  imageLiteralToBitmap,
  DEFAULT_PALETTE,
} from "@/lib/makecode-image";
import type { PaletteMode } from "@/lib/png-to-image-client";
import { useDebouncedPreview } from "../pixel-preview";

const inputClass =
  "border-4 border-makecode-black bg-makecode-white p-2 font-mono text-xs text-makecode-black focus:outline-none focus:ring-2 focus:ring-makecode-yellow";
const labelClass = "font-sans text-sm font-bold text-makecode-tan";
const infoClass =
  "border-4 border-makecode-black bg-makecode-blue p-4 font-sans text-sm text-white";
const codeClass =
  "rounded bg-makecode-black px-1 py-0.5 font-mono text-xs text-makecode-green";
const buttonClass =
  "self-start border-4 border-makecode-black bg-makecode-yellow px-4 py-2 font-sans text-sm font-bold text-makecode-black shadow-[4px_4px_0_#000000] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000000] disabled:opacity-50";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export default function ImgToPngConverter() {
  const [imgInput, setImgInput] = useState<string>("");
  const [paletteMode, setPaletteMode] = useState<PaletteMode>("default");
  const [pxtJsonPalette, setPxtJsonPalette] = useState<string>("");
  const [pixelScale, setPixelScale] = useState("4");
  const [filename, setFilename] = useState("image");

  const palette = useMemo(() => {
    if (paletteMode === "pxt-json" && pxtJsonPalette.trim()) {
      try {
        const parsed = JSON.parse(pxtJsonPalette.trim()) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // fall through to default
      }
    }
    return DEFAULT_PALETTE;
  }, [paletteMode, pxtJsonPalette]);

  const bitmap = useMemo(() => {
    if (!imgInput.trim()) return null;
    try {
      return imageLiteralToBitmap(imgInput);
    } catch {
      return null;
    }
  }, [imgInput]);

  const preview = useCallback(() => {
    if (!bitmap) return null;
    return { pixels: bitmap.pixels, width: bitmap.width, height: bitmap.height, palette };
  }, [bitmap, palette]);
  const { canvasRef, error: previewError } = useDebouncedPreview(preview);

  const downloadPng = useCallback(() => {
    if (!bitmap) return;
    const scale = Math.max(1, parseInt(pixelScale, 10) || 1);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width * scale;
    canvas.height = bitmap.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = ctx.createImageData(bitmap.width, bitmap.height);
    for (let i = 0; i < bitmap.pixels.length; i++) {
      const idx = bitmap.pixels[i];
      if (idx === 0) continue; // transparent
      const [r, g, b] = hexToRgb(palette[idx % palette.length] ?? "#000000");
      image.data[i * 4] = r;
      image.data[i * 4 + 1] = g;
      image.data[i * 4 + 2] = b;
      image.data[i * 4 + 3] = 255;
    }

    if (scale === 1) {
      ctx.putImageData(image, 0, 0);
    } else {
      const tmp = document.createElement("canvas");
      tmp.width = bitmap.width;
      tmp.height = bitmap.height;
      tmp.getContext("2d")?.putImageData(image, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.trim() || "image"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [bitmap, palette, pixelScale, filename]);

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

        <div className="flex flex-col gap-2">
          <label className={labelClass}>Palette source</label>
          <select
            value={paletteMode}
            onChange={(e) => setPaletteMode(e.target.value as PaletteMode)}
            className={inputClass}
          >
            <option value="default">Default MakeCode Arcade palette</option>
            <option value="pxt-json">Pasted pxt.json palette</option>
          </select>
        </div>

        {paletteMode === "pxt-json" && (
          <>
            <div className={infoClass}>
              <p className="leading-relaxed">
                Copy and paste a palette from the{" "}
                <code className={codeClass}>pxt.json</code> file — you can find it
                when viewing files in the JavaScript view. It should be a JSON
                array of 16 hex colors.
              </p>
            </div>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>
                pxt.json palette (JSON array of 16 hex colors)
              </span>
              <textarea
                value={pxtJsonPalette}
                onChange={(e) => setPxtJsonPalette(e.target.value)}
                placeholder='["#000000","#ffffff",...]'
                className={`${inputClass} h-24 resize-y`}
              />
            </label>
          </>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className={labelClass}>Preview</span>
          {previewError && (
            <p className="font-sans text-sm font-bold text-makecode-pink">
              {previewError}
            </p>
          )}
          <canvas
            ref={canvasRef}
            className="self-start border-4 border-makecode-black bg-makecode-white"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>PNG scale (px per pixel)</span>
            <input
              type="number"
              min={1}
              max={64}
              value={pixelScale}
              onChange={(e) => setPixelScale(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Filename</span>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <button onClick={downloadPng} disabled={!bitmap} className={buttonClass}>
          Download PNG
        </button>
      </div>
    </div>
  );
}
