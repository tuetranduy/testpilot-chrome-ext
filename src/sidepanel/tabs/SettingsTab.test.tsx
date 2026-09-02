import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../../lib/types'
import { SettingsTab } from './SettingsTab'

vi.mock('../../lib/providers', () => ({
  chatWithProvider: vi.fn(),
  ensureProviderAccess: vi.fn(),
  listModels: vi.fn(),
}))

describe('SettingsTab', () => {
  it('gives provider configuration fields persistent accessible labels', () => {
    render(<SettingsTab settings={DEFAULT_SETTINGS} onSave={vi.fn()} />)

    expect(screen.getByLabelText('Active provider')).toBeTruthy()
    expect(screen.getByLabelText('OpenAI API key')).toBeTruthy()
    expect(screen.getByLabelText('OpenAI model')).toBeTruthy()
    expect(screen.getByLabelText('Local LLM base URL')).toBeTruthy()
  })

  it('announces save failures without announcing a false success', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Could not write settings'))
    render(<SettingsTab settings={DEFAULT_SETTINGS} onSave={onSave} />)

    expect(screen.queryByText('Settings saved.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }))

    expect((await screen.findByRole('alert')).textContent).toContain('Could not write settings')
    expect(screen.queryByText('Settings saved.')).toBeNull()
  })
})
