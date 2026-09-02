// Real-scenario integration test: exercises the actual scan/prompt/provider/fill
// pipeline against the live raynatours.com page and a live local LLM (LM Studio).
// Not part of the offline unit-test suite -- run explicitly:
//   npx vitest run --config vitest.e2e.config.ts
import { beforeAll, describe, expect, it } from 'vitest'
import type { FillInstruction } from '../content/fill'
import { fillFields } from '../content/fill'
import { scanPage } from '../content/scan'
import { parseJsonResponse } from '../lib/aiJson'
import { buildTestCasePrompt, buildTestDataPrompt } from '../lib/promptTemplates'
import { chatWithProvider } from '../lib/providers'
import type { ElementSummary, ProviderConfig, TestCase, WebScanResult } from '../lib/types'

const TARGET_URL = 'https://www.raynatours.com/'
const LOCAL_CONFIG: ProviderConfig = { apiKey: '', model: 'openai/gpt-oss-20b', baseUrl: 'http://127.0.0.1:1234' }

let elements: ElementSummary[]
// A real link-heavy marketing page can scan to 700+ elements; a local 20B model can't
// reasonably process that much context. Cap what we send, same as a user would by
// scanning a focused region rather than dumping an entire page's nav/footer links.
function promptElements(all: ElementSummary[]): ElementSummary[] {
    const formFields = all.filter((e) => ['input', 'textarea', 'select'].includes(e.tag))
    const rest = all.filter((e) => !['input', 'textarea', 'select'].includes(e.tag)).slice(0, 20)
    return [...formFields, ...rest]
}

describe('real scenario: raynatours.com + local LM Studio (openai/gpt-oss-20b)', () => {
    beforeAll(async () => {
        const res = await fetch(TARGET_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        const html = await res.text()
        document.open()
        document.write(html)
        document.close()
    })

    it('scans the real page and finds interactive elements', () => {
        elements = scanPage()
        expect(elements.length).toBeGreaterThan(0)
        expect(elements.some((e) => e.tag === 'a' || e.tag === 'button')).toBe(true)
        // jsdom has no real layout engine (getBoundingClientRect is always zero-size), so
        // scanPage()'s `visible` flag is meaningless here. Correct it to reflect what a real
        // browser would report, since buildTestCasePrompt/buildTestDataPrompt filter on it.
        elements = elements.map((e) => ({ ...e, visible: true }))
    })

    it('generates manual test cases via the real local LLM', async () => {
        const scan: WebScanResult = {
            source: 'web',
            url: TARGET_URL,
            title: 'Rayna Tours',
            scannedAt: Date.now(),
            screenshotDataUrl: null,
            elements: promptElements(elements),
        }
        const { system, user } = buildTestCasePrompt(
            scan,
            'User can search for a tour or activity by destination and view results.',
            'plain',
            10,
        )
        const text = await chatWithProvider('local', LOCAL_CONFIG, [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ])
        const testCases = parseJsonResponse<TestCase[]>(text)
        expect(Array.isArray(testCases)).toBe(true)
        expect(testCases.length).toBeGreaterThan(0)
        expect(testCases[0]).toHaveProperty('title')
        expect(testCases[0]).toHaveProperty('steps')
        expect(testCases[0]).toHaveProperty('expectedResult')
    })

    it('generates test data via the real local LLM and applies it with fillFields', async () => {
        // jsdom has no real layout engine (getBoundingClientRect is always zero-size), so the
        // `visible` flag scanPage() computes is meaningless here -- ignore it for this check.
        const formFields = elements.filter((e) => ['input', 'textarea', 'select'].includes(e.tag))
        // Static (unrendered) HTML may have few or no visible form fields; skip gracefully if so.
        if (formFields.length === 0) return

        const { system, user } = buildTestDataPrompt(promptElements(elements))
        const text = await chatWithProvider('local', LOCAL_CONFIG, [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ])
        const values = parseJsonResponse<{ id: string; value: string }[]>(text)
        expect(Array.isArray(values)).toBe(true)

        const instructions: FillInstruction[] = values
            .map((v) => {
                const field = formFields.find((f) => f.id === v.id)
                return field ? { selector: field.selector, value: v.value, type: field.type } : null
            })
            .filter((i): i is FillInstruction => i !== null)

        const filled = fillFields(instructions)
        expect(filled).toBeGreaterThan(0)
    })
})
