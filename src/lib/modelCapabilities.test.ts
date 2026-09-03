import { describe, expect, it } from 'vitest'
import { getVisionCapability, visionCapabilityLabel } from './modelCapabilities'
import type { ProviderConfig } from './types'

function config(model: string, visionOverride?: ProviderConfig['visionOverride']): ProviderConfig {
    return { apiKey: '', model, baseUrl: '', visionOverride }
}

describe('model vision capability', () => {
    it('recognizes supported hosted vision model families', () => {
        expect(getVisionCapability('openai', config('gpt-4o-mini'))).toBe('vision')
        expect(getVisionCapability('openai', config('gpt-5-mini'))).toBe('vision')
        expect(getVisionCapability('gemini', config('gemini-flash-latest'))).toBe('vision')
        expect(getVisionCapability('anthropic', config('claude-3-5-sonnet-latest'))).toBe('vision')
    })

    it('distinguishes known text-only families from unknown models', () => {
        expect(getVisionCapability('openai', config('gpt-3.5-turbo'))).toBe('text')
        expect(getVisionCapability('openai', config('o1-mini'))).toBe('text')
        expect(getVisionCapability('openai', config('o1-preview'))).toBe('text')
        expect(getVisionCapability('openai', config('o1-preview-2024-09-12'))).toBe('text')
        expect(getVisionCapability('openai', config('o3-mini'))).toBe('text')
        expect(getVisionCapability('anthropic', config('claude-2.1'))).toBe('text')
        expect(getVisionCapability('local', config('llama3'))).toBe('unknown')
        expect(getVisionCapability('openai', config('future-model'))).toBe('unknown')
    })

    it('recognizes GPT-4 Turbo as vision-capable', () => {
        expect(getVisionCapability('openai', config('gpt-4-turbo'))).toBe('vision')
        expect(getVisionCapability('openai', config('gpt-4-turbo-preview'))).toBe('vision')
    })

    it('uses an override only when it belongs to the current model', () => {
        expect(getVisionCapability('local', config('llava', { model: 'llava', supported: true }))).toBe('vision')
        expect(getVisionCapability('local', config('other', { model: 'llava', supported: true }))).toBe('unknown')
    })

    it('provides user-facing labels for every capability state', () => {
        expect(visionCapabilityLabel('vision')).toBe('Vision')
        expect(visionCapabilityLabel('text')).toBe('Text only')
        expect(visionCapabilityLabel('unknown')).toBe('Vision unknown')
    })
})
