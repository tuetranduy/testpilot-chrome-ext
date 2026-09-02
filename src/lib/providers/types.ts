import type { ProviderConfig } from '../types'

export interface ChatMessage {
    role: 'system' | 'user'
    content: string
}

export interface ChatOptions {
    /** Data URLs; only used by providers/models that accept image input. */
    images?: string[]
    /** Sampling temperature override for generation tasks that need more variation. */
    temperature?: number
}

export interface ProviderAdapter {
    chat(messages: ChatMessage[], config: ProviderConfig, options?: ChatOptions): Promise<string>
}

export class ProviderError extends Error {
    providerId: string

    constructor(providerId: string, message: string) {
        super(message)
        this.name = 'ProviderError'
        this.providerId = providerId
    }
}
