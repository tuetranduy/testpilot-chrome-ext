import type { TestCase } from './types'

export type TestCaseBatchRequester = (count: number, excludedTitles: string[]) => Promise<TestCase[]>

function normalizedTitle(title: string): string {
    return title.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

export async function generateTestCaseSuite(
    requestedCount: number,
    requestBatch: TestCaseBatchRequester,
    onProgress?: (completed: number, total: number) => void,
): Promise<TestCase[]> {
    if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 50) {
        throw new Error('Test-case count must be an integer from 1 to 50.')
    }

    const result: TestCase[] = []
    const seen = new Set<string>()
    const maximumAttempts = Math.ceil(requestedCount / 10) + 2

    for (let attempt = 0; attempt < maximumAttempts && result.length < requestedCount; attempt++) {
        const remaining = requestedCount - result.length
        const batch = await requestBatch(Math.min(10, remaining), result.map((testCase) => testCase.title))
        for (const testCase of batch) {
            const key = normalizedTitle(testCase.title)
            if (!key || seen.has(key)) continue
            seen.add(key)
            result.push(testCase)
            if (result.length === requestedCount) break
        }
        onProgress?.(result.length, requestedCount)
    }

    if (result.length !== requestedCount) {
        throw new Error(`The AI provider could not produce exactly ${requestedCount} unique test cases. Try again or choose a smaller count.`)
    }
    return result
}
