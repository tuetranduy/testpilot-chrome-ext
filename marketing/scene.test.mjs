import { describe, expect, test } from 'vitest'
import { TIMELINE, PRESETS, frameCount, renderMarketingFrame } from './scene.mjs'

describe('marketing scene', () => {
  test('timeline is ordered and covers the full 12 second edit', () => {
    expect(TIMELINE[0].start).toBe(0)
    expect(TIMELINE.at(-1).end).toBe(12)
    expect(TIMELINE.every((beat, index) => index === 0 || beat.start === TIMELINE[index - 1].end)).toBe(true)
  })

  test('presets expose the approved dimensions and frame rate', () => {
    expect(PRESETS.master).toMatchObject({ width: 1920, height: 1080, fps: 30, duration: 12 })
    expect(PRESETS.gif).toMatchObject({ width: 960, height: 540, fps: 15, duration: 12 })
    expect(PRESETS.square).toMatchObject({ width: 1080, height: 1080, fps: 30, duration: 12 })
    expect(PRESETS.vertical).toMatchObject({ width: 1080, height: 1920, fps: 30, duration: 12 })
  })

  test('frame count is deterministic', () => {
    expect(frameCount(PRESETS.master)).toBe(360)
    expect(frameCount(PRESETS.gif)).toBe(180)
  })

  test('representative frames contain the approved story copy and lockup', () => {
    const opening = renderMarketingFrame({ time: 1, width: 1920, height: 1080 })
    const middle = renderMarketingFrame({ time: 7.5, width: 1920, height: 1080 })
    const ending = renderMarketingFrame({ time: 10.5, width: 1920, height: 1080 })
    expect(opening).toContain('From design to live page.')
    expect(middle).toContain('Fill realistic data.')
    expect(middle).toContain('Scan')
    expect(ending).toContain('Sharper first drafts.')
    expect(ending).toContain('TestPilot')
  })
})
