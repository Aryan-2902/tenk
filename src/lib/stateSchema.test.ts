import { describe, expect, it } from 'vitest'
import { parseFinanceState } from './stateSchema'

const validState = {
  budget: 10000,
  periodDays: 30,
  currentDay: 5,
  transactions: [
    { id: 't1', label: 'Coffee', amount: 100, category: 'Food', day: 1, kind: 'expense' },
  ],
  subscriptions: [],
  goals: [],
}

describe('parseFinanceState', () => {
  it('accepts a well-formed state unchanged', () => {
    const result = parseFinanceState(validState)
    expect(result).not.toBeNull()
    expect(result!.budget).toBe(10000)
    expect(result!.transactions).toHaveLength(1)
  })

  it('rejects null, undefined, arrays, and primitives outright', () => {
    for (const bad of [null, undefined, [], 'state', 42, true]) {
      expect(parseFinanceState(bad)).toBeNull()
    }
  })

  it('rejects a state with the wrong category enum, rather than letting it through', () => {
    const tampered = {
      ...validState,
      transactions: [{ ...validState.transactions[0], category: 'NotACategory' }],
    }
    expect(parseFinanceState(tampered)).toBeNull()
  })

  it('rejects a negative or absurdly large amount', () => {
    for (const amount of [-100, 1e9, Infinity, NaN]) {
      const tampered = { ...validState, transactions: [{ ...validState.transactions[0], amount }] }
      expect(parseFinanceState(tampered)).toBeNull()
    }
  })

  it('rejects a non-numeric amount instead of letting it propagate to NaN', () => {
    const tampered = {
      ...validState,
      transactions: [{ ...validState.transactions[0], amount: '<script>alert(1)</script>' }],
    }
    expect(parseFinanceState(tampered)).toBeNull()
  })

  it('strips control characters from a label and caps its length', () => {
    const longLabel = 'x'.repeat(500)
    const result = parseFinanceState({
      ...validState,
      transactions: [
        { ...validState.transactions[0], label: `evil\u0000\u0007${longLabel}` },
      ],
    })
    expect(result).not.toBeNull()
    expect(result!.transactions[0].label).not.toMatch(/[\u0000-\u0008]/)
    expect(result!.transactions[0].label.length).toBeLessThanOrEqual(120)
  })

  it('a label is plain text that reads back exactly as stored — React escapes it, there is no markup to strip', () => {
    const payload = '<img src=x onerror=alert(1)>'
    const result = parseFinanceState({
      ...validState,
      transactions: [{ ...validState.transactions[0], label: payload }],
    })
    // The schema does not need to strip HTML because nothing in the app ever
    // renders a label as HTML (no dangerouslySetInnerHTML in the codebase);
    // React renders it as the literal text node `<img ...>` that a browser
    // never parses as markup. This test documents that assumption.
    expect(result!.transactions[0].label).toBe(payload)
  })

  it('rejects an oversized array (a denial-of-service style payload)', () => {
    const tampered = {
      ...validState,
      transactions: Array.from({ length: 5000 }, (_, i) => ({
        ...validState.transactions[0],
        id: `t${i}`,
      })),
    }
    expect(parseFinanceState(tampered)).toBeNull()
  })

  it('rejects day values outside the sane 1–366 range', () => {
    for (const day of [0, -1, 400, 1.5]) {
      const tampered = { ...validState, transactions: [{ ...validState.transactions[0], day }] }
      expect(parseFinanceState(tampered)).toBeNull()
    }
  })
})
