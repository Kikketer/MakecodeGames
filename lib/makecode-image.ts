/**
 * Pure TypeScript MakeCode Arcade image encoder/decoder.
 *
 * Mirrors the PXT logic in pxt/pxtlib/emitter/image.ts and
 * pxt/pxtlib/spriteutils.ts so make-web can generate and inspect
 * image/x-mkcd-f4 .jres data without pulling in pxt-core at runtime.
 */

import { bytesToBase64, base64ToBytes } from './base64'

export const HEX_CHARS = ['.', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']

export const DEFAULT_PALETTE: string[] = [
  '#000000',
  '#ffffff',
  '#ff2121',
  '#ff93c4',
  '#ff8135',
  '#fff609',
  '#249ca3',
  '#78dc52',
  '#003fad',
  '#87f2ff',
  '#8e2ec4',
  '#a4839f',
  '#5c406c',
  '#e5cdc4',
  '#91463d',
  '#000000',
]

export interface JresEntry {
  id: string
  data: string
  dataEncoding: 'base64'
  namespace: string
  mimeType: 'image/x-mkcd-f4'
  displayName: string
}

export interface BitmapData {
  width: number
  height: number
  pixels: Uint8Array
}

export interface ImageLiteralResult {
  width: number
  height: number
  pixels: Uint8Array
}

const charToIndex: Record<string, number | undefined> = {
  '0': 0,
  '.': 0,
  '1': 1,
  '#': 1,
  '2': 2,
  'T': 2,
  '3': 3,
  't': 3,
  '4': 4,
  'N': 4,
  '5': 5,
  'n': 5,
  '6': 6,
  'G': 6,
  '7': 7,
  'g': 7,
  '8': 8,
  '9': 9,
  a: 10,
  A: 10,
  R: 10,
  b: 11,
  B: 11,
  P: 11,
  c: 12,
  C: 12,
  p: 12,
  d: 13,
  D: 13,
  O: 13,
  e: 14,
  E: 14,
  Y: 14,
  f: 15,
  F: 15,
  W: 15,
}

function hex2(n: number) {
  return ('0' + n.toString(16)).slice(-2)
}

export function f4EncodeImg(
  w: number,
  h: number,
  bpp: number,
  getPix: (x: number, y: number) => number,
): string {
  const header = [0x87, bpp, w & 0xff, w >> 8, h & 0xff, h >> 8, 0, 0]
  let r = header.map(hex2).join('')
  let ptr = 4
  let curr = 0
  let shift = 0

  const pushBits = (n: number) => {
    curr |= n << shift
    if (shift == 8 - bpp) {
      r += hex2(curr)
      ptr++
      curr = 0
      shift = 0
    } else {
      shift += bpp
    }
  }

  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) pushBits(getPix(i, j))
    while (shift != 0) pushBits(0)
    if (bpp > 1) {
      while (ptr & 3) pushBits(0)
    }
  }

  return r
}

export function f4EncodeImgToBytes(
  w: number,
  h: number,
  bpp: number,
  getPix: (x: number, y: number) => number,
): Uint8Array {
  const hex = f4EncodeImg(w, h, bpp, getPix)
  const bytes = new Uint8Array(hex.length >> 1)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i >> 1] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

export function imageLiteralToBitmap(literal: string): ImageLiteralResult {
  const cleaned = literal
    .replace(/[ `]|(?:&#96;)|(?:&#9;)|(?:img)/g, '')
    .replace(/^["`\(\)]*/, '')
    .replace(/["`\(\)]*$/, '')
    .replace(/&#10;/g, '\n')

  const sourceRows = cleaned.split('\n')
  const rows: number[][] = []
  let width = 0

  for (const rawRow of sourceRows) {
    const row: number[] = []
    for (const ch of rawRow) {
      const idx = charToIndex[ch]
      if (idx !== undefined) {
        row.push(idx)
      } else if (!/\s/.test(ch)) {
        throw new Error(`Invalid character in image literal: '${ch}'`)
      }
    }
    if (row.length) {
      rows.push(row)
      width = Math.max(width, row.length)
    }
  }

  const height = rows.length
  const pixels = new Uint8Array(width * height)
  for (let r = 0; r < height; r++) {
    const row = rows[r]
    for (let c = 0; c < width; c++) {
      pixels[r * width + c] = c < row.length ? row[c] : 0
    }
  }

  return { width, height, pixels }
}

export function bitmapToImageLiteral(pixels: Uint8Array, width: number, height: number): string {
  if (width === 0 || height === 0) return ''
  const padding = width * height > 300 ? '' : ' '
  let res = 'img`'
  for (let r = 0; r < height; r++) {
    res += '\n'
    for (let c = 0; c < width; c++) {
      res += HEX_CHARS[getPixel(pixels, width, height, c, r)] + padding
    }
  }
  res += '\n`'
  return res
}

export function getPixel(pixels: Uint8Array, width: number, height: number, x: number, y: number): number {
  if (x < 0 || x >= width || y < 0 || y >= height) return 0
  return pixels[y * width + x]
}

export function setPixel(pixels: Uint8Array, width: number, height: number, x: number, y: number, value: number) {
  if (x < 0 || x >= width || y < 0 || y >= height) return
  pixels[y * width + x] = value & 0xf
}

export function sliceSpriteSheet(
  pixels: Uint8Array,
  fullWidth: number,
  fullHeight: number,
  spriteWidth: number,
  spriteHeight: number,
  count: number,
): Uint8Array[] {
  if (!Number.isInteger(spriteWidth) || spriteWidth <= 0) {
    throw new Error('Sprite width must be a positive integer')
  }
  if (!Number.isInteger(spriteHeight) || spriteHeight <= 0) {
    throw new Error('Sprite height must be a positive integer')
  }
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('Sprite count must be a positive integer')
  }

  const spritesPerRow = Math.floor(fullWidth / spriteWidth)
  if (spritesPerRow === 0) {
    throw new Error('Sprite width is larger than the image width')
  }

  const frames: Uint8Array[] = []
  for (let i = 0; i < count; i++) {
    const col = i % spritesPerRow
    const row = Math.floor(i / spritesPerRow)
    const x = col * spriteWidth
    const y = row * spriteHeight

    if (x + spriteWidth > fullWidth || y + spriteHeight > fullHeight) {
      throw new Error(`Sprite ${i + 1} of ${count} does not fit in the image`)
    }

    const slice = new Uint8Array(spriteWidth * spriteHeight)
    for (let sy = 0; sy < spriteHeight; sy++) {
      const srcStart = (y + sy) * fullWidth + x
      slice.set(pixels.subarray(srcStart, srcStart + spriteWidth), sy * spriteWidth)
    }
    frames.push(slice)
  }

  return frames
}

function indentImageLiteral(literal: string, spaces: number): string {
  const prefix = ' '.repeat(spaces)
  return literal
    .split('\n')
    .map((line) => (line ? `${prefix}${line}` : ''))
    .join('\n')
}

export function formatImageArray(frames: string[]): string {
  const parts = frames.map((frame) => indentImageLiteral(frame, 4)).join(',\n')
  return `const output = [\n${parts}\n]`
}

export function formatAnimationStarter(frames: string[]): string {
  if (frames.length === 0) return ''
  const frameParts = frames.map((frame) => indentImageLiteral(frame, 4)).join(',\n')
  return `let mySprite = sprites.create(${frames[0]}, SpriteKind.Player)

let argvs = [
${frameParts}
]

animation.runImageAnimation(
    mySprite,
    argvs,
    500,
    true
)`
}

export function hexToBitmap(hex: string | Uint8Array): BitmapData {
  let bytes: Uint8Array
  if (typeof hex === 'string') {
    bytes = new Uint8Array(hex.length >> 1)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i >> 1] = parseInt(hex.slice(i, i + 2), 16)
    }
  } else {
    bytes = hex
  }

  let magic = bytes[0]
  let w = bytes[1]
  let h = bytes[2]
  let dataOffset = 0

  if (magic === 0x87) {
    magic = 0xe0 | bytes[1]
    w = bytes[2] | (bytes[3] << 8)
    h = bytes[4] | (bytes[5] << 8)
    dataOffset = 4
  }

  const data = bytes.slice(dataOffset)
  const pixels = new Uint8Array(w * h)

  if (magic === 0xe1) {
    let mask = 0x01
    let v = data[0]
    let index = 1
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        setPixel(pixels, w, h, x, y, v & mask ? 1 : 0)
        mask <<= 1
        if (mask === 0x100) {
          mask = 0x01
          v = data[index++]
        }
      }
    }
  } else {
    let index = 4
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y += 2) {
        const v = data[index++]
        setPixel(pixels, w, h, x, y, v & 0xf)
        if (y !== h - 1) {
          setPixel(pixels, w, h, x, y + 1, (v >> 4) & 0xf)
        }
      }
      while (index & 3) index++
    }
  }

  return { width: w, height: h, pixels }
}

export function bitmapDataToJresData(
  pixels: Uint8Array,
  width: number,
  height: number,
): string {
  const bytes = f4EncodeImgToBytes(width, height, 4, (x, y) => getPixel(pixels, width, height, x, y))
  return bytesToBase64(bytes)
}

export function jresDataToBitmapData(data: string): BitmapData {
  const bytes = base64ToBytes(data)
  return hexToBitmap(bytes)
}

export function bitmapDataToJresEntry(
  pixels: Uint8Array,
  width: number,
  height: number,
  id: string,
  displayName: string,
): JresEntry {
  return {
    id,
    data: bitmapDataToJresData(pixels, width, height),
    dataEncoding: 'base64',
    namespace: 'myImages.',
    mimeType: 'image/x-mkcd-f4',
    displayName,
  }
}

export function imageLiteralToJresEntry(
  literal: string,
  id: string,
  displayName: string,
): JresEntry {
  const { width, height, pixels } = imageLiteralToBitmap(literal)
  return bitmapDataToJresEntry(pixels, width, height, id, displayName)
}

export function jresDataToImageLiteral(data: string): string {
  const { width, height, pixels } = jresDataToBitmapData(data)
  return bitmapToImageLiteral(pixels, width, height)
}
