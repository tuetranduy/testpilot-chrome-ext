// Shared types used across background, content scripts, and the side panel UI.

export interface ElementSummary {
    id: string // stable synthetic id assigned during scan, used to target fills
    tag: string
    role: string | null
    label: string | null
    type: string | null // input type, or tag-derived type for non-inputs
    name: string | null
    placeholder: string | null
    required: boolean
    pattern: string | null
    maxLength: number | null
    options: string[] | null // <select> option values/labels
    text: string | null // visible text for non-form elements (buttons, links)
    selector: string // CSS selector used to re-locate the element for filling
    visible: boolean
}

export interface WebScanResult {
    source: 'web'
    url: string
    title: string
    scannedAt: number
    elements: ElementSummary[]
    screenshotDataUrl: string | null
}

export interface FigmaNodeSummary {
    id: string
    name: string
    type: string
    text: string | null
    visible: boolean
    componentId: string | null
    interactionTriggers: string[]
    layoutMode: string | null
    width: number | null
    height: number | null
}

export interface FigmaScanResult {
    source: 'figma'
    url: string
    title: string
    scannedAt: number
    fileKey: string
    pageId: string
    pageName: string
    nodeId: string
    nodeName: string
    nodes: FigmaNodeSummary[]
    screenshotDataUrl: string | null
    previewWarning: string | null
}

export type ScanResult = WebScanResult | FigmaScanResult

export interface WebRunLocator {
    source: 'web'
    origin: string
    pathname: string
    url: string
    label: string
}

export interface FigmaRunLocator {
    source: 'figma'
    fileKey: string
    nodeId: string
    url: string
    label: string
}

export type RunLocator = WebRunLocator | FigmaRunLocator

export type TestCaseFormat = 'plain' | 'gherkin'

export interface TestCase {
    id: string
    title: string
    priority: 'High' | 'Medium' | 'Low'
    // Plain format
    steps: string[]
    expectedResult: string
    // Gherkin format
    gherkin: string | null
}

export type ProviderId = 'openai' | 'gemini' | 'anthropic' | 'local'

export interface ProviderConfig {
    apiKey: string
    model: string
    baseUrl: string // used by 'local'; ignored by hosted providers
}

export interface Settings {
    activeProvider: ProviderId
    providers: Record<ProviderId, ProviderConfig>
    figma: {
        personalAccessToken: string
    }
}

export interface RunRecord {
    locator: RunLocator
    updatedAt: number
    lastScan: ScanResult | null
    requirementsText: string
    testCases: TestCase[]
    fieldValues: Record<string, string> // elementId -> generated value, last fill run
}

/** @deprecated Use RunRecord. Retained as a source-compatible alias during migration. */
export type SiteRecord = RunRecord

export const DEFAULT_SETTINGS: Settings = {
    activeProvider: 'openai',
    providers: {
        openai: { apiKey: '', model: 'gpt-4o-mini', baseUrl: '' },
        // "latest" alias auto-tracks the current flash release instead of pinning a model ID that can be retired.
        gemini: { apiKey: '', model: 'gemini-flash-latest', baseUrl: '' },
        anthropic: { apiKey: '', model: 'claude-3-5-sonnet-latest', baseUrl: '' },
        local: { apiKey: '', model: 'llama3', baseUrl: 'http://localhost:11434/v1' },
    },
    figma: { personalAccessToken: '' },
}
