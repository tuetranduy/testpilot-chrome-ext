import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSettings, normalizeStoredRun, runKey } from './storage'

afterEach(() => {
    delete (globalThis as unknown as { chrome?: unknown }).chrome
})

describe('runKey', () => {
    it('keeps web keys compatible and creates deterministic Figma keys', () => {
        expect(runKey({ source: 'web', origin: 'https://example.com', pathname: '/checkout', url: 'https://example.com/checkout', label: 'Checkout' }))
            .toBe('site:https://example.com/checkout')
        expect(runKey({ source: 'figma', fileKey: 'ABC', nodeId: '1:2', url: 'https://www.figma.com/design/ABC/App', label: 'Checkout' }))
            .toBe('figma:ABC:1:2')
    })
})

describe('normalizeStoredRun', () => {
    it('loads legacy site records as web runs', () => {
        const normalized = normalizeStoredRun({
            origin: 'https://example.com',
            pathname: '/checkout',
            updatedAt: 10,
            lastScan: null,
            requirementsText: '',
            testCases: [],
            fieldValues: {},
        })

        expect(normalized?.locator).toEqual({
            source: 'web',
            origin: 'https://example.com',
            pathname: '/checkout',
            url: 'https://example.com/checkout',
            label: 'example.com/checkout',
        })
    })
})

describe('getSettings', () => {
    it('adds the Figma default to legacy saved settings', async () => {
        ;(globalThis as unknown as { chrome: unknown }).chrome = {
            storage: { local: { get: vi.fn().mockResolvedValue({ settings: { activeProvider: 'openai' } }) } },
        }

        const settings = await getSettings()

        expect(settings.figma.personalAccessToken).toBe('')
        expect(settings.providers.openai.model).toBeTruthy()
    })
})
