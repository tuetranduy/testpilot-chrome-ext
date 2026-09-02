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
