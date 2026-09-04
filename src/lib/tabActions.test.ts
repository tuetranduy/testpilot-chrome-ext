import { afterEach, describe, expect, it, vi } from 'vitest'
import { scanActiveTab } from './tabActions'

describe('scanActiveTab', () => {
    afterEach(() => {
        delete (globalThis as unknown as { chrome?: unknown }).chrome
    })

    it('marks injected DOM scans as web results', async () => {
        ;(globalThis as unknown as { chrome: unknown }).chrome = {
            scripting: { executeScript: vi.fn().mockResolvedValue([{ result: [] }]) },
            tabs: { captureVisibleTab: vi.fn().mockResolvedValue('data:image/jpeg;base64,abc') },
        }

        const result = await scanActiveTab({ id: 1, windowId: 2, url: 'https://example.com/', title: 'Example' } as chrome.tabs.Tab)

        expect(result.source).toBe('web')
    })

    it('adds a captured full-page image when requested', async () => {
        const attach = vi.fn().mockResolvedValue(undefined)
        const detach = vi.fn().mockResolvedValue(undefined)
        const sendCommand = vi.fn().mockResolvedValue({ data: 'full-page-image' })
        ;(globalThis as unknown as { chrome: unknown }).chrome = {
            scripting: { executeScript: vi.fn().mockResolvedValue([{ result: [] }]) },
            tabs: { captureVisibleTab: vi.fn().mockResolvedValue('data:image/jpeg;base64,viewport-image') },
            debugger: { attach, detach, sendCommand },
        }

        const result = await scanActiveTab(
            { id: 1, windowId: 2, url: 'https://example.com/', title: 'Example' } as chrome.tabs.Tab,
            { includeFullPage: true },
        )

        expect(result.images).toEqual([
            expect.objectContaining({ role: 'viewport', dataUrl: 'data:image/jpeg;base64,viewport-image' }),
            expect.objectContaining({ role: 'full-page', dataUrl: 'data:image/jpeg;base64,full-page-image' }),
        ])
        expect(attach).toHaveBeenCalledWith({ tabId: 1 }, '1.3')
        expect(sendCommand).toHaveBeenCalledWith({ tabId: 1 }, 'Page.captureScreenshot', {
            format: 'jpeg', quality: 70, captureBeyondViewport: true,
        })
        expect(detach).toHaveBeenCalledWith({ tabId: 1 })
    })

    it('keeps the viewport scan and reports when full-page capture is unavailable', async () => {
        ;(globalThis as unknown as { chrome: unknown }).chrome = {
            scripting: { executeScript: vi.fn().mockResolvedValue([{ result: [] }]) },
            tabs: { captureVisibleTab: vi.fn().mockResolvedValue('data:image/jpeg;base64,viewport-image') },
            debugger: { attach: vi.fn().mockRejectedValue(new Error('Screenshot capture is restricted by policy.')) },
        }

        const result = await scanActiveTab(
            { id: 1, windowId: 2, url: 'https://example.com/', title: 'Example' } as chrome.tabs.Tab,
            { includeFullPage: true },
        )

        expect(result).toMatchObject({
            images: [expect.objectContaining({ role: 'viewport' })],
            fullPageCaptureError: 'Screenshot capture is restricted by policy.',
        })
    })
})
