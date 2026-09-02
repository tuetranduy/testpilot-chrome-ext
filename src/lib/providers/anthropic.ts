import { ProviderError, type ProviderAdapter } from './types'

export const anthropicAdapter: ProviderAdapter = {
    async chat(messages, config, options) {
        const systemMessage = messages.find((m) => m.role === 'system')
        const userMessage = messages.find((m) => m.role === 'user')

        const content: string | unknown[] =
            options?.images && options.images.length > 0
                ? [
                    { type: 'text', text: userMessage?.content ?? '' },
                    ...options.images
                        .map((url) => /^data:(.+);base64,(.*)$/.exec(url))
                        .filter((m): m is RegExpExecArray => m !== null)
                        .map((m) => ({ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } })),
                ]
                : (userMessage?.content ?? '')

        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01',
                // Required for direct calls from a browser/extension context (no proxy server).
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
                model: config.model,
                max_tokens: 4096,
                temperature: options?.temperature ?? 0.4,
                ...(systemMessage ? { system: systemMessage.content } : {}),
                messages: [{ role: 'user', content }],
            }),
        })

        if (!res.ok) {
            const text = await res.text().catch(() => res.statusText)
            throw new ProviderError('anthropic', `Anthropic request failed (${res.status}): ${text}`)
        }
        const data = await res.json()
        const text = data?.content?.map((p: { text?: string }) => p.text ?? '').join('')
        if (typeof text !== 'string' || !text) throw new ProviderError('anthropic', 'Anthropic returned an unexpected response shape.')
        return text
    },
} satisfies ProviderAdapter
