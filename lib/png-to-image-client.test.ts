import { describe, it, expect } from 'vitest'
import { pngToImageDataFromRgba, findNearestPaletteIndex } from './png-to-image-client'

function rgbaData(width: number, height: number, values: number[]) {
  return { width, height, data: new Uint8Array(values) }
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

describe('findNearestPaletteIndex', () => {
  it('picks the closest default color', () => {
    expect(findNearestPaletteIndex(0, 0, 0, ['#000000', '#ffffff', '#ff2121'])).toBe(0)
    expect(findNearestPaletteIndex(0xff, 0xff, 0xff, ['#000000', '#ffffff', '#ff2121'])).toBe(1)
    expect(findNearestPaletteIndex(0xff, 0x20, 0x20, ['#000000', '#ffffff', '#ff2121'])).toBe(2)
  })
})
