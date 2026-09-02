// Injected via chrome.scripting.executeScript({ func: fillFields }) — must
// stay self-contained: Chrome only serializes the referenced function, so any
// other top-level helper (like a separate setNativeValue) would be undefined
// in the target page's isolated world. See scan.ts for the same constraint.

export interface FillInstruction {
    selector: string
    value: string
    type: string | null
}

export function fillFields(instructions: FillInstruction[]): number {
    // Sets a value the framework's controlled-input listeners will observe (React etc).
    function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
        setter?.call(el, value)
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
    }

    let filled = 0
    for (const instr of instructions) {
        const el = document.querySelector(instr.selector)
        if (!el) continue
        const tag = el.tagName.toLowerCase()

        if (tag === 'select') {
            const select = el as HTMLSelectElement
            const match = Array.from(select.options).find((o) => o.value === instr.value || o.text === instr.value)
            if (match) {
                select.value = match.value
                select.dispatchEvent(new Event('change', { bubbles: true }))
                filled++
            }
            continue
        }

        if (tag === 'input' && (instr.type === 'checkbox' || instr.type === 'radio')) {
            const input = el as HTMLInputElement
            const shouldCheck = ['true', '1', 'yes', 'checked'].includes(instr.value.toLowerCase())
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked')?.set
            setter?.call(input, shouldCheck)
            input.dispatchEvent(new Event('click', { bubbles: true }))
            input.dispatchEvent(new Event('change', { bubbles: true }))
            filled++
            continue
        }

        if (tag === 'input' || tag === 'textarea') {
            setNativeValue(el as HTMLInputElement | HTMLTextAreaElement, instr.value)
            filled++
            continue
        }

        if (el.getAttribute('contenteditable') === 'true') {
            el.textContent = instr.value
            el.dispatchEvent(new Event('input', { bubbles: true }))
            filled++
        }
    }
    return filled
}
