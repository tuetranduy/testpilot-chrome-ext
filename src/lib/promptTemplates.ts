import type { ElementSummary, ScanResult, TestCaseFormat } from './types'

function summarizeElements(elements: ElementSummary[]) {
    // Only send fields the model needs; keeps prompts small and avoids leaking page text unnecessarily.
    return JSON.stringify(
        elements
            .filter((e) => e.visible)
            .map((e) => ({
                id: e.id,
                tag: e.tag,
                type: e.type,
                role: e.role,
                label: e.label,
                name: e.name,
                placeholder: e.placeholder,
                required: e.required,
                pattern: e.pattern,
                maxLength: e.maxLength,
                options: e.options,
                text: e.text,
            })),
        null,
        2,
    )
}

const TEST_CASE_SCHEMA = `type TestCase = {
  id: string
  title: string
  priority: "High" | "Medium" | "Low"
  steps: string[]        // short imperative steps
  expectedResult: string // one sentence
  gherkin: string | null // "Given ...\\nWhen ...\\nThen ..." or null
}
type Response = TestCase[]`

function summarizeFigmaNodes(scan: Extract<ScanResult, { source: 'figma' }>) {
    return JSON.stringify(scan.nodes.filter((node) => node.visible), null, 2)
}

export function buildTestCasePrompt(
    scan: ScanResult,
    requirementsText: string,
    format: TestCaseFormat,
    requestedCount: number,
    excludedTitles: string[] = [],
) {
    const sourceDescription = scan.source === 'figma' ? 'an imported Figma design' : 'a scanned live web page'
    const system = `You are a senior QA engineer writing manual test cases from ${sourceDescription} and optional requirements/acceptance criteria. Respond ONLY with strict JSON matching this TypeScript type — no markdown fences, no commentary:\n\n${TEST_CASE_SCHEMA}`
    const formatNote =
        format === 'gherkin'
            ? 'Populate "gherkin" with a full Given/When/Then scenario for each case; "steps" and "expectedResult" may be brief summaries.'
            : 'Populate "steps" as short imperative steps and "expectedResult" as one sentence; leave "gherkin" null.'
    const sourceLabel = scan.source === 'figma' ? 'Figma design nodes' : 'Web page elements'
    const sourceJson = scan.source === 'figma' ? summarizeFigmaNodes(scan) : summarizeElements(scan.elements)
    const exclusions = excludedTitles.length > 0
        ? `\n\nDo not repeat these previously generated test-case titles or equivalent scenarios:\n${excludedTitles.map((title) => `- ${title}`).join('\n')}`
        : ''
    const user = `${sourceLabel} (JSON):\n${sourceJson}\n\nRequirements / Acceptance Criteria:\n${requirementsText.trim() || '(none provided — infer sensible test cases from the UI alone)'
        }${exclusions}\n\nGenerate exactly ${requestedCount} unique test cases covering the happy path, validation errors, and edge cases. ${formatNote}`
    return { system, user }
}

const TEST_DATA_SCHEMA = `type FieldValue = { id: string; value: string }
type Response = FieldValue[]`

export function buildTestDataPrompt(
    elements: ElementSummary[],
    variationToken = '',
    previousValues: Record<string, string> = {},
) {
    const formFields = elements.filter((e) => ['input', 'textarea', 'select'].includes(e.tag) && e.visible)
    const system = `You are a QA test-data generation assistant. Given form fields and their constraints, generate realistic, valid sample values. Respond ONLY with strict JSON matching this TypeScript type — no markdown fences, no commentary:\n\n${TEST_DATA_SCHEMA}`
    const previous = Object.keys(previousValues).length > 0 ? JSON.stringify(previousValues, null, 2) : '(none)'
    const variation = variationToken || 'fresh-generation'
    const user = `Generation variation token: ${variation}\nPrevious generated values (avoid reusing these when valid alternatives exist):\n${previous}\n\nForm fields (JSON):\n${summarizeElements(formFields)}\n\nGenerate exactly one fresh value per field "id", respecting its type/pattern/required/maxLength/options constraints. Prefer values that differ from the previous generated values. For "select" fields, choose one of the given "options" verbatim. For checkboxes/radios use "true" or "false".`
    return { system, user }
}
