import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { buildEncodeCommands, parseArgs, renderPreset } from './render.mjs'

const temporaryDirectories = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

function makeOutputDirectory() {
  const directory = mkdtempSync(path.join(tmpdir(), 'testpilot-render-'))
  temporaryDirectories.push(directory)
  return directory
}

describe('marketing render CLI', () => {
  test('defaults to all approved deliverables', () => {
    expect(parseArgs([]).presets).toEqual(['master', 'gif', 'square', 'vertical'])
  })

  test('accepts a preset, output directory, and retained-frame flag', () => {
    expect(parseArgs(['--preset', 'square', '--output-dir', '/tmp/out', '--keep-frames']))
      .toMatchObject({ presets: ['square'], outputDir: '/tmp/out', keepFrames: true })
  })

  test('expands the all preset and rejects malformed arguments', () => {
    expect(parseArgs(['--preset', 'all']).presets)
      .toEqual(['master', 'gif', 'square', 'vertical'])
    expect(() => parseArgs(['--preset', 'poster'])).toThrow('Unknown preset: poster')
    expect(() => parseArgs(['--output-dir'])).toThrow('Missing value for --output-dir')
    expect(() => parseArgs(['--unexpected'])).toThrow('Unknown argument: --unexpected')
  })

  test('builds the correct MP4 and GIF encoding commands', () => {
    expect(buildEncodeCommands('master', { width: 1920, height: 1080, fps: 30 }, '/tmp/frames', '/tmp/out'))
      .toEqual([[
        'ffmpeg', '-y', '-framerate', '30', '-i', '/tmp/frames/frame-%04d.png',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
        '/tmp/out/testpilot-marketing-master.mp4',
      ]])
    expect(buildEncodeCommands('gif', { width: 960, height: 540, fps: 15 }, '/tmp/frames', '/tmp/out'))
      .toEqual([[
        'ffmpeg', '-y', '-framerate', '15', '-i', '/tmp/frames/frame-%04d.png',
        '-vf', 'fps=15,scale=960:540:flags=lanczos', '-loop', '0',
        '/tmp/out/testpilot-marketing-preview.gif',
      ]])
  })

  test('renders deterministic frames, invokes injected commands, and cleans frames on success', () => {
    const outputDir = makeOutputDirectory()
    const commands = []
    let firstSvg = ''
    const runCommand = (command) => {
      commands.push(command)
      if (command[0] === 'convert' && !firstSvg) firstSvg = readFileSync(command[3], 'utf8')
    }

    const result = renderPreset('gif', { presetName: 'gif', outputDir, runCommand })

    expect(result).toEqual({
      presetName: 'gif',
      outputPath: path.join(outputDir, 'testpilot-marketing-preview.gif'),
      frameCount: 180,
      width: 960,
      height: 540,
      fps: 15,
      duration: 12,
    })
    expect(firstSvg).toContain('<svg')
    expect(firstSvg).toContain('width="960"')
    expect(commands.slice(0, 2)).toEqual([
      ['command', '-v', 'convert'],
      ['command', '-v', 'ffmpeg'],
    ])
    expect(commands.filter(([command]) => command === 'convert')).toHaveLength(180)
    expect(commands.at(-1)).toEqual(buildEncodeCommands(
      'gif',
      { width: 960, height: 540, fps: 15, duration: 12 },
      path.join(outputDir, '.frames', 'gif'),
      outputDir,
    )[0])
    expect(existsSync(path.join(outputDir, '.frames', 'gif'))).toBe(false)
  })

  test('retains generated SVG frames when requested', () => {
    const outputDir = makeOutputDirectory()

    renderPreset('gif', {
      presetName: 'gif',
      outputDir,
      keepFrames: true,
      runCommand: () => {},
    })

    const frameDir = path.join(outputDir, '.frames', 'gif')
    expect(existsSync(path.join(frameDir, 'frame-0000.svg'))).toBe(true)
    expect(existsSync(path.join(frameDir, 'frame-0179.svg'))).toBe(true)
  })

  test('reports the exact missing media command with installation guidance', () => {
    const outputDir = makeOutputDirectory()
    const runCommand = (command) => {
      if (command.at(-1) === 'convert') throw new Error('not found')
    }

    expect(() => renderPreset('master', {
      presetName: 'master',
      outputDir,
      runCommand,
    })).toThrow(/convert.*Install ImageMagick/is)
  })

  test('CLI exits with an actionable error for an unknown preset', () => {
    const result = spawnSync(process.execPath, ['marketing/render.mjs', '--preset', 'poster'], {
      cwd: path.resolve('.'),
      encoding: 'utf8',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Unknown preset: poster')
  })
})
