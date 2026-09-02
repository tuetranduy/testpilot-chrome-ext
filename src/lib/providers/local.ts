import { openAiCompatibleChat } from './openai'
import type { ProviderAdapter } from './types'

/**
 * Local servers (LM Studio, Ollama, vLLM, etc) are commonly configured with just
 * the host:port shown in their UI (e.g. "http://127.0.0.1:1234"), without the
 * "/v1" suffix their OpenAI-compatible routes actually live under. Normalize so
 * both forms work.
 */
export function normalizeLocalBaseUrl(rawBaseUrl: string): string {
    const trimmed = (rawBaseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '')
    return /\/v1$/.test(trimmed) ? trimmed : `${trimmed}/v1`
}

/** Any OpenAI-compatible local server (Ollama, LM Studio, vLLM, etc). */
export const localAdapter: ProviderAdapter = {
    chat(messages, config, options) {
        return openAiCompatibleChat('local', normalizeLocalBaseUrl(config.baseUrl), config, messages, options)
    },
}
