import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HistoryTab } from './HistoryTab'

const storage = vi.hoisted(() => ({
  deleteRunRecord: vi.fn(),
  runKey: vi.fn((locator: { source: string; url: string }) => `${locator.source}:${locator.url}`),
  listRunRecords: vi.fn().mockResolvedValue([
    {
      locator: { source: 'web', origin: 'https://example.com', pathname: '/checkout', url: 'https://example.com/checkout', label: 'Checkout' },
      updatedAt: 1,
      lastScan: null,
      requirementsText: '',
      testCases: [],
      fieldValues: {},
    },
  ]),
}))

vi.mock('../../lib/storage', () => storage)

describe('HistoryTab', () => {
  beforeEach(() => {
    storage.deleteRunRecord.mockReset().mockResolvedValue(undefined)
    storage.listRunRecords.mockReset().mockResolvedValue([
      {
        locator: { source: 'web', origin: 'https://example.com', pathname: '/checkout', url: 'https://example.com/checkout', label: 'Checkout' },
        updatedAt: 1,
        lastScan: null,
        requirementsText: '',
        testCases: [],
        fieldValues: {},
      },
    ])
  })

  it('keeps a saved run when deletion is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<HistoryTab />)

    fireEvent.click(await screen.findByRole('button', { name: /delete/i }))

    expect(storage.deleteRunRecord).not.toHaveBeenCalled()
  })

  it('deletes the selected source-aware run after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<HistoryTab />)

    fireEvent.click(await screen.findByRole('button', { name: /delete/i }))

    expect(storage.deleteRunRecord).toHaveBeenCalledWith(expect.objectContaining({ source: 'web', pathname: '/checkout' }))
  })

  it('shows a recoverable error when saved runs cannot be loaded', async () => {
    storage.listRunRecords.mockRejectedValueOnce(new Error('Storage unavailable'))
    render(<HistoryTab />)

    expect((await screen.findByRole('alert')).textContent).toContain('Storage unavailable')
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy()
  })

  it('identifies whether a saved run came from the web or Figma', async () => {
    storage.listRunRecords.mockResolvedValueOnce([
      {
        locator: { source: 'figma', fileKey: 'ABC', nodeId: '1:2', url: 'https://www.figma.com/design/ABC/App', label: 'App — Checkout' },
        updatedAt: 1, lastScan: null, requirementsText: '', testCases: [], fieldValues: {},
      },
    ])
    render(<HistoryTab />)

    expect(await screen.findByText('Figma design')).toBeTruthy()
    expect(screen.getByText('App — Checkout')).toBeTruthy()
  })
})
