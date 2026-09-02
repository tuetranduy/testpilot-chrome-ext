import { describe, expect, it } from 'vitest'
import { featureFilename, toCsv, toFeature, toMarkdown } from './export'
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

describe('toFeature', () => {
    it('combines scenarios and removes duplicate model-supplied headings', () => {
        const feature = toFeature([
            { ...sample[1], title: 'Login succeeds', gherkin: '```gherkin\nFeature: Old\nScenario: Old scenario\nGiven a login form\nWhen valid details are submitted\nThen the dashboard opens\n```' },
        ], 'Customer Login')

        expect(feature).toBe('Feature: Customer Login\n\n  Scenario: Login succeeds\n    Given a login form\n    When valid details are submitted\n    Then the dashboard opens\n')
    })

    it('creates a safe kebab-case feature filename', () => {
        expect(featureFilename('Checkout / Payment: Desktop')).toBe('checkout-payment-desktop.feature')
    })

    it('requires Gherkin for every case and keeps scenario headings on one line', () => {
        expect(() => toFeature(sample, 'Login')).toThrow(/Gherkin/i)
        expect(toFeature([{ ...sample[1], title: 'Login\nwith valid details', gherkin: 'Scenario : old\nGiven a page' }], 'Login'))
            .toContain('Scenario: Login with valid details\n    Given a page')
    })
})
