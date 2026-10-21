"use client";

import { useState, useCallback, useRef } from "react";
import {
  imageLiteralToBitmap,
  bitmapDataToJresEntry,
  bitmapToImageLiteral,
  sliceSpriteSheet,
  formatImageArray,
  formatAnimationStarter,
} from "@/lib/makecode-image";
import { loadPngFile, pngToImageDataFromRgba, type PaletteMode } from "@/lib/png-to-image-client";
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
const infoClass =
  "border-4 border-makecode-black bg-makecode-blue p-4 font-sans text-sm text-white";
const codeClass =
  "rounded bg-makecode-black px-1 py-0.5 font-mono text-xs text-makecode-green";

export default function PngToImgConverter() {
  const [pngFile, setPngFile] = useState<File | null>(null);
  const [pngMode, setPngMode] = useState<PaletteMode>("default");
  const [pxtJsonPalette, setPxtJsonPalette] = useState<string>("");
  const [spriteSheet, setSpriteSheet] = useState(false);
  const [spriteWidth, setSpriteWidth] = useState("16");
  const [spriteHeight, setSpriteHeight] = useState("16");
  const [spriteCount, setSpriteCount] = useState("4");
  const [pngResult, setPngResult] = useState<{
    img?: string;
    jres?: string;
    frames?: string[];
    imageArray?: string;
    animationStarter?: string;
    width: number;
    height: number;
    palette: string[];
  } | null>(null);
  const [pngStatus, setPngStatus] = useState<"idle" | "converting" | "done" | "error">("idle");
  const [pngError, setPngError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pngPreview = useCallback(() => {
    if (!pngResult) return null;
    if (pngResult.frames && pngResult.frames.length > 0) {
      const { width, height, pixels } = imageLiteralToBitmap(pngResult.frames[0]);
      return { pixels, width, height, palette: pngResult.palette };
    }
    if (!pngResult.img) return null;
    const { pixels } = imageLiteralToBitmap(pngResult.img);
    return { pixels, width: pngResult.width, height: pngResult.height, palette: pngResult.palette };
  }, [pngResult]);
  const { canvasRef: pngCanvasRef, error: pngPreviewError } = useDebouncedPreview(pngPreview);

  const convertPng = useCallback(
    async (file: File) => {
      if (pngStatus === "converting") return;
      setPngStatus("converting");
      setPngResult(null);
      setPngError(null);

      try {
        const { width, height, data } = await loadPngFile(file);

        let parsedPxtJsonPalette: string[] | undefined;
        if (pngMode === "pxt-json" && pxtJsonPalette.trim()) {
          try {
            parsedPxtJsonPalette = JSON.parse(pxtJsonPalette.trim()) as string[];
          } catch {
            throw new Error("Invalid palette JSON");
          }
        }

        const {
          width: outWidth,
          height: outHeight,
          pixels,
          palette,
        } = pngToImageDataFromRgba({ width, height, data }, pngMode, parsedPxtJsonPalette);

        if (spriteSheet) {
          const sw = parseInt(spriteWidth, 10);
          const sh = parseInt(spriteHeight, 10);
          const sc = parseInt(spriteCount, 10);

          const frameBuffers = sliceSpriteSheet(pixels, outWidth, outHeight, sw, sh, sc);
          const frames = frameBuffers.map((buffer) => bitmapToImageLiteral(buffer, sw, sh));
          const imageArray = formatImageArray(frames);
          const animationStarter = formatAnimationStarter(frames);

          setPngResult({ frames, imageArray, animationStarter, width: sw, height: sh, palette });
          setPngStatus("done");
          return;
        }

        const displayName = file.name.replace(/\.png$/i, "").replace(/[^a-zA-Z0-9_-]/g, "_");
        const id = `myImages.image${displayName}`;

        const jres = bitmapDataToJresEntry(pixels, outWidth, outHeight, id, displayName);
        const img = bitmapToImageLiteral(pixels, outWidth, outHeight);

        setPngResult({
          jres: JSON.stringify(jres, null, 2),
          img,
          width: outWidth,
          height: outHeight,
          palette,
        });
        setPngStatus("done");
      } catch (err: unknown) {
        console.error("[png] Conversion error:", err);
        setPngError(err instanceof Error ? err.message : "Conversion failed");
        setPngStatus("error");
      }
    },
    [pngMode, pxtJsonPalette, spriteSheet, spriteWidth, spriteHeight, spriteCount, pngStatus],
  );

  const handlePngFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".png") && file.type !== "image/png") {
      setPngError("Only PNG files are accepted.");
      setPngStatus("error");
      return;
    }
    setPngFile(file);
    void convertPng(file);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Palette source</label>
          <select
            value={pngMode}
            onChange={(e) => setPngMode(e.target.value as PaletteMode)}
            className={inputClass}
          >
            <option value="top-row">Top-row palette</option>
            <option value="pxt-json">Pasted pxt.json palette</option>
            <option value="default">Default MakeCode Arcade palette</option>
          </select>
        </div>

        <div className={infoClass}>
          <p className="leading-relaxed">
            {pngMode === "top-row" &&
              "Put your colors in the first top row of pixels, one pixel per color. They will be assigned their index based on their position (transparent pixels are ignored)."}
            {pngMode === "pxt-json" && (
              <>
                Copy and paste a palette from the{" "}
                <code className={codeClass}>pxt.json</code> file — you can find it
                when viewing files in the JavaScript view. It should be a JSON
                array of 16 hex colors.
              </>
            )}
            {pngMode === "default" && "Use the built-in 16-color MakeCode Arcade palette."}
          </p>
        </div>

        {pngMode === "pxt-json" && (
          <label className="flex flex-col gap-1">
            <span className={labelClass}>
              pxt.json palette (JSON array of 16 hex colors, copied from pxt.json)
            </span>
            <textarea
              value={pxtJsonPalette}
              onChange={(e) => setPxtJsonPalette(e.target.value)}
              placeholder='["#000000","#ffffff",...]'
              className={`${inputClass} h-24 resize-y`}
            />
          </label>
        )}

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={spriteSheet}
            onChange={(e) => setSpriteSheet(e.target.checked)}
            className="h-4 w-4 accent-makecode-yellow"
          />
          <span className={labelClass}>Sprite sheet</span>
        </label>

        {spriteSheet && (
          <div className="grid grid-cols-3 gap-4">
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Sprite width (px)</span>
              <input
                type="number"
                min={1}
                value={spriteWidth}
                onChange={(e) => setSpriteWidth(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Sprite height (px)</span>
              <input
                type="number"
                min={1}
                value={spriteHeight}
                onChange={(e) => setSpriteHeight(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Sprite count</span>
              <input
                type="number"
                min={1}
                value={spriteCount}
                onChange={(e) => setSpriteCount(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        )}

        <div
          className={[
            "cursor-pointer rounded-xl border-4 border-dashed border-makecode-black bg-makecode-white p-10 text-center transition-colors",
            dragOver ? "border-makecode-cyan bg-makecode-cyan" : "hover:border-makecode-teal",
            pngStatus === "converting" ? "pointer-events-none opacity-50" : "",
          ].join(" ")}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handlePngFile(e.dataTransfer.files[0]);
          }}
          onClick={() => pngStatus !== "converting" && fileInputRef.current?.click()}
        >
          <p className="font-sans text-sm font-bold text-makecode-brown">
            {pngStatus === "converting"
              ? "Converting…"
              : "Drop a .png file here, or click to browse"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,image/png"
            className="hidden"
            onChange={(e) => handlePngFile(e.target.files?.[0])}
          />
        </div>

        {pngFile && <p className="font-sans text-sm text-makecode-tan">{pngFile.name}</p>}
        {pngStatus === "error" && (
          <p className="font-sans text-sm font-bold text-makecode-pink">
            {pngError ?? "Conversion failed. Try again."}
          </p>
        )}

        <div className={infoClass}>
          <p className="leading-relaxed">
            To bring the <code className={codeClass}>img</code> into your game
            in the MakeCode editor:
          </p>
          <ol className="list-decimal space-y-1 pl-5 leading-relaxed">
            <li>Copy the img string.</li>
            <li>
              Switch to JavaScript and type{" "}
              <code className={codeClass}>let theImage = </code> then paste.
            </li>
            <li>
              Switch back to Blocks — you&apos;ll see the new image and can save
              it from there.
            </li>
          </ol>
          <p className="leading-relaxed">
            The <code className={codeClass}>.jres</code> output is only needed
            for Visual Studio Code projects — paste it into{" "}
            <code className={codeClass}>images.g.jres</code>.
          </p>
        </div>

        {pngResult && (
          <div className="flex flex-col gap-2">
            {pngResult.img && (
              <>
                <span className={labelClass}>img literal</span>
                <pre className={preClass}>{pngResult.img}</pre>
                <button onClick={() => copy(pngResult.img!)} className={copyButtonClass}>
                  Copy img literal
                </button>
              </>
            )}
            {pngResult.jres && (
              <>
                <span className={`${labelClass} mt-2`}>.jres entry</span>
                <pre className={preClass}>{pngResult.jres}</pre>
                <button onClick={() => copy(pngResult.jres!)} className={copyButtonClass}>
                  Copy .jres JSON
                </button>
              </>
            )}
            {pngResult.imageArray && (
              <>
                <span className={labelClass}>Image array</span>
                <pre className={preClass}>{pngResult.imageArray}</pre>
                <button onClick={() => copy(pngResult.imageArray!)} className={copyButtonClass}>
                  Copy image array
                </button>
              </>
            )}
            {pngResult.animationStarter && (
              <>
                <span className={`${labelClass} mt-2`}>Animation starter</span>
                <pre className={preClass}>{pngResult.animationStarter}</pre>
                <button
                  onClick={() => copy(pngResult.animationStarter!)}
                  className={copyButtonClass}
                >
                  Copy animation code
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <span className={labelClass}>Preview</span>
        {pngPreviewError && (
          <p className="font-sans text-sm font-bold text-makecode-pink">{pngPreviewError}</p>
        )}
        <canvas
          ref={pngCanvasRef}
          className="self-start border-4 border-makecode-black bg-makecode-white"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
    </div>
  );
}
