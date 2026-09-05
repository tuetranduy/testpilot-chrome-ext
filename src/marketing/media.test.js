import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const siteMarkup = readFileSync('docs/index.html', 'utf8')
const siteStyles = readFileSync('docs/styles.css', 'utf8')
const siteRoot = path.resolve('docs')

describe('marketing hero media', () => {
  test('uses responsive marketing video exports with a GIF fallback', () => {
    const hero = document.createElement('div')
    hero.innerHTML = siteMarkup

    const video = hero.querySelector('.hero-video')
    const sources = Array.from(video?.querySelectorAll('source') ?? [])
    const fallback = video?.querySelector('img')

    expect(video).not.toBeNull()
    expect(video?.autoplay).toBe(true)
    expect(video?.hasAttribute('muted')).toBe(true)
    expect(video?.loop).toBe(true)
    expect(video?.playsInline).toBe(true)
    expect(video?.preload).toBe('metadata')
    expect(video?.getAttribute('aria-label')).toBe('TestPilot workflow preview')
    expect(sources.map((source) => source.getAttribute('src'))).toEqual([
      'marketing/exports/testpilot-marketing-vertical.mp4',
      'marketing/exports/testpilot-marketing-square.mp4',
      'marketing/exports/testpilot-marketing-master.mp4',
    ])
    expect(sources.map((source) => source.getAttribute('media'))).toEqual([
      '(max-width: 560px)',
      '(max-width: 850px)',
      null,
    ])
    expect(fallback?.getAttribute('src')).toBe('marketing/exports/testpilot-marketing-preview.gif')
    expect(fallback?.getAttribute('alt')).toBe('TestPilot workflow preview: move from a Figma design to a scanned, generated, and filled QA workspace.')

    for (const asset of [
      'testpilot-marketing-vertical.mp4',
      'testpilot-marketing-square.mp4',
      'testpilot-marketing-master.mp4',
      'testpilot-marketing-preview.gif',
    ]) {
      expect(existsSync(path.join(siteRoot, 'marketing', 'exports', asset))).toBe(true)
    }
  })

  test('contains mismatched hero media only at the mobile breakpoint', () => {
    const style = document.createElement('style')
    style.textContent = siteStyles
    document.head.append(style)

    const rules = Array.from(style.sheet?.cssRules ?? [])
    const baseVideoRule = rules.find((rule) => rule.selectorText === '.hero-video')
    const mobileRule = rules.find((rule) => (
      rule.conditionText?.replaceAll(' ', '') === '(max-width:560px)'
      && Array.from(rule.cssRules ?? []).some((nestedRule) => nestedRule.selectorText === '.hero-video')
    ))
    const mobileVideoRule = Array.from(mobileRule?.cssRules ?? [])
      .find((rule) => rule.selectorText === '.hero-video')

    expect(baseVideoRule?.style.objectFit).toBe('cover')
    expect(mobileVideoRule?.style.objectFit).toBe('contain')

    style.remove()
  })
})
