import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type SiteRecord } from '../../lib/types'
import { FillDataTab } from './FillDataTab'

const fillActiveTab = vi.hoisted(() => vi.fn())
const chatWithProvider = vi.hoisted(() => vi.fn())
const ensureProviderAccess = vi.hoisted(() => vi.fn())

vi.mock('../../lib/tabActions', () => ({ fillActiveTab }))
vi.mock('../../lib/providers', () => ({ chatWithProvider, ensureProviderAccess }))

const siteRecord: SiteRecord = {
  origin: 'https://example.com',
  pathname: '/checkout',
  updatedAt: 1,
  requirementsText: '',
  testCases: [],
  fieldValues: { email: 'alex@example.com' },
  lastScan: {
    url: 'https://example.com/checkout',
    title: 'Checkout',
    scannedAt: 1,
    screenshotDataUrl: null,
    elements: [
      { id: 'email', tag: 'input', role: null, label: 'Email address', type: 'email', name: 'email', placeholder: null, required: true, pattern: null, maxLength: null, options: null, text: null, selector: '#email', visible: true },
    ],
  },
}

describe('FillDataTab', () => {
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

    fireEvent.click(screen.getByRole('button', { name: /fill all/i }))

    expect((await screen.findByRole('alert')).textContent).toContain('Page is no longer available')
  })
})
