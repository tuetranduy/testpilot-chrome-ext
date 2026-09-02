// Per-origin host permission helpers. We never request <all_urls> upfront;
// access is requested the first time the user scans a given site and persists
// via chrome.permissions until the user revokes it.

export function originPatternFor(url: string): string {
    const u = new URL(url)
    // u.host includes the port (e.g. 127.0.0.1:1234), which matters for local LLM servers.
    return `${u.protocol}//${u.host}/*`
}

export async function hasOriginAccess(originPattern: string): Promise<boolean> {
    return chrome.permissions.contains({ origins: [originPattern] })
}

/** Must be called from a user-gesture context (e.g. a button click handler). */
export async function requestOriginAccess(originPattern: string): Promise<boolean> {
    return chrome.permissions.request({ origins: [originPattern] })
}

export async function listGrantedOrigins(): Promise<string[]> {
    const { origins } = await chrome.permissions.getAll()
    return origins ?? []
}

export async function revokeOriginAccess(originPattern: string): Promise<boolean> {
    return chrome.permissions.remove({ origins: [originPattern] })
}
