/**
 * Browser-safe PNG loading and pixel quantization for MakeCode Arcade images.
 *
 * This file does not import pngjs or any Node-only module, so it can be bundled
 * for the client. The server-side wrapper that uses pngjs lives in
 * `lib/png-to-image.ts` and re-exports `pngToImageDataFromRgba` from this file.
 */

import { DEFAULT_PALETTE } from './makecode-image'

export type PaletteMode = 'top-row' | 'pxt-json' | 'default'

export interface RgbaImageData {
  width: number
  height: number
  data: Uint8Array
}

export interface PngToImageResult {
  width: number
  height: number
  pixels: Uint8Array
  palette: string[]
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace(/^#/, '')
  const num = parseInt(clean, 16)
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  }
}

function isTransparent(r: number, g: number, b: number, a: number): boolean {
  return a < 128
}

function colorDistanceSq(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
): number {
  const dr = c1.r - c2.r
  const dg = c1.g - c2.g
  const db = c1.b - c2.b
  return dr * dr + dg * dg + db * db
}

export function findNearestPaletteIndex(r: number, g: number, b: number, palette: string[]): number {
  let best = 0
  let bestDist = Infinity
  const c1 = { r, g, b }
  for (let i = 0; i < palette.length; i++) {
    const dist = colorDistanceSq(c1, hexToRgb(palette[i]))
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

function extractTopRowPalette(img: RgbaImageData): string[] {
  const colors = new Set<string>()
  const palette: string[] = []

  for (let x = 0; x < img.width; x++) {
    const idx = x * 4
    const r = img.data[idx]
    const g = img.data[idx + 1]
    const b = img.data[idx + 2]
    const a = img.data[idx + 3]
    if (a < 128) continue
    const hex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')
    if (!colors.has(hex)) {
      colors.add(hex)
      palette.push(hex)
      if (palette.length >= 16) break
    }
  }

  if (palette.length === 0) return DEFAULT_PALETTE
  return palette
}

function normalizePxtJsonPalette(palette: unknown): string[] {
  if (!Array.isArray(palette) || palette.length === 0) return DEFAULT_PALETTE
  const colors = palette
    .map((c) => (typeof c === 'string' ? c : ''))
    .filter((c) => /^#?[0-9a-fA-F]{6}$/.test(c))
    .map((c) => (c.startsWith('#') ? c : `#${c}`))
  return colors.length >= 16 ? colors.slice(0, 16) : DEFAULT_PALETTE
}

export function pngToImageDataFromRgba(
  img: RgbaImageData,
  mode: PaletteMode,
  pxtJsonPalette?: string[],
): PngToImageResult {
  let activePalette: string[]
  if (mode === 'pxt-json') {
    activePalette = normalizePxtJsonPalette(pxtJsonPalette)
  } else if (mode === 'top-row') {
    activePalette = extractTopRowPalette(img)
  } else {
    activePalette = DEFAULT_PALETTE
  }

  const outputHeight = mode === 'top-row' ? Math.max(0, img.height - 1) : img.height
  const outputWidth = img.width
  const pixels = new Uint8Array(outputWidth * outputHeight)

  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      const srcY = mode === 'top-row' ? y + 1 : y
      const idx = (srcY * img.width + x) * 4
      const r = img.data[idx]
      const g = img.data[idx + 1]
      const b = img.data[idx + 2]
      const a = img.data[idx + 3]

      const value = isTransparent(r, g, b, a) ? 0 : findNearestPaletteIndex(r, g, b, activePalette)
      pixels[y * outputWidth + x] = value
    }
  }

  return {
    width: outputWidth,
    height: outputHeight,
    pixels,
    palette: activePalette,
  }
}

export interface PngFileResult {
  width: number
  height: number
  data: Uint8Array
}

export async function loadPngFile(file: File | Blob): Promise<PngFileResult> {
  const bitmap = await createImageBitmap(file)
  const width = bitmap.width
  const height = bitmap.height

  let canvas: OffscreenCanvas | HTMLCanvasElement
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height)
  } else {
    canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not get canvas 2d context')
  }
  ctx.drawImage(bitmap, 0, 0)
  if (bitmap.close) {
    bitmap.close()
  }

  const imageData = ctx.getImageData(0, 0, width, height)
  return { width, height, data: new Uint8Array(imageData.data.buffer) }
}
