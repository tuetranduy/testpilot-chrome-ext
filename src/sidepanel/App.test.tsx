import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../lib/types'
import App from './App'

const appMocks = vi.hoisted(() => ({
  emptySiteRecord: vi.fn().mockReturnValue({
    origin: 'https://example.com',
    pathname: '/checkout',
    updatedAt: 0,
    lastScan: null,
    requirementsText: '',
    testCases: [],
    fieldValues: {},
  }),
  getSettings: vi.fn(),
  getSiteRecord: vi.fn(),
  saveSettings: vi.fn(),
  saveSiteRecord: vi.fn(),
  listSiteRecords: vi.fn(),
  deleteSiteRecord: vi.fn(),
  getActiveTab: vi.fn(),
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
  emptySiteRecord: appMocks.emptySiteRecord,
  getSettings: appMocks.getSettings,
  getSiteRecord: appMocks.getSiteRecord,
  saveSettings: appMocks.saveSettings,
  saveSiteRecord: appMocks.saveSiteRecord,
  listSiteRecords: appMocks.listSiteRecords,
  deleteSiteRecord: appMocks.deleteSiteRecord,
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
    appMocks.getSiteRecord.mockResolvedValue(null)
    appMocks.saveSettings.mockResolvedValue(undefined)
    appMocks.saveSiteRecord.mockResolvedValue(undefined)
    appMocks.listSiteRecords.mockResolvedValue([])
    appMocks.deleteSiteRecord.mockResolvedValue(undefined)
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
    appMocks.saveSiteRecord.mockRejectedValueOnce(new Error('Quota exceeded'))
    render(<App />)

    const requirements = await screen.findByLabelText(/add acceptance criteria/i)
    fireEvent.change(requirements, { target: { value: 'Checkout is required' } })
    expect((await screen.findByRole('alert')).textContent).toContain('Quota exceeded')

    appMocks.saveSiteRecord.mockResolvedValueOnce(undefined)
    fireEvent.click(screen.getByRole('button', { name: /retry save/i }))

    await waitFor(() => expect(screen.queryByText(/quota exceeded/i)).toBeNull())
    expect(appMocks.saveSiteRecord).toHaveBeenCalledTimes(2)
  })
})
