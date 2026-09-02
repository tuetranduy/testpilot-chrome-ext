import { normalizeLocalBaseUrl } from './local'
import { ProviderError } from './types'
import type { ProviderConfig, ProviderId } from '../types'

async function listOpenAiCompatibleModels(providerId: string, baseUrl: string, config: ProviderConfig): Promise<string[]> {
    const res = await fetch(`${baseUrl}/models`, {
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
    })
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new ProviderError(providerId, `${providerId} model list failed (${res.status}): ${text}`)
    }
    const data = await res.json()
    const ids = (data?.data ?? []).map((m: { id: string }) => m.id)
    return [...ids].sort()
}

async function listGeminiModels(config: ProviderConfig): Promise<string[]> {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(config.apiKey)}`)
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new ProviderError('gemini', `Gemini model list failed (${res.status}): ${text}`)
    }
    const data = await res.json()
    const models = (data?.models ?? []) as { name: string; supportedGenerationMethods?: string[] }[]
    return models
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace(/^models\//, ''))
        .sort()
}

async function listAnthropicModels(config: ProviderConfig): Promise<string[]> {
    const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
    })
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new ProviderError('anthropic', `Anthropic model list failed (${res.status}): ${text}`)
    }
    const data = await res.json()
    const ids = (data?.data ?? []).map((m: { id: string }) => m.id)
    return [...ids].sort()
}

/** Fetches the models currently available for this provider/API key, for populating a picker. */
export async function listModels(providerId: ProviderId, config: ProviderConfig): Promise<string[]> {
    switch (providerId) {
        case 'openai':
            return listOpenAiCompatibleModels('openai', 'https://api.openai.com/v1', config)
        case 'local':
            return listOpenAiCompatibleModels('local', normalizeLocalBaseUrl(config.baseUrl), config)
        case 'gemini':
            return listGeminiModels(config)
        case 'anthropic':
            return listAnthropicModels(config)
    }
}
