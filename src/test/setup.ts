import '@testing-library/jest-dom/vitest'

// jsdom gives every element a 0×0 layout box, which Recharts' ResponsiveContainer
// warns about loudly and harmlessly on every render in a test environment.
// Silencing just that one message keeps real console.error output (prop-type
// warnings, React errors) visible instead of buried under chart noise.
const originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('should be greater than 0')) return
  originalWarn(...args)
}

// jsdom has no ResizeObserver, which Recharts' ResponsiveContainer needs.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub

// jsdom does not implement matchMedia; useTheme and the boot script read it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
