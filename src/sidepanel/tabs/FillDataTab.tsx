import { useState } from 'react'
import type { FillInstruction } from '../../content/fill'
import { buildTestDataPrompt } from '../../lib/promptTemplates'
import { chatWithProvider, ensureProviderAccess } from '../../lib/providers'
import { parseFieldValuesResponse } from '../../lib/aiJson'
import { fillActiveTab } from '../../lib/tabActions'
import type { RunRecord, Settings } from '../../lib/types'
import { Button, Card, EmptyState, Icon, InlineMessage, SectionTitle, Spinner, fieldClassName } from '../components/ui'

interface Props {
  tab: chrome.tabs.Tab
  settings: Settings
  siteRecord: RunRecord
  onUpdate: (next: RunRecord) => void
}

export function FillDataTab({ tab, settings, siteRecord, onUpdate }: Props) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filling, setFilling] = useState<string | null>(null) // 'all' | field id | null
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null)

  const webScan = siteRecord.lastScan?.source === 'web' ? siteRecord.lastScan : null
  const formFields = (webScan?.elements ?? []).filter(
    (e) => ['input', 'textarea', 'select'].includes(e.tag) && e.visible,
  )

  async function handleGenerate() {
    if (!webScan) return
    setError(null)
    setGenerating(true)
    try {
      const config = settings.providers[settings.activeProvider]
      if (!(await ensureProviderAccess(settings.activeProvider, config))) {
        throw new Error('Permission to contact the AI provider was denied.')
      }
      const variationToken = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const { system, user } = buildTestDataPrompt(webScan.elements, variationToken, siteRecord.fieldValues)
      const text = await chatWithProvider(settings.activeProvider, config, [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ], { temperature: 0.9 })
      const parsed = parseFieldValuesResponse(text)
      const fieldValues = { ...siteRecord.fieldValues }
      for (const { id, value } of parsed) fieldValues[id] = value
      onUpdate({ ...siteRecord, fieldValues })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test data generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  function setValue(id: string, value: string) {
    onUpdate({ ...siteRecord, fieldValues: { ...siteRecord.fieldValues, [id]: value } })
  }

  async function fillOne(id: string) {
    const field = formFields.find((f) => f.id === id)
    const value = siteRecord.fieldValues[id]
    if (!field || value === undefined) return
    setError(null)
    setFilling(id)
    try {
      await fillActiveTab(tab, [{ selector: field.selector, value, type: field.type }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fill this field. Try scanning the page again.')
    } finally {
      setFilling(null)
    }
  }

  function openFieldChooser() {
    setSelectedIds(new Set(formFields.filter((field) => siteRecord.fieldValues[field.id] !== undefined).map((field) => field.id)))
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current ?? [])
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function fillSelected() {
    if (!selectedIds || selectedIds.size === 0) return
    setError(null)
    setFilling('all')
    try {
      const instructions: FillInstruction[] = formFields
        .filter((f) => selectedIds.has(f.id) && siteRecord.fieldValues[f.id] !== undefined)
        .map((f) => ({ selector: f.selector, value: siteRecord.fieldValues[f.id], type: f.type }))
      await fillActiveTab(tab, instructions)
      setSelectedIds(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fill the page. Try scanning it again.')
    } finally {
      setFilling(null)
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Card>
        <SectionTitle icon="fill">Test data</SectionTitle>
        <p className="mt-1.5 text-xs leading-5 text-muted">Generate realistic values, review them, then choose several fields or fill one field at a time.</p>
        {!siteRecord.lastScan ? (
          <div className="mt-3"><EmptyState icon="scan" title="No page scan" description="Scan the current page first to discover its form fields." /></div>
        ) : siteRecord.lastScan.source === 'figma' ? (
          <div className="mt-3"><EmptyState icon="fill" title="Live page required" description="Fill Data is available only for live web-page scans. Figma designs can be used to generate test cases." /></div>
        ) : formFields.length === 0 ? (
          <div className="mt-3"><EmptyState icon="fill" title="No form fields found" description="The latest scan did not detect visible inputs, textareas, or selects." /></div>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <Button onClick={handleGenerate} disabled={generating} className="flex-1">
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner /> Generating…
                  </span>
                ) : (
                  <><Icon name="sparkles" /> Generate data</>
                )}
              </Button>
              <Button variant="secondary" onClick={openFieldChooser} disabled={filling !== null || Object.keys(siteRecord.fieldValues).length === 0}>
                {filling === 'all' ? <Spinner /> : <><Icon name="fill" /> Choose fields</>}
              </Button>
            </div>
            {error && <div className="mt-3"><InlineMessage tone="error">{error}</InlineMessage></div>}

            {selectedIds && (
              <fieldset aria-label="Fields to fill" className="mt-3 rounded-xl border border-border bg-bg/35 p-3">
                <legend className="px-1 text-xs font-semibold text-text">Fields to fill</legend>
                <div className="mt-1 flex gap-2">
                  <Button variant="ghost" size="small" onClick={() => setSelectedIds(new Set(formFields.filter((field) => siteRecord.fieldValues[field.id] !== undefined).map((field) => field.id)))}>Select all</Button>
                  <Button variant="ghost" size="small" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {formFields.filter((field) => siteRecord.fieldValues[field.id] !== undefined).map((field) => {
                    const label = field.label || field.name || field.placeholder || field.tag
                    return (
                      <label key={field.id} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs text-muted hover:bg-surface-hover">
                        <input type="checkbox" checked={selectedIds.has(field.id)} onChange={() => toggleSelected(field.id)} aria-label={`Select ${label}`} className="h-4 w-4 accent-[var(--color-cta)]" />
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                      </label>
                    )
                  })}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                  <Button variant="secondary" size="small" onClick={() => setSelectedIds(null)}>Cancel</Button>
                  <Button size="small" disabled={selectedIds.size === 0 || filling !== null} onClick={fillSelected}>
                    {filling === 'all' ? <Spinner /> : `Fill ${selectedIds.size} ${selectedIds.size === 1 ? 'field' : 'fields'}`}
                  </Button>
                </div>
              </fieldset>
            )}

            <ul className="mt-3 flex flex-col gap-2.5 border-t border-border pt-3">
              {formFields.map((field) => (
                <li key={field.id} className="flex items-end gap-2 rounded-xl border border-border bg-bg/35 p-2.5">
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`field-${field.id}`} title={field.label || field.name || field.placeholder || field.tag} className="mb-1 block truncate text-[11px] font-semibold text-muted">
                      {field.label || field.name || field.placeholder || field.tag}
                    </label>
                    <input
                      id={`field-${field.id}`}
                      value={siteRecord.fieldValues[field.id] ?? ''}
                      onChange={(e) => setValue(field.id, e.target.value)}
                      className={fieldClassName}
                      placeholder="Enter a test value"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => fillOne(field.id)}
                    disabled={filling !== null || siteRecord.fieldValues[field.id] === undefined}
                    className="mb-1"
                  >
                    {filling === field.id ? <Spinner /> : <><Icon name="fill" /> Fill</>}
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  )
}
