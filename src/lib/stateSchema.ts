import { z } from 'zod'
import { CATEGORIES, type FinanceState } from '@/lib/finance'

/**
 * Validates and sanitizes whatever comes back out of `localStorage`.
 *
 * `JSON.parse` succeeding only means the bytes were valid JSON — it says
 * nothing about their shape. Storage on this origin can be edited by the
 * user's own devtools, a browser extension, a shared computer's previous
 * user, or a future version of this app writing a different shape. None of
 * that is attacker input in the usual sense, but every one of those is a way
 * the stored state can stop being a `FinanceState`, and an app that trusts it
 * blindly either crashes (a string where a number was expected propagates to
 * `NaN` through every calculation) or renders something it never validated.
 *
 * So every read is re-validated here, not just the first one: numbers are
 * bounded to the ranges the forms themselves enforce, free text is length-
 * capped and stripped of control characters before it ever reaches a
 * component, and anything that does not parse is rejected wholesale in
 * favour of the known-good seed rather than partially trusted.
 */

const MAX_AMOUNT = 1_000_000
const MAX_LABEL = 120

// Control characters (other than newline/tab) have no legitimate place in a
// label a user typed into a text input; stripping them is cheap insurance
// against anything that slipped in some other way.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g

const label = z
  .string()
  .transform((s) => s.replace(CONTROL_CHARS, '').slice(0, MAX_LABEL).trim())

const amount = z.number().finite().min(0).max(MAX_AMOUNT)
const day = z.number().int().min(1).max(366)

const transactionSchema = z.object({
  id: z.string().min(1).max(64),
  label,
  amount,
  category: z.enum(CATEGORIES as [string, ...string[]]),
  day,
  kind: z.enum(['expense', 'income']),
  transfer: z.boolean().optional(),
})

const subscriptionSchema = z.object({
  id: z.string().min(1).max(64),
  label,
  amount,
  chargeDay: day,
})

const goalSchema = z.object({
  id: z.string().min(1).max(64),
  label,
  target: amount,
  saved: z.number().finite().min(0).max(MAX_AMOUNT),
  byDay: day,
})

const financeStateSchema = z.object({
  budget: z.number().finite().min(0).max(MAX_AMOUNT),
  periodDays: z.number().int().min(1).max(366),
  currentDay: z.number().int().min(1).max(366),
  transactions: z.array(transactionSchema).max(2000),
  subscriptions: z.array(subscriptionSchema).max(200),
  goals: z.array(goalSchema).max(200),
})

/** Returns the sanitized state, or `null` if it does not validate at all. */
export function parseFinanceState(raw: unknown): FinanceState | null {
  const result = financeStateSchema.safeParse(raw)
  return result.success ? (result.data as FinanceState) : null
}
