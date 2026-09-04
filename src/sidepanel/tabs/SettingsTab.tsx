import { useState } from 'react'
import { chatWithProvider, ensureProviderAccess, listModels } from '../../lib/providers'
import { getVisionCapability, visionCapabilityLabel } from '../../lib/modelCapabilities'
import type { ProviderId, Settings } from '../../lib/types'
import { Badge, Button, Card, Icon, InlineMessage, SectionTitle, Spinner, fieldClassName } from '../components/ui'

interface Props {
  settings: Settings
  onSave: (settings: Settings) => void | Promise<void>
}

const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  anthropic: 'Claude (Anthropic)',
  local: 'Local LLM',
}

const CUSTOM_MODEL_VALUE = '__custom__'

export function SettingsTab({ settings, onSave }: Props) {
  const [draft, setDraft] = useState<Settings>(settings)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'ok' | 'error'>>({})
  const [testError, setTestError] = useState<Record<string, string>>({})
  const [modelOptions, setModelOptions] = useState<Partial<Record<ProviderId, string[]>>>({})
  const [modelStatus, setModelStatus] = useState<Record<string, 'idle' | 'loading' | 'error'>>({})
  const [modelError, setModelError] = useState<Record<string, string>>({})

  function updateProvider(id: ProviderId, patch: Partial<Settings['providers'][ProviderId]>) {
    setDraft((d) => ({ ...d, providers: { ...d.providers, [id]: { ...d.providers[id], ...patch } } }))
  }

  function updateModel(id: ProviderId, model: string) {
    updateProvider(id, { model, visionOverride: undefined })
  }

  async function testProvider(id: ProviderId) {
    setTestStatus((s) => ({ ...s, [id]: 'testing' }))
    try {
      const config = draft.providers[id]
      if (!(await ensureProviderAccess(id, config))) throw new Error('Permission denied for this provider.')
      await chatWithProvider(id, config, [{ role: 'user', content: 'Reply with the single word OK.' }])
      setTestStatus((s) => ({ ...s, [id]: 'ok' }))
    } catch (e) {
      setTestError((s) => ({ ...s, [id]: e instanceof Error ? e.message : 'Connection failed.' }))
      setTestStatus((s) => ({ ...s, [id]: 'error' }))
    }
  }

  async function fetchModels(id: ProviderId) {
    setModelStatus((s) => ({ ...s, [id]: 'loading' }))
    try {
      const config = draft.providers[id]
      if (!(await ensureProviderAccess(id, config))) throw new Error('Permission denied for this provider.')
      const models = await listModels(id, config)
      setModelOptions((o) => ({ ...o, [id]: models }))
      setModelStatus((s) => ({ ...s, [id]: 'idle' }))
    } catch (e) {
      setModelError((s) => ({ ...s, [id]: e instanceof Error ? e.message : 'Could not fetch models.' }))
      setModelStatus((s) => ({ ...s, [id]: 'error' }))
    }
  }

  async function handleSave() {
    setSaved(false)
    setSaveError(null)
    setSaving(true)
    try {
      await onSave(draft)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <SectionTitle icon="settings">AI provider</SectionTitle>
          <Badge tone="success">{PROVIDER_LABELS[draft.activeProvider]}</Badge>
        </div>
        <p className="mt-1.5 text-xs leading-5 text-muted">Choose the provider used for test cases and form data.</p>
        <label htmlFor="active-provider" className="mb-1.5 mt-3 block text-[11px] font-semibold text-muted">Active provider</label>
        <select
          id="active-provider"
          value={draft.activeProvider}
          onChange={(e) => setDraft((d) => ({ ...d, activeProvider: e.target.value as ProviderId }))}
          className={`${fieldClassName} cursor-pointer`}
        >
          {(Object.keys(PROVIDER_LABELS) as ProviderId[]).map((id) => (
            <option key={id} value={id}>
              {PROVIDER_LABELS[id]}
            </option>
          ))}
        </select>
      </Card>

      {(Object.keys(PROVIDER_LABELS) as ProviderId[]).map((id) => {
        const config = draft.providers[id]
        const currentVisionOverride = config.visionOverride?.model === config.model ? config.visionOverride : undefined
        const capability = getVisionCapability(id, config)
        const capabilityLabel = visionCapabilityLabel(capability)

        return <Card key={id} className={draft.activeProvider === id ? 'border-cta/30' : ''}>
          <div className="flex items-center justify-between gap-3">
            <SectionTitle icon={id === 'local' ? 'server' : 'globe'}>{PROVIDER_LABELS[id]}</SectionTitle>
            {testStatus[id] === 'ok' && <Badge tone="success">Connected</Badge>}
            {testStatus[id] === 'error' && <Badge tone="danger">Failed</Badge>}
            {testStatus[id] === 'testing' && <Badge tone="warning">Testing</Badge>}
            {testStatus[id] === undefined && draft.activeProvider === id && <Badge>Active</Badge>}
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {id !== 'local' && (
              <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted">
                {PROVIDER_LABELS[id]} API key
                <input
                  type="password"
                  autoComplete="off"
                  placeholder="API key"
                  value={draft.providers[id].apiKey}
                  onChange={(e) => updateProvider(id, { apiKey: e.target.value })}
                  className={fieldClassName}
                />
              </label>
            )}
            {modelOptions[id] && modelOptions[id]!.length > 0 ? (
              <div className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor={`model-${id}`}>{PROVIDER_LABELS[id]} model</label>
                  <span className="font-medium text-muted">{capabilityLabel}</span>
                </div>
                <select
                  id={`model-${id}`}
                  value={modelOptions[id]!.includes(config.model) ? config.model : CUSTOM_MODEL_VALUE}
                  onChange={(e) => {
                    if (e.target.value === CUSTOM_MODEL_VALUE) {
                      setModelOptions((o) => ({ ...o, [id]: [] }))
                      return
                    }
                    updateModel(id, e.target.value)
                  }}
                  className={`${fieldClassName} cursor-pointer`}
                >
                  {modelOptions[id]!.map((m) => (
                    <option key={m} value={m}>
                      {m} — {visionCapabilityLabel(getVisionCapability(id, { ...config, model: m, visionOverride: undefined }))}
                    </option>
                  ))}
                  <option value={CUSTOM_MODEL_VALUE}>Custom (type manually)…</option>
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor={`model-${id}`}>{PROVIDER_LABELS[id]} model</label>
                  <span className="font-medium text-muted">{capabilityLabel}</span>
                </div>
                <input
                  id={`model-${id}`}
                  placeholder="Model"
                  value={config.model}
                  onChange={(e) => updateModel(id, e.target.value)}
                  className={fieldClassName}
                />
              </div>
            )}
            {(capability === 'unknown' || currentVisionOverride) && (
              <label className="flex items-center gap-2 text-[11px] font-medium text-muted">
                <input
                  type="checkbox"
                  aria-label={`This model accepts image input for ${PROVIDER_LABELS[id]}`}
                  checked={Boolean(currentVisionOverride?.supported)}
                  onChange={(event) => updateProvider(id, {
                    visionOverride: event.target.checked ? { model: config.model, supported: true } : undefined,
                  })}
                />
                This model accepts image input
              </label>
            )}
            <Button variant="ghost" size="small" onClick={() => fetchModels(id)} disabled={modelStatus[id] === 'loading'} className="-ml-2 self-start">
              {modelStatus[id] === 'loading' ? <><Spinner /> Fetching models…</> : <><Icon name="download" /> Fetch available models</>}
            </Button>
            {modelStatus[id] === 'error' && modelError[id] && <InlineMessage tone="error">{modelError[id]}</InlineMessage>}
            {id === 'local' && (
              <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-muted">
                Local LLM base URL
                <input
                  type="url"
                  placeholder="Base URL (OpenAI-compatible)"
                  value={draft.providers[id].baseUrl}
                  onChange={(e) => updateProvider(id, { baseUrl: e.target.value })}
                  className={fieldClassName}
                />
              </label>
            )}
          </div>
          <Button variant="secondary" onClick={() => testProvider(id)} disabled={testStatus[id] === 'testing'} className="mt-3 w-full">
            {testStatus[id] === 'testing' ? <><Spinner /> Testing connection…</> : <><Icon name="server" /> Test connection</>}
          </Button>
          {testStatus[id] === 'error' && testError[id] && <div className="mt-3"><InlineMessage tone="error">{testError[id]}</InlineMessage></div>}
        </Card>
      })}

      <Card>
        <SectionTitle icon="file">Figma connection</SectionTitle>
        <p className="mt-1.5 text-xs leading-5 text-muted">Import Figma Design pages and frames with a personal token that has the <span className="font-mono text-text">file_content:read</span> scope.</p>
        <label className="mt-3 flex flex-col gap-1.5 text-[11px] font-semibold text-muted">
          Figma personal access token
          <input
            type="password"
            autoComplete="off"
            placeholder="Figma personal access token"
            value={draft.figma.personalAccessToken}
            onChange={(event) => setDraft((current) => ({ ...current, figma: { personalAccessToken: event.target.value } }))}
            className={fieldClassName}
          />
        </label>
        <InlineMessage>
          Personal tokens expire after at most 90 days. Generate a replacement in Figma settings if imports begin returning an access error.
        </InlineMessage>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <><Spinner /> Saving settings…</> : <><Icon name="check" /> Save settings</>}
      </Button>
      {saveError && <InlineMessage tone="error">{saveError}</InlineMessage>}
      {/* Always rendered (opacity-toggled) so its height doesn't pop in/out and shift/jump the scroll position. */}
      <p className="min-h-5 text-center text-xs font-medium text-cta-soft" aria-live="polite">
        {saved ? 'Settings saved.' : ''}
      </p>
      <p className="flex items-center justify-center gap-1.5 pb-1 text-center text-[11px] leading-5 text-muted"><Icon name="lock" className="h-3.5 w-3.5 shrink-0" /> API keys stay on this device and are never synced.</p>
    </div>
  )
}
