import { describe, expect, it } from 'vitest'
import { toCsv, toMarkdown } from './export'
import type { TestCase } from './types'

const sample: TestCase[] = [
    {
        id: 'tc-1',
        title: 'Login with valid credentials',
        priority: 'High',
        steps: ['Enter valid email', 'Enter valid password', 'Click login'],
        expectedResult: 'User is redirected to the dashboard',
        gherkin: null,
    },
    {
        id: 'tc-2',
        title: 'Login, comma test',
        priority: 'Low',
        steps: [],
        expectedResult: 'Shows "error, please retry"',
        gherkin: 'Given ...\nWhen ...\nThen ...',
    },
]

describe('toMarkdown', () => {
    it('renders numbered steps, expected result, and gherkin blocks', () => {
        const md = toMarkdown(sample)
        expect(md).toContain('### 1. Login with valid credentials (High)')
        expect(md).toContain('1. Enter valid email')
        expect(md).toContain('**Expected Result:** User is redirected to the dashboard')
        expect(md).toContain('```gherkin')
    })
})

describe('toCsv', () => {
    it('escapes fields containing commas or quotes', () => {
        const csv = toCsv(sample)
        const lines = csv.split('\n')
        expect(lines[0]).toBe('ID,Title,Priority,Steps,Expected Result,Gherkin')
        expect(lines[2]).toContain('"Shows ""error, please retry"""')
    })
})
