import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../lib/types'
import App from './App'

const appMocks = vi.hoisted(() => ({
  emptyRunRecord: vi.fn().mockImplementation((locator) => ({
    locator,
    updatedAt: 0,
    lastScan: null,
    requirementsText: '',
    testCases: [],
    fieldValues: {},
  })),
  getSettings: vi.fn(),
  getRunRecord: vi.fn(),
  saveSettings: vi.fn(),
  saveRunRecord: vi.fn(),
  listRunRecords: vi.fn(),
  deleteRunRecord: vi.fn(),
  getActiveTab: vi.fn(),
  normalizeImageFiles: vi.fn(),
}))

vi.mock('../lib/tabActions', () => ({
  getActiveTab: appMocks.getActiveTab,
}))

vi.mock('../lib/permissions', () => ({
  hasOriginAccess: vi.fn().mockResolvedValue(true),
  originPatternFor: vi.fn().mockReturnValue('https://example.com/*'),
  requestOriginAccess: vi.fn(),
}))

vi.mock('../lib/storage', () => ({
  emptyRunRecord: appMocks.emptyRunRecord,
  getSettings: appMocks.getSettings,
  getRunRecord: appMocks.getRunRecord,
  saveSettings: appMocks.saveSettings,
  saveRunRecord: appMocks.saveRunRecord,
  listRunRecords: appMocks.listRunRecords,
  deleteRunRecord: appMocks.deleteRunRecord,
}))

vi.mock('../lib/images', () => ({
  MAX_SCAN_IMAGES: 5,
  imageRunLabel: (names: string[]) => names[0] ?? 'Image scan',
  normalizeImageFiles: appMocks.normalizeImageFiles,
}))

describe('side panel navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appMocks.getActiveTab.mockResolvedValue({
      id: 1,
      url: 'https://example.com/checkout',
      title: 'Checkout',
    })
    appMocks.getSettings.mockResolvedValue(DEFAULT_SETTINGS)
    appMocks.getRunRecord.mockResolvedValue(null)
    appMocks.saveSettings.mockResolvedValue(undefined)
    appMocks.saveRunRecord.mockResolvedValue(undefined)
    appMocks.listRunRecords.mockResolvedValue([])
    appMocks.deleteRunRecord.mockResolvedValue(undefined)
    appMocks.normalizeImageFiles.mockResolvedValue([{ id: 'image-1', name: 'Checkout.png', mimeType: 'image/webp', width: 1200, height: 800, dataUrl: 'data:image/webp;base64,image', role: 'upload' }])
  })

  it('shows the TestPilot brand mark in the header', async () => {
    render(<App />)

    expect(await screen.findByRole('img', { name: 'TestPilot icon' })).toBeTruthy()
  })

  it('announces the selected view and connects it to the visible panel', async () => {
    render(<App />)

    const scanTab = await screen.findByRole('tab', { name: /scan/i })
    const settingsTab = screen.getByRole('tab', { name: /settings/i })

    expect(scanTab.getAttribute('aria-selected')).toBe('true')
    expect(settingsTab.getAttribute('aria-selected')).toBe('false')
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(scanTab.id)
    expect(document.getElementById(scanTab.getAttribute('aria-controls')!)).toBeTruthy()
    expect(document.getElementById(settingsTab.getAttribute('aria-controls')!)).toBeTruthy()

    fireEvent.click(settingsTab)

    expect(scanTab.getAttribute('aria-selected')).toBe('false')
    expect(settingsTab.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(settingsTab.id)
  })

  it('moves between views with the arrow keys', async () => {
    render(<App />)

    const scanTab = await screen.findByRole('tab', { name: /scan/i })
    const fillTab = screen.getByRole('tab', { name: /fill/i })

    scanTab.focus()
    fireEvent.keyDown(scanTab, { key: 'ArrowRight' })

    expect(fillTab.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(fillTab)
  })

  it('gives each selected view a top-level heading', async () => {
    render(<App />)

    await screen.findByRole('heading', { level: 1, name: 'Scan' })
    fireEvent.click(screen.getByRole('tab', { name: /settings/i }))

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeTruthy()
  })

  it('explains when local settings cannot be loaded', async () => {
    appMocks.getSettings.mockRejectedValueOnce(new Error('Storage unavailable'))
    render(<App />)

    expect((await screen.findByRole('alert')).textContent).toContain('Storage unavailable')
  })

  it('retries the latest site change and clears a transient save error', async () => {
    appMocks.saveRunRecord.mockRejectedValueOnce(new Error('Quota exceeded'))
    render(<App />)

    const requirements = await screen.findByLabelText(/add acceptance criteria/i)
    fireEvent.change(requirements, { target: { value: 'Checkout is required' } })
    expect((await screen.findByRole('alert')).textContent).toContain('Quota exceeded')

    appMocks.saveRunRecord.mockResolvedValueOnce(undefined)
    fireEvent.click(screen.getByRole('button', { name: /retry save/i }))

    await waitFor(() => expect(screen.queryByText(/quota exceeded/i)).toBeNull())
    expect(appMocks.saveRunRecord).toHaveBeenCalledTimes(2)
  })

  it('creates and persists a fresh image run without copying the web run', async () => {
    render(<App />)
    await screen.findByRole('button', { name: 'Images' })

    fireEvent.click(screen.getByRole('button', { name: 'Images' }))
    fireEvent.change(screen.getByLabelText('Upload scan images'), { target: { files: [new File(['image'], 'Checkout.png', { type: 'image/png' })] } })

    await waitFor(() => expect(appMocks.saveRunRecord).toHaveBeenCalledWith(expect.objectContaining({
      locator: expect.objectContaining({ source: 'image' }),
      requirementsText: '',
    })))
  })

  it('opens Settings from an image model compatibility warning', async () => {
    appMocks.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, activeProvider: 'local' })
    appMocks.getRunRecord.mockResolvedValue({
      locator: { source: 'image', runId: 'screens', label: 'Checkout.png' },
      updatedAt: 1,
      requirementsText: '',
      testCases: [],
      fieldValues: {},
      lastScan: {
        source: 'image',
        title: 'Checkout.png',
        scannedAt: 1,
        images: [{ id: 'image-1', name: 'Checkout.png', mimeType: 'image/webp', width: 1200, height: 800, dataUrl: 'data:image/webp;base64,image', role: 'upload' }],
      },
    })
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /choose vision model/i }))

    expect(screen.getByRole('tab', { name: /settings/i }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeTruthy()
  })

  it('does not activate an unsaved vision override when settings persistence fails', async () => {
    appMocks.getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, activeProvider: 'local' })
    appMocks.getRunRecord.mockResolvedValue({
      locator: { source: 'image', runId: 'screens', label: 'Checkout.png' },
      updatedAt: 1,
      requirementsText: '',
      testCases: [],
      fieldValues: {},
      lastScan: {
        source: 'image',
        title: 'Checkout.png',
        scannedAt: 1,
        images: [{ id: 'image-1', name: 'Checkout.png', mimeType: 'image/webp', width: 1200, height: 800, dataUrl: 'data:image/webp;base64,image', role: 'upload' }],
      },
    })
    appMocks.saveSettings.mockRejectedValueOnce(new Error('Storage unavailable'))
    render(<App />)

    fireEvent.click(await screen.findByRole('tab', { name: /settings/i }))
    fireEvent.change(screen.getByLabelText('Local LLM model'), { target: { value: 'llava' } })
    fireEvent.click(screen.getByLabelText('This model accepts image input for Local LLM'))
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }))
    expect((await screen.findByRole('alert')).textContent).toContain('Storage unavailable')

    fireEvent.click(screen.getByRole('tab', { name: /scan/i }))
    expect(screen.getByText(/vision support for llama3 is unknown/i)).toBeTruthy()
    expect((screen.getByRole('button', { name: /generate test cases/i }) as HTMLButtonElement).disabled).toBe(true)
  })
})
