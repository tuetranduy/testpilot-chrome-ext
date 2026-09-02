import { ProviderError, type ProviderAdapter } from './types'

export const geminiAdapter: ProviderAdapter = {
    async chat(messages, config, options) {
        const systemMessage = messages.find((m) => m.role === 'system')
        const userMessage = messages.find((m) => m.role === 'user')

        const parts: unknown[] = [{ text: userMessage?.content ?? '' }]
        for (const image of options?.images ?? []) {
            const match = /^data:(.+);base64,(.*)$/.exec(image)
            if (match) parts.push({ inline_data: { mime_type: match[1], data: match[2] } })
        }

        const body = {
            ...(systemMessage ? { systemInstruction: { parts: [{ text: systemMessage.content }] } } : {}),
            contents: [{ role: 'user', parts }],
            generationConfig: { temperature: options?.temperature ?? 0.4 },
        }

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            },
        )

        if (!res.ok) {
            const text = await res.text().catch(() => res.statusText)
            throw new ProviderError('gemini', `Gemini request failed (${res.status}): ${text}`)
        }
        const data = await res.json()
        const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('')
        if (typeof text !== 'string' || !text) throw new ProviderError('gemini', 'Gemini returned an unexpected response shape.')
        return text
    },
} satisfies ProviderAdapter
