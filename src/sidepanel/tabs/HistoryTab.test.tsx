import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HistoryTab } from './HistoryTab'

const storage = vi.hoisted(() => ({
  deleteSiteRecord: vi.fn(),
  listSiteRecords: vi.fn().mockResolvedValue([
    {
      origin: 'https://example.com',
      pathname: '/checkout',
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
    storage.deleteSiteRecord.mockReset().mockResolvedValue(undefined)
    storage.listSiteRecords.mockReset().mockResolvedValue([
      {
        origin: 'https://example.com',
        pathname: '/checkout',
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

    expect(storage.deleteSiteRecord).not.toHaveBeenCalled()
  })

  it('shows a recoverable error when saved runs cannot be loaded', async () => {
    storage.listSiteRecords.mockRejectedValueOnce(new Error('Storage unavailable'))
    render(<HistoryTab />)

    expect((await screen.findByRole('alert')).textContent).toContain('Storage unavailable')
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy()
  })
})
