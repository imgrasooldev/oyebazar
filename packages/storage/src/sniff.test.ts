import { describe, expect, it } from 'vitest'
import { resolveMimeType, sniffMimeType } from './sniff'

/**
 * 🔴 Ye test us jagah ki hifazat karta hai jahan se hamare apne origin par HTML chal
 * sakti thi.
 *
 * Dev mein upload `apps/web/public/_dev-media` mein girti hai aur Next usay
 * localhost:3000 se serve karta hai. Wahan ek "image/jpeg" jo asal mein HTML hai,
 * reseller ki session cookie tak pohanch sakti thi. Is liye qism file ke andar se
 * tay hoti hai — Content-Type se nahi, jo client likhta hai.
 */

/** ISO base-media header: 4 bytes size, phir "ftyp", phir brand. */
function isoHeader(brand: string): Buffer {
  return Buffer.concat([
    Buffer.from([0, 0, 0, 0x20]),
    Buffer.from('ftyp', 'latin1'),
    Buffer.from(brand, 'latin1'),
  ])
}

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const WEBP = Buffer.concat([
  Buffer.from('RIFF', 'latin1'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBP', 'latin1'),
])
const WEBM = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00])
const MP4 = isoHeader('isom')
const MOV = isoHeader('qt  ')

describe('sniffMimeType — asli qism file ke bytes se', () => {
  it('tasveerein pehchanta hai', () => {
    expect(sniffMimeType(JPEG)).toBe('image/jpeg')
    expect(sniffMimeType(PNG)).toBe('image/png')
    expect(sniffMimeType(WEBP)).toBe('image/webp')
  })

  it('video pehchanta hai — MP4 aur iPhone ki MOV dono', () => {
    expect(sniffMimeType(MP4)).toBe('video/mp4')
    expect(sniffMimeType(MOV)).toBe('video/quicktime')
    expect(sniffMimeType(WEBM)).toBe('video/webm')
  })

  it('🔴 HTML ko qubool nahi karta — chahe wo tasveer keh kar aaye', () => {
    expect(sniffMimeType(Buffer.from('<html><script>alert(1)</script>', 'utf8'))).toBeNull()
  })

  it('🔴 SVG bhi nahi — us mein script chal sakti hai', () => {
    expect(sniffMimeType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">', 'utf8'))).toBeNull()
  })

  it('khali ya adhoori file par null', () => {
    expect(sniffMimeType(Buffer.alloc(0))).toBeNull()
    expect(sniffMimeType(Buffer.from([0xff, 0xd8]))).toBeNull()
  })

  it('anjaan ISO brand qubool nahi hota — andaza nahi lagate', () => {
    expect(sniffMimeType(isoHeader('xxxx'))).toBeNull()
  })
})

describe('resolveMimeType — dawe aur haqeeqat ka moqabla', () => {
  it('🔴 "image/jpeg" keh kar HTML bhejne par mana', () => {
    const result = resolveMimeType(Buffer.from('<html>', 'utf8'), 'image/jpeg')
    expect(result).toEqual({ ok: false, reason: 'unsupported' })
  })

  it('🔴 tasveer keh kar video bhejne par mana — hadd qism ke hisab se lagti hai', () => {
    const result = resolveMimeType(MP4, 'image/png')
    expect(result).toEqual({ ok: false, reason: 'mismatch' })
  })

  it('MP4 aur MOV aapas mein chalte hain — browser inhen badal deta hai', () => {
    expect(resolveMimeType(MOV, 'video/mp4')).toEqual({ ok: true, mime: 'video/quicktime' })
    expect(resolveMimeType(MP4, 'video/quicktime')).toEqual({ ok: true, mime: 'video/mp4' })
  })

  it('Content-Type na ho tab bhi chalta hai — faisla file ke bytes ka hai', () => {
    expect(resolveMimeType(JPEG, undefined)).toEqual({ ok: true, mime: 'image/jpeg' })
    expect(resolveMimeType(PNG, 'application/octet-stream')).toEqual({ ok: true, mime: 'image/png' })
  })
})
