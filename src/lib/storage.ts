// chrome.storage.local wrapper. Credentials and saved runs stay on this device.
import { DEFAULT_SETTINGS, type RunLocator, type RunRecord, type ScanResult, type Settings } from './types'

const SETTINGS_KEY = 'settings'
const WEB_PREFIX = 'site:'
const FIGMA_PREFIX = 'figma:'

export function runKey(locator: RunLocator): string {
    return locator.source === 'web'
        ? `${WEB_PREFIX}${locator.origin}${locator.pathname}`
        : `${FIGMA_PREFIX}${locator.fileKey}:${locator.nodeId}`
}

function normalizeScan(value: unknown): ScanResult | null {
    if (!value || typeof value !== 'object') return null
    const scan = value as Record<string, unknown>
    if (scan.source === 'figma') return scan as unknown as ScanResult
    return { ...scan, source: 'web' } as unknown as ScanResult
}

export function normalizeStoredRun(value: unknown): RunRecord | null {
    if (!value || typeof value !== 'object') return null
    const record = value as Record<string, unknown>
    if (record.locator && typeof record.locator === 'object') {
        return { ...record, lastScan: normalizeScan(record.lastScan) } as unknown as RunRecord
    }
    if (typeof record.origin !== 'string' || typeof record.pathname !== 'string') return null
    const url = `${record.origin}${record.pathname}`
    const hostname = (() => {
        try { return new URL(record.origin).hostname }
        catch { return record.origin }
    })()
    return {
        locator: {
            source: 'web',
            origin: record.origin,
            pathname: record.pathname,
            url,
            label: `${hostname}${record.pathname || '/'}`,
        },
        updatedAt: typeof record.updatedAt === 'number' ? record.updatedAt : Date.now(),
        lastScan: normalizeScan(record.lastScan),
        requirementsText: typeof record.requirementsText === 'string' ? record.requirementsText : '',
        testCases: Array.isArray(record.testCases) ? record.testCases as RunRecord['testCases'] : [],
        fieldValues: record.fieldValues && typeof record.fieldValues === 'object' ? record.fieldValues as Record<string, string> : {},
    }
}

export async function getSettings(): Promise<Settings> {
    const stored = await chrome.storage.local.get(SETTINGS_KEY)
    const settings = stored[SETTINGS_KEY] as Partial<Settings> | undefined
    if (!settings) return DEFAULT_SETTINGS
    // Merge with defaults so newly-added providers don't come back undefined.
    return {
        ...DEFAULT_SETTINGS,
        ...settings,
        providers: { ...DEFAULT_SETTINGS.providers, ...settings.providers },
        figma: { ...DEFAULT_SETTINGS.figma, ...settings.figma },
    }
}

export async function saveSettings(settings: Settings): Promise<void> {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings })
}

export async function getRunRecord(locator: RunLocator): Promise<RunRecord | null> {
    const key = runKey(locator)
    const stored = await chrome.storage.local.get(key)
    return normalizeStoredRun(stored[key])
}

export async function saveRunRecord(record: RunRecord): Promise<void> {
    await chrome.storage.local.set({ [runKey(record.locator)]: record })
}

export async function deleteRunRecord(locator: RunLocator): Promise<void> {
    await chrome.storage.local.remove(runKey(locator))
}

export async function listRunRecords(): Promise<RunRecord[]> {
    const all = await chrome.storage.local.get(null)
    return Object.entries(all)
        .filter(([key]) => key.startsWith(WEB_PREFIX) || key.startsWith(FIGMA_PREFIX))
        .flatMap(([, value]) => {
            const record = normalizeStoredRun(value)
            return record ? [record] : []
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function emptyRunRecord(locator: RunLocator): RunRecord {
    return {
        locator,
        updatedAt: Date.now(),
        lastScan: null,
        requirementsText: '',
        testCases: [],
        fieldValues: {},
    }
}
