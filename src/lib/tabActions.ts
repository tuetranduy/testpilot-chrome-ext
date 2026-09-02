// Orchestrates scanning/filling the active tab. Runs in the side panel
// context, which has direct access to chrome.scripting/chrome.tabs — no
// background relay needed.
import { scanPage } from '../content/scan'
import { fillFields, type FillInstruction } from '../content/fill'
import { hasOriginAccess, originPatternFor, requestOriginAccess } from './permissions'
import type { ScanResult, WebScanResult } from './types'

export async function getActiveTab(): Promise<chrome.tabs.Tab> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url) throw new Error('No active tab found.')
    return tab
}

/** Must be invoked from a user gesture (button click) so the permission prompt can appear. */
export async function ensureActiveTabAccess(tab: chrome.tabs.Tab): Promise<boolean> {
    const pattern = originPatternFor(tab.url!)
    if (await hasOriginAccess(pattern)) return true
    return requestOriginAccess(pattern)
}

export async function scanActiveTab(tab: chrome.tabs.Tab): Promise<ScanResult> {
    const [injection] = await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        func: scanPage,
    })
    const elements = (injection?.result ?? []) as WebScanResult['elements']

    let screenshotDataUrl: string | null = null
    try {
        screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 70 })
    } catch {
        // Capture can fail (e.g. chrome:// pages); scanning still succeeds without it.
        screenshotDataUrl = null
    }

    return {
        source: 'web',
        url: tab.url!,
        title: tab.title ?? tab.url!,
        scannedAt: Date.now(),
        elements,
        screenshotDataUrl,
    }
}

export async function fillActiveTab(tab: chrome.tabs.Tab, instructions: FillInstruction[]): Promise<number> {
    const [injection] = await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        func: fillFields,
        args: [instructions],
    })
    return (injection?.result as number | undefined) ?? 0
}
