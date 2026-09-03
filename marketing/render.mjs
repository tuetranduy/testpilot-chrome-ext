import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { PRESETS, frameCount, renderMarketingFrame } from './scene.mjs'

const PRESET_NAMES = ['master', 'gif', 'square', 'vertical']

const OUTPUT_NAMES = {
  master: 'testpilot-marketing-master.mp4',
  gif: 'testpilot-marketing-preview.gif',
  square: 'testpilot-marketing-square.mp4',
  vertical: 'testpilot-marketing-vertical.mp4',
}

const RASTER_FONT_CANDIDATES = [
  process.env.TESTPILOT_MARKETING_FONT,
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/System/Library/Fonts/Helvetica.ttc',
  '/Library/Fonts/Arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  'C:\\Windows\\Fonts\\arial.ttf',
].filter(Boolean)

function resolveRasterFontPath() {
  const fontPath = RASTER_FONT_CANDIDATES.find((candidate) => existsSync(candidate))
  if (!fontPath) {
    throw new Error('A rasterization font is required. Set TESTPILOT_MARKETING_FONT to an installed TTF or TTC font file.')
  }
  return fontPath
}

export function parseArgs(argv) {
  const options = {
    presets: [...PRESET_NAMES],
    outputDir: path.resolve('marketing/exports'),
    keepFrames: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--preset') {
      const preset = argv[index + 1]
      if (!preset || preset.startsWith('--')) throw new Error('Missing value for --preset')
      if (preset !== 'all' && !PRESET_NAMES.includes(preset)) {
        throw new Error(`Unknown preset: ${preset}`)
      }
      options.presets = preset === 'all' ? [...PRESET_NAMES] : [preset]
      index += 1
    } else if (argument === '--output-dir') {
      const outputDir = argv[index + 1]
      if (!outputDir || outputDir.startsWith('--')) throw new Error('Missing value for --output-dir')
      options.outputDir = outputDir
      index += 1
    } else if (argument === '--keep-frames') {
      options.keepFrames = true
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }

  return options
}

export function buildEncodeCommands(presetName, preset, frameDir, outputDir) {
  const inputPattern = path.join(frameDir, 'frame-%04d.png')
  const outputPath = path.join(outputDir, OUTPUT_NAMES[presetName])

  if (presetName === 'gif') {
    return [[
      'ffmpeg', '-y', '-framerate', String(preset.fps), '-i', inputPattern,
      '-vf', `fps=${preset.fps},scale=${preset.width}:${preset.height}:flags=lanczos`,
      '-loop', '0', outputPath,
    ]]
  }

  return [[
    'ffmpeg', '-y', '-framerate', String(preset.fps), '-i', inputPattern,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outputPath,
  ]]
}

function defaultRunCommand(command) {
  let executable = command[0]
  let args = command.slice(1)
  let stdio = 'inherit'

  if (executable === 'command' && args[0] === '-v') {
    executable = '/bin/sh'
    args = ['-c', 'command -v "$1"', 'command-v', args[1]]
    stdio = 'pipe'
  }

  const result = spawnSync(executable, args, { stdio })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command.join(' ')} exited with status ${result.status}`)
  }
  return result
}

function requireMediaCommands(runCommand) {
  try {
    runCommand(['command', '-v', 'convert'])
  } catch {
    throw new Error('convert is required. Install ImageMagick and ensure convert is available on PATH.')
  }

  try {
    runCommand(['command', '-v', 'ffmpeg'])
  } catch {
    throw new Error('ffmpeg is required. Install FFmpeg and ensure ffmpeg is available on PATH.')
  }
}

export function renderPreset(presetName, {
  outputDir,
  keepFrames = false,
  fontPath = resolveRasterFontPath(),
  runCommand = defaultRunCommand,
} = {}) {
  const preset = PRESETS[presetName]
  if (!preset) throw new Error(`Unknown preset: ${presetName}`)
  if (!outputDir) throw new Error('outputDir is required')

  requireMediaCommands(runCommand)

  const totalFrames = frameCount(preset)
  const frameDir = path.join(outputDir, '.frames', presetName)
  rmSync(frameDir, { recursive: true, force: true })
  mkdirSync(frameDir, { recursive: true })
  mkdirSync(outputDir, { recursive: true })

  for (let index = 0; index < totalFrames; index += 1) {
    const frameName = `frame-${String(index).padStart(4, '0')}`
    const svgPath = path.join(frameDir, `${frameName}.svg`)
    const pngPath = path.join(frameDir, `${frameName}.png`)
    const svg = renderMarketingFrame({
      time: index / preset.fps,
      width: preset.width,
      height: preset.height,
    })
    writeFileSync(svgPath, svg)
    runCommand(['convert', '-font', fontPath, '-background', 'none', svgPath, pngPath])
  }

  const [encodeCommand] = buildEncodeCommands(presetName, preset, frameDir, outputDir)
  runCommand(encodeCommand)
  if (!keepFrames) rmSync(frameDir, { recursive: true, force: true })

  return {
    presetName,
    outputPath: path.join(outputDir, OUTPUT_NAMES[presetName]),
    frameCount: totalFrames,
    width: preset.width,
    height: preset.height,
    fps: preset.fps,
    duration: preset.duration,
  }
}

function runCli() {
  try {
    const options = parseArgs(process.argv.slice(2))
    for (const presetName of options.presets) {
      const result = renderPreset(presetName, {
        outputDir: options.outputDir,
        keepFrames: options.keepFrames,
      })
      console.log(`${result.presetName}: ${result.width}x${result.height}, ${result.fps}fps, ${result.duration}s -> ${result.outputPath}`)
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  runCli()
}
