import { describe, expect, it } from 'vitest'
import { parseFieldValuesResponse, parseJsonResponse, parseTestCasesResponse } from './aiJson'

describe('parseJsonResponse', () => {
    it('parses plain JSON', () => {
        expect(parseJsonResponse<{ a: number }>('{"a": 1}')).toEqual({ a: 1 })
    })

    it('strips markdown code fences before parsing', () => {
        const text = '```json\n{"a": 1}\n```'
        expect(parseJsonResponse<{ a: number }>(text)).toEqual({ a: 1 })
    })

    it('throws a clear error on invalid JSON', () => {
        expect(() => parseJsonResponse('not json')).toThrow(/not valid JSON/)
    })
})

describe('AI response validation', () => {
    it('rejects test cases with missing render-critical fields', () => {
        expect(() => parseTestCasesResponse('[{"title":"Incomplete"}]')).toThrow(/test case shape/)
    })

    it('accepts complete test cases', () => {
        const parsed = parseTestCasesResponse('[{"id":"tc-1","title":"Checkout","priority":"High","steps":["Submit"],"expectedResult":"Confirmed","gherkin":null}]')
        expect(parsed[0].steps).toEqual(['Submit'])
    })

    it('rejects generated field values without string ids and values', () => {
        expect(() => parseFieldValuesResponse('[{"id":"email","value":42}]')).toThrow(/field value shape/)
    })
})
