import { describe, expect, it, vi } from 'vitest'
import { extractFigmaTargets, loadFigmaTargets, parseFigmaUrl, scanFigmaTarget, summarizeFigmaNodes } from './figma'

describe('parseFigmaUrl', () => {
    it('extracts a file key and selected node from a Figma Design URL', () => {
        expect(parseFigmaUrl('https://www.figma.com/design/AbC123/My-App?node-id=12-34&t=abc')).toEqual({
            fileKey: 'AbC123',
            nodeId: '12:34',
            url: 'https://www.figma.com/design/AbC123/My-App?node-id=12-34&t=abc',
        })
    })

    it('rejects unsupported Figma editor URLs', () => {
        expect(() => parseFigmaUrl('https://www.figma.com/board/AbC123/Workshop')).toThrow(/Figma Design/i)
    })
})

describe('extractFigmaTargets', () => {
    it('groups pages and top-level design targets while keeping pages selectable', () => {
        const targets = extractFigmaTargets({
            document: {
                id: '0:0',
                name: 'Document',
                type: 'DOCUMENT',
                children: [{
                    id: '0:1',
                    name: 'Checkout',
                    type: 'CANVAS',
                    children: [
                        { id: '1:2', name: 'Desktop', type: 'FRAME' },
                        { id: '1:3', name: 'Notes', type: 'TEXT' },
                        { id: '1:4', name: 'Form', type: 'COMPONENT' },
                    ],
                }],
            },
        })

        expect(targets).toEqual([
            { id: '0:1', name: 'Checkout', pageId: '0:1', pageName: 'Checkout', type: 'CANVAS' },
            { id: '1:2', name: 'Desktop', pageId: '0:1', pageName: 'Checkout', type: 'FRAME' },
            { id: '1:4', name: 'Form', pageId: '0:1', pageName: 'Checkout', type: 'COMPONENT' },
        ])
    })
})

describe('summarizeFigmaNodes', () => {
    it('captures relevant design semantics and respects the 500-node cap', () => {
        const children = Array.from({ length: 510 }, (_, index) => ({
            id: `1:${index}`,
            name: index === 509 ? 'Submit button' : `Rectangle ${index}`,
            type: index === 509 ? 'INSTANCE' : 'RECTANGLE',
            visible: true,
            ...(index === 509 ? {
                componentId: '9:9',
                interactions: [{ trigger: { type: 'ON_CLICK' } }],
                absoluteBoundingBox: { width: 120, height: 44 },
            } : {}),
        }))

        const summaries = summarizeFigmaNodes({ id: '0:1', name: 'Page', type: 'CANVAS', children })

        expect(summaries).toHaveLength(500)
        expect(summaries.some((node) => node.name === 'Submit button')).toBe(true)
        expect(summaries.find((node) => node.name === 'Submit button')).toMatchObject({
            componentId: '9:9',
            interactionTriggers: ['ON_CLICK'],
            width: 120,
            height: 44,
        })
    })
})

describe('Figma API', () => {
    it('requires a token and rejects files without selectable design content', async () => {
        await expect(loadFigmaTargets('https://www.figma.com/design/ABC/App', '')).rejects.toThrow(/token/i)
        const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ name: 'Empty', document: { id: '0:0', name: 'Document', type: 'DOCUMENT', children: [] } }), { status: 200 }))
        await expect(loadFigmaTargets('https://www.figma.com/design/ABC/App', 'token', fetcher)).rejects.toThrow(/no pages/i)
    })

    it('rejects non-Design editor content even if a URL looks like a design link', async () => {
        const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ editorType: 'figjam', document: { id: '0:0', name: 'Document', type: 'DOCUMENT', children: [] } }), { status: 200 }))
        await expect(loadFigmaTargets('https://www.figma.com/design/ABC/App', 'token', fetcher)).rejects.toThrow(/FigJam, Slides, and Buzz/i)
    })

    it('explains when the saved token cannot access a file', async () => {
        const fetcher = vi.fn().mockResolvedValue(new Response('forbidden', { status: 403 }))

        await expect(loadFigmaTargets('https://www.figma.com/design/ABC/App', 'expired-token', fetcher)).rejects.toThrow(/expired|scope|access/i)
    })

    it.each([
        [404, /find this file/i],
        [429, /rate limit/i],
    ])('turns Figma status %s into actionable guidance', async (status, message) => {
        const fetcher = vi.fn().mockResolvedValue(new Response('', { status }))
        await expect(loadFigmaTargets('https://www.figma.com/design/ABC/App', 'token', fetcher)).rejects.toThrow(message)
    })

    it('keeps a structured scan when Figma cannot render a preview', async () => {
        const fetcher = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                name: 'Storefront',
                document: {
                    id: '0:0', name: 'Document', type: 'DOCUMENT', children: [{
                        id: '0:1', name: 'Checkout', type: 'CANVAS', children: [{
                            id: '1:2', name: 'Desktop checkout', type: 'FRAME', children: [
                                { id: '1:3', name: 'Pay now', type: 'TEXT', characters: 'Pay now' },
                            ],
                        }],
                    }],
                },
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ images: { '1:2': null } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

        const scan = await scanFigmaTarget({
            parsed: { fileKey: 'ABC', nodeId: null, url: 'https://www.figma.com/design/ABC/App' },
            target: { id: '1:2', name: 'Desktop checkout', pageId: '0:1', pageName: 'Checkout', type: 'FRAME' },
            token: 'token',
            fetcher,
        })

        expect(scan.source).toBe('figma')
        expect(scan.nodes.some((node) => node.text === 'Pay now')).toBe(true)
        expect(scan.images).toEqual([])
        expect(scan.previewWarning).toMatch(/preview/i)
    })
})
