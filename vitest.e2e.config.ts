import { defineConfig } from 'vitest/config'

// Runs the real-scenario integration tests (live internet + local LLM server).
// Usage: npx vitest run --config vitest.e2e.config.ts
export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        include: ['**/*.e2e.test.ts'],
        testTimeout: 60_000,
        hookTimeout: 60_000,
    },
})
