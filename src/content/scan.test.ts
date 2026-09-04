import { describe, expect, it } from 'vitest'
import { scanPage } from './scan'

describe('scanPage', () => {
    it('extracts labeled form fields with constraints', () => {
        document.body.innerHTML = `
      <form>
        <label for="email">Email</label>
        <input id="email" name="email" type="email" required maxlength="50" placeholder="you@example.com" />
        <select id="country" name="country">
          <option value="us">United States</option>
          <option value="uk">United Kingdom</option>
        </select>
        <button type="submit">Submit</button>
      </form>
    `

        const elements = scanPage()

        const email = elements.find((e) => e.name === 'email')
        expect(email).toMatchObject({
            tag: 'input',
            type: 'email',
            label: 'Email',
            required: true,
            maxLength: 50,
            placeholder: 'you@example.com',
            selector: '#email',
        })

        const country = elements.find((e) => e.name === 'country')
        expect(country?.options).toEqual([
            { value: 'us', label: 'United States' },
            { value: 'uk', label: 'United Kingdom' },
        ])

        const submit = elements.find((e) => e.tag === 'button')
        expect(submit?.text).toBe('Submit')
    })

    it('stamps a data attribute selector when no id/name/testid is present', () => {
        document.body.innerHTML = `<input type="text" placeholder="Anonymous field" />`
        const [element] = scanPage()
        expect(element.selector).toMatch(/data-testpilot-id/)
        expect(document.querySelector(element.selector)).not.toBeNull()
    })

    it('describes each control by its nearest page region', () => {
        document.body.innerHTML = `
          <header><a href="/help">Help</a></header>
          <main><form><input id="email" type="email" /></form></main>
          <footer><a href="/privacy">Privacy</a></footer>
        `

        const elements = scanPage()

        expect(elements.find((element) => element.selector === '#email')).toMatchObject({ context: 'form' })
        expect(elements.find((element) => element.text === 'Help')).toMatchObject({ context: 'header' })
        expect(elements.find((element) => element.text === 'Privacy')).toMatchObject({ context: 'footer' })
    })
})
