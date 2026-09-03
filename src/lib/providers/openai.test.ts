import { afterEach, describe, expect, it, vi } from 'vitest'
import { openaiAdapter } from './openai'
import { localAdapter } from './local'
import { ProviderError } from './types'
import type { ProviderConfig } from '../types'

const config: ProviderConfig = { apiKey: 'sk-test', model: 'gpt-4o-mini', baseUrl: '' }

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('openaiAdapter', () => {
    it('sends chat-completions request and returns the message content', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'Hello there' } }] }),
        })
        vi.stubGlobal('fetch', fetchMock)

        const result = await openaiAdapter.chat([{ role: 'user', content: 'Hi' }], config)

        expect(result).toBe('Hello there')
        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.openai.com/v1/chat/completions',
            expect.objectContaining({ method: 'POST' }),
        )
    })

    it('throws a ProviderError on a non-ok response', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid api key' }),
        )
        await expect(openaiAdapter.chat([{ role: 'user', content: 'Hi' }], config)).rejects.toThrow(ProviderError)
    })

    it('keeps multiple images in their supplied order', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) })
        vi.stubGlobal('fetch', fetchMock)

        await openaiAdapter.chat([{ role: 'user', content: 'Review' }], config, { images: ['data:image/webp;base64,one', 'data:image/webp;base64,two'] })

        const body = JSON.parse(fetchMock.mock.calls[0][1].body)
        expect(body.messages[0].content.slice(1)).toEqual([
            { type: 'image_url', image_url: { url: 'data:image/webp;base64,one' } },
            { type: 'image_url', image_url: { url: 'data:image/webp;base64,two' } },
        ])
    })
})

describe('localAdapter', () => {
    it('targets the configured base URL', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
        })
        vi.stubGlobal('fetch', fetchMock)

        await localAdapter.chat([{ role: 'user', content: 'Hi' }], { ...config, baseUrl: 'http://localhost:1234/v1' })

        expect(fetchMock).toHaveBeenCalledWith('http://localhost:1234/v1/chat/completions', expect.anything())
    })
})
