import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, test } from 'vitest'

const marketingStyles = readFileSync('docs/styles.css', 'utf8')

describe('marketing editorial layout', () => {
  afterEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  test('keeps the quote accent rule at the quote content height', () => {
    document.head.innerHTML = `<style>${marketingStyles}</style>`
    document.body.innerHTML = `
      <section class="editorial-block">
        <div class="pull-quote">A short pull quote.</div>
        <div><p>Long editorial copy that creates a taller neighboring grid item.</p></div>
      </section>
    `

    const block = document.querySelector('.editorial-block')
    const quote = document.querySelector('.pull-quote')
    const blockAlignment = getComputedStyle(block).alignItems
    const quoteAlignment = getComputedStyle(quote).alignSelf

    expect([blockAlignment, quoteAlignment]).toContain('start')
  })
})
