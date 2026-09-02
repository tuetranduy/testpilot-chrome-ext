type PreviewChrome = {
  storage?: { local: { get: (key: string | null) => Promise<Record<string, unknown>>; set: (values: Record<string, unknown>) => Promise<void>; remove: (key: string) => Promise<void> } }
  tabs?: { query: () => Promise<Array<{ id: number; url: string; title: string }>> }
  permissions?: { contains: () => Promise<boolean>; request: () => Promise<boolean> }
}

const previewGlobal = globalThis as unknown as { chrome?: PreviewChrome }

if (!previewGlobal.chrome?.tabs?.query || !previewGlobal.chrome?.storage?.local) {
  const siteKey = 'site:https://example.com/checkout'
  const store: Record<string, unknown> = {
    [siteKey]: {
      origin: 'https://example.com',
      pathname: '/checkout',
      updatedAt: Date.now(),
      requirementsText: 'Customers can complete checkout with valid shipping and payment details.',
      fieldValues: { email: 'alex@example.com', country: 'Vietnam' },
      lastScan: {
        url: 'https://example.com/checkout',
        title: 'Checkout',
        scannedAt: Date.now(),
        screenshotDataUrl: null,
        elements: [
          { id: 'email', tag: 'input', role: null, label: 'Email address', type: 'email', name: 'email', placeholder: 'you@example.com', required: true, pattern: null, maxLength: null, options: null, text: null, selector: '#email', visible: true },
          { id: 'country', tag: 'select', role: null, label: 'Country', type: null, name: 'country', placeholder: null, required: true, pattern: null, maxLength: null, options: ['Vietnam', 'Singapore'], text: null, selector: '#country', visible: true },
          { id: 'submit', tag: 'button', role: 'button', label: null, type: 'submit', name: null, placeholder: null, required: false, pattern: null, maxLength: null, options: null, text: 'Place order', selector: '#submit', visible: true },
        ],
      },
      testCases: [
        { id: 'tc-1', title: 'Complete checkout with valid customer details', priority: 'High', steps: ['Enter a valid email address', 'Select a supported country', 'Submit the checkout form'], expectedResult: 'The order is accepted and a confirmation is shown.', gherkin: 'Given the checkout form is open\nWhen valid details are submitted\nThen the order is confirmed' },
        { id: 'tc-2', title: 'Prevent checkout when email is missing', priority: 'Medium', steps: ['Leave the email field empty', 'Submit the checkout form'], expectedResult: 'A clear email validation message is shown.', gherkin: null },
      ],
    },
  }

  previewGlobal.chrome = {
    storage: {
      local: {
        get: async (key) => key === null ? { ...store } : { [key]: store[key] },
        set: async (values) => { Object.assign(store, values) },
        remove: async (key) => { delete store[key] },
      },
    },
    tabs: { query: async () => [{ id: 1, url: 'https://example.com/checkout', title: 'Checkout' }] },
    permissions: { contains: async () => true, request: async () => true },
  }
}

await import('./main')
