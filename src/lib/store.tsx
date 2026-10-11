import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { uid } from '@/lib/utils'
import { seedState } from '@/data/seed'
import { parseFinanceState } from '@/lib/stateSchema'
import {
  derive,
  type Category,
  type Decision,
  type Derived,
  type FinanceState,
} from '@/lib/finance'

const KEY = 'tenk-finance-state'

/**
 * Storage is the source of truth, and every write re-reads it first. A second
 * tab therefore cannot overwrite what the first one saved, and the `storage`
 * event keeps open tabs in step.
 *
 * Every read is re-validated through `parseFinanceState`, not merely parsed:
 * a stored value that is well-formed JSON but the wrong shape (hand-edited in
 * devtools, left over from an older version of this app, or just corrupted)
 * falls back to the seed instead of being trusted. See stateSchema.ts.
 */
function readState(): FinanceState {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return seedState
    return parseFinanceState(JSON.parse(raw)) ?? seedState
  } catch {
    return seedState
  }
}

function writeState(next: FinanceState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable — the session still works, it just will not persist */
  }
}

interface Store {
  state: FinanceState
  derived: Derived
  addTransaction: (input: {
    label: string
    amount: number
    category: Category
    kind: 'expense' | 'income'
  }) => void
  removeTransaction: (id: string) => void
  addSubscription: (input: { label: string; amount: number; chargeDay: number }) => void
  removeSubscription: (id: string) => void
  addGoal: (input: { label: string; target: number; byDay: number }) => void
  contributeToGoal: (id: string, amount: number) => void
  removeGoal: (id: string) => void
  setCurrentDay: (day: number) => void
  /** Takes a simulated decision for real. */
  commit: (decision: Decision) => void
  reset: () => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(readState)

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === KEY) setState(readState())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  /** Every mutation funnels through here, so persistence is never forgotten. */
  const update = useCallback((fn: (current: FinanceState) => FinanceState) => {
    const next = fn(readState())
    writeState(next)
    setState(next)
  }, [])

  const addTransaction: Store['addTransaction'] = useCallback(
    (input) =>
      update((s) => ({
        ...s,
        transactions: [
          { ...input, id: uid('t'), day: s.currentDay },
          ...s.transactions,
        ],
      })),
    [update],
  )

  const removeTransaction = useCallback(
    (id: string) =>
      update((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) })),
    [update],
  )

  const addSubscription: Store['addSubscription'] = useCallback(
    (input) =>
      update((s) => ({ ...s, subscriptions: [...s.subscriptions, { ...input, id: uid('s') }] })),
    [update],
  )

  const removeSubscription = useCallback(
    (id: string) =>
      update((s) => ({ ...s, subscriptions: s.subscriptions.filter((x) => x.id !== id) })),
    [update],
  )

  const addGoal: Store['addGoal'] = useCallback(
    (input) =>
      update((s) => ({ ...s, goals: [...s.goals, { ...input, id: uid('g'), saved: 0 }] })),
    [update],
  )

  /**
   * Contributing is a transfer, not a disappearance: the goal grows and the
   * same amount leaves the spendable balance as a transaction. Without the
   * second half the money would be counted twice.
   */
  const contributeToGoal = useCallback(
    (id: string, amount: number) =>
      update((s) => {
        const goal = s.goals.find((g) => g.id === id)
        if (!goal) return s
        const room = Math.max(0, goal.target - goal.saved)
        const applied = Math.min(amount, room)
        if (applied <= 0) return s
        return {
          ...s,
          goals: s.goals.map((g) => (g.id === id ? { ...g, saved: g.saved + applied } : g)),
          transactions: [
            {
              id: uid('t'),
              label: `Saved towards ${goal.label}`,
              amount: applied,
              category: 'Other' as Category,
              day: s.currentDay,
              kind: 'expense' as const,
              transfer: true,
            },
            ...s.transactions,
          ],
        }
      }),
    [update],
  )

  const removeGoal = useCallback(
    (id: string) => update((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) })),
    [update],
  )

  const setCurrentDay = useCallback(
    (day: number) =>
      update((s) => ({ ...s, currentDay: Math.min(s.periodDays, Math.max(1, day)) })),
    [update],
  )

  const commit = useCallback(
    (decision: Decision) =>
      update((s) => {
        if (decision.type === 'expense') {
          return {
            ...s,
            transactions: [
              {
                id: uid('t'),
                label: decision.label || 'Expense',
                amount: decision.amount,
                category: decision.category,
                day: s.currentDay,
                kind: 'expense' as const,
              },
              ...s.transactions,
            ],
          }
        }
        if (decision.type === 'subscription') {
          return {
            ...s,
            subscriptions: [
              ...s.subscriptions,
              {
                id: uid('s'),
                label: decision.label || 'Subscription',
                amount: decision.amount,
                chargeDay: decision.chargeDay,
              },
            ],
          }
        }
        const goal = s.goals.find((g) => g.id === decision.goalId)
        if (!goal) return s
        const applied = Math.min(decision.amount, Math.max(0, goal.target - goal.saved))
        return {
          ...s,
          goals: s.goals.map((g) =>
            g.id === decision.goalId ? { ...g, saved: g.saved + applied } : g,
          ),
          transactions: [
            {
              id: uid('t'),
              label: `Saved towards ${goal.label}`,
              amount: applied,
              category: 'Other' as Category,
              day: s.currentDay,
              kind: 'expense' as const,
              transfer: true,
            },
            ...s.transactions,
          ],
        }
      }),
    [update],
  )

  const reset = useCallback(() => {
    writeState(seedState)
    setState(seedState)
  }, [])

  const derived = useMemo(() => derive(state), [state])

  const value = useMemo<Store>(
    () => ({
      state,
      derived,
      addTransaction,
      removeTransaction,
      addSubscription,
      removeSubscription,
      addGoal,
      contributeToGoal,
      removeGoal,
      setCurrentDay,
      commit,
      reset,
    }),
    [
      state,
      derived,
      addTransaction,
      removeTransaction,
      addSubscription,
      removeSubscription,
      addGoal,
      contributeToGoal,
      removeGoal,
      setCurrentDay,
      commit,
      reset,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
