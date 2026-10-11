/**
 * The finance engine.
 *
 * Every number the interface shows is derived here, from one state object, by
 * pure functions. Nothing is computed inside a component. That is what makes
 * the consequences of a decision genuinely interconnected rather than merely
 * displayed side by side: change one input and every figure moves together,
 * because they all come from the same calculation.
 */

export type Category =
  | 'Food'
  | 'Transport'
  | 'Shopping'
  | 'Entertainment'
  | 'Bills'
  | 'Health'
  | 'Education'
  | 'Other'

export const CATEGORIES: Category[] = [
  'Food',
  'Transport',
  'Shopping',
  'Entertainment',
  'Bills',
  'Health',
  'Education',
  'Other',
]

export interface Transaction {
  id: string
  label: string
  amount: number
  category: Category
  /** Day of the 30-day period, 1-indexed. */
  day: number
  kind: 'expense' | 'income'
  /**
   * True when this is money moved into a savings goal rather than spent.
   * It still leaves the balance, but it is not consumption, so it is kept
   * out of the burn rate and out of the category breakdown.
   */
  transfer?: boolean
}

export interface Subscription {
  id: string
  label: string
  amount: number
  /** Day of the period it is charged on, 1-indexed. */
  chargeDay: number
}

export interface Goal {
  id: string
  label: string
  target: number
  saved: number
  /** Day of the period it should be met by, 1-indexed. */
  byDay: number
}

export interface FinanceState {
  /** The starting budget for the whole period. */
  budget: number
  periodDays: number
  /** Today, within the period. 1-indexed. */
  currentDay: number
  transactions: Transaction[]
  subscriptions: Subscription[]
  goals: Goal[]
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical'

export interface Derived {
  /** Everything that has left the account so far, savings transfers included. */
  spent: number
  /** Spending only — the part of `spent` that was consumption. */
  discretionarySpent: number
  /** Extra income received so far. */
  income: number
  /** Subscription charges that have already hit. */
  chargedSubscriptions: number
  /** What is actually in the account right now. */
  balance: number
  /** Subscription charges still to come before the period ends. */
  upcomingCommitments: number
  /** Still needed to finish every savings goal. */
  goalsOutstanding: number
  /**
   * Balance minus everything already promised — commitments and goals.
   * This, not the balance, is the number that is genuinely free to spend.
   */
  safeToSpend: number
  daysElapsed: number
  daysLeft: number
  /** safeToSpend spread evenly across the days remaining. */
  dailyAllowance: number
  /** Average discretionary spend per completed day. */
  averageBurn: number
  /** Completed days the burn rate is averaged over. */
  burnDays: number
  /** Where the balance lands on the last day if the current rate continues. */
  projectedEndBalance: number
  /** The day the money runs out at the current rate, or null if it does not. */
  runsOutOnDay: number | null
  risk: RiskLevel
  /** 0–100, made of four named parts so it can be explained, not just shown. */
  health: number
  healthParts: { label: string; score: number; max: number; detail: string }[]
  /** Per-day projection for the whole period, for the forecast chart. */
  forecast: { day: number; balance: number; actual: boolean }[]
  spendByCategory: { label: string; value: number }[]
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export function derive(state: FinanceState): Derived {
  const { budget, periodDays, currentDay, transactions, subscriptions, goals } = state

  const spent = transactions
    .filter((t) => t.kind === 'expense' && t.day <= currentDay)
    .reduce((sum, t) => sum + t.amount, 0)

  const discretionarySpent = transactions
    .filter((t) => t.kind === 'expense' && !t.transfer && t.day <= currentDay)
    .reduce((sum, t) => sum + t.amount, 0)

  const income = transactions
    .filter((t) => t.kind === 'income' && t.day <= currentDay)
    .reduce((sum, t) => sum + t.amount, 0)

  const chargedSubscriptions = subscriptions
    .filter((s) => s.chargeDay <= currentDay)
    .reduce((sum, s) => sum + s.amount, 0)

  const balance = budget + income - spent - chargedSubscriptions

  const upcomingCommitments = subscriptions
    .filter((s) => s.chargeDay > currentDay)
    .reduce((sum, s) => sum + s.amount, 0)

  const goalsOutstanding = goals.reduce(
    (sum, g) => sum + Math.max(0, g.target - g.saved),
    0,
  )

  const safeToSpend = balance - upcomingCommitments - goalsOutstanding

  const daysElapsed = currentDay
  const daysLeft = Math.max(0, periodDays - currentDay + 1)

  const dailyAllowance = daysLeft > 0 ? safeToSpend / daysLeft : 0

  /**
   * The burn rate is averaged over COMPLETED days only, and ignores savings
   * transfers.
   *
   * Including today would mean a single decision taken this morning instantly
   * rewrites your long-run habit: buy one ₹2,000 thing on day 12 and the model
   * claims you now spend ₹167 more every day for the rest of the month. That
   * overstates a one-off badly. Excluding today, a decision taken now lowers
   * the balance by exactly its own size and leaves the trend alone, which is
   * what makes the before/after forecast legible — the two lines run parallel,
   * separated by the cost of the decision.
   */
  const burnDays = Math.max(0, currentDay - 1)
  const historicSpend = transactions
    .filter((t) => t.kind === 'expense' && !t.transfer && t.day < currentDay)
    .reduce((sum, t) => sum + t.amount, 0)
  const averageBurn = burnDays > 0 ? historicSpend / burnDays : 0

  // If today's rate holds, this is where the period ends up.
  const projectedEndBalance = balance - upcomingCommitments - averageBurn * Math.max(0, daysLeft - 1)

  /**
   * Walk the period day by day. Days up to today use real data; later days
   * apply the average burn and any scheduled charge. Walking it beats a
   * closed-form estimate because commitments land on specific days.
   */
  const forecast: Derived['forecast'] = []
  let running = budget
  let runsOutOnDay: number | null = null

  for (let day = 1; day <= periodDays; day += 1) {
    const actual = day <= currentDay

    if (actual) {
      running += transactions
        .filter((t) => t.day === day)
        .reduce((sum, t) => sum + (t.kind === 'income' ? t.amount : -t.amount), 0)
    } else {
      running -= averageBurn
    }

    running -= subscriptions
      .filter((s) => s.chargeDay === day)
      .reduce((sum, s) => sum + s.amount, 0)

    if (running < 0 && runsOutOnDay === null) runsOutOnDay = day
    forecast.push({ day, balance: Math.round(running), actual })
  }

  const spendByCategory = CATEGORIES.map((category) => ({
    label: category,
    value: transactions
      .filter(
        (t) =>
          t.kind === 'expense' && !t.transfer && t.day <= currentDay && t.category === category,
      )
      .reduce((sum, t) => sum + t.amount, 0),
  }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)

  // ---- Health score -------------------------------------------------------
  // Four named parts, each explained, so the number is understandable rather
  // than a black box.

  // 1. Runway — does the money last the period?
  const runwayScore =
    projectedEndBalance >= budget * 0.1
      ? 30
      : projectedEndBalance >= 0
        ? 22
        : projectedEndBalance >= -budget * 0.1
          ? 10
          : 0

  // 2. Spending discipline — burn rate against what is affordable.
  const burnRatio = dailyAllowance > 0 ? averageBurn / dailyAllowance : averageBurn > 0 ? 3 : 0
  const disciplineScore =
    burnRatio === 0 ? 25 : burnRatio <= 0.8 ? 25 : burnRatio <= 1 ? 20 : burnRatio <= 1.3 ? 12 : burnRatio <= 1.8 ? 5 : 0

  // 3. Savings progress — goals kept pace with the calendar?
  const goalTarget = goals.reduce((s, g) => s + g.target, 0)
  const goalSaved = goals.reduce((s, g) => s + Math.min(g.saved, g.target), 0)
  const expectedProgress = periodDays > 0 ? currentDay / periodDays : 0
  const actualProgress = goalTarget > 0 ? goalSaved / goalTarget : 1
  const savingsScore =
    goalTarget === 0
      ? 18
      : Math.round(clamp(actualProgress / Math.max(expectedProgress, 0.01), 0, 1) * 25)

  // 4. Commitment load — how much of the balance is already promised away.
  const commitmentRatio = balance > 0 ? (upcomingCommitments + goalsOutstanding) / balance : 1
  const commitmentScore =
    commitmentRatio <= 0.3 ? 20 : commitmentRatio <= 0.5 ? 15 : commitmentRatio <= 0.75 ? 9 : commitmentRatio <= 1 ? 4 : 0

  const health = clamp(
    Math.round(runwayScore + disciplineScore + savingsScore + commitmentScore),
    0,
    100,
  )

  const healthParts = [
    {
      label: 'Runway',
      score: runwayScore,
      max: 30,
      detail:
        projectedEndBalance >= 0
          ? `On track to finish the 30 days with ₹${Math.round(projectedEndBalance).toLocaleString('en-IN')} left.`
          : `On track to overshoot by ₹${Math.abs(Math.round(projectedEndBalance)).toLocaleString('en-IN')}.`,
    },
    {
      label: 'Spending discipline',
      score: disciplineScore,
      max: 25,
      detail:
        burnDays === 0
          ? 'Day one — no completed day to average yet.'
          : averageBurn === 0
            ? 'Nothing spent yet.'
            : `Spending ₹${Math.round(averageBurn).toLocaleString('en-IN')} a day against an allowance of ₹${Math.round(dailyAllowance).toLocaleString('en-IN')}.`,
    },
    {
      label: 'Savings progress',
      score: savingsScore,
      max: 25,
      detail:
        goalTarget === 0
          ? 'No savings goals set.'
          : `${Math.round(actualProgress * 100)}% saved by day ${currentDay} of ${periodDays}.`,
    },
    {
      label: 'Commitment load',
      score: commitmentScore,
      max: 20,
      detail: `₹${Math.round(upcomingCommitments + goalsOutstanding).toLocaleString('en-IN')} of your ₹${Math.round(balance).toLocaleString('en-IN')} is already promised.`,
    },
  ]

  const risk: RiskLevel =
    health >= 75 ? 'low' : health >= 55 ? 'moderate' : health >= 35 ? 'high' : 'critical'

  return {
    spent,
    discretionarySpent,
    income,
    chargedSubscriptions,
    balance,
    upcomingCommitments,
    goalsOutstanding,
    safeToSpend,
    daysElapsed,
    daysLeft,
    dailyAllowance,
    averageBurn,
    burnDays,
    projectedEndBalance,
    runsOutOnDay,
    risk,
    health,
    healthParts,
    forecast,
    spendByCategory,
  }
}

// ---- Simulation -----------------------------------------------------------

export type Decision =
  | { type: 'expense'; label: string; amount: number; category: Category }
  | { type: 'subscription'; label: string; amount: number; chargeDay: number }
  | { type: 'saving'; goalId: string; amount: number }

/**
 * Applies a decision to a copy of the state and re-derives everything.
 *
 * The decision is never committed — this is the "simulate before you take it"
 * requirement. The caller gets `before` and `after` and can show the delta on
 * every metric at once.
 */
export function simulate(state: FinanceState, decision: Decision) {
  const next: FinanceState = {
    ...state,
    transactions: [...state.transactions],
    subscriptions: [...state.subscriptions],
    goals: state.goals.map((g) => ({ ...g })),
  }

  if (decision.type === 'expense') {
    next.transactions.push({
      id: 'sim',
      label: decision.label || 'Simulated expense',
      amount: decision.amount,
      category: decision.category,
      day: state.currentDay,
      kind: 'expense',
    })
  }

  if (decision.type === 'subscription') {
    next.subscriptions.push({
      id: 'sim',
      label: decision.label || 'Simulated subscription',
      amount: decision.amount,
      chargeDay: decision.chargeDay,
    })
  }

  if (decision.type === 'saving') {
    const goal = next.goals.find((g) => g.id === decision.goalId)
    if (goal) goal.saved += decision.amount
    // Money moved into a goal leaves the spendable balance.
    next.transactions.push({
      id: 'sim',
      label: 'Simulated transfer to savings',
      amount: decision.amount,
      category: 'Other',
      day: state.currentDay,
      kind: 'expense',
      transfer: true,
    })
  }

  return { before: derive(state), after: derive(next), nextState: next }
}

export function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

/**
 * Short form for chart axes.
 *
 * Intl's own compact notation renders 10,000 as "10T" under en-IN — "T" for
 * thousand — which every reader parses as trillion. Hand-rolled is clearer.
 */
export function formatINRShort(value: number) {
  const sign = value < 0 ? '-' : ''
  const n = Math.abs(value)
  if (n >= 1000) {
    const k = n / 1000
    return `${sign}₹${k % 1 === 0 ? k : k.toFixed(1)}k`
  }
  return `${sign}₹${Math.round(n)}`
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: 'Low risk',
  moderate: 'Moderate risk',
  high: 'High risk',
  critical: 'Critical risk',
}
