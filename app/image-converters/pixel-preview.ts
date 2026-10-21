"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_PALETTE } from "@/lib/makecode-image";

export function drawPreview(
  canvas: HTMLCanvasElement,
  pixels: Uint8Array,
  width: number,
  height: number,
  palette: string[] = DEFAULT_PALETTE,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const scale = Math.max(1, Math.min(16, Math.floor(320 / Math.max(width, height))));
  canvas.width = width * scale;
  canvas.height = height * scale;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = pixels[y * width + x];
      ctx.fillStyle = palette[idx % palette.length] ?? "#000000";
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

export function useDebouncedPreview(
  render: () => { pixels: Uint8Array; width: number; height: number; palette?: string[] } | null,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const result = render();
        if (result && canvasRef.current) {
          drawPreview(canvasRef.current, result.pixels, result.width, result.height, result.palette);
          setError(null);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [render]);

  return { canvasRef, error };
}
