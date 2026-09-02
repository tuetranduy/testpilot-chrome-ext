import { describe, expect, it } from 'vitest'
import { buildTestCasePrompt } from './promptTemplates'
import type { FigmaScanResult, WebScanResult } from './types'

const webScan: WebScanResult = {
    source: 'web',
    url: 'https://example.com/checkout',
    title: 'Checkout',
    scannedAt: 1,
    screenshotDataUrl: null,
    elements: [{ id: 'email', tag: 'input', role: null, label: 'Email', type: 'email', name: 'email', placeholder: null, required: true, pattern: null, maxLength: null, options: null, text: null, selector: '#email', visible: true }],
}

const figmaScan: FigmaScanResult = {
    source: 'figma',
    url: 'https://www.figma.com/design/ABC/App',
    title: 'App — Checkout',
    scannedAt: 1,
    fileKey: 'ABC',
    pageId: '0:1',
    pageName: 'Checkout',
    nodeId: '1:2',
    nodeName: 'Desktop',
    nodes: [{ id: '1:3', name: 'Pay now', type: 'TEXT', text: 'Pay now', visible: true, componentId: null, interactionTriggers: [], layoutMode: null, width: 100, height: 20 }],
    screenshotDataUrl: null,
    previewWarning: null,
}

describe('buildTestCasePrompt', () => {
    it('asks for the exact requested web test count and excludes prior titles', () => {
        const prompt = buildTestCasePrompt(webScan, 'Checkout works', 'plain', 7, ['Missing email'])
        expect(prompt.user).toContain('Generate exactly 7')
        expect(prompt.user).toContain('Missing email')
        expect(prompt.user).toContain('Web page elements')
    })

    it('describes imported Figma nodes as a design rather than live DOM elements', () => {
        const prompt = buildTestCasePrompt(figmaScan, '', 'gherkin', 5)
        expect(prompt.system).toContain('Figma design')
        expect(prompt.user).toContain('Figma design nodes')
        expect(prompt.user).toContain('Pay now')
    })
})
