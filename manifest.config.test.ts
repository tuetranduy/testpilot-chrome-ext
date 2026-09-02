import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import manifest from './manifest.config'

const iconSizes = [16, 32, 48, 128] as const

function readPngDimensions(path: string) {
  const png = readFileSync(resolve(path))
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}

function readPngCornerAlpha(path: string) {
  const png = readFileSync(resolve(path))
  expect(png[24]).toBe(8)
  expect(png[25]).toBe(6)

  const idatChunks: Buffer[] = []
  let offset = 8
  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.toString('ascii', offset + 4, offset + 8)
    const dataStart = offset + 8
    if (type === 'IDAT') idatChunks.push(png.subarray(dataStart, dataStart + length))
    offset = dataStart + length + 4
  }

  const firstScanline = inflateSync(Buffer.concat(idatChunks))
  return firstScanline[4]
}

describe('extension icon assets', () => {
  it('declares square PNG icons at every Chrome extension size', () => {
    for (const size of iconSizes) {
      const path = `icons/icon-${size}.png`
      expect(manifest.icons?.[size]).toBe(path)
      expect(manifest.action?.default_icon?.[size]).toBe(path)
      expect(readPngDimensions(`public/${path}`)).toEqual({ width: size, height: size })
    }
  })

  it('keeps icon corners transparent in the Chrome toolbar', () => {
    for (const size of iconSizes) {
      expect(readPngCornerAlpha(`public/icons/icon-${size}.png`)).toBe(0)
    }
  })
})
