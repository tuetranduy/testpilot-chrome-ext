import { afterEach, describe, expect, it, vi } from 'vitest'
import { imageRunLabel, normalizeImageFile, normalizedDimensions, validateImageSelection } from './images'

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

function file(name: string, type: string, size: number) {
    return { name, type, size } as File
}

describe('image utilities', () => {
    it('accepts at most five PNG, JPEG, or WebP images up to 10 MB each', () => {
        expect(() => validateImageSelection([file('screen.png', 'image/png', 100)], 4)).not.toThrow()
        expect(() => validateImageSelection([file('screen.gif', 'image/gif', 100)])).toThrow(/PNG, JPEG, or WebP/)
        expect(() => validateImageSelection([file('large.png', 'image/png', 10 * 1024 * 1024 + 1)])).toThrow(/10 MB/)
        expect(() => validateImageSelection([file('sixth.png', 'image/png', 100)], 5)).toThrow(/up to 5/)
    })

    it('limits the longest edge to 2048 pixels without upscaling', () => {
        expect(normalizedDimensions(4096, 2048)).toEqual({ width: 2048, height: 1024 })
        expect(normalizedDimensions(800, 600)).toEqual({ width: 800, height: 600 })
        expect(normalizedDimensions(1, 5000)).toEqual({ width: 1, height: 2048 })
    })

    it('labels an image run from the first filename and remaining count', () => {
        expect(imageRunLabel(['Checkout.png'])).toBe('Checkout.png')
        expect(imageRunLabel(['Checkout.png', 'Error.png', 'Mobile.png'])).toBe('Checkout.png + 2 more')
    })

    it('decodes, resizes, and encodes uploads as bounded WebP images', async () => {
        class MockReader {
            result: string | null = null
            onload: null | (() => void) = null
            onerror: null | (() => void) = null
            readAsDataURL() { this.result = 'data:image/png;base64,source'; this.onload?.() }
        }
        class MockImage {
            naturalWidth = 4096
            naturalHeight = 2048
            onload: null | (() => void) = null
            onerror: null | (() => void) = null
            set src(_value: string) { this.onload?.() }
        }
        vi.stubGlobal('FileReader', MockReader)
        vi.stubGlobal('Image', MockImage)
        const drawImage = vi.fn()
        const createElement = document.createElement.bind(document)
        vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => tag === 'canvas'
            ? { width: 0, height: 0, getContext: () => ({ drawImage }), toDataURL: () => 'data:image/webp;base64,AAAA' } as unknown as HTMLCanvasElement
            : createElement(tag)) as typeof document.createElement)

        const result = await normalizeImageFile(file('Checkout.png', 'image/png', 100), 'upload')

        expect(result).toEqual(expect.objectContaining({ name: 'Checkout.png', mimeType: 'image/webp', width: 2048, height: 1024, role: 'upload' }))
        expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2048, 1024)
    })

    it('reduces dimensions when quality reduction alone cannot meet the 2 MB limit', async () => {
        class MockReader {
            result: string | null = null
            onload: null | (() => void) = null
            onerror: null | (() => void) = null
            readAsDataURL() { this.result = 'data:image/png;base64,source'; this.onload?.() }
        }
        class MockImage {
            naturalWidth = 2048
            naturalHeight = 2048
            onload: null | (() => void) = null
            onerror: null | (() => void) = null
            set src(_value: string) { this.onload?.() }
        }
        vi.stubGlobal('FileReader', MockReader)
        vi.stubGlobal('Image', MockImage)
        const oversized = `data:image/webp;base64,${'A'.repeat(2_796_204)}`
        const canvas = {
            width: 0,
            height: 0,
            getContext: () => ({ drawImage: vi.fn() }),
            toDataURL: () => canvas.width > 1024 ? oversized : 'data:image/webp;base64,AAAA',
        } as unknown as HTMLCanvasElement
        const createElement = document.createElement.bind(document)
        vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => tag === 'canvas' ? canvas : createElement(tag)) as typeof document.createElement)

        const result = await normalizeImageFile(file('Detailed.png', 'image/png', 100), 'upload')

        expect(result.width).toBeLessThanOrEqual(1024)
        expect(result.height).toBeLessThanOrEqual(1024)
        expect(result.dataUrl).toBe('data:image/webp;base64,AAAA')
    })
})
