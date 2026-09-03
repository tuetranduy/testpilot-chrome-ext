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
  normalizeImageFiles: vi.fn(),
}))

vi.mock('../../lib/providers', () => ({ chatWithProvider: mocks.chatWithProvider, ensureProviderAccess: mocks.ensureProviderAccess }))
vi.mock('../../lib/figma', () => ({ loadFigmaTargets: mocks.loadFigmaTargets, scanFigmaTarget: mocks.scanFigmaTarget }))
vi.mock('../../lib/permissions', () => ({ hasOriginAccess: mocks.hasOriginAccess, originPatternFor: (url: string) => `${new URL(url).origin}/*`, requestOriginAccess: mocks.requestOriginAccess }))
vi.mock('../../lib/tabActions', () => ({ scanActiveTab: mocks.scanActiveTab }))
vi.mock('../../lib/images', () => ({
  MAX_SCAN_IMAGES: 5,
  imageRunLabel: (names: string[]) => names.length > 1 ? `${names[0]} + ${names.length - 1} more` : names[0],
  normalizeImageFiles: mocks.normalizeImageFiles,
}))

const uploadedImage = { id: 'image-1', name: 'Checkout.png', mimeType: 'image/webp', width: 1200, height: 800, dataUrl: 'data:image/webp;base64,upload', role: 'upload' as const }
const fullPageImage = { ...uploadedImage, id: 'full-page', name: 'Checkout-full.png', dataUrl: 'data:image/webp;base64,full', role: 'full-page' as const }

const webRecord: RunRecord = {
  locator: { source: 'web', origin: 'https://example.com', pathname: '/checkout', url: 'https://example.com/checkout', label: 'Checkout' },
  updatedAt: 1,
  requirementsText: '',
  testCases: [],
  fieldValues: {},
  lastScan: {
    source: 'web', url: 'https://example.com/checkout', title: 'Checkout', scannedAt: 1, images: [],
    elements: [{ id: 'submit', tag: 'button', role: null, label: null, type: 'submit', name: null, placeholder: null, required: false, pattern: null, maxLength: null, options: null, text: 'Pay', selector: '#pay', visible: true }],
  },
}

function renderTab(record = webRecord, onUpdate = vi.fn(), onSelectRun = vi.fn().mockResolvedValue(undefined), onCreateRun = vi.fn()) {
  const tab = { id: 1, windowId: 1, url: 'https://example.com/checkout', title: 'Checkout' } as chrome.tabs.Tab
  render(<ScanTab tab={tab} granted settings={DEFAULT_SETTINGS} siteRecord={record} setGranted={vi.fn()} onUpdate={onUpdate} onSelectRun={onSelectRun} onCreateRun={onCreateRun} />)
  return { onUpdate, onSelectRun, onCreateRun }
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
    mocks.normalizeImageFiles.mockResolvedValue([uploadedImage])
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

  it('creates a saved run from a batch of uploaded UI images', async () => {
    mocks.normalizeImageFiles.mockResolvedValue([uploadedImage, { ...uploadedImage, id: 'image-2', name: 'Error.png' }])
    const { onCreateRun } = renderTab()

    fireEvent.click(screen.getByRole('button', { name: 'Images' }))
    fireEvent.change(screen.getByLabelText('Upload scan images'), { target: { files: [new File(['one'], 'Checkout.png', { type: 'image/png' }), new File(['two'], 'Error.png', { type: 'image/png' })] } })

    await waitFor(() => expect(onCreateRun).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'image', label: 'Checkout.png + 1 more' }),
      expect.objectContaining({ source: 'image', images: expect.arrayContaining([expect.objectContaining({ name: 'Checkout.png' })]) }),
    ))
  })

  it('adds an optional full-page image to an existing web scan', async () => {
    mocks.normalizeImageFiles.mockResolvedValue([fullPageImage])
    const { onUpdate } = renderTab()

    fireEvent.change(screen.getByLabelText('Attach full-page screenshot'), { target: { files: [new File(['full'], 'Checkout-full.png', { type: 'image/png' })] } })

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      lastScan: expect.objectContaining({ images: [expect.objectContaining({ role: 'full-page' })] }),
    })))
  })

  it('keeps a staged full-page image when the web page is scanned afterward', async () => {
    mocks.normalizeImageFiles.mockResolvedValue([fullPageImage])
    mocks.scanActiveTab.mockResolvedValue({ ...webRecord.lastScan, images: [uploadedImage] })
    const { onUpdate } = renderTab({ ...webRecord, lastScan: null })

    fireEvent.change(screen.getByLabelText('Attach full-page screenshot'), { target: { files: [new File(['full'], 'Checkout-full.png', { type: 'image/png' })] } })
    await waitFor(() => expect(mocks.normalizeImageFiles).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: /scan current page/i }))

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      lastScan: expect.objectContaining({ images: [uploadedImage, fullPageImage] }),
    })))
  })

  it('previews and removes a full-page image staged before scanning', async () => {
    mocks.normalizeImageFiles.mockResolvedValue([fullPageImage])
    renderTab({ ...webRecord, lastScan: null })

    fireEvent.change(screen.getByLabelText('Attach full-page screenshot'), { target: { files: [new File(['full'], 'Checkout-full.png', { type: 'image/png' })] } })
    expect(await screen.findByAltText('Checkout-full.png preview')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Checkout-full.png' }))

    expect(screen.queryByAltText('Checkout-full.png preview')).toBeNull()
  })

  it('sends every scan image to the provider in display order', async () => {
    mocks.chatWithProvider.mockResolvedValue(cases(5))
    renderTab({ ...webRecord, lastScan: { ...webRecord.lastScan!, images: [uploadedImage, fullPageImage] } })

    fireEvent.click(screen.getByRole('button', { name: '5 test cases' }))
    fireEvent.click(screen.getByRole('button', { name: /generate test cases/i }))

    await waitFor(() => expect(mocks.chatWithProvider).toHaveBeenCalled())
    expect(mocks.chatWithProvider.mock.calls[0][3].images).toEqual([uploadedImage.dataUrl, fullPageImage.dataUrl])
  })

  it('does not generate an image run after its last image is removed', () => {
    renderTab({
      ...webRecord,
      locator: { source: 'image', runId: 'empty', label: 'Image scan' },
      lastScan: { source: 'image', title: 'Image scan', scannedAt: 1, images: [] },
    })

    expect((screen.getByRole('button', { name: /generate test cases/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('removes an uploaded image from its saved run', () => {
    const onUpdate = vi.fn()
    renderTab({
      ...webRecord,
      locator: { source: 'image', runId: 'images', label: 'Checkout.png' },
      lastScan: { source: 'image', title: 'Checkout.png', scannedAt: 1, images: [uploadedImage] },
    }, onUpdate)

    fireEvent.click(screen.getByRole('button', { name: 'Remove Checkout.png' }))

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ lastScan: expect.objectContaining({ images: [] }) }))
  })

  it('prevents a web scan until the destination web run has loaded', async () => {
    let finishSwitch: (() => void) | undefined
    const onSelectRun = vi.fn().mockReturnValue(new Promise<void>((resolve) => { finishSwitch = resolve }))
    renderTab({
      ...webRecord,
      locator: { source: 'image', runId: 'images', label: 'Checkout.png' },
      lastScan: { source: 'image', title: 'Checkout.png', scannedAt: 1, images: [uploadedImage] },
    }, vi.fn(), onSelectRun)

    fireEvent.click(screen.getByRole('button', { name: 'Web page' }))

    expect((screen.getByRole('button', { name: /scan current page/i }) as HTMLButtonElement).disabled).toBe(true)
    finishSwitch?.()
    await waitFor(() => expect((screen.getByRole('button', { name: /scan current page/i }) as HTMLButtonElement).disabled).toBe(false))
  })

  it('restores the previous source when the destination run cannot load', async () => {
    const onSelectRun = vi.fn().mockResolvedValue(false)
    renderTab({
      ...webRecord,
      locator: { source: 'image', runId: 'images', label: 'Checkout.png' },
      lastScan: { source: 'image', title: 'Checkout.png', scannedAt: 1, images: [uploadedImage] },
    }, vi.fn(), onSelectRun)

    fireEvent.click(screen.getByRole('button', { name: 'Web page' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Images' }).getAttribute('aria-pressed')).toBe('true'))
    expect(screen.queryByRole('button', { name: /scan current page/i })).toBeNull()
  })

  it('locks attachment changes while a web scan is running', async () => {
    let finishScan: ((value: typeof webRecord.lastScan) => void) | undefined
    mocks.scanActiveTab.mockReturnValue(new Promise((resolve) => { finishScan = resolve }))
    renderTab()

    fireEvent.click(screen.getByRole('button', { name: /scan current page/i }))

    await waitFor(() => expect((screen.getByLabelText('Attach full-page screenshot') as HTMLInputElement).disabled).toBe(true))
    finishScan?.(webRecord.lastScan)
  })

  it('disables additional uploads when an image run has five images', () => {
    const images = Array.from({ length: 5 }, (_, index) => ({ ...uploadedImage, id: `image-${index}`, name: `Screen-${index}.png` }))
    renderTab({
      ...webRecord,
      locator: { source: 'image', runId: 'five', label: 'Five screens' },
      lastScan: { source: 'image', title: 'Five screens', scannedAt: 1, images },
    })

    expect((screen.getByLabelText('Upload scan images') as HTMLInputElement).disabled).toBe(true)
  })
})
