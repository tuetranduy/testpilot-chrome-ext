const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080
const SAFE_WIDTH = DESIGN_WIDTH * 0.88
const SAFE_HEIGHT = DESIGN_HEIGHT * 0.82
const SAFE_X = (DESIGN_WIDTH - SAFE_WIDTH) / 2
const SAFE_Y = (DESIGN_HEIGHT - SAFE_HEIGHT) / 2

const COLORS = {
  paper: '#f5f7f2',
  green: '#123f34',
  mint: '#a9e8c3',
  orange: '#f2784b',
  copy: '#71857c',
  white: '#ffffff',
  line: '#dce6de',
}

export const TIMELINE = [
  { id: 'source', start: 0, end: 2, label: 'From design to live page.' },
  { id: 'scan', start: 2, end: 4, label: 'Scan the UI.' },
  { id: 'generate', start: 4, end: 6, label: 'Generate exact coverage.' },
  { id: 'fill', start: 6, end: 9, label: 'Fill realistic data.' },
  { id: 'promise', start: 9, end: 12, label: 'Sharper first drafts.' },
]

export const PRESETS = {
  master: { width: 1920, height: 1080, fps: 30, duration: 12 },
  gif: { width: 960, height: 540, fps: 15, duration: 12 },
  square: { width: 1080, height: 1080, fps: 30, duration: 12 },
  vertical: { width: 1080, height: 1920, fps: 30, duration: 12 },
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function easeOut(value) {
  const progress = clamp(value, 0, 1)
  return 1 - ((1 - progress) ** 3)
}

export function frameCount(preset) {
  return Math.round(preset.duration * preset.fps)
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function number(value) {
  return Number(value.toFixed(2))
}

function text(value, x, y, size, fill = COLORS.green, weight = 500, anchor = 'start', extra = '') {
  return `<text x="${number(x)}" y="${number(y)}" fill="${fill}" font-family="Space Grotesk, DM Sans, Arial, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" ${extra}>${escapeXml(value)}</text>`
}

function roundedRect(x, y, width, height, fill, radius = 24, extra = '') {
  return `<rect x="${number(x)}" y="${number(y)}" width="${number(width)}" height="${number(height)}" rx="${radius}" fill="${fill}" ${extra}/>`
}

function progressFor(time, start, end) {
  return easeOut(clamp((time - start) / Math.min(0.7, end - start), 0, 1))
}

function mark(x, y, size, fill = COLORS.mint) {
  const half = size / 2
  return `<g transform="translate(${number(x)} ${number(y)})" fill="${fill}"><path d="M0 ${number(-half)}c${number(half * 0.8)} 0 ${number(half)} ${number(half * 0.2)} ${number(half)} ${number(half)} 0 ${number(half * 0.8)}-${number(half * 0.2)} ${number(half)}-${number(half)} ${number(half)}-${number(half * 0.8)} 0-${number(half)}-${number(0.2 * half)}-${number(half)}-${number(half)}z"/><circle cx="0" cy="0" r="${number(size * 0.12)}" fill="${COLORS.green}"/></g>`
}

function sourceCard(entrance, narrow) {
  const width = narrow ? 1050 : 920
  const height = narrow ? 560 : 620
  const x = narrow ? (DESIGN_WIDTH - width) / 2 : 760
  const y = narrow ? 430 : 245
  const slide = (1 - entrance) * (narrow ? 180 : 130)
  return `<g transform="translate(${number(slide)} 0) rotate(-3 ${number(x + width / 2)} ${number(y + height / 2)})">
    ${roundedRect(x, y, width, height, COLORS.white, 32, `stroke="${COLORS.line}" stroke-width="3"`)}
    ${roundedRect(x, y, width, 70, '#eef2ed', 32)}
    <circle cx="${number(x + 34)}" cy="${number(y + 35)}" r="8" fill="${COLORS.orange}"/><circle cx="${number(x + 62)}" cy="${number(y + 35)}" r="8" fill="#f5c75f"/><circle cx="${number(x + 90)}" cy="${number(y + 35)}" r="8" fill="#67c58b"/>
    ${text('figma / checkout', x + 130, y + 43, 20, COLORS.copy, 600)}
    ${roundedRect(x + 48, y + 120, width * 0.52, 385, '#f8faf7', 22)}
    ${text('Checkout', x + 92, y + 184, 36, COLORS.green, 700)}
    ${text('Shipping details', x + 92, y + 244, 21, COLORS.copy, 600)}
    ${roundedRect(x + 92, y + 275, width * 0.38, 52, COLORS.white, 12, `stroke="${COLORS.line}"`)}
    ${roundedRect(x + 92, y + 348, width * 0.25, 52, COLORS.white, 12, `stroke="${COLORS.line}"`)}
    ${roundedRect(x + width * 0.64, y + 120, width * 0.26, 280, COLORS.green, 20)}
    ${text('Order total', x + width * 0.68, y + 180, 20, COLORS.mint, 600)}
    ${text('$128.00', x + width * 0.68, y + 238, 42, COLORS.white, 700)}
    ${roundedRect(x + width * 0.68, y + 294, width * 0.18, 52, COLORS.orange, 12)}
    ${text('Pay now', x + width * 0.77, y + 328, 20, COLORS.white, 700, 'middle')}
  </g>`
}

function workspace(entrance, beat, narrow) {
  const width = narrow ? 1080 : 1420
  const height = narrow ? 610 : 650
  const x = (DESIGN_WIDTH - width) / 2
  const y = narrow ? 380 : 285
  const offset = (1 - entrance) * 180
  const active = beat === 'scan' ? COLORS.orange : beat === 'generate' ? COLORS.mint : COLORS.orange
  return `<g transform="translate(${number(offset)} 0)">
    ${roundedRect(x, y, width, height, COLORS.green, 30)}
    ${text('TestPilot', x + 42, y + 62, 28, COLORS.mint, 700)}
    ${text('Workspace', x + 190, y + 62, 22, '#b5c9bd', 500)}
    ${roundedRect(x + 38, y + 95, 230, height - 132, '#194b3e', 18)}
    ${text('RUN', x + 70, y + 145, 17, '#83a497', 700)}
    ${text('Scan', x + 70, y + 202, 25, beat === 'scan' ? COLORS.mint : COLORS.white, 700)}
    ${text('Generate', x + 70, y + 255, 25, beat === 'generate' ? COLORS.mint : COLORS.white, 700)}
    ${text('Fill', x + 70, y + 308, 25, beat === 'fill' ? COLORS.mint : COLORS.white, 700)}
    ${roundedRect(x + 314, y + 95, width - 352, height - 132, '#f9fbf7', 18)}
    ${text('Checkout flow', x + 362, y + 155, 30, COLORS.green, 700)}
    ${text(beat === 'generate' ? '10 of 10 scenarios' : beat === 'fill' ? 'Selected fields' : 'Ready to inspect', x + 362, y + 198, 20, COLORS.copy, 600)}
    ${roundedRect(x + 362, y + 240, width - 450, 64, active, 14)}
    ${text(beat === 'scan' ? 'Scan the UI.' : beat === 'generate' ? 'Generate exact coverage.' : 'Fill realistic data.', x + 395, y + 282, 23, COLORS.green, 700)}
    ${[0, 1, 2].map((row) => `<g>${roundedRect(x + 362, y + 340 + row * 58, width - 450, 38, row < (beat === 'fill' ? 2 : 3) ? '#edf5ee' : '#f5f7f2', 10)}${row < (beat === 'fill' ? 2 : 3) ? `<circle cx="${number(x + 388)}" cy="${number(y + 359 + row * 58)}" r="10" fill="${COLORS.orange}"/>${text('✓', x + 388, y + 366 + row * 58, 15, COLORS.white, 700, 'middle')}` : ''}${text(['Email address', 'Shipping address', 'Payment details'][row], x + 416, y + 366 + row * 58, 18, COLORS.copy, 600)}</g>`).join('')}
  </g>`
}

function endCard(entrance, narrow) {
  const offset = (1 - entrance) * 100
  const center = DESIGN_WIDTH / 2
  return `<g transform="translate(0 ${number(offset)})">
    ${roundedRect(SAFE_X, SAFE_Y, SAFE_WIDTH, SAFE_HEIGHT, COLORS.green, 42)}
    ${mark(center, narrow ? 370 : 330, 84)}
    ${text('TestPilot', center, narrow ? 485 : 445, 36, COLORS.mint, 700, 'middle')}
    ${text('Sharper first drafts.', center, narrow ? 630 : 600, 86, COLORS.white, 700, 'middle')}
    ${text('AI-assisted manual QA.', center, narrow ? 700 : 670, 28, '#b5c9bd', 500, 'middle')}
  </g>`
}

function stackedWorkspace(entrance, beat, width, height, cardX, cardY, cardWidth, cardHeight) {
  const slide = (1 - entrance) * 90
  const innerX = cardX + 28
  const innerWidth = cardWidth - 56
  const navHeight = Math.min(92, cardHeight * 0.2)
  const contentY = cardY + navHeight + 26
  const contentHeight = cardHeight - navHeight - 54
  const active = beat === 'generate' ? COLORS.mint : COLORS.orange
  const caption = beat === 'scan' ? 'Scan the UI.' : beat === 'generate' ? 'Generate exact coverage.' : 'Fill realistic data.'
  return `<g data-section="active-card" data-x="${number(cardX)}" data-y="${number(cardY)}" data-width="${number(cardWidth)}" data-height="${number(cardHeight)}" transform="translate(0 ${number(slide)})">
    ${roundedRect(cardX, cardY, cardWidth, cardHeight, COLORS.green, 28)}
    ${text('TestPilot', innerX, cardY + 42, 26, COLORS.mint, 700)}
    ${text('Workspace', innerX + 150, cardY + 42, 20, '#b5c9bd', 500)}
    ${text('Scan', cardX + cardWidth - 250, cardY + 42, 18, beat === 'scan' ? COLORS.mint : COLORS.white, 700)}
    ${text('Generate', cardX + cardWidth - 155, cardY + 42, 18, beat === 'generate' ? COLORS.mint : COLORS.white, 700)}
    ${text('Fill', cardX + cardWidth - 55, cardY + 42, 18, beat === 'fill' ? COLORS.mint : COLORS.white, 700, 'end')}
    ${roundedRect(innerX, contentY, innerWidth, contentHeight, '#f9fbf7', 18)}
    ${text('Checkout flow', innerX + 28, contentY + 42, 25, COLORS.green, 700)}
    ${text(beat === 'generate' ? '10 of 10 scenarios' : beat === 'fill' ? 'Selected fields' : 'Ready to inspect', innerX + 28, contentY + 76, 17, COLORS.copy, 600)}
    ${roundedRect(innerX + 24, contentY + 100, innerWidth - 48, 54, active, 12)}
    ${text(caption, innerX + 48, contentY + 135, 20, COLORS.green, 700)}
  </g>`
}

function stackedSource(entrance, cardX, cardY, cardWidth, cardHeight) {
  const slide = (1 - entrance) * 90
  return `<g data-section="active-card" data-x="${number(cardX)}" data-y="${number(cardY)}" data-width="${number(cardWidth)}" data-height="${number(cardHeight)}" transform="translate(0 ${number(slide)})">
    ${roundedRect(cardX, cardY, cardWidth, cardHeight, COLORS.white, 28, `stroke="${COLORS.line}" stroke-width="3"`)}
    ${text('figma / checkout', cardX + 28, cardY + 44, 20, COLORS.copy, 600)}
    ${text('Checkout', cardX + 28, cardY + 108, 32, COLORS.green, 700)}
    ${roundedRect(cardX + 28, cardY + 140, cardWidth * 0.55, cardHeight - 188, '#f8faf7', 16)}
    ${roundedRect(cardX + cardWidth * 0.64, cardY + 140, cardWidth * 0.28, cardHeight - 230, COLORS.green, 16)}
    ${text('$128.00', cardX + cardWidth * 0.68, cardY + 202, 30, COLORS.white, 700)}
  </g>`
}

function stackedEnd(entrance, width, height, cardX, cardY, cardWidth, cardHeight) {
  const slide = (1 - entrance) * 70
  const center = width / 2
  return `<g data-section="active-card" data-x="${number(cardX)}" data-y="${number(cardY)}" data-width="${number(cardWidth)}" data-height="${number(cardHeight)}" transform="translate(0 ${number(slide)})">
    ${roundedRect(cardX, cardY, cardWidth, cardHeight, COLORS.green, 28)}
    ${mark(center, cardY + cardHeight * 0.25, Math.min(70, cardWidth * 0.14))}
    ${text('TestPilot', center, cardY + cardHeight * 0.43, 28, COLORS.mint, 700, 'middle')}
    ${text('Sharper first drafts.', center, cardY + cardHeight * 0.62, Math.min(54, width * 0.06), COLORS.white, 700, 'middle')}
    ${text('AI-assisted manual QA.', center, cardY + cardHeight * 0.76, 20, '#b5c9bd', 500, 'middle')}
  </g>`
}

function renderStackedFrame({ currentTime, width, height, beat, entrance }) {
  const padding = width * 0.08
  const contentWidth = width - padding * 2
  const headlineY = height * 0.12
  const headlineHeight = height * 0.1
  const cardY = height * 0.29
  const cardHeight = Math.min(height * 0.39, 650)
  const supportY = cardY + cardHeight + height * 0.08
  const supportHeight = Math.min(height * 0.1, 120)
  const center = width / 2
  const headline = beat.label
  let activeCard = ''
  if (beat.id === 'source') activeCard = stackedSource(entrance, padding, cardY, contentWidth, cardHeight)
  if (beat.id === 'scan' || beat.id === 'generate' || beat.id === 'fill') activeCard = stackedWorkspace(entrance, beat.id, width, height, padding, cardY, contentWidth, cardHeight)
  if (beat.id === 'promise') activeCard = stackedEnd(entrance, width, height, padding, cardY, contentWidth, cardHeight)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(headline)}" data-layout="stacked">
  <rect width="${width}" height="${height}" fill="${COLORS.paper}"/>
  <g data-section="headline" data-x="0" data-y="${number(headlineY - headlineHeight / 2)}" data-width="${width}" data-height="${number(headlineHeight)}">
    ${text(headline, center, headlineY, Math.min(58, width * 0.055), COLORS.green, 700, 'middle')}
  </g>
  ${activeCard}
  <g data-section="supporting" data-x="${number(padding)}" data-y="${number(supportY)}" data-width="${number(contentWidth)}" data-height="${number(supportHeight)}">
    ${text('Scan', padding, supportY + 30, 18, beat.id === 'scan' ? COLORS.orange : COLORS.copy, 700)}
    ${text('Generate', center, supportY + 30, 18, beat.id === 'generate' ? COLORS.orange : COLORS.copy, 700, 'middle')}
    ${text('Fill', width - padding, supportY + 30, 18, beat.id === 'fill' ? COLORS.orange : COLORS.copy, 700, 'end')}
    ${roundedRect(padding, supportY + 54, contentWidth, 8, '#dce6de', 4)}
    ${roundedRect(padding, supportY + 54, contentWidth * clamp(currentTime / 12, 0, 1), 8, COLORS.orange, 4)}
  </g>
</svg>`
}

export function renderMarketingFrame({ time, width, height }) {
  const canvasWidth = Number(width)
  const canvasHeight = Number(height)
  if (!Number.isFinite(canvasWidth) || !Number.isFinite(canvasHeight) || canvasWidth <= 0 || canvasHeight <= 0) {
    throw new TypeError('width and height must be positive numbers')
  }

  const currentTime = clamp(Number(time) || 0, 0, TIMELINE.at(-1).end)
  const beat = TIMELINE.find((item) => currentTime >= item.start && currentTime < item.end) ?? TIMELINE.at(-1)
  const narrow = canvasWidth / canvasHeight < 1.35
  if (narrow) return renderStackedFrame({ currentTime, width: canvasWidth, height: canvasHeight, beat, entrance: progressFor(currentTime, beat.start, beat.end) })
  const scale = Math.min(canvasWidth / DESIGN_WIDTH, canvasHeight / DESIGN_HEIGHT)
  const offsetX = (canvasWidth - DESIGN_WIDTH * scale) / 2
  const offsetY = (canvasHeight - DESIGN_HEIGHT * scale) / 2
  const entrance = progressFor(currentTime, beat.start, beat.end)
  const headline = beat.label
  let scene = ''

  if (beat.id === 'source') scene = sourceCard(entrance, narrow)
  if (beat.id === 'scan' || beat.id === 'generate' || beat.id === 'fill') scene = workspace(entrance, beat.id, narrow)
  if (beat.id === 'promise') scene = endCard(entrance, narrow)

  const headlineY = narrow ? 250 : 190
  const headlineSize = narrow ? 58 : 72
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" role="img" aria-label="${escapeXml(headline)}">
  <rect width="${canvasWidth}" height="${canvasHeight}" fill="${COLORS.paper}"/>
  <g transform="translate(${number(offsetX)} ${number(offsetY)}) scale(${number(scale)})">
    ${text(headline, centerX(), headlineY, headlineSize, COLORS.green, 700, 'middle')}
    ${scene}
    ${progressRail(currentTime)}
  </g>
</svg>`
}

function centerX() {
  return DESIGN_WIDTH / 2
}

function progressRail(time) {
  const x = SAFE_X
  const y = DESIGN_HEIGHT - SAFE_Y - 18
  const width = SAFE_WIDTH
  const progress = clamp(time / 12, 0, 1)
  return `${roundedRect(x, y, width, 8, '#dce6de', 4)}${roundedRect(x, y, width * progress, 8, COLORS.orange, 4)}`
}
