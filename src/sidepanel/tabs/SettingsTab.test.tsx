import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../../lib/types'
import { SettingsTab } from './SettingsTab'

const mocks = vi.hoisted(() => ({
  chatWithProvider: vi.fn(),
  ensureProviderAccess: vi.fn(),
  listModels: vi.fn(),
}))

vi.mock('../../lib/providers', () => ({
  chatWithProvider: mocks.chatWithProvider,
  ensureProviderAccess: mocks.ensureProviderAccess,
  listModels: mocks.listModels,
}))

describe('SettingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.ensureProviderAccess.mockResolvedValue(true)
  })

  it('gives provider configuration fields persistent accessible labels', () => {
    render(<SettingsTab settings={DEFAULT_SETTINGS} onSave={vi.fn()} />)

    expect(screen.getByLabelText('Active provider')).toBeTruthy()
    expect(screen.getByLabelText('OpenAI API key')).toBeTruthy()
    expect(screen.getByLabelText('OpenAI model')).toBeTruthy()
    expect(screen.getByLabelText('Local LLM base URL')).toBeTruthy()
    expect(screen.getByLabelText('Figma personal access token')).toBeTruthy()
  })

  it('announces save failures without announcing a false success', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Could not write settings'))
    render(<SettingsTab settings={DEFAULT_SETTINGS} onSave={onSave} />)

    expect(screen.queryByText('Settings saved.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }))

    expect((await screen.findByRole('alert')).textContent).toContain('Could not write settings')
    expect(screen.queryByText('Settings saved.')).toBeNull()
  })

  it('labels configured models with their visual capability', () => {
    render(<SettingsTab settings={DEFAULT_SETTINGS} onSave={vi.fn()} />)

    expect(screen.getAllByText('Vision')).toHaveLength(3)
    expect(screen.getByText('Vision unknown')).toBeTruthy()
    expect(screen.getByLabelText('This model accepts image input for Local LLM')).toBeTruthy()
  })

  it('annotates fetched model options with visual capability', async () => {
    mocks.listModels.mockResolvedValue(['future-model', 'gpt-3.5-turbo', 'gpt-4o-mini'])
    render(<SettingsTab settings={DEFAULT_SETTINGS} onSave={vi.fn()} />)

    fireEvent.click(screen.getAllByRole('button', { name: /fetch available models/i })[0])

    expect(await screen.findByRole('option', { name: 'gpt-4o-mini — Vision' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'gpt-3.5-turbo — Text only' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'future-model — Vision unknown' })).toBeTruthy()
  })

  it('saves an explicit vision confirmation for an unknown model', async () => {
    const onSave = vi.fn()
    render(<SettingsTab settings={DEFAULT_SETTINGS} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Local LLM model'), { target: { value: 'llava' } })
    fireEvent.click(screen.getByLabelText('This model accepts image input for Local LLM'))
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ providers: expect.objectContaining({
      local: expect.objectContaining({ model: 'llava', visionOverride: { model: 'llava', supported: true } }),
    }) })))
  })

  it('clears a stale vision confirmation when the model changes', async () => {
    const onSave = vi.fn()
    const settings = {
      ...DEFAULT_SETTINGS,
      providers: { ...DEFAULT_SETTINGS.providers, local: { ...DEFAULT_SETTINGS.providers.local, model: 'llava', visionOverride: { model: 'llava', supported: true } } },
    }
    render(<SettingsTab settings={settings} onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('Local LLM model'), { target: { value: 'another-local-model' } })
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0].providers.local.visionOverride).toBeUndefined()
  })
})
