import { describe, expect, it } from 'vitest'
import { fillFields } from './fill'

describe('fillFields', () => {
    it('sets text input values and dispatches input/change events', () => {
        document.body.innerHTML = `<input id="name" type="text" />`
        const input = document.querySelector<HTMLInputElement>('#name')!
        let inputEvents = 0
        let changeEvents = 0
        input.addEventListener('input', () => inputEvents++)
        input.addEventListener('change', () => changeEvents++)

        const filled = fillFields([{ selector: '#name', value: 'Ada Lovelace', type: 'text' }])

        expect(filled).toBe(1)
        expect(input.value).toBe('Ada Lovelace')
        expect(inputEvents).toBe(1)
        expect(changeEvents).toBe(1)
    })

    it('checks checkboxes based on truthy value strings', () => {
        document.body.innerHTML = `<input id="agree" type="checkbox" />`
        const filled = fillFields([{ selector: '#agree', value: 'true', type: 'checkbox' }])
        expect(filled).toBe(1)
        expect(document.querySelector<HTMLInputElement>('#agree')!.checked).toBe(true)
    })

    it('selects a matching <select> option', () => {
        document.body.innerHTML = `
      <select id="country">
        <option value="us">United States</option>
        <option value="uk">United Kingdom</option>
      </select>
    `
        const filled = fillFields([{ selector: '#country', value: 'uk', type: 'select' }])
        expect(filled).toBe(1)
        expect(document.querySelector<HTMLSelectElement>('#country')!.value).toBe('uk')
    })

    it('skips instructions whose selector matches nothing', () => {
        document.body.innerHTML = `<div></div>`
        const filled = fillFields([{ selector: '#missing', value: 'x', type: 'text' }])
        expect(filled).toBe(0)
    })
})
