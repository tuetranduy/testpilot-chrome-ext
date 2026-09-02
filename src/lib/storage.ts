// chrome.storage.local wrapper. Settings (incl. API keys) and per-site history
// are kept in storage.local ONLY -- never storage.sync -- so keys never leave
// the device via Chrome account sync.
import { DEFAULT_SETTINGS, type Settings, type SiteRecord } from './types'

const SETTINGS_KEY = 'settings'
const SITE_PREFIX = 'site:'

function siteKey(origin: string, pathname: string): string {
    return `${SITE_PREFIX}${origin}${pathname}`
}

export async function getSettings(): Promise<Settings> {
    const stored = await chrome.storage.local.get(SETTINGS_KEY)
    const settings = stored[SETTINGS_KEY] as Settings | undefined
    if (!settings) return DEFAULT_SETTINGS
    // Merge with defaults so newly-added providers don't come back undefined.
    return {
        ...DEFAULT_SETTINGS,
        ...settings,
        providers: { ...DEFAULT_SETTINGS.providers, ...settings.providers },
    }
}

export async function saveSettings(settings: Settings): Promise<void> {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings })
}

export async function getSiteRecord(origin: string, pathname: string): Promise<SiteRecord | null> {
    const key = siteKey(origin, pathname)
    const stored = await chrome.storage.local.get(key)
    return (stored[key] as SiteRecord | undefined) ?? null
}

export async function saveSiteRecord(record: SiteRecord): Promise<void> {
    const key = siteKey(record.origin, record.pathname)
    await chrome.storage.local.set({ [key]: record })
}

export async function deleteSiteRecord(origin: string, pathname: string): Promise<void> {
    await chrome.storage.local.remove(siteKey(origin, pathname))
}

export async function listSiteRecords(): Promise<SiteRecord[]> {
    const all = await chrome.storage.local.get(null)
    return Object.entries(all)
        .filter(([key]) => key.startsWith(SITE_PREFIX))
        .map(([, value]) => value as SiteRecord)
        .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function emptySiteRecord(origin: string, pathname: string): SiteRecord {
    return {
        origin,
        pathname,
        updatedAt: Date.now(),
        lastScan: null,
        requirementsText: '',
        testCases: [],
        fieldValues: {},
    }
}
