import type { TestCase } from './types'

/** Models occasionally wrap JSON in markdown fences despite instructions; strip before parsing. */
export function parseJsonResponse<T>(text: string): T {
    const trimmed = text.trim()
    const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)
    const jsonText = fenced ? fenced[1] : trimmed
    try {
        return JSON.parse(jsonText) as T
    } catch {
        throw new Error('The AI response was not valid JSON. Try again or switch providers.')
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseTestCasesResponse(text: string): TestCase[] {
    const value = parseJsonResponse<unknown>(text)
    const priorities = new Set(['High', 'Medium', 'Low'])
    const valid = Array.isArray(value) && value.every((testCase) =>
        isRecord(testCase)
        && typeof testCase.title === 'string'
        && priorities.has(String(testCase.priority))
        && Array.isArray(testCase.steps)
        && testCase.steps.every((step) => typeof step === 'string')
        && typeof testCase.expectedResult === 'string'
        && (typeof testCase.gherkin === 'string' || testCase.gherkin === null)
        && (testCase.id === undefined || typeof testCase.id === 'string'),
    )
    if (!valid) throw new Error('The AI response did not match the expected test case shape. Try again or switch providers.')
    return value as TestCase[]
}

export function parseFieldValuesResponse(text: string): { id: string; value: string }[] {
    const value = parseJsonResponse<unknown>(text)
    const valid = Array.isArray(value) && value.every((fieldValue) =>
        isRecord(fieldValue) && typeof fieldValue.id === 'string' && typeof fieldValue.value === 'string',
    )
    if (!valid) throw new Error('The AI response did not match the expected field value shape. Try again or switch providers.')
    return value as { id: string; value: string }[]
}
