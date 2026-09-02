import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type RunRecord } from '../../lib/types'
import { FillDataTab } from './FillDataTab'

const fillActiveTab = vi.hoisted(() => vi.fn())
const chatWithProvider = vi.hoisted(() => vi.fn())
const ensureProviderAccess = vi.hoisted(() => vi.fn())

vi.mock('../../lib/tabActions', () => ({ fillActiveTab }))
vi.mock('../../lib/providers', () => ({ chatWithProvider, ensureProviderAccess }))

const siteRecord: RunRecord = {
  locator: { source: 'web', origin: 'https://example.com', pathname: '/checkout', url: 'https://example.com/checkout', label: 'Checkout' },
  updatedAt: 1,
  requirementsText: '',
  testCases: [],
  fieldValues: { email: 'alex@example.com', country: 'Vietnam' },
  lastScan: {
    source: 'web',
    url: 'https://example.com/checkout',
    title: 'Checkout',
    scannedAt: 1,
    screenshotDataUrl: null,
    elements: [
      { id: 'email', tag: 'input', role: null, label: 'Email address', type: 'email', name: 'email', placeholder: null, required: true, pattern: null, maxLength: null, options: null, text: null, selector: '#email', visible: true },
      { id: 'country', tag: 'input', role: null, label: 'Country', type: 'text', name: 'country', placeholder: null, required: true, pattern: null, maxLength: null, options: null, text: null, selector: '#country', visible: true },
    ],
  },
}

describe('FillDataTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests a fresh set of test data on each generation', async () => {
    ensureProviderAccess.mockResolvedValue(true)
    chatWithProvider.mockResolvedValue('[{"id":"email","value":"new@example.com"}]')
    const tab: chrome.tabs.Tab = {
      id: 1,
      index: 0,
      pinned: false,
      highlighted: true,
      windowId: 1,
      active: true,
      frozen: false,
      incognito: false,
      selected: true,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      lastAccessed: 1,
      url: 'https://example.com/checkout',
    }
    render(<FillDataTab tab={tab} settings={DEFAULT_SETTINGS} siteRecord={siteRecord} onUpdate={vi.fn()} />)

    const generateButton = screen.getByRole('button', { name: /generate data/i })
    fireEvent.click(generateButton)
    await waitFor(() => expect(chatWithProvider).toHaveBeenCalledTimes(1))
    fireEvent.click(generateButton)
    await waitFor(() => expect(chatWithProvider).toHaveBeenCalledTimes(2))

    expect(chatWithProvider).toHaveBeenCalledTimes(2)
    const firstRequest = chatWithProvider.mock.calls[0][2]
    const secondRequest = chatWithProvider.mock.calls[1][2]
    expect(firstRequest[1].content).not.toBe(secondRequest[1].content)
  })

  it('shows an actionable error when filling the page fails', async () => {
    fillActiveTab.mockRejectedValueOnce(new Error('Page is no longer available'))
    const tab: chrome.tabs.Tab = {
      id: 1,
      index: 0,
      pinned: false,
      highlighted: true,
      windowId: 1,
      active: true,
      frozen: false,
      incognito: false,
      selected: true,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      lastAccessed: 1,
      url: 'https://example.com/checkout',
    }
    render(<FillDataTab tab={tab} settings={DEFAULT_SETTINGS} siteRecord={siteRecord} onUpdate={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /choose fields/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /select country/i }))
    fireEvent.click(screen.getByRole('button', { name: /fill 1 field/i }))

    expect((await screen.findByRole('alert')).textContent).toContain('Page is no longer available')
  })

  it('fills only fields selected in the bulk chooser', async () => {
    fillActiveTab.mockResolvedValueOnce(1)
    const tab = { id: 1, windowId: 1, url: 'https://example.com/checkout' } as chrome.tabs.Tab
    render(<FillDataTab tab={tab} settings={DEFAULT_SETTINGS} siteRecord={siteRecord} onUpdate={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /choose fields/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /select country/i }))
    fireEvent.click(screen.getByRole('button', { name: /fill 1 field/i }))

    await waitFor(() => expect(fillActiveTab).toHaveBeenCalledWith(tab, [
      { selector: '#email', value: 'alex@example.com', type: 'email' },
    ]))
    expect(screen.queryByRole('group', { name: /fields to fill/i })).toBeNull()
  })

  it('supports Clear, Select all, and Cancel without filling', () => {
    const tab = { id: 1, windowId: 1, url: 'https://example.com/checkout' } as chrome.tabs.Tab
    render(<FillDataTab tab={tab} settings={DEFAULT_SETTINGS} siteRecord={siteRecord} onUpdate={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /choose fields/i }))
    expect(screen.getAllByRole('checkbox').every((checkbox) => (checkbox as HTMLInputElement).checked)).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getAllByRole('checkbox').every((checkbox) => !(checkbox as HTMLInputElement).checked)).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /select all/i }))
    expect(screen.getAllByRole('checkbox').every((checkbox) => (checkbox as HTMLInputElement).checked)).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByRole('group', { name: /fields to fill/i })).toBeNull()
    expect(fillActiveTab).not.toHaveBeenCalled()
  })

  it('explains that Figma scans cannot fill a live page', () => {
    const figmaRecord: RunRecord = {
      ...siteRecord,
      locator: { source: 'figma', fileKey: 'ABC', nodeId: '1:2', url: 'https://www.figma.com/design/ABC/App', label: 'Checkout' },
      lastScan: {
        source: 'figma', url: 'https://www.figma.com/design/ABC/App', title: 'App — Checkout', scannedAt: 1,
        fileKey: 'ABC', pageId: '0:1', pageName: 'Page', nodeId: '1:2', nodeName: 'Checkout', nodes: [], screenshotDataUrl: null, previewWarning: null,
      },
    }
    render(<FillDataTab tab={{ id: 1 } as chrome.tabs.Tab} settings={DEFAULT_SETTINGS} siteRecord={figmaRecord} onUpdate={vi.fn()} />)

    expect(screen.getByText(/available only for live web-page scans/i)).toBeTruthy()
  })
})
