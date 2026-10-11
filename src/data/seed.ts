import type { FinanceState } from '@/lib/finance'

/**
 * A realistic month in progress: twelve days in, some spending done, two
 * subscriptions already charged and two still to come, two goals part-funded.
 *
 * The figures are tuned deliberately. On first load the month is *workable
 * but thin* — moderate risk, health in the sixties, one warning showing. That
 * leaves room in both directions: a ₹2,800 unexpected expense visibly tips it
 * into critical, and trimming a subscription visibly pulls it back. A seed
 * that started comfortable would make every simulation look harmless, and one
 * that started in crisis would make every simulation look pointless.
 *
 * The two "Saved towards…" rows are not decoration: money already moved into
 * a goal has genuinely left the spendable balance, so it has to appear as a
 * transaction. Without them the balance would be ₹1,050 too high and the
 * goals page would quietly disagree with the overview. They carry
 * `transfer: true` so they do not inflate the burn rate or the category
 * breakdown — setting money aside is not consumption.
 */
export const seedState: FinanceState = {
  budget: 10000,
  periodDays: 30,
  currentDay: 12,

  transactions: [
    { id: 't1', label: 'Groceries for the week', amount: 760, category: 'Food', day: 2, kind: 'expense' },
    { id: 't2', label: 'Metro recharge', amount: 400, category: 'Transport', day: 2, kind: 'expense' },
    { id: 't3', label: 'Lecture notes printout', amount: 180, category: 'Education', day: 3, kind: 'expense' },
    { id: 't4', label: 'Saved towards Emergency buffer', amount: 600, category: 'Other', day: 3, kind: 'expense', transfer: true },
    { id: 't5', label: 'Dinner with friends', amount: 520, category: 'Food', day: 5, kind: 'expense' },
    { id: 't6', label: 'Freelance logo design', amount: 1500, category: 'Other', day: 6, kind: 'income' },
    { id: 't7', label: 'Cab home, late night', amount: 220, category: 'Transport', day: 6, kind: 'expense' },
    { id: 't8', label: 'Saved towards Weekend trip fund', amount: 450, category: 'Other', day: 7, kind: 'expense', transfer: true },
    { id: 't9', label: 'New running shoes', amount: 700, category: 'Shopping', day: 8, kind: 'expense' },
    { id: 't10', label: 'Chemist — cold medicine', amount: 160, category: 'Health', day: 9, kind: 'expense' },
    { id: 't11', label: 'Cinema ticket', amount: 260, category: 'Entertainment', day: 10, kind: 'expense' },
  ],

  subscriptions: [
    { id: 's1', label: 'Music streaming', amount: 119, chargeDay: 4 },
    { id: 's2', label: 'Mobile data pack', amount: 299, chargeDay: 7 },
    { id: 's3', label: 'Gym membership', amount: 800, chargeDay: 20 },
    { id: 's4', label: 'Cloud storage', amount: 130, chargeDay: 25 },
  ],

  goals: [
    { id: 'g1', label: 'Emergency buffer', target: 1500, saved: 600, byDay: 30 },
    { id: 'g2', label: 'Weekend trip fund', target: 2000, saved: 450, byDay: 28 },
  ],
}
