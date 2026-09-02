// Injected via chrome.scripting.executeScript({ func: scanPage }) — must stay
// self-contained (no imports besides erased type-only imports, no top-level
// helpers): Chrome only serializes the referenced function itself, so any
// other module-level const/function it called would be undefined in the
// target page's isolated world. All helpers are nested inside scanPage.
import type { ElementSummary } from '../lib/types'

export function scanPage(): ElementSummary[] {
    const INTERACTIVE_SELECTOR = [
        'input',
        'textarea',
        'select',
        'button',
        'a[href]',
        '[role="button"]',
        '[contenteditable="true"]',
    ].join(',')

    function isVisible(el: Element): boolean {
        const style = window.getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
        const rect = el.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
    }

    function labelFor(el: Element): string | null {
        const id = el.getAttribute('id')
        if (id) {
            const label = document.querySelector(`label[for="${CSS.escape(id)}"]`)
            if (label?.textContent?.trim()) return label.textContent.trim()
        }
        const closestLabel = el.closest('label')
        if (closestLabel?.textContent?.trim()) return closestLabel.textContent.trim()
        const ariaLabel = el.getAttribute('aria-label')
        if (ariaLabel) return ariaLabel
        const ariaLabelledBy = el.getAttribute('aria-labelledby')
        if (ariaLabelledBy) {
            const ref = document.getElementById(ariaLabelledBy)
            if (ref?.textContent?.trim()) return ref.textContent.trim()
        }
        return null
    }

    // Prefer stable attributes for re-selection; fall back to a stamped data attribute.
    function selectorFor(el: Element, index: number): string {
        const testId = el.getAttribute('data-testid') || el.getAttribute('data-test')
        if (testId) return `[data-testid="${CSS.escape(testId)}"],[data-test="${CSS.escape(testId)}"]`
        const id = el.getAttribute('id')
        if (id) return `#${CSS.escape(id)}`
        const name = el.getAttribute('name')
        if (name) return `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`
        el.setAttribute('data-testpilot-id', String(index))
        return `[data-testpilot-id="${index}"]`
    }

    function typeOf(el: Element, tag: string): string {
        if (tag === 'input') return (el as HTMLInputElement).type || 'text'
        if (tag === 'select' || tag === 'textarea') return tag
        if (tag === 'a' || el.getAttribute('role') === 'button') return tag === 'a' ? 'link' : 'button'
        return tag
    }

    const nodes = Array.from(document.querySelectorAll(INTERACTIVE_SELECTOR))
    return nodes.map((el, index) => {
        const tag = el.tagName.toLowerCase()
        const inputEl = el as HTMLInputElement
        const isTextish = ['button', 'a'].includes(tag) || el.getAttribute('role') === 'button'
        return {
            id: `el-${index}`,
            tag,
            role: el.getAttribute('role'),
            label: labelFor(el),
            type: typeOf(el, tag),
            name: el.getAttribute('name'),
            placeholder: el.getAttribute('placeholder'),
            required: el.hasAttribute('required'),
            pattern: el.getAttribute('pattern'),
            maxLength: inputEl.maxLength && inputEl.maxLength > 0 ? inputEl.maxLength : null,
            options: tag === 'select' ? Array.from((el as HTMLSelectElement).options).map((o) => o.value || o.text) : null,
            text: isTextish ? (el.textContent || '').trim().slice(0, 120) || null : null,
            selector: selectorFor(el, index),
            visible: isVisible(el),
        }
    })
}

