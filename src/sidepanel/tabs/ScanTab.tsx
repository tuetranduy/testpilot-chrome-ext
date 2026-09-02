import { useRef, useState } from 'react'
import { featureFilename, toCsv, toFeature, toMarkdown } from '../../lib/export'
import { loadFigmaTargets, scanFigmaTarget, type FigmaTarget, type LoadedFigmaTargets } from '../../lib/figma'
import { hasOriginAccess, originPatternFor, requestOriginAccess } from '../../lib/permissions'
import { buildTestCasePrompt } from '../../lib/promptTemplates'
import { chatWithProvider, ensureProviderAccess } from '../../lib/providers'
import { parseTestCasesResponse } from '../../lib/aiJson'
import { scanActiveTab } from '../../lib/tabActions'
import { generateTestCaseSuite } from '../../lib/testCaseGeneration'
import type { RunLocator, RunRecord, Settings, TestCaseFormat, WebRunLocator } from '../../lib/types'
import { Badge, Button, Card, EmptyState, Icon, InlineMessage, SectionTitle, Spinner, fieldClassName } from '../components/ui'

interface Props {
  tab: chrome.tabs.Tab
  granted: boolean | null
  setGranted: (granted: boolean) => void
  settings: Settings
  siteRecord: RunRecord
  onUpdate: (next: RunRecord) => void
  onSelectRun: (locator: RunLocator) => void | Promise<void>
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function webLocator(tab: chrome.tabs.Tab): WebRunLocator {
  const url = new URL(tab.url!)
  return {
    source: 'web',
    origin: url.origin,
    pathname: url.pathname,
    url: url.toString(),
    label: tab.title?.trim() || `${url.hostname}${url.pathname}`,
  }
}

function isFigmaTab(url: string | undefined): boolean {
  try { return Boolean(url && /(^|\.)figma\.com$/i.test(new URL(url).hostname)) }
  catch { return false }
}

async function ensureOrigin(originPattern: string): Promise<boolean> {
  return (await hasOriginAccess(originPattern)) || requestOriginAccess(originPattern)
}

export function ScanTab({ tab, granted, setGranted, settings, siteRecord, onUpdate, onSelectRun }: Props) {
  const [source, setSource] = useState<'web' | 'figma'>(siteRecord.locator.source)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [genError, setGenError] = useState<string | null>(null)
  const [format, setFormat] = useState<TestCaseFormat>('plain')
  const [countMode, setCountMode] = useState<number | 'custom'>(10)
  const [customCount, setCustomCount] = useState('10')
  const [figmaUrl, setFigmaUrl] = useState(isFigmaTab(tab.url) ? tab.url! : (siteRecord.locator.source === 'figma' ? siteRecord.locator.url : ''))
  const [loadedFigma, setLoadedFigma] = useState<LoadedFigmaTargets | null>(null)
  const [selectedTargetId, setSelectedTargetId] = useState('')
  const [loadingFigma, setLoadingFigma] = useState(false)
  const [switchingRun, setSwitchingRun] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scan = siteRecord.lastScan?.source === source ? siteRecord.lastScan : null
  const parsedCustomCount = Number(customCount)
  const customCountValid = Number.isInteger(parsedCustomCount) && parsedCustomCount >= 1 && parsedCustomCount <= 50
  const requestedCount = countMode === 'custom' ? parsedCustomCount : countMode
  const canDownloadFeature = siteRecord.testCases.length > 0 && siteRecord.testCases.every((testCase) => Boolean(testCase.gherkin?.trim()))

  async function selectSource(next: 'web' | 'figma') {
    setSource(next)
    setScanError(null)
    if (next === 'web') await onSelectRun(webLocator(tab))
  }

  async function handleWebScan() {
    setScanError(null)
    setScanning(true)
    try {
      if (!granted) {
        const grantedNow = await requestOriginAccess(originPatternFor(tab.url!))
        setGranted(grantedNow)
        if (!grantedNow) throw new Error('Permission denied for this site.')
      }
      const result = await scanActiveTab(tab)
      onUpdate({ ...siteRecord, locator: webLocator(tab), lastScan: result })
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Scan failed.')
    } finally {
      setScanning(false)
    }
  }

  function figmaLocator(loaded: LoadedFigmaTargets, target: FigmaTarget): RunLocator {
    return {
      source: 'figma',
      fileKey: loaded.parsed.fileKey,
      nodeId: target.id,
      url: loaded.parsed.url,
      label: `${loaded.fileName} — ${target.name}`,
    }
  }

  async function selectFigmaTarget(targetId: string, loaded = loadedFigma) {
    setSelectedTargetId(targetId)
    const target = loaded?.targets.find((item) => item.id === targetId)
    if (!loaded || !target) return
    setSwitchingRun(true)
    try {
      await onSelectRun(figmaLocator(loaded, target))
    } finally {
      setSwitchingRun(false)
    }
  }

  async function handleLoadFigma() {
    setScanError(null)
    setLoadingFigma(true)
    try {
      if (!(await ensureOrigin('https://api.figma.com/*'))) throw new Error('Permission to contact the Figma API was denied.')
      const loaded = await loadFigmaTargets(figmaUrl, settings.figma.personalAccessToken)
      setLoadedFigma(loaded)
      const target = loaded.targets.find((item) => item.id === loaded.parsed.nodeId) ?? loaded.targets[0]
      await selectFigmaTarget(target.id, loaded)
    } catch (error) {
      setLoadedFigma(null)
      setSelectedTargetId('')
      setScanError(error instanceof Error ? error.message : 'Could not load this Figma design.')
    } finally {
      setLoadingFigma(false)
    }
  }

  async function handleFigmaScan() {
    const target = loadedFigma?.targets.find((item) => item.id === selectedTargetId)
    if (!loadedFigma || !target) return
    setScanError(null)
    setScanning(true)
    try {
      const result = await scanFigmaTarget({
        parsed: loadedFigma.parsed,
        target,
        token: settings.figma.personalAccessToken,
        ensureOriginAccess: async (url) => ensureOrigin(originPatternFor(url)),
      })
      onUpdate({ ...siteRecord, locator: figmaLocator(loadedFigma, target), lastScan: result, fieldValues: {} })
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Figma scan failed.')
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
    if (!scan || !Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 50) return
    setGenError(null)
    setGenerating(true)
    setGenerationProgress(0)
    try {
      const config = settings.providers[settings.activeProvider]
      if (!(await ensureProviderAccess(settings.activeProvider, config))) {
        throw new Error('Permission to contact the AI provider was denied.')
      }
      const generated = await generateTestCaseSuite(requestedCount, async (batchCount, excludedTitles) => {
        const { system, user } = buildTestCasePrompt(scan, siteRecord.requirementsText, format, batchCount, excludedTitles)
        const text = await chatWithProvider(
          settings.activeProvider,
          config,
          [{ role: 'system', content: system }, { role: 'user', content: user }],
          { images: scan.screenshotDataUrl ? [scan.screenshotDataUrl] : undefined },
        )
        return parseTestCasesResponse(text)
      }, (completed) => setGenerationProgress(completed))
      const stamp = Date.now()
      const testCases = generated.map((testCase, index) => ({ ...testCase, id: testCase.id || `tc-${stamp}-${index}` }))
      onUpdate({ ...siteRecord, testCases })
    } catch (error) {
      setGenError(error instanceof Error ? error.message : 'Test case generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  function removeTestCase(id: string) {
    onUpdate({ ...siteRecord, testCases: siteRecord.testCases.filter((testCase) => testCase.id !== id) })
  }

  const groupedTargets = loadedFigma?.targets.reduce<Record<string, FigmaTarget[]>>((groups, target) => {
    ;(groups[target.pageName] ??= []).push(target)
    return groups
  }, {}) ?? {}

  return (
    <div className="flex flex-col gap-3.5">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <SectionTitle icon="scan">Source scan</SectionTitle>
          {scan && <Badge tone="success">{scan.source === 'web' ? `${scan.elements.length} elements` : `${scan.nodes.length} nodes`}</Badge>}
        </div>
        <div aria-label="Scan source" role="group" className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-border bg-bg/60 p-1">
          {(['web', 'figma'] as const).map((item) => (
            <button key={item} type="button" aria-pressed={source === item} onClick={() => void selectSource(item)} className={`min-h-9 cursor-pointer rounded-md px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${source === item ? 'bg-surface-raised text-cta-soft shadow-sm' : 'text-muted hover:bg-surface-hover'}`}>
              {item === 'web' ? 'Web page' : 'Figma'}
            </button>
          ))}
        </div>

        {source === 'web' ? (
          <>
            <p className="mt-2 text-xs leading-5 text-muted">Capture interactive elements and a visual snapshot of the current page.</p>
            <Button onClick={handleWebScan} disabled={scanning} className="mt-3 w-full">
              {scanning ? <><Spinner /> Scanning…</> : <><Icon name="scan" /> Scan current page</>}
            </Button>
          </>
        ) : (
          <div className="mt-3 flex flex-col gap-2.5">
            <label htmlFor="figma-url" className="text-[11px] font-semibold text-muted">Figma Design URL</label>
            <input id="figma-url" type="url" value={figmaUrl} onChange={(event) => setFigmaUrl(event.target.value)} placeholder="https://www.figma.com/design/…" className={fieldClassName} />
            <Button variant="secondary" onClick={handleLoadFigma} disabled={loadingFigma || !figmaUrl.trim()}>
              {loadingFigma ? <><Spinner /> Loading designs…</> : <><Icon name="download" /> Load designs</>}
            </Button>
            {loadedFigma && (
              <>
                <label htmlFor="figma-target" className="text-[11px] font-semibold text-muted">Page or frame</label>
                <select id="figma-target" value={selectedTargetId} onChange={(event) => void selectFigmaTarget(event.target.value)} className={`${fieldClassName} cursor-pointer`}>
                  {Object.entries(groupedTargets).map(([pageName, targets]) => (
                    <optgroup key={pageName} label={pageName}>
                      {targets.map((target) => <option key={target.id} value={target.id}>{target.type === 'CANVAS' ? `${target.name} (page)` : target.name}</option>)}
                    </optgroup>
                  ))}
                </select>
                <Button onClick={handleFigmaScan} disabled={scanning || switchingRun || !selectedTargetId}>
                  {scanning ? <><Spinner /> Scanning design…</> : <><Icon name="scan" /> Scan design</>}
                </Button>
              </>
            )}
          </div>
        )}

        {scanError && <div className="mt-3"><InlineMessage tone="error">{scanError}</InlineMessage></div>}
        {scan?.source === 'figma' && scan.previewWarning && <div className="mt-3"><InlineMessage>{scan.previewWarning}</InlineMessage></div>}
        {scan?.screenshotDataUrl && (
          <figure className="mt-3 overflow-hidden rounded-xl border border-border bg-bg">
            <img src={scan.screenshotDataUrl} alt={scan.source === 'figma' ? 'Figma design preview' : 'Page screenshot preview'} className="max-h-44 w-full object-cover object-top" />
            <figcaption className="flex items-center gap-2 border-t border-border px-3 py-2 text-[11px] text-muted"><Icon name="image" className="h-3.5 w-3.5" /> Latest {scan.source === 'figma' ? 'design' : 'page'} snapshot</figcaption>
          </figure>
        )}
      </Card>

      <Card>
        <SectionTitle icon="file">Requirements</SectionTitle>
        <label htmlFor="requirements" className="mt-1.5 block text-xs leading-5 text-muted">Add acceptance criteria to make generated tests more specific.</label>
        <textarea id="requirements" value={siteRecord.requirementsText} onChange={(event) => handleRequirementsChange(event.target.value)} placeholder="Paste requirements or acceptance criteria here (optional)…" rows={4} className={`${fieldClassName} mt-2 resize-y leading-5`} />
        <div className="mt-2 flex items-center gap-2">
          <Button variant="secondary" size="small" onClick={() => fileInputRef.current?.click()}><Icon name="upload" /> Upload file</Button>
          <span className="text-[11px] text-subtle">.txt or .md</span>
          <input ref={fileInputRef} type="file" accept=".txt,.md" aria-label="Upload requirements file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleFileUpload(file); event.target.value = '' }} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <SectionTitle icon="sparkles">Test cases</SectionTitle>
          <div aria-label="Test case format" role="group" className="flex gap-1 rounded-lg border border-border bg-bg/60 p-0.5">
            {(['plain', 'gherkin'] as const).map((item) => (
              <button key={item} type="button" aria-pressed={format === item} onClick={() => setFormat(item)} className={`min-h-7 cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${format === item ? 'bg-surface-raised text-cta-soft' : 'text-muted hover:bg-surface-hover hover:text-text'}`}>{item === 'plain' ? 'Plain' : 'Gherkin'}</button>
            ))}
          </div>
        </div>
        <p className="mt-1.5 text-xs leading-5 text-muted">Generate an exact number of reviewable scenarios from the scan and requirements.</p>

        <div aria-label="Test-case count" role="group" className="mt-3 grid grid-cols-5 gap-1">
          {[5, 10, 15, 20].map((count) => (
            <button key={count} type="button" aria-label={`${count} test cases`} aria-pressed={countMode === count} onClick={() => setCountMode(count)} className={`min-h-9 cursor-pointer rounded-lg border px-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${countMode === count ? 'border-cta/40 bg-cta/10 text-cta-soft' : 'border-border text-muted hover:bg-surface-hover'}`}>{count}</button>
          ))}
          <button type="button" aria-label="Custom test-case count" aria-pressed={countMode === 'custom'} onClick={() => setCountMode('custom')} className={`min-h-9 cursor-pointer rounded-lg border px-1 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${countMode === 'custom' ? 'border-cta/40 bg-cta/10 text-cta-soft' : 'border-border text-muted hover:bg-surface-hover'}`}>Custom</button>
        </div>
        {countMode === 'custom' && (
          <div className="mt-2">
            <label htmlFor="custom-test-count" className="mb-1 block text-[11px] font-semibold text-muted">Custom test-case count</label>
            <input id="custom-test-count" type="number" min={1} max={50} step={1} value={customCount} onChange={(event) => setCustomCount(event.target.value)} aria-describedby={!customCountValid ? 'custom-count-error' : undefined} className={fieldClassName} />
            {!customCountValid && <p id="custom-count-error" className="mt-1 text-[11px] text-danger">Enter an integer from 1 to 50.</p>}
          </div>
        )}

        <Button onClick={handleGenerate} disabled={!scan || generating || !Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 50} className="mt-3 w-full">
          {generating ? <><Spinner /> Generating {generationProgress} of {requestedCount}…</> : <><Icon name="sparkles" /> Generate test cases</>}
        </Button>
        {!scan && <div className="mt-3"><InlineMessage>Scan the selected {source === 'figma' ? 'Figma design' : 'web page'} before generating test cases.</InlineMessage></div>}
        {genError && <div className="mt-3"><InlineMessage tone="error">{genError}</InlineMessage></div>}

        {siteRecord.testCases.length > 0 && (
          <>
            <div className={`mt-3 grid ${format === 'gherkin' && canDownloadFeature ? 'grid-cols-3' : 'grid-cols-2'} gap-2 border-t border-border pt-3`}>
              <Button variant="secondary" size="small" onClick={() => downloadFile('test-cases.md', toMarkdown(siteRecord.testCases), 'text/markdown')}><Icon name="download" /> Markdown</Button>
              <Button variant="secondary" size="small" onClick={() => downloadFile('test-cases.csv', toCsv(siteRecord.testCases), 'text/csv')}><Icon name="download" /> CSV</Button>
              {format === 'gherkin' && canDownloadFeature && <Button variant="secondary" size="small" onClick={() => downloadFile(featureFilename(scan?.title ?? siteRecord.locator.label), toFeature(siteRecord.testCases, scan?.title ?? siteRecord.locator.label), 'text/x-gherkin;charset=utf-8')}><Icon name="download" /> Feature file</Button>}
            </div>
            {format === 'gherkin' && !canDownloadFeature && <div className="mt-2"><InlineMessage>Regenerate the suite in Gherkin format to download a complete Feature file.</InlineMessage></div>}
            <ul className="mt-3 flex flex-col gap-2.5">
              {siteRecord.testCases.map((testCase, index) => (
                <li key={`${testCase.id}-${index}`} className="rounded-xl border border-border bg-bg/35 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-[13px] font-semibold leading-5 text-text">{testCase.title}</p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge tone={testCase.priority === 'High' ? 'danger' : testCase.priority === 'Medium' ? 'warning' : 'muted'}>{testCase.priority}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => removeTestCase(testCase.id)} className="h-8 w-8 text-subtle hover:text-danger" aria-label="Remove test case"><Icon name="trash" className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {format === 'gherkin' && testCase.gherkin ? (
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-bg/60 p-2.5 font-mono text-[11px] leading-5 text-muted">{testCase.gherkin}</pre>
                  ) : (
                    <><ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-5 text-muted marker:text-subtle">{testCase.steps.map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}</ol>{testCase.expectedResult && <p className="mt-2 border-t border-border pt-2 text-xs leading-5 text-muted"><span className="font-semibold text-text">Expected:</span> {testCase.expectedResult}</p>}</>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        {scan && siteRecord.testCases.length === 0 && !generating && <div className="mt-3"><EmptyState icon="file" title="No test cases yet" description="Generate a set when your scan and requirements are ready." /></div>}
      </Card>
    </div>
  )
}
