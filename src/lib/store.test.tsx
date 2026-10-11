import { describe, expect, it, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { StoreProvider, useStore } from './store'
import type { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <StoreProvider>{children}</StoreProvider>
)

beforeEach(() => {
  window.localStorage.clear()
})

describe('useStore', () => {
  it('loads the seed state when storage is empty', () => {
    const { result } = renderHook(() => useStore(), { wrapper })
    expect(result.current.state.budget).toBe(10000)
    expect(result.current.state.periodDays).toBe(30)
  })

  it('commit() persists a decision so a fresh mount picks it up', () => {
    const { result, unmount } = renderHook(() => useStore(), { wrapper })
    const balanceBefore = result.current.derived.balance

    act(() => {
      result.current.commit({ type: 'expense', label: 'Test', amount: 777, category: 'Food' })
    })
    expect(result.current.derived.balance).toBe(balanceBefore - 777)
    unmount()

    const second = renderHook(() => useStore(), { wrapper })
    expect(second.result.current.derived.balance).toBe(balanceBefore - 777)
  })

  it('reset() restores the seed and clears committed decisions', () => {
    const { result } = renderHook(() => useStore(), { wrapper })
    act(() => {
      result.current.commit({ type: 'expense', label: 'Test', amount: 500, category: 'Food' })
    })
    act(() => result.current.reset())
    expect(result.current.state.transactions.some((t) => t.label === 'Test')).toBe(false)
  })

  it('contributeToGoal never contributes more than the remaining room on the goal', () => {
    const { result } = renderHook(() => useStore(), { wrapper })
    const goal = result.current.state.goals[0]
    const room = goal.target - goal.saved

    act(() => result.current.contributeToGoal(goal.id, room + 10_000))

    const updated = result.current.state.goals.find((g) => g.id === goal.id)!
    expect(updated.saved).toBe(goal.target) // clamped, never overshoots
  })

  it('a corrupted value written directly to localStorage does not crash the app on next read', () => {
    window.localStorage.setItem(
      'tenk-finance-state',
      JSON.stringify({ budget: 'not-a-number', transactions: 'also-not-an-array' }),
    )
    const { result } = renderHook(() => useStore(), { wrapper })
    // Falls back to the known-good seed instead of propagating garbage.
    expect(result.current.state.budget).toBe(10000)
    expect(Array.isArray(result.current.state.transactions)).toBe(true)
  })

  it('removeTransaction only removes the targeted entry', () => {
    const { result } = renderHook(() => useStore(), { wrapper })
    const countBefore = result.current.state.transactions.length
    const target = result.current.state.transactions[0].id

    act(() => result.current.removeTransaction(target))

    expect(result.current.state.transactions).toHaveLength(countBefore - 1)
    expect(result.current.state.transactions.find((t) => t.id === target)).toBeUndefined()
  })
})
