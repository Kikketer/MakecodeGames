import { describe, it, expect } from 'vitest'
import {
  imageLiteralToBitmap,
  bitmapToImageLiteral,
  bitmapDataToJresData,
  jresDataToImageLiteral,
  jresDataToBitmapData,
  f4EncodeImgToBytes,
  hexToBitmap,
  DEFAULT_PALETTE,
  HEX_CHARS,
  sliceSpriteSheet,
  formatImageArray,
  formatAnimationStarter,
} from './makecode-image'

const CAR_SHOW_ANGLE_LITERAL = `img\`
.......................
.......................
.......................
.......................
.......................
.......................
............bbbbbbbb...
.........bbbbbbbbbbbb..
........555555b55b555b.
.......5555555b55b555bb
....bbbbb55555bbbbb333b
.bbbbbbbbbbbbb33333bbbb
.eebbbbbbb3333333bbff..
.eeeebb3333333bbb..ff..
..eeeee333ff3b.........
.....eebbffff..........
..........ff...........
.......................
.......................
.......................
.......................
.......................
.......................
\``

describe('imageLiteralToBitmap', () => {
  it('parses the CarShowAngle img literal', () => {
    const { width, height, pixels } = imageLiteralToBitmap(CAR_SHOW_ANGLE_LITERAL)
    expect(width).toBe(23)
    expect(height).toBe(23)
    expect(pixels).toBeInstanceOf(Uint8Array)
    expect(pixels.length).toBe(23 * 23)
  })

  it('maps characters to the correct palette indices', () => {
    const { width, height, pixels } = imageLiteralToBitmap(`img\`
.b1T2N3n4G5g6789
. # t n g
\``)
    expect(width).toBe(16)
    expect(height).toBe(2)
    expect(pixels[0]).toBe(0)
    expect(pixels[1]).toBe(11)
    expect(pixels[2]).toBe(1)
    expect(pixels[3]).toBe(2)
    expect(pixels[4]).toBe(2)
    expect(pixels[5]).toBe(4)
    expect(pixels[6]).toBe(3)
    expect(pixels[7]).toBe(5)
    expect(pixels[8]).toBe(4)
    expect(pixels[9]).toBe(6)
    expect(pixels[10]).toBe(5)
    expect(pixels[11]).toBe(7)
    expect(pixels[12]).toBe(6)
    expect(pixels[13]).toBe(7)
    expect(pixels[14]).toBe(8)
    expect(pixels[15]).toBe(9)
    expect(pixels[width]).toBe(0)
    expect(pixels[width + 1]).toBe(1)
    expect(pixels[width + 2]).toBe(3)
    expect(pixels[width + 3]).toBe(5)
    expect(pixels[width + 4]).toBe(7)
  })

  it('handles ragged rows', () => {
    const { width, height, pixels } = imageLiteralToBitmap(`img\`
123
45
\``)
    expect(width).toBe(3)
    expect(height).toBe(2)
    expect(pixels).toEqual(new Uint8Array([1, 2, 3, 4, 5, 0]))
  })
})

describe('bitmapToImageLiteral', () => {
  it('round-trips a small image', () => {
    const { width, height, pixels } = imageLiteralToBitmap(`img\`
. 1 2
3 4 5
\``)
    const literal = bitmapToImageLiteral(pixels, width, height)
    const roundTrip = imageLiteralToBitmap(literal)
    expect(roundTrip.width).toBe(width)
    expect(roundTrip.height).toBe(height)
    expect(roundTrip.pixels).toEqual(pixels)
  })

  it('uses compact output without spaces for images over 300 pixels', () => {
    const pixels = new Uint8Array(23 * 23)
    pixels[24] = 11
    const literal = bitmapToImageLiteral(pixels, 23, 23)
    expect(literal).toContain('b')
    expect(literal).not.toContain('b ')
  })

  it('uses spaces for images up to 300 pixels', () => {
    const pixels = new Uint8Array(16)
    pixels[0] = 1
    const literal = bitmapToImageLiteral(pixels, 4, 4)
    expect(literal).toContain('1 ')
  })
})

describe('f4EncodeImgToBytes', () => {
  it('produces a 23x23 all-zero image with the correct size', () => {
    const bytes = f4EncodeImgToBytes(23, 23, 4, () => 0)
    expect(bytes[0]).toBe(0x87)
    expect(bytes[1]).toBe(0x04)
    expect(bytes[2]).toBe(23)
    expect(bytes[4]).toBe(23)
    expect(bytes.length).toBe(284)
  })

  it('produces a 1x1 image with the correct size', () => {
    const bytes = f4EncodeImgToBytes(1, 1, 4, () => 0)
    expect(bytes.length).toBe(12)
  })
})

describe('jres encode/decode round-trip', () => {
  it('round-trips the CarShowAngle literal', () => {
    const { width, height, pixels } = imageLiteralToBitmap(CAR_SHOW_ANGLE_LITERAL)
    const data = bitmapDataToJresData(pixels, width, height)
    const literal = jresDataToImageLiteral(data)
    const roundTrip = imageLiteralToBitmap(literal)
    expect(roundTrip.width).toBe(width)
    expect(roundTrip.height).toBe(height)
    expect(roundTrip.pixels).toEqual(pixels)
  })

  it('decodes a known jres data string to the expected dimensions', () => {
    const data = 'hwQXABcAAAAAAAAAAAAAAAAAAAAAAAAAALDuAAAAAAAAAAAAALDuDgAAAAAAAAAAALDrDgAAAAAAAAAAALvrDgAAAAAAAAAAALu77gAAAAAAAAAAULs7swAAAAAAAAAAVbs7swAAAAAAAACwVbU78wAAAAAAAACwVbUz/w8AAAAAAACwVbUz/w8AAAAAAAC7VbUz8wAAAAAAAAC7VbUzCwAAAAAAAAC7uzuzAAAAAAAAAAC7VTuzAAAAAAAAAAC7VTuzAAAAAAAAAAC7uzsLAAAAAAAAAAC7VTsLAAAAAAAAAAC7VbP/AAAAAAAAAACwVbP/AAAAAAAAAAAAu7MAAAAAAAAAAAAAsLsAAAAAAAA='
    const { width, height } = jresDataToBitmapData(data)
    expect(width).toBe(23)
    expect(height).toBe(23)
  })
})

describe('hexToBitmap', () => {
  it('decodes a 23x23 all-zero image', () => {
    const hex = f4EncodeImgToBytes(23, 23, 4, () => 0).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')
    const { width, height, pixels } = hexToBitmap(hex)
    expect(width).toBe(23)
    expect(height).toBe(23)
    expect(pixels).toEqual(new Uint8Array(23 * 23))
  })
})

describe('HEX_CHARS and DEFAULT_PALETTE', () => {
  it('has 16 compact hex characters', () => {
    expect(HEX_CHARS).toHaveLength(16)
    expect(HEX_CHARS).toEqual(['.', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('has the default MakeCode Arcade palette', () => {
    expect(DEFAULT_PALETTE).toHaveLength(16)
    expect(DEFAULT_PALETTE[0]).toBe('#000000')
    expect(DEFAULT_PALETTE[1]).toBe('#ffffff')
  })
})

describe('sliceSpriteSheet', () => {
  it('slices a horizontal strip of sprites', () => {
    const fullWidth = 4
    const fullHeight = 2
    const pixels = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    const frames = sliceSpriteSheet(pixels, fullWidth, fullHeight, 2, 1, 2)
    expect(frames).toHaveLength(2)
    expect(frames[0]).toEqual(new Uint8Array([1, 2]))
    expect(frames[1]).toEqual(new Uint8Array([3, 4]))
  })

  it('slices a grid of sprites in row-major order', () => {
    const fullWidth = 4
    const fullHeight = 2
    const pixels = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    const frames = sliceSpriteSheet(pixels, fullWidth, fullHeight, 2, 2, 2)
    expect(frames).toHaveLength(2)
    expect(frames[0]).toEqual(new Uint8Array([1, 2, 5, 6]))
    expect(frames[1]).toEqual(new Uint8Array([3, 4, 7, 8]))
  })

  it('throws when the sprite count exceeds the image bounds', () => {
    const pixels = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    expect(() => sliceSpriteSheet(pixels, 4, 2, 2, 2, 3)).toThrow(/does not fit/)
  })

  it('throws for non-positive dimensions', () => {
    const pixels = new Uint8Array([1, 2, 3, 4])
    expect(() => sliceSpriteSheet(pixels, 2, 2, 0, 1, 1)).toThrow(/Sprite width must be a positive integer/)
    expect(() => sliceSpriteSheet(pixels, 2, 2, 1, -1, 1)).toThrow(/Sprite height must be a positive integer/)
    expect(() => sliceSpriteSheet(pixels, 2, 2, 1, 1, 0)).toThrow(/Sprite count must be a positive integer/)
  })

  it('throws when the sprite width is larger than the image width', () => {
    const pixels = new Uint8Array([1, 2, 3, 4])
    expect(() => sliceSpriteSheet(pixels, 2, 2, 4, 1, 1)).toThrow(/larger than the image width/)
  })
})

describe('formatImageArray', () => {
  it('wraps frames in a const output array', () => {
    const pixels = new Uint8Array([1])
    const frame = bitmapToImageLiteral(pixels, 1, 1)
    const output = formatImageArray([frame, frame])
    expect(output).toContain('const output = [')
    expect(output).toContain(']')
    expect(output).toContain('img`')
  })
})

describe('formatAnimationStarter', () => {
  it('wraps frames in sprites.create and animation.runImageAnimation', () => {
    const pixels = new Uint8Array([1])
    const frame = bitmapToImageLiteral(pixels, 1, 1)
    const output = formatAnimationStarter([frame, frame])
    expect(output).toContain('sprites.create(')
    expect(output).toContain('SpriteKind.Player')
    expect(output).toContain('let argvs = [')
    expect(output).toContain('animation.runImageAnimation(')
  })
})
