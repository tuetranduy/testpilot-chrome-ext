import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSettings, listRunRecords, normalizeStoredRun, runKey } from './storage'

afterEach(() => {
    delete (globalThis as unknown as { chrome?: unknown }).chrome
})

describe('runKey', () => {
    it('keeps web keys compatible and creates deterministic Figma keys', () => {
        expect(runKey({ source: 'web', origin: 'https://example.com', pathname: '/checkout', url: 'https://example.com/checkout', label: 'Checkout' }))
            .toBe('site:https://example.com/checkout')
        expect(runKey({ source: 'figma', fileKey: 'ABC', nodeId: '1:2', url: 'https://www.figma.com/design/ABC/App', label: 'Checkout' }))
            .toBe('figma:ABC:1:2')
        expect(runKey({ source: 'image', runId: 'run-123', label: 'Checkout screens' }))
            .toBe('image:run-123')
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

    it('migrates a legacy screenshot into the ordered image collection', () => {
        const normalized = normalizeStoredRun({
            locator: { source: 'web', origin: 'https://example.com', pathname: '/', url: 'https://example.com/', label: 'Example' },
            updatedAt: 10,
            lastScan: { source: 'web', url: 'https://example.com/', title: 'Example', scannedAt: 10, elements: [], screenshotDataUrl: 'data:image/jpeg;base64,abc' },
            requirementsText: '', testCases: [], fieldValues: {},
        })

        expect(normalized?.lastScan?.images).toEqual([expect.objectContaining({ role: 'viewport', dataUrl: 'data:image/jpeg;base64,abc' })])
        expect(normalized?.lastScan).not.toHaveProperty('screenshotDataUrl')
    })

    it('migrates a legacy Figma preview with its design role', () => {
        const normalized = normalizeStoredRun({
            locator: { source: 'figma', fileKey: 'ABC', nodeId: '1:2', url: 'https://www.figma.com/design/ABC/App', label: 'Checkout' },
            updatedAt: 10,
            lastScan: { source: 'figma', title: 'Checkout', scannedAt: 10, fileKey: 'ABC', pageId: '0:1', pageName: 'Page', nodeId: '1:2', nodeName: 'Checkout', nodes: [], screenshotDataUrl: 'data:image/png;base64,abc', previewWarning: null },
            requirementsText: '', testCases: [], fieldValues: {},
        })

        expect(normalized?.lastScan?.images).toEqual([expect.objectContaining({ role: 'figma-preview', mimeType: 'image/png' })])
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

describe('listRunRecords', () => {
    it('includes persisted image runs in history', async () => {
        const record = {
            locator: { source: 'image', runId: 'images-1', label: 'Checkout.png' },
            updatedAt: 10,
            lastScan: { source: 'image', title: 'Checkout.png', scannedAt: 10, images: [] },
            requirementsText: '', testCases: [], fieldValues: {},
        }
        ;(globalThis as unknown as { chrome: unknown }).chrome = {
            storage: { local: { get: vi.fn().mockResolvedValue({ 'image:images-1': record, settings: {} }) } },
        }

        expect(await listRunRecords()).toEqual([record])
    })
})
