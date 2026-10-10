import { describe, it, expect } from 'vitest'
import { PNG } from 'pngjs'
import { pngToImageDataFromRgba, findNearestPaletteIndex } from './png-to-image-client'

function rgbaData(width: number, height: number, values: number[]) {
  return { width, height, data: new Uint8Array(values) }
}

function createPngBuffer(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number, number],
) {
  const png = new PNG({ width, height })
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = fill(x, y)
      const idx = (y * width + x) * 4
      png.data[idx] = r
      png.data[idx + 1] = g
      png.data[idx + 2] = b
      png.data[idx + 3] = a
    }
  }
  return PNG.sync.write(png)
}

function decodePng(buffer: Buffer) {
  const png = PNG.sync.read(buffer)
  return { width: png.width, height: png.height, data: new Uint8Array(png.data) }
}

describe('pngToImageDataFromRgba from raw RGBA', () => {
  it('maps a solid red RGBA image to default palette index 2', () => {
    const values: number[] = []
    for (let i = 0; i < 4; i++) {
      values.push(0xff, 0x21, 0x21, 0xff)
    }
    const { width: outWidth, height: outHeight, pixels, palette } = pngToImageDataFromRgba(
      rgbaData(2, 2, values),
      'default',
    )
    expect(outWidth).toBe(2)
    expect(outHeight).toBe(2)
    expect(palette[2]).toBe('#ff2121')
    expect(pixels).toEqual(new Uint8Array([2, 2, 2, 2]))
  })

  it('extracts the top-row palette and skips the top row', () => {
    const values = [
      0xff, 0x21, 0x21, 0xff, 0x24, 0x9c, 0xa3, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0x21, 0x21, 0xff, 0x24, 0x9c, 0xa3, 0xff, 0xff, 0xff, 0xff, 0xff,
      0xff, 0x21, 0x21, 0xff, 0x24, 0x9c, 0xa3, 0xff, 0xff, 0xff, 0xff, 0xff,
    ]
    const { width: outWidth, height: outHeight, pixels, palette } = pngToImageDataFromRgba(
      rgbaData(3, 3, values),
      'top-row',
    )
    expect(outWidth).toBe(3)
    expect(outHeight).toBe(2)
    expect(palette).toContain('#ff2121')
    expect(palette).toContain('#249ca3')
    expect(palette).toContain('#ffffff')
    expect(pixels).toEqual(new Uint8Array([0, 1, 2, 0, 1, 2]))
  })

  it('treats transparent pixels as index 0', () => {
    const values: number[] = []
    for (let i = 0; i < 4; i++) {
      values.push(0xff, 0x21, 0x21, 0x00)
    }
    const { pixels } = pngToImageDataFromRgba(rgbaData(2, 2, values), 'default')
    expect(pixels).toEqual(new Uint8Array([0, 0, 0, 0]))
  })

  it('uses a pasted pxt.json palette', () => {
    const values = [0x00, 0x3f, 0xad, 0xff]
    const pxtJsonPalette = [
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
    const { width, height, pixels, palette } = pngToImageDataFromRgba(
      rgbaData(1, 1, values),
      'pxt-json',
      pxtJsonPalette,
    )
    expect(width).toBe(1)
    expect(height).toBe(1)
    expect(pixels[0]).toBe(8)
    expect(palette[8]).toBe('#003fad')
  })

  it('falls back to the default palette when the pxt.json palette is invalid', () => {
    const values = [0xff, 0xff, 0xff, 0xff]
    const { pixels } = pngToImageDataFromRgba(rgbaData(1, 1, values), 'pxt-json', ['not-a-color'])
    expect(pixels[0]).toBe(1)
  })
})

describe('pngToImageDataFromRgba from PNG buffer', () => {
  it('maps a solid red PNG to the default palette index 2', () => {
    const buffer = createPngBuffer(2, 2, () => [0xff, 0x21, 0x21, 0xff])
    const { width, height, pixels, palette } = pngToImageDataFromRgba(decodePng(buffer), 'default')
    expect(width).toBe(2)
    expect(height).toBe(2)
    expect(palette[2]).toBe('#ff2121')
    expect(pixels).toEqual(new Uint8Array([2, 2, 2, 2]))
  })

  it('treats transparent pixels as index 0', () => {
    const buffer = createPngBuffer(2, 2, () => [0xff, 0x21, 0x21, 0x00])
    const { pixels } = pngToImageDataFromRgba(decodePng(buffer), 'default')
    expect(pixels).toEqual(new Uint8Array([0, 0, 0, 0]))
  })

  it('extracts the top-row palette and excludes the top row', () => {
    const buffer = createPngBuffer(3, 3, (x, y) => {
      if (y === 0) {
        if (x === 0) return [0xff, 0x21, 0x21, 0xff]
        if (x === 1) return [0x24, 0x9c, 0xa3, 0xff]
        return [0xff, 0xff, 0xff, 0xff]
      }
      if (x === 0) return [0xff, 0x21, 0x21, 0xff]
      if (x === 1) return [0x24, 0x9c, 0xa3, 0xff]
      return [0xff, 0xff, 0xff, 0xff]
    })
    const { width, height, pixels, palette } = pngToImageDataFromRgba(decodePng(buffer), 'top-row')
    expect(width).toBe(3)
    expect(height).toBe(2)
    expect(palette).toContain('#ff2121')
    expect(palette).toContain('#249ca3')
    expect(palette).toContain('#ffffff')
    expect(pixels).toEqual(new Uint8Array([0, 1, 2, 0, 1, 2]))
  })

  it('uses a pasted pxt.json palette', () => {
    const buffer = createPngBuffer(1, 1, () => [0x00, 0x3f, 0xad, 0xff])
    const { width, height, pixels, palette } = pngToImageDataFromRgba(decodePng(buffer), 'pxt-json', [
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
    ])
    expect(width).toBe(1)
    expect(height).toBe(1)
    expect(pixels[0]).toBe(8)
    expect(palette[8]).toBe('#003fad')
  })

  it('falls back to the default palette when the pxt.json palette is invalid', () => {
    const buffer = createPngBuffer(1, 1, () => [0xff, 0xff, 0xff, 0xff])
    const { pixels } = pngToImageDataFromRgba(decodePng(buffer), 'pxt-json', ['not-a-color'])
    expect(pixels[0]).toBe(1)
  })
})

describe('findNearestPaletteIndex', () => {
  it('picks the closest default color', () => {
    expect(findNearestPaletteIndex(0, 0, 0, ['#000000', '#ffffff', '#ff2121'])).toBe(0)
    expect(findNearestPaletteIndex(0xff, 0xff, 0xff, ['#000000', '#ffffff', '#ff2121'])).toBe(1)
    expect(findNearestPaletteIndex(0xff, 0x20, 0x20, ['#000000', '#ffffff', '#ff2121'])).toBe(2)
  })
})
