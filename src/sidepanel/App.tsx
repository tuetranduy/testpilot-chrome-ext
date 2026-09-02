import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { hasOriginAccess, originPatternFor } from '../lib/permissions'
import { emptySiteRecord, getSettings, getSiteRecord, saveSettings, saveSiteRecord } from '../lib/storage'
import { getActiveTab } from '../lib/tabActions'
import type { Settings, SiteRecord } from '../lib/types'
import { Badge, BrandMark, Button, Icon, InlineMessage, type IconName } from './components/ui'
import { FillDataTab } from './tabs/FillDataTab'
import { HistoryTab } from './tabs/HistoryTab'
import { ScanTab } from './tabs/ScanTab'
import { SettingsTab } from './tabs/SettingsTab'

type TabId = 'scan' | 'fill' | 'history' | 'settings'

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'scan', label: 'Scan', icon: 'scan' },
  { id: 'fill', label: 'Fill', icon: 'fill' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

export default function App() {
  const [activeTabId, setActiveTabId] = useState<TabId>('scan')
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null)
  const [granted, setGranted] = useState<boolean | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [siteRecord, setSiteRecord] = useState<SiteRecord | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [persistenceError, setPersistenceError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const pendingRecordRef = useRef<SiteRecord | null>(null)
  const tabUrl = tab?.url

  const originPathKey = useMemo(() => {
    if (!tabUrl) return null
    try {
      const u = new URL(tabUrl)
      return { origin: u.origin, pathname: u.pathname }
    } catch {
      return null
    }
  }, [tabUrl])

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Could not load settings.'))
  }, [loadAttempt])

  useEffect(() => {
    let cancelled = false
    getActiveTab()
      .then(async (t) => {
        if (cancelled) return
        setTab(t)
        if (t.url) setGranted(await hasOriginAccess(originPatternFor(t.url)))
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not read the active tab.')
      })
    return () => {
      cancelled = true
    }
  }, [loadAttempt])

  useEffect(() => {
    if (!originPathKey) return
    let cancelled = false
    getSiteRecord(originPathKey.origin, originPathKey.pathname)
      .then((record) => {
        if (cancelled) return
        setSiteRecord(record ?? emptySiteRecord(originPathKey.origin, originPathKey.pathname))
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Could not load saved page data.')
      })
    return () => {
      cancelled = true
    }
  }, [originPathKey, loadAttempt])

  async function saveRecord(record: SiteRecord) {
    try {
      await saveSiteRecord(record)
      if (pendingRecordRef.current === record) setPersistenceError(null)
    } catch (error) {
      if (pendingRecordRef.current === record) {
        setPersistenceError(error instanceof Error ? `Changes could not be saved: ${error.message}` : 'Changes could not be saved locally.')
      }
    }
  }

  function persist(next: SiteRecord) {
    const record = { ...next, updatedAt: Date.now() }
    setSiteRecord(next)
    pendingRecordRef.current = record
    void saveRecord(record)
  }

  function retrySave() {
    const record = pendingRecordRef.current
    if (record) void saveRecord(record)
  }

  async function persistSettings(next: Settings) {
    setSettings(next)
    await saveSettings(next)
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % TABS.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + TABS.length) % TABS.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = TABS.length - 1
    if (nextIndex === null) return

    event.preventDefault()
    const nextTab = TABS[nextIndex]
    setActiveTabId(nextTab.id)
    document.getElementById(`tab-${nextTab.id}`)?.focus()
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-transparent font-sans text-sm text-text">
      <header className="relative z-10 shrink-0 border-b border-border bg-bg/95 px-3.5 pb-3 pt-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-8 w-8 shrink-0 drop-shadow-[0_4px_12px_rgba(69,212,141,0.2)]" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[14px] font-semibold tracking-tight text-text">TestPilot</p>
            <p className="text-[11px] text-muted">AI-assisted manual QA</p>
          </div>
        </div>
        {tab?.url ? (
          <div className="mt-3 flex min-w-0 items-center gap-2 rounded-xl border border-border bg-surface/75 p-2.5 text-xs text-muted shadow-input">
            <Icon name="globe" className="h-4 w-4 shrink-0 text-subtle" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-text">{new URL(tab.url).hostname}</p>
              <p className="truncate text-[10px] text-subtle">{originPathKey?.pathname || '/'}</p>
            </div>
            <Badge tone={granted ? 'success' : 'muted'}>{granted ? 'Access granted' : 'No access yet'}</Badge>
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-border bg-surface p-2.5 text-xs text-muted" role="status">{loadError ?? 'Loading active tab…'}</p>
        )}
        <nav aria-label="TestPilot views" role="tablist" className="mt-3 grid grid-cols-4 gap-1 rounded-xl border border-border bg-surface p-1 shadow-input">
          {TABS.map((t, index) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={activeTabId === t.id}
              aria-controls="active-panel"
              tabIndex={activeTabId === t.id ? 0 : -1}
              onClick={() => setActiveTabId(t.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={`flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-[10px] font-semibold transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none ${
                activeTabId === t.id ? 'bg-surface-raised text-cta-soft shadow-sm' : 'text-muted hover:bg-surface-hover hover:text-text'
              }`}
            >
              <Icon name={t.icon} className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main
        id="active-panel"
        role="tabpanel"
        aria-labelledby={`tab-${activeTabId}`}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto px-3.5 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <h1 className="sr-only">{TABS.find((tabItem) => tabItem.id === activeTabId)?.label}</h1>
        {!tab || !settings || !siteRecord ? (
          loadError ? (
            <InlineMessage tone="error">
              <p>{loadError}</p>
              <Button variant="secondary" size="small" className="mt-2" onClick={() => { setLoadError(null); setLoadAttempt((attempt) => attempt + 1) }}>
                Retry
              </Button>
            </InlineMessage>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 text-xs text-muted" role="status">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cta motion-reduce:animate-none" />
              Preparing your workspace…
            </div>
          )
        ) : activeTabId === 'scan' ? (
          <>
            {persistenceError && (
              <div className="mb-3">
                <InlineMessage tone="error">
                  <p>{persistenceError}</p>
                  <Button variant="secondary" size="small" className="mt-2" onClick={retrySave}>Retry save</Button>
                </InlineMessage>
              </div>
            )}
            <ScanTab tab={tab} granted={granted} setGranted={setGranted} settings={settings} siteRecord={siteRecord} onUpdate={persist} />
          </>
        ) : activeTabId === 'fill' ? (
          <>
            {persistenceError && (
              <div className="mb-3">
                <InlineMessage tone="error">
                  <p>{persistenceError}</p>
                  <Button variant="secondary" size="small" className="mt-2" onClick={retrySave}>Retry save</Button>
                </InlineMessage>
              </div>
            )}
            <FillDataTab tab={tab} settings={settings} siteRecord={siteRecord} onUpdate={persist} />
          </>
        ) : activeTabId === 'history' ? (
          <HistoryTab />
        ) : (
          <SettingsTab settings={settings} onSave={persistSettings} />
        )}
      </main>
    </div>
  )
}
