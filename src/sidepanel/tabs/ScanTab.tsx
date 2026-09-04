import { useRef, useState } from 'react'
import { featureFilename, toCsv, toFeature, toMarkdown } from '../../lib/export'
import { loadFigmaTargets, scanFigmaTarget, type FigmaTarget, type LoadedFigmaTargets } from '../../lib/figma'
import { hasOriginAccess, originPatternFor, requestOriginAccess } from '../../lib/permissions'
import { buildTestCasePrompt } from '../../lib/promptTemplates'
import { chatWithProvider, ensureProviderAccess } from '../../lib/providers'
import { parseTestCasesResponse } from '../../lib/aiJson'
import { scanActiveTab } from '../../lib/tabActions'
import { generateTestCaseSuite } from '../../lib/testCaseGeneration'
import { imageRunLabel, MAX_SCAN_IMAGES, normalizeImageFiles } from '../../lib/images'
import { getVisionCapability } from '../../lib/modelCapabilities'
import type { ImageScanResult, RunLocator, RunRecord, ScanResult, Settings, TestCaseFormat, WebRunLocator } from '../../lib/types'
import { Badge, Button, Card, EmptyState, Icon, InlineMessage, SectionTitle, Spinner, fieldClassName } from '../components/ui'

interface Props {
  tab: chrome.tabs.Tab
  granted: boolean | null
  setGranted: (granted: boolean) => void
  settings: Settings
  siteRecord: RunRecord
  onUpdate: (next: RunRecord) => void
  onSelectRun: (locator: RunLocator) => boolean | void | Promise<boolean | void>
  onCreateRun: (locator: RunLocator, scan: ImageScanResult) => void
  onOpenSettings: () => void
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

export function ScanTab({ tab, granted, setGranted, settings, siteRecord, onUpdate, onSelectRun, onCreateRun, onOpenSettings }: Props) {
  const [source, setSource] = useState<RunLocator['source']>(siteRecord.locator.source)
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
  const [processingImages, setProcessingImages] = useState(false)
  const [includeFullPage, setIncludeFullPage] = useState(false)
  const [structuredOnlyConsent, setStructuredOnlyConsent] = useState<{
    source: RunLocator['source']
    scan: ScanResult
    provider: Settings['activeProvider']
    model: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scan = siteRecord.lastScan?.source === source ? siteRecord.lastScan : null
  const parsedCustomCount = Number(customCount)
  const customCountValid = Number.isInteger(parsedCustomCount) && parsedCustomCount >= 1 && parsedCustomCount <= 50
  const requestedCount = countMode === 'custom' ? parsedCustomCount : countMode
  const canDownloadFeature = siteRecord.testCases.length > 0 && siteRecord.testCases.every((testCase) => Boolean(testCase.gherkin?.trim()))
  const hasUsableScan = Boolean(scan && (scan.source !== 'image' || scan.images.length > 0))
  const activeConfig = settings.providers[settings.activeProvider]
  const visionCapability = getVisionCapability(settings.activeProvider, activeConfig)
  const requiresVision = Boolean(scan && scan.images.length > 0)
  const visionIncompatible = requiresVision && visionCapability !== 'vision'
  const canGenerateWithoutImages = Boolean(scan && scan.source !== 'image' && visionIncompatible)
  const generateWithoutImages = Boolean(
    scan
    && structuredOnlyConsent?.source === source
    && structuredOnlyConsent.scan === scan
    && structuredOnlyConsent.provider === settings.activeProvider
    && structuredOnlyConsent.model === activeConfig.model,
  )
  const omitImages = canGenerateWithoutImages && generateWithoutImages
  const visionBlocked = visionIncompatible && !omitImages
  const displayedImages = scan?.images ?? []

  function continueWithoutImages() {
    if (!scan) return
    setStructuredOnlyConsent({ source, scan, provider: settings.activeProvider, model: activeConfig.model })
  }

  async function selectSource(next: RunLocator['source']) {
    const previousSource = source
    setSource(next)
    setScanError(null)
    if (next === 'web') {
      setSwitchingRun(true)
      try {
        const selected = await onSelectRun(webLocator(tab))
        if (selected === false) setSource(previousSource)
      } catch (error) {
        setSource(previousSource)
        setScanError(error instanceof Error ? error.message : 'Could not load the selected run.')
      } finally {
        setSwitchingRun(false)
      }
    }
  }

  async function handleWebScan(includeFullPageScreenshot = includeFullPage) {
    if (switchingRun || processingImages) return
    setScanError(null)
    setScanning(true)
    try {
      if (!granted) {
        const grantedNow = await requestOriginAccess(originPatternFor(tab.url!))
        setGranted(grantedNow)
        if (!grantedNow) throw new Error('Permission denied for this site.')
      }
      const result = await scanActiveTab(tab, { includeFullPage: includeFullPageScreenshot })
      onUpdate({ ...siteRecord, locator: webLocator(tab), lastScan: result })
      if (result.source === 'web' && result.fullPageCaptureError) setScanError(`Full-page screenshot was not captured: ${result.fullPageCaptureError}`)
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Scan failed.')
    } finally {
      setScanning(false)
    }
  }

  async function handleImageUpload(files: File[]) {
    if (files.length === 0) return
    setScanError(null)
    setProcessingImages(true)
    try {
      const current = scan?.source === 'image' ? scan.images : []
      const added = await normalizeImageFiles(files, 'upload', current.length)
      const images = [...current, ...added]
      const title = imageRunLabel(images.map((image) => image.name))
      if (siteRecord.locator.source === 'image' && scan?.source === 'image') {
        onUpdate({ ...siteRecord, locator: { ...siteRecord.locator, label: title }, lastScan: { ...scan, title, images } })
      } else {
        const runId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
        onCreateRun({ source: 'image', runId, label: title }, { source: 'image', title, scannedAt: Date.now(), images })
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Could not process these images.')
    } finally {
      setProcessingImages(false)
    }
  }

  function removeImage(imageId: string) {
    if (!scan) return
    const images = scan.images.filter((image) => image.id !== imageId)
    if (scan.source === 'image' && siteRecord.locator.source === 'image') {
      const title = imageRunLabel(images.map((image) => image.name))
      onUpdate({ ...siteRecord, locator: { ...siteRecord.locator, label: title }, lastScan: { ...scan, title, images } })
    } else {
      onUpdate({ ...siteRecord, lastScan: { ...scan, images } })
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
    if (!scan || !hasUsableScan || visionBlocked || !Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 50) return
    setGenError(null)
    setGenerating(true)
    setGenerationProgress(0)
    try {
      const config = settings.providers[settings.activeProvider]
      if (!(await ensureProviderAccess(settings.activeProvider, config))) {
        throw new Error('Permission to contact the AI provider was denied.')
      }
      const generated = await generateTestCaseSuite(requestedCount, async (batchCount, excludedTitles) => {
        const generationScan = omitImages ? { ...scan, images: [] } : scan
        const providerImages = omitImages ? [] : scan.images.map((image) => image.dataUrl)
        const { system, user } = buildTestCasePrompt(generationScan, siteRecord.requirementsText, format, batchCount, excludedTitles)
        const text = await chatWithProvider(
          settings.activeProvider,
          config,
          [{ role: 'system', content: system }, { role: 'user', content: user }],
          providerImages.length > 0 ? { images: providerImages } : undefined,
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
          {scan && <Badge tone="success">{scan.source === 'web' ? `${scan.elements.length} elements` : scan.source === 'figma' ? `${scan.nodes.length} nodes` : `${scan.images.length} images`}</Badge>}
        </div>
        <div aria-label="Scan source" role="group" className="mt-3 grid grid-cols-3 gap-1 rounded-lg border border-border bg-bg/60 p-1">
          {(['web', 'figma', 'image'] as const).map((item) => (
            <button key={item} type="button" disabled={scanning || processingImages || switchingRun} aria-pressed={source === item} onClick={() => void selectSource(item)} className={`min-h-9 cursor-pointer rounded-md px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${source === item ? 'bg-surface-raised text-cta-soft shadow-sm' : 'text-muted hover:bg-surface-hover'}`}>
              {item === 'web' ? 'Web page' : item === 'figma' ? 'Figma' : 'Images'}
            </button>
          ))}
        </div>

        {source === 'web' ? (
          <>
            <p className="mt-2 text-xs leading-5 text-muted">Capture interactive elements and a visual snapshot of the current page.</p>
            <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border-strong bg-bg/35 px-3 py-2.5 text-xs text-muted hover:bg-surface-hover">
              <span><span className="block font-semibold text-text">Full-page screenshot</span><span className="mt-0.5 block text-[10px]">Scan the entire page when enabled.</span></span>
              <input type="checkbox" aria-label="Capture full-page screenshot" checked={includeFullPage} disabled={processingImages || scanning || switchingRun} onChange={(event) => { const checked = event.currentTarget.checked; setIncludeFullPage(checked); if (checked) void handleWebScan(true) }} className="h-4 w-4 shrink-0 cursor-pointer accent-cta disabled:cursor-not-allowed" />
            </label>
            <Button onClick={() => void handleWebScan()} disabled={scanning || processingImages || switchingRun} className="mt-3 w-full">
              {scanning ? <><Spinner /> Scanning…</> : <><Icon name="scan" /> Scan current page</>}
            </Button>
          </>
        ) : source === 'figma' ? (
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
        ) : (
          <div className="mt-3 flex flex-col gap-2.5">
            <p className="text-xs leading-5 text-muted">Upload up to {MAX_SCAN_IMAGES} related UI screenshots to generate one test suite.</p>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-bg/35 px-3 py-4 text-xs font-semibold text-text hover:bg-surface-hover">
              {processingImages ? <><Spinner /> Processing images…</> : <><Icon name="upload" /> Choose images</>}
              <input type="file" multiple accept="image/png,image/jpeg,image/webp" aria-label="Upload scan images" className="hidden" disabled={processingImages || (scan?.source === 'image' && scan.images.length >= MAX_SCAN_IMAGES)} onChange={(event) => { void handleImageUpload(Array.from(event.target.files ?? [])); event.target.value = '' }} />
            </label>
          </div>
        )}

        {scanError && <div className="mt-3"><InlineMessage tone="error">{scanError}</InlineMessage></div>}
        {scan?.source === 'figma' && scan.previewWarning && <div className="mt-3"><InlineMessage>{scan.previewWarning}</InlineMessage></div>}
        {displayedImages.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {displayedImages.map((image) => (
              <figure key={image.id} className="relative overflow-hidden rounded-xl border border-border bg-bg">
                <img src={image.dataUrl} alt={`${image.name} preview`} className="h-28 w-full object-cover object-top" />
                <figcaption className="truncate border-t border-border px-2 py-1.5 pr-8 text-[10px] text-muted">{image.name}</figcaption>
                {((scan?.source === 'image') || image.role === 'full-page') && <Button variant="ghost" size="icon" aria-label={`Remove ${image.name}`} onClick={() => removeImage(image.id)} className="absolute bottom-0 right-0 h-7 w-7"><Icon name="trash" className="h-3 w-3" /></Button>}
              </figure>
            ))}
          </div>
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

        <Button onClick={handleGenerate} disabled={!hasUsableScan || visionBlocked || generating || !Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 50} className="mt-3 w-full">
          {generating ? <><Spinner /> Generating {generationProgress} of {requestedCount}…</> : <><Icon name="sparkles" /> Generate test cases</>}
        </Button>
        {!hasUsableScan && <div className="mt-3"><InlineMessage>{source === 'image' ? 'Upload one or more images' : `Scan the selected ${source === 'figma' ? 'Figma design' : 'web page'}`} before generating test cases.</InlineMessage></div>}
        {visionIncompatible && (
          <div className="mt-3">
            <InlineMessage>
              {omitImages ? (
                <p>Images will be omitted. Generation will use the structured {scan?.source === 'figma' ? 'Figma nodes' : 'web page elements'} only.</p>
              ) : (
                <p>{visionCapability === 'text'
                  ? `${activeConfig.model} is text-only. Choose a vision-capable model to use attached images.`
                  : `Vision support for ${activeConfig.model} is unknown. Confirm it in Settings or choose a vision-capable model.`}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {canGenerateWithoutImages && !omitImages && <Button variant="secondary" size="small" onClick={continueWithoutImages}>Continue without images</Button>}
                <Button variant="secondary" size="small" onClick={onOpenSettings}>Choose vision model</Button>
              </div>
            </InlineMessage>
          </div>
        )}
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
        {hasUsableScan && siteRecord.testCases.length === 0 && !generating && <div className="mt-3"><EmptyState icon="file" title="No test cases yet" description="Generate a set when your scan and requirements are ready." /></div>}
      </Card>
    </div>
  )
}
