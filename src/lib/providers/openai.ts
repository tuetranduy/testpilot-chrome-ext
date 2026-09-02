import type { ProviderConfig } from '../types'
import { ProviderError, type ChatMessage, type ChatOptions, type ProviderAdapter } from './types'

/** Shared by openai.ts and local.ts — both speak the OpenAI chat-completions schema. */
export async function openAiCompatibleChat(
    providerId: string,
    baseUrl: string,
    config: ProviderConfig,
    messages: ChatMessage[],
    options?: ChatOptions,
): Promise<string> {
    const userMessage = messages.find((m) => m.role === 'user')
    const systemMessage = messages.find((m) => m.role === 'system')

    const body = {
        model: config.model,
        messages: [
            ...(systemMessage ? [{ role: 'system', content: systemMessage.content }] : []),
            {
                role: 'user',
                content:
                    options?.images && options.images.length > 0
                        ? [
                            { type: 'text', text: userMessage?.content ?? '' },
                            ...options.images.map((url) => ({ type: 'image_url', image_url: { url } })),
                        ]
                        : (userMessage?.content ?? ''),
            },
        ],
        temperature: options?.temperature ?? 0.4,
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new ProviderError(providerId, `${providerId} request failed (${res.status}): ${text}`)
    }
    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content
    if (typeof text !== 'string') throw new ProviderError(providerId, `${providerId} returned an unexpected response shape.`)
    return text
}

export const openaiAdapter: ProviderAdapter = {
    chat(messages, config, options) {
        return openAiCompatibleChat('openai', 'https://api.openai.com/v1', config, messages, options)
    },
}
