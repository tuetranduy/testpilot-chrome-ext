// Orchestrates scanning/filling the active tab. Runs in the side panel
// context, which has direct access to chrome.scripting/chrome.tabs — no
// background relay needed.
import { scanPage } from '../content/scan'
import { fillFields, type FillInstruction } from '../content/fill'
import { hasOriginAccess, originPatternFor, requestOriginAccess } from './permissions'
import type { ScanImage, ScanResult, WebScanResult } from './types'

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

async function captureFullPage(tab: chrome.tabs.Tab): Promise<{ image: ScanImage | null; error: string | null }> {
    const target = { tabId: tab.id! }
    let attached = false
    try {
        await chrome.debugger.attach(target, '1.3')
        attached = true
        const screenshot = await chrome.debugger.sendCommand(target, 'Page.captureScreenshot', {
            format: 'jpeg', quality: 70, captureBeyondViewport: true,
        }) as { data?: string }
        if (!screenshot.data) return { image: null, error: 'Chrome returned an empty full-page screenshot.' }
        return { image: {
            id: `full-page-${Date.now()}`,
            name: 'Full page',
            mimeType: 'image/jpeg',
            width: 0,
            height: 0,
            dataUrl: `data:image/jpeg;base64,${screenshot.data}`,
            role: 'full-page',
        }, error: null }
    } catch (error) {
        return { image: null, error: error instanceof Error ? error.message : 'Could not capture the full-page screenshot.' }
    } finally {
        if (attached) await chrome.debugger.detach(target).catch(() => undefined)
    }
}

export async function scanActiveTab(tab: chrome.tabs.Tab, options: { includeFullPage?: boolean } = {}): Promise<ScanResult> {
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

    const images: WebScanResult['images'] = screenshotDataUrl
        ? [{ id: `viewport-${Date.now()}`, name: 'Page viewport', mimeType: 'image/jpeg', width: 0, height: 0, dataUrl: screenshotDataUrl, role: 'viewport' }]
        : []
    let fullPageCaptureError: string | null = null
    if (options.includeFullPage) {
        const fullPage = await captureFullPage(tab)
        if (fullPage.image) images.push(fullPage.image)
        fullPageCaptureError = fullPage.error
    }

    return {
        source: 'web',
        url: tab.url!,
        title: tab.title ?? tab.url!,
        scannedAt: Date.now(),
        elements,
        images,
        fullPageCaptureError,
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
