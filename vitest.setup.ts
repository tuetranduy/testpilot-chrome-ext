// jsdom doesn't implement CSS.escape; polyfill for tests only (Chrome supports it natively).
if (typeof CSS === 'undefined' || typeof CSS.escape !== 'function') {
    ; (globalThis as unknown as { CSS: { escape: (s: string) => string } }).CSS = {
        escape: (s: string) => s.replace(/([^\w-])/g, '\\$1'),
    }
}
