import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        // Real-scenario tests hit the live internet + a local LLM server; keep them
        // out of the normal offline/CI run. Invoke explicitly: npx vitest run --config vitest.e2e.config.ts
        exclude: ['**/node_modules/**', '**/*.e2e.test.ts'],
    },
})
