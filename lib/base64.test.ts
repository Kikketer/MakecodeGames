import { describe, it, expect } from 'vitest'
import { bytesToBase64, base64ToBytes } from './base64'

describe('bytesToBase64 / base64ToBytes', () => {
  it('round-trips a known string', () => {
    const str = 'hello world'
    const bytes = new TextEncoder().encode(str)
    const encoded = bytesToBase64(bytes)
    const decoded = base64ToBytes(encoded)
    expect(new TextDecoder().decode(decoded)).toBe(str)
  })

  it('round-trips image jres bytes', () => {
    const bytes = new Uint8Array([0x87, 0x04, 0x10, 0x00, 0x10, 0x00])
    const encoded = bytesToBase64(bytes)
    const decoded = base64ToBytes(encoded)
    expect(decoded).toEqual(bytes)
  })
})
