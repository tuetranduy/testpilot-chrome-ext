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
})
