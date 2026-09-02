import { useRef, useState } from 'react'
import { toCsv, toMarkdown } from '../../lib/export'
import { originPatternFor, requestOriginAccess } from '../../lib/permissions'
import { buildTestCasePrompt } from '../../lib/promptTemplates'
import { chatWithProvider, ensureProviderAccess } from '../../lib/providers'
import { parseTestCasesResponse } from '../../lib/aiJson'
import { scanActiveTab } from '../../lib/tabActions'
import type { Settings, SiteRecord, TestCaseFormat } from '../../lib/types'
import { Badge, Button, Card, EmptyState, Icon, InlineMessage, SectionTitle, Spinner, fieldClassName } from '../components/ui'

interface Props {
  tab: chrome.tabs.Tab
  granted: boolean | null
  setGranted: (granted: boolean) => void
  settings: Settings
  siteRecord: SiteRecord
  onUpdate: (next: SiteRecord) => void
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ScanTab({ tab, granted, setGranted, settings, siteRecord, onUpdate }: Props) {
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [format, setFormat] = useState<TestCaseFormat>('plain')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scan = siteRecord.lastScan

  async function handleScan() {
    setScanError(null)
    setScanning(true)
    try {
      if (!granted) {
        const grantedNow = await requestOriginAccess(originPatternFor(tab.url!))
        setGranted(grantedNow)
        if (!grantedNow) throw new Error('Permission denied for this site.')
      }
      const result = await scanActiveTab(tab)
      onUpdate({ ...siteRecord, lastScan: result })
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Scan failed.')
    } finally {
      setScanning(false)
    }
  }

  function handleRequirementsChange(text: string) {
    onUpdate({ ...siteRecord, requirementsText: text })
  }

  function handleFileUpload(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      handleRequirementsChange(`${siteRecord.requirementsText}\n\n${text}`.trim())
    }
    reader.readAsText(file)
  }

  async function handleGenerate() {
    if (!scan) return
    setGenError(null)
    setGenerating(true)
    try {
      const config = settings.providers[settings.activeProvider]
      if (!(await ensureProviderAccess(settings.activeProvider, config))) {
        throw new Error('Permission to contact the AI provider was denied.')
      }
      const { system, user } = buildTestCasePrompt(scan.elements, siteRecord.requirementsText, format)
      const images = scan.screenshotDataUrl ? [scan.screenshotDataUrl] : undefined
      const text = await chatWithProvider(
        settings.activeProvider,
        config,
        [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        { images },
      )
      const parsed = parseTestCasesResponse(text)
      const testCases = parsed.map((tc, i) => ({ ...tc, id: tc.id || `tc-${Date.now()}-${i}` }))
      onUpdate({ ...siteRecord, testCases })
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Test case generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  function removeTestCase(id: string) {
    onUpdate({ ...siteRecord, testCases: siteRecord.testCases.filter((tc) => tc.id !== id) })
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <SectionTitle icon="scan">Page scan</SectionTitle>
          {scan && <Badge tone="success">{scan.elements.length} elements</Badge>}
        </div>
        <p className="mt-1.5 text-xs leading-5 text-muted">Capture interactive elements and a visual snapshot of the current page.</p>
        <Button onClick={handleScan} disabled={scanning} className="mt-3 w-full">
          {scanning ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> Scanning…
            </span>
          ) : (
            <><Icon name="scan" /> Scan current page</>
          )}
        </Button>
        {scanError && <div className="mt-3"><InlineMessage tone="error">{scanError}</InlineMessage></div>}
        {scan?.screenshotDataUrl && (
          <figure className="mt-3 overflow-hidden rounded-xl border border-border bg-bg">
            <img src={scan.screenshotDataUrl} alt="Page screenshot preview" className="max-h-44 w-full object-cover object-top" />
            <figcaption className="flex items-center gap-2 border-t border-border px-3 py-2 text-[11px] text-muted">
              <Icon name="image" className="h-3.5 w-3.5" /> Latest page snapshot
            </figcaption>
          </figure>
        )}
      </Card>

      <Card>
        <SectionTitle icon="file">Requirements</SectionTitle>
        <label htmlFor="requirements" className="mt-1.5 block text-xs leading-5 text-muted">
          Add acceptance criteria to make generated tests more specific.
        </label>
        <textarea
          id="requirements"
          value={siteRecord.requirementsText}
          onChange={(e) => handleRequirementsChange(e.target.value)}
          placeholder="Paste requirements or acceptance criteria here (optional)…"
          rows={4}
          className={`${fieldClassName} mt-2 resize-y leading-5`}
        />
        <div className="mt-2 flex items-center gap-2">
          <Button variant="secondary" size="small" onClick={() => fileInputRef.current?.click()}>
            <Icon name="upload" /> Upload file
          </Button>
          <span className="text-[11px] text-subtle">.txt or .md</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            aria-label="Upload requirements file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
              e.target.value = ''
            }}
          />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <SectionTitle icon="sparkles">Test cases</SectionTitle>
          <div aria-label="Test case format" role="group" className="flex gap-1 rounded-lg border border-border bg-bg/60 p-0.5">
            {(['plain', 'gherkin'] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={format === f}
                onClick={() => setFormat(f)}
                className={`min-h-7 cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                  format === f ? 'bg-surface-raised text-cta-soft' : 'text-muted hover:bg-surface-hover hover:text-text'
                }`}
              >
                {f === 'plain' ? 'Plain' : 'Gherkin'}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1.5 text-xs leading-5 text-muted">Generate actionable manual scenarios from the scan and requirements.</p>
        <Button onClick={handleGenerate} disabled={!scan || generating} className="mt-3 w-full">
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> Generating…
            </span>
          ) : (
            <><Icon name="sparkles" /> Generate test cases</>
          )}
        </Button>
        {!scan && <div className="mt-3"><InlineMessage>Scan the current page before generating test cases.</InlineMessage></div>}
        {genError && <div className="mt-3"><InlineMessage tone="error">{genError}</InlineMessage></div>}

        {siteRecord.testCases.length > 0 && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
              <Button variant="secondary" size="small" onClick={() => downloadFile('test-cases.md', toMarkdown(siteRecord.testCases), 'text/markdown')}>
                <Icon name="download" /> Markdown
              </Button>
              <Button variant="secondary" size="small" onClick={() => downloadFile('test-cases.csv', toCsv(siteRecord.testCases), 'text/csv')}>
                <Icon name="download" /> CSV
              </Button>
            </div>
            <ul className="mt-3 flex flex-col gap-2.5">
              {siteRecord.testCases.map((tc) => (
                <li key={tc.id} className="rounded-xl border border-border bg-bg/35 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-[13px] font-semibold leading-5 text-text">{tc.title}</p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge tone={tc.priority === 'High' ? 'danger' : tc.priority === 'Medium' ? 'warning' : 'muted'}>{tc.priority}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => removeTestCase(tc.id)} className="h-8 w-8 text-subtle hover:text-danger" aria-label="Remove test case">
                        <Icon name="trash" className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {format === 'gherkin' && tc.gherkin ? (
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-bg/60 p-2.5 font-mono text-[11px] leading-5 text-muted">{tc.gherkin}</pre>
                  ) : (
                    <>
                      <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-5 text-muted marker:text-subtle">
                        {tc.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                      {tc.expectedResult && <p className="mt-2 border-t border-border pt-2 text-xs leading-5 text-muted"><span className="font-semibold text-text">Expected:</span> {tc.expectedResult}</p>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        {scan && siteRecord.testCases.length === 0 && !generating && (
          <div className="mt-3"><EmptyState icon="file" title="No test cases yet" description="Generate a set when your scan and requirements are ready." /></div>
        )}
      </Card>
    </div>
  )
}
