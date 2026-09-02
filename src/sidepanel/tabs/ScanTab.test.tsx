import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type RunRecord, type TestCase } from '../../lib/types'
import { ScanTab } from './ScanTab'

const mocks = vi.hoisted(() => ({
  chatWithProvider: vi.fn(),
  ensureProviderAccess: vi.fn(),
  loadFigmaTargets: vi.fn(),
  scanFigmaTarget: vi.fn(),
  hasOriginAccess: vi.fn(),
  requestOriginAccess: vi.fn(),
  scanActiveTab: vi.fn(),
}))

vi.mock('../../lib/providers', () => ({ chatWithProvider: mocks.chatWithProvider, ensureProviderAccess: mocks.ensureProviderAccess }))
vi.mock('../../lib/figma', () => ({ loadFigmaTargets: mocks.loadFigmaTargets, scanFigmaTarget: mocks.scanFigmaTarget }))
vi.mock('../../lib/permissions', () => ({ hasOriginAccess: mocks.hasOriginAccess, originPatternFor: (url: string) => `${new URL(url).origin}/*`, requestOriginAccess: mocks.requestOriginAccess }))
vi.mock('../../lib/tabActions', () => ({ scanActiveTab: mocks.scanActiveTab }))

const webRecord: RunRecord = {
  locator: { source: 'web', origin: 'https://example.com', pathname: '/checkout', url: 'https://example.com/checkout', label: 'Checkout' },
  updatedAt: 1,
  requirementsText: '',
  testCases: [],
  fieldValues: {},
  lastScan: {
    source: 'web', url: 'https://example.com/checkout', title: 'Checkout', scannedAt: 1, screenshotDataUrl: null,
    elements: [{ id: 'submit', tag: 'button', role: null, label: null, type: 'submit', name: null, placeholder: null, required: false, pattern: null, maxLength: null, options: null, text: 'Pay', selector: '#pay', visible: true }],
  },
}

function renderTab(record = webRecord, onUpdate = vi.fn(), onSelectRun = vi.fn().mockResolvedValue(undefined)) {
  const tab = { id: 1, windowId: 1, url: 'https://example.com/checkout', title: 'Checkout' } as chrome.tabs.Tab
  render(<ScanTab tab={tab} granted settings={DEFAULT_SETTINGS} siteRecord={record} setGranted={vi.fn()} onUpdate={onUpdate} onSelectRun={onSelectRun} />)
  return { onUpdate, onSelectRun }
}

function cases(count: number, gherkin: string | null = null): string {
  return JSON.stringify(Array.from({ length: count }, (_, index): TestCase => ({
    id: '', title: `Case ${index + 1}`, priority: 'Medium', steps: ['Act'], expectedResult: 'Done', gherkin,
  })))
}

describe('ScanTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.ensureProviderAccess.mockResolvedValue(true)
    mocks.hasOriginAccess.mockResolvedValue(false)
    mocks.requestOriginAccess.mockResolvedValue(true)
  })

  it('uses a selected generation preset as the exact requested count', async () => {
    mocks.chatWithProvider.mockResolvedValue(cases(5))
    const { onUpdate } = renderTab()

    fireEvent.click(screen.getByRole('button', { name: '5 test cases' }))
    fireEvent.click(screen.getByRole('button', { name: /generate test cases/i }))

    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
    expect(onUpdate.mock.calls.at(-1)?.[0].testCases).toHaveLength(5)
    expect(mocks.chatWithProvider.mock.calls[0][2][1].content).toContain('Generate exactly 5')
  })

  it('validates custom generation counts from 1 through 50', () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: /custom test-case count/i }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Custom test-case count' }), { target: { value: '51' } })

    expect(screen.getByText(/integer from 1 to 50/i)).toBeTruthy()
    expect((screen.getByRole('button', { name: /generate test cases/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('offers a Feature file only for a complete Gherkin suite', () => {
    renderTab({ ...webRecord, testCases: JSON.parse(cases(2, 'Given a page\nWhen I act\nThen it works')) })
    fireEvent.click(screen.getByRole('button', { name: 'Gherkin' }))

    expect(screen.getByRole('button', { name: /feature file/i })).toBeTruthy()
  })

  it('loads Figma targets and switches to the selected design run', async () => {
    mocks.loadFigmaTargets.mockResolvedValue({
      parsed: { fileKey: 'ABC', nodeId: null, url: 'https://www.figma.com/design/ABC/App' },
      fileName: 'App',
      targets: [{ id: '1:2', name: 'Checkout', pageId: '0:1', pageName: 'Flows', type: 'FRAME' }],
    })
    const { onSelectRun } = renderTab()

    fireEvent.click(screen.getByRole('button', { name: 'Figma' }))
    fireEvent.change(screen.getByLabelText('Figma Design URL'), { target: { value: 'https://www.figma.com/design/ABC/App' } })
    fireEvent.click(screen.getByRole('button', { name: /load designs/i }))

    await screen.findByRole('option', { name: /Checkout/ })
    fireEvent.change(screen.getByLabelText('Page or frame'), { target: { value: '1:2' } })
    await waitFor(() => expect(onSelectRun).toHaveBeenCalledWith(expect.objectContaining({ source: 'figma', fileKey: 'ABC', nodeId: '1:2' })))
  })

  it('explains when Figma API permission is denied', async () => {
    mocks.requestOriginAccess.mockResolvedValueOnce(false)
    renderTab()

    fireEvent.click(screen.getByRole('button', { name: 'Figma' }))
    fireEvent.change(screen.getByLabelText('Figma Design URL'), { target: { value: 'https://www.figma.com/design/ABC/App' } })
    fireEvent.click(screen.getByRole('button', { name: /load designs/i }))

    expect(await screen.findByText(/permission to contact the Figma API was denied/i)).toBeTruthy()
    expect(mocks.loadFigmaTargets).not.toHaveBeenCalled()
  })

  it('keeps the previous suite when exact-count generation fails', async () => {
    mocks.chatWithProvider.mockResolvedValue(cases(1).replace('Case 1', 'Duplicate'))
    const previous = JSON.parse(cases(2)) as TestCase[]
    const onUpdate = vi.fn()
    renderTab({ ...webRecord, testCases: previous }, onUpdate)

    fireEvent.click(screen.getByRole('button', { name: '5 test cases' }))
    fireEvent.click(screen.getByRole('button', { name: /generate test cases/i }))

    expect(await screen.findByText(/could not produce exactly 5/i)).toBeTruthy()
    expect(onUpdate).not.toHaveBeenCalled()
  })
})
