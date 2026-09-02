import { describe, expect, it, vi } from 'vitest'
import { generateTestCaseSuite } from './testCaseGeneration'
import type { TestCase } from './types'

function testCase(title: string): TestCase {
    return { id: '', title, priority: 'Medium', steps: ['Act'], expectedResult: 'Done', gherkin: null }
}

describe('generateTestCaseSuite', () => {
    it.each([1, 50])('accepts the valid boundary count %s', async (count) => {
        const result = await generateTestCaseSuite(count, async (batchCount, excluded) =>
            Array.from({ length: batchCount }, (_, index) => testCase(`Case ${excluded.length + index + 1}`)))
        expect(result).toHaveLength(count)
    })

    it.each([0, 51, 1.5])('rejects the invalid count %s', async (count) => {
        await expect(generateTestCaseSuite(count, vi.fn())).rejects.toThrow(/1 to 50/i)
    })

    it('generates an exact large suite in batches of at most ten', async () => {
        const progress: number[] = []
        const requestBatch = vi.fn(async (count: number, excluded: string[]) =>
            Array.from({ length: count }, (_, index) => testCase(`Case ${excluded.length + index + 1}`)))

        const result = await generateTestCaseSuite(12, requestBatch, (completed) => progress.push(completed))

        expect(result).toHaveLength(12)
        expect(requestBatch.mock.calls.map((call) => call[0])).toEqual([10, 2])
        expect(progress).toEqual([10, 12])
    })

    it('uses recovery batches for duplicate or short provider responses', async () => {
        const requestBatch = vi.fn()
            .mockResolvedValueOnce([testCase('A'), testCase('A')])
            .mockResolvedValueOnce([testCase('B')])
            .mockResolvedValueOnce([testCase('C')])

        const result = await generateTestCaseSuite(3, requestBatch)

        expect(result.map((item) => item.title)).toEqual(['A', 'B', 'C'])
        expect(requestBatch).toHaveBeenCalledTimes(3)
    })

    it('truncates excess unique cases returned by a provider', async () => {
        const result = await generateTestCaseSuite(2, async () => [testCase('A'), testCase('B'), testCase('C')])
        expect(result.map((item) => item.title)).toEqual(['A', 'B'])
    })

    it('fails without returning a partial suite after two recovery batches', async () => {
        const requestBatch = vi.fn().mockResolvedValue([testCase('Same')])

        await expect(generateTestCaseSuite(3, requestBatch)).rejects.toThrow(/exactly 3/i)
        expect(requestBatch).toHaveBeenCalledTimes(3)
    })
})
