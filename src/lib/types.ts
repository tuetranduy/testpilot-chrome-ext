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
    options: SelectOption[] | null // <select> option values and displayed labels
    text: string | null // visible text for non-form elements (buttons, links)
    selector: string // CSS selector used to re-locate the element for filling
    visible: boolean
    context?: ElementContext
}

export interface SelectOption {
    value: string
    label: string
}

export type ElementContext = 'form' | 'main' | 'header' | 'footer' | 'navigation' | 'aside' | 'unknown'

export type ScanImageRole = 'viewport' | 'full-page' | 'figma-preview' | 'upload'

export interface ScanImage {
    id: string
    name: string
    mimeType: string
    width: number
    height: number
    dataUrl: string
    role: ScanImageRole
}

export interface WebScanResult {
    source: 'web'
    url: string
    title: string
    scannedAt: number
    elements: ElementSummary[]
    images: ScanImage[]
    fullPageCaptureError?: string | null
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
    images: ScanImage[]
    previewWarning: string | null
}

export interface ImageScanResult {
    source: 'image'
    title: string
    scannedAt: number
    images: ScanImage[]
}

export type ScanResult = WebScanResult | FigmaScanResult | ImageScanResult

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

export interface ImageRunLocator {
    source: 'image'
    runId: string
    label: string
}

export type RunLocator = WebRunLocator | FigmaRunLocator | ImageRunLocator

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
    visionOverride?: {
        model: string
        supported: boolean
    }
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
