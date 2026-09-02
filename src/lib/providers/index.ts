import { hasOriginAccess, originPatternFor, requestOriginAccess } from '../permissions'
import type { ProviderConfig, ProviderId } from '../types'
import { anthropicAdapter } from './anthropic'
import { geminiAdapter } from './gemini'
import { localAdapter, normalizeLocalBaseUrl } from './local'
import { openaiAdapter } from './openai'
import type { ChatMessage, ChatOptions, ProviderAdapter } from './types'

export type { ChatMessage, ChatOptions, ProviderAdapter } from './types'
export { ProviderError } from './types'
export { listModels } from './models'

const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
    openai: openaiAdapter,
    gemini: geminiAdapter,
    anthropic: anthropicAdapter,
    local: localAdapter,
}

// Cloud APIs generally send permissive CORS headers, but the extension still
// needs host permission granted to make the request bypass CORS reliably --
// this matters most for local servers (LM Studio, Ollama) whose CORS/preflight
// handling is often inconsistent.
const CLOUD_ORIGIN_PATTERNS: Partial<Record<ProviderId, string>> = {
    openai: 'https://api.openai.com/*',
    gemini: 'https://generativelanguage.googleapis.com/*',
    anthropic: 'https://api.anthropic.com/*',
}

export function getProviderOriginPattern(providerId: ProviderId, config: ProviderConfig): string {
    if (providerId === 'local') return originPatternFor(normalizeLocalBaseUrl(config.baseUrl))
    return CLOUD_ORIGIN_PATTERNS[providerId]!
}

/** Must be called from a user-gesture context (e.g. a button click handler). */
export async function ensureProviderAccess(providerId: ProviderId, config: ProviderConfig): Promise<boolean> {
    const pattern = getProviderOriginPattern(providerId, config)
    if (await hasOriginAccess(pattern)) return true
    return requestOriginAccess(pattern)
}

export function getProviderAdapter(providerId: ProviderId): ProviderAdapter {
    return ADAPTERS[providerId]
}

export async function chatWithProvider(
    providerId: ProviderId,
    config: ProviderConfig,
    messages: ChatMessage[],
    options?: ChatOptions,
): Promise<string> {
    return getProviderAdapter(providerId).chat(messages, config, options)
}
