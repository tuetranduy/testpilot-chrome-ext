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

  test('tilts the source card with one affine transform and hands it to the workspace', () => {
    const opening = renderMarketingFrame({ time: 1, width: 1920, height: 1080 })
    const handoff = renderMarketingFrame({ time: 2.1, width: 1920, height: 1080 })

    expect(opening).toMatch(/data-scene="source"[^>]*data-tilt="-2"[^>]*transform="skewY\(-2\)"/)
    expect(opening).not.toContain('rotate(')
    expect(opening).not.toContain('matrix(')
    expect(handoff).toContain('data-transition="source-to-workspace"')
    expect(handoff).toContain('data-progress="0.67"')
    expect(handoff).toMatch(/data-scene="source"[^>]*opacity="0\.33"/)
    expect(handoff).toMatch(/data-scene="workspace"[^>]*opacity="0\.67"/)
    expect(handoff).toContain('figma / checkout')
    expect(handoff).toContain('Workspace')
  })

  test('increments the reviewable scenario count across the Generate beat', () => {
    const countAt = (time) => {
      const frame = renderMarketingFrame({ time, width: 1920, height: 1080 })
      return Number(frame.match(/(\d+) of 10 scenarios/)?.[1])
    }

    expect([4, 4.2, 4.4, 4.6, 4.8, 5, 5.2, 5.4, 5.6, 5.8].map(countAt))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  test('keeps the selected-field checklist in square and vertical Fill scenes', () => {
    for (const height of [1080, 1920]) {
      const frame = renderMarketingFrame({ time: 7.5, width: 1080, height })

      expect(frame).toContain('data-section="field-checklist"')
      expect(frame).toContain('Email address')
      expect(frame).toContain('Shipping address')
      expect(frame).toContain('Payment details')
      expect(frame.match(/data-selected="true"/g)).toHaveLength(2)
      expect(frame.match(/data-selected="false"/g)).toHaveLength(1)
    }
  })

  test('stacks narrow headline, active card, and supporting elements inside the canvas', () => {
    for (const height of [1080, 1920]) {
      const frame = renderMarketingFrame({ time: 7.5, width: 1080, height })
      expect(frame).toContain('data-layout="stacked"')

      const sections = ['headline', 'active-card', 'supporting']
      const positions = sections.map((section) => {
        const match = frame.match(new RegExp(`data-section="${section}"[^>]*data-x="([\\d.]+)"[^>]*data-y="([\\d.]+)"[^>]*data-width="([\\d.]+)"[^>]*data-height="([\\d.]+)"`))
        expect(match).not.toBeNull()
        return match.slice(1).map(Number)
      })

      expect(positions[0][1]).toBeLessThan(positions[1][1])
      expect(positions[1][1]).toBeLessThan(positions[2][1])
      for (const [x, y, sectionWidth, sectionHeight] of positions) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(x + sectionWidth).toBeLessThanOrEqual(1080)
        expect(y + sectionHeight).toBeLessThanOrEqual(height)
      }
    }
  })
})
