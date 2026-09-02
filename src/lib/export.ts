import type { TestCase } from './types'

export function toMarkdown(testCases: TestCase[]): string {
    return testCases
        .map((tc, i) => {
            const parts = [`### ${i + 1}. ${tc.title} (${tc.priority})`]
            if (tc.steps.length > 0) {
                parts.push('**Steps:**', ...tc.steps.map((s, idx) => `${idx + 1}. ${s}`))
            }
            if (tc.expectedResult) parts.push(`**Expected Result:** ${tc.expectedResult}`)
            if (tc.gherkin) parts.push('**Gherkin:**', '```gherkin', tc.gherkin, '```')
            return parts.join('\n')
        })
        .join('\n\n')
}

function csvEscape(value: string): string {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
    return value
}

export function toCsv(testCases: TestCase[]): string {
    const header = ['ID', 'Title', 'Priority', 'Steps', 'Expected Result', 'Gherkin']
    const rows = testCases.map((tc) => [
        tc.id,
        tc.title,
        tc.priority,
        tc.steps.join(' | '),
        tc.expectedResult,
        tc.gherkin ?? '',
    ])
    return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
}

function gherkinSteps(value: string): string[] {
    return value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !/^```(?:gherkin)?$/i.test(line) && !/^(Feature|Scenario(?: Outline)?)\s*:/i.test(line))
}

export function toFeature(testCases: TestCase[], featureName: string): string {
    if (testCases.some((testCase) => !testCase.gherkin?.trim())) {
        throw new Error('Every test case must contain Gherkin before creating a Feature file.')
    }
    const scenarios = testCases.map((testCase) => {
        const steps = gherkinSteps(testCase.gherkin!)
        const title = testCase.title.trim().replace(/\s+/g, ' ')
        return [`  Scenario: ${title}`, ...steps.map((step) => `    ${step}`)].join('\n')
    })
    return `Feature: ${featureName.trim().replace(/\s+/g, ' ')}\n\n${scenarios.join('\n\n')}\n`
}

export function featureFilename(featureName: string): string {
    const stem = featureName
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
    return `${stem || 'test-cases'}.feature`
}
