import { afterEach, describe, expect, it, vi } from 'vitest'
import { anthropicAdapter } from './anthropic'
import { geminiAdapter } from './gemini'
import type { ProviderConfig } from '../types'

const config: ProviderConfig = { apiKey: 'key', model: 'vision-model', baseUrl: '' }
const images = ['data:image/webp;base64,b25l', 'data:image/png;base64,dHdv']

afterEach(() => vi.unstubAllGlobals())

describe('hosted provider image payloads', () => {
    it('keeps Gemini inline images in supplied order', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }) })
        vi.stubGlobal('fetch', fetchMock)
        await geminiAdapter.chat([{ role: 'user', content: 'Review' }], config, { images })

        const body = JSON.parse(fetchMock.mock.calls[0][1].body)
        expect(body.contents[0].parts.slice(1)).toEqual([
            { inline_data: { mime_type: 'image/webp', data: 'b25l' } },
            { inline_data: { mime_type: 'image/png', data: 'dHdv' } },
        ])
    })

    it('keeps Anthropic image blocks in supplied order', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ content: [{ text: 'ok' }] }) })
        vi.stubGlobal('fetch', fetchMock)
        await anthropicAdapter.chat([{ role: 'user', content: 'Review' }], config, { images })

        const body = JSON.parse(fetchMock.mock.calls[0][1].body)
        expect(body.messages[0].content.slice(1)).toEqual([
            { type: 'image', source: { type: 'base64', media_type: 'image/webp', data: 'b25l' } },
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'dHdv' } },
        ])
    })
})
