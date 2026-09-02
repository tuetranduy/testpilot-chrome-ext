import type { FigmaNodeSummary, FigmaScanResult } from './types'

interface FigmaApiNode {
    id: string
    name: string
    type: string
    visible?: boolean
    characters?: string
    componentId?: string
    interactions?: Array<{ trigger?: { type?: string } }>
    layoutMode?: string
    absoluteBoundingBox?: { width?: number; height?: number }
    children?: FigmaApiNode[]
}

interface FigmaFileResponse {
    name?: string
    editorType?: string
    document?: FigmaApiNode
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface ParsedFigmaUrl {
    fileKey: string
    nodeId: string | null
    url: string
}

export interface FigmaTarget {
    id: string
    name: string
    pageId: string
    pageName: string
    type: string
}

export interface LoadedFigmaTargets {
    parsed: ParsedFigmaUrl
    fileName: string
    targets: FigmaTarget[]
}

const TARGET_TYPES = new Set(['FRAME', 'SECTION', 'COMPONENT', 'COMPONENT_SET'])

export function parseFigmaUrl(raw: string): ParsedFigmaUrl {
    let url: URL
    try {
        url = new URL(raw.trim())
    } catch {
        throw new Error('Enter a valid Figma Design URL.')
    }
    if (!/(^|\.)figma\.com$/i.test(url.hostname)) throw new Error('Enter a valid figma.com Design URL.')
    const [, editorType, fileKey] = url.pathname.split('/')
    if (!['design', 'file', 'proto'].includes(editorType) || !fileKey) {
        throw new Error('Only Figma Design files are supported in this release. FigJam, Slides, and Buzz are not supported.')
    }
    const rawNodeId = url.searchParams.get('node-id')
    return {
        fileKey,
        nodeId: rawNodeId ? rawNodeId.replace(/-/g, ':') : null,
        url: url.toString(),
    }
}

export function extractFigmaTargets(file: FigmaFileResponse): FigmaTarget[] {
    const pages = file.document?.children?.filter((node) => node.type === 'CANVAS') ?? []
    return pages.flatMap((page) => [
        { id: page.id, name: page.name, pageId: page.id, pageName: page.name, type: page.type },
        ...(page.children ?? [])
            .filter((node) => TARGET_TYPES.has(node.type) && node.visible !== false)
            .map((node) => ({ id: node.id, name: node.name, pageId: page.id, pageName: page.name, type: node.type })),
    ])
}

function nodeScore(node: FigmaApiNode): number {
    let score = 0
    if (node.visible === false) score -= 100
    if (node.characters?.trim()) score += 50
    if (node.interactions?.length) score += 45
    if (node.type === 'INSTANCE' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') score += 35
    if (!/^\s*(rectangle|group|frame|vector|line|ellipse)\s*\d*\s*$/i.test(node.name)) score += 15
    if (node.children?.length) score += 5
    return score
}

export function summarizeFigmaNodes(root: FigmaApiNode, limit = 500): FigmaNodeSummary[] {
    const flattened: Array<{ node: FigmaApiNode; order: number }> = []
    function visit(node: FigmaApiNode) {
        flattened.push({ node, order: flattened.length })
        for (const child of node.children ?? []) visit(child)
    }
    visit(root)

    const selected = flattened
        .sort((a, b) => nodeScore(b.node) - nodeScore(a.node) || a.order - b.order)
        .slice(0, limit)
        .sort((a, b) => a.order - b.order)

    return selected.map(({ node }) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        text: node.characters?.trim().slice(0, 240) || null,
        visible: node.visible !== false,
        componentId: node.componentId ?? null,
        interactionTriggers: (node.interactions ?? []).flatMap((interaction) => interaction.trigger?.type ? [interaction.trigger.type] : []),
        layoutMode: node.layoutMode ?? null,
        width: typeof node.absoluteBoundingBox?.width === 'number' ? node.absoluteBoundingBox.width : null,
        height: typeof node.absoluteBoundingBox?.height === 'number' ? node.absoluteBoundingBox.height : null,
    }))
}

function figmaError(status: number): Error {
    if (status === 403) return new Error('Figma access failed. The token may be expired, missing the file_content:read scope, or unable to access this file.')
    if (status === 404) return new Error('Figma could not find this file. Check the URL and confirm the file is shared with the token owner.')
    if (status === 429) return new Error('Figma rate limit reached. Wait a moment, then try again.')
    return new Error(`Figma request failed (${status}). Try again.`)
}

async function fetchFigmaJson<T>(path: string, token: string, fetcher: Fetcher): Promise<T> {
    if (!token.trim()) throw new Error('Add a Figma personal access token in Settings before loading a design.')
    const response = await fetcher(`https://api.figma.com/v1${path}`, {
        headers: { 'X-Figma-Token': token },
    })
    if (!response.ok) throw figmaError(response.status)
    return response.json() as Promise<T>
}

export async function loadFigmaTargets(rawUrl: string, token: string, fetcher: Fetcher = fetch): Promise<LoadedFigmaTargets> {
    const parsed = parseFigmaUrl(rawUrl)
    const file = await fetchFigmaJson<FigmaFileResponse>(`/files/${encodeURIComponent(parsed.fileKey)}?depth=2`, token, fetcher)
    if (file.editorType && file.editorType.toLocaleLowerCase() !== 'figma') {
        throw new Error('Only Figma Design files are supported in this release. FigJam, Slides, and Buzz are not supported.')
    }
    const targets = extractFigmaTargets(file)
    if (targets.length === 0) throw new Error('This Figma file has no pages or top-level design frames to scan.')
    return { parsed, fileName: file.name?.trim() || 'Figma design', targets }
}

function findNode(root: FigmaApiNode | undefined, id: string): FigmaApiNode | null {
    if (!root) return null
    if (root.id === id) return root
    for (const child of root.children ?? []) {
        const match = findNode(child, id)
        if (match) return match
    }
    return null
}

async function responseToDataUrl(response: Response): Promise<string> {
    const blob = await response.blob()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return `data:${blob.type || 'image/png'};base64,${btoa(binary)}`
}

export async function scanFigmaTarget(options: {
    parsed: ParsedFigmaUrl
    target: FigmaTarget
    token: string
    fetcher?: Fetcher
    ensureOriginAccess?: (url: string) => Promise<boolean>
}): Promise<FigmaScanResult> {
    const fetcher = options.fetcher ?? fetch
    const file = await fetchFigmaJson<FigmaFileResponse>(
        `/files/${encodeURIComponent(options.parsed.fileKey)}?ids=${encodeURIComponent(options.target.id)}`,
        options.token,
        fetcher,
    )
    const root = findNode(file.document, options.target.id)
    if (!root) throw new Error('The selected Figma page or frame no longer exists. Reload the design list and choose another target.')

    let screenshotDataUrl: string | null = null
    let previewWarning: string | null = null
    try {
        const rendered = await fetchFigmaJson<{ images?: Record<string, string | null> }>(
            `/images/${encodeURIComponent(options.parsed.fileKey)}?ids=${encodeURIComponent(options.target.id)}&format=png&scale=1`,
            options.token,
            fetcher,
        )
        const imageUrl = rendered.images?.[options.target.id]
        if (!imageUrl) throw new Error('Figma did not return a preview for this target.')
        if (options.ensureOriginAccess && !(await options.ensureOriginAccess(imageUrl))) {
            throw new Error('Permission to download the Figma preview was denied.')
        }
        const imageResponse = await fetcher(imageUrl)
        if (!imageResponse.ok) throw new Error(`Preview download failed (${imageResponse.status}).`)
        screenshotDataUrl = await responseToDataUrl(imageResponse)
    } catch (error) {
        previewWarning = `${error instanceof Error ? error.message : 'Preview unavailable'} The structured design scan is still ready.`
    }

    return {
        source: 'figma',
        url: options.parsed.url,
        title: `${file.name?.trim() || 'Figma design'} — ${options.target.name}`,
        scannedAt: Date.now(),
        fileKey: options.parsed.fileKey,
        pageId: options.target.pageId,
        pageName: options.target.pageName,
        nodeId: options.target.id,
        nodeName: options.target.name,
        nodes: summarizeFigmaNodes(root),
        screenshotDataUrl,
        previewWarning,
    }
}
