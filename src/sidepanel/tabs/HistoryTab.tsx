import { useEffect, useState } from 'react'
import { deleteRunRecord, listRunRecords, runKey } from '../../lib/storage'
import type { RunRecord } from '../../lib/types'
import { Badge, Button, Card, EmptyState, Icon, InlineMessage, SectionTitle, Spinner } from '../components/ui'

export function HistoryTab() {
  const [records, setRecords] = useState<RunRecord[] | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    setError(null)
    try {
      setRecords(await listRunRecords())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load saved runs.')
      setRecords([])
    }
  }

  useEffect(() => {
    let cancelled = false
    void listRunRecords().then((next) => {
      if (!cancelled) setRecords(next)
    }).catch((loadError) => {
      if (!cancelled) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load saved runs.')
        setRecords([])
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleDelete(record: RunRecord) {
    if (!window.confirm(`Delete the saved run for ${record.locator.label}?`)) return
    const key = runKey(record.locator)
    setDeleting(key)
    setError(null)
    try {
      await deleteRunRecord(record.locator)
      await load()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this saved run.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="px-1">
        <SectionTitle icon="history">Saved runs</SectionTitle>
        <p className="mt-1 text-xs leading-5 text-muted">Review test cases saved locally for web pages, Figma designs, and image scans.</p>
      </div>
      {error ? (
        <InlineMessage tone="error">
          <p>{error}</p>
          <Button variant="secondary" size="small" className="mt-2" onClick={load}>Retry</Button>
        </InlineMessage>
      ) : !records ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 text-xs text-muted" role="status">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cta motion-reduce:animate-none" /> Loading saved runs…
        </div>
      ) : records.length === 0 ? (
        <EmptyState icon="history" title="No saved runs" description="Scanned pages and generated test cases will appear here." />
      ) : (
        records.map((record, index) => {
          const key = runKey(record.locator)
          const panelId = `history-test-cases-${index}`
          return (
            <Card key={key}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-text">{record.locator.label}</p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted">{record.locator.source === 'image' ? `${record.lastScan?.images.length ?? 0} uploaded images` : record.locator.url}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge>{record.locator.source === 'figma' ? 'Figma design' : record.locator.source === 'image' ? 'Images' : 'Web page'}</Badge>
                  <span className="text-[10px] text-subtle">{record.testCases.length} test cases</span>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-subtle">Updated <time dateTime={new Date(record.updatedAt).toISOString()}>{new Date(record.updatedAt).toLocaleString()}</time></p>
              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 border-t border-border pt-3">
                <Button
                  variant="secondary"
                  size="small"
                  aria-expanded={expanded === key}
                  aria-controls={panelId}
                  onClick={() => setExpanded(expanded === key ? null : key)}
                >
                  <Icon name="chevron" className={`h-4 w-4 transition-transform duration-150 ${expanded === key ? 'rotate-180' : ''}`} />
                  {expanded === key ? 'Hide' : 'View'} test cases
                </Button>
                <Button variant="danger" size="small" disabled={deleting === key} onClick={() => handleDelete(record)}>
                  {deleting === key ? <><Spinner /> Deleting…</> : <><Icon name="trash" /> Delete</>}
                </Button>
              </div>
              {expanded === key && (
                <ul id={panelId} className="mt-3 flex list-disc flex-col gap-1.5 rounded-xl border border-border bg-bg/35 py-2.5 pl-7 pr-3 marker:text-cta">
                  {record.testCases.length === 0 && <li className="text-xs text-muted marker:text-subtle">No test cases were generated for this run.</li>}
                  {record.testCases.map((tc) => (
                    <li key={tc.id} className="text-xs leading-5 text-muted">
                      {tc.title}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}
