import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useStore } from '@/lib/store'
import { formatINR } from '@/lib/finance'

/**
 * The maths, in the open, filled in with the user's own current figures.
 *
 * A finance product that shows a score without showing its working asks to be
 * trusted. Showing the arithmetic is what turns "your health is 61" into
 * something a person can act on.
 */
export function HowItWorksDialog({ onClose }: { onClose: () => void }) {
  const { state, derived: d } = useStore()

  const rows = [
    {
      term: 'Balance',
      formula: 'budget + income − spent − subscriptions already charged',
      worked: `${formatINR(state.budget)} + ${formatINR(d.income)} − ${formatINR(
        d.spent,
      )} − ${formatINR(d.chargedSubscriptions)} = ${formatINR(d.balance)}`,
    },
    {
      term: 'Safe to spend',
      formula: 'balance − commitments still to come − still owed to goals',
      worked: `${formatINR(d.balance)} − ${formatINR(d.upcomingCommitments)} − ${formatINR(
        d.goalsOutstanding,
      )} = ${formatINR(d.safeToSpend)}`,
    },
    {
      term: 'Daily allowance',
      formula: 'safe to spend ÷ days left',
      worked: `${formatINR(d.safeToSpend)} ÷ ${d.daysLeft} = ${formatINR(d.dailyAllowance)}`,
    },
    {
      term: 'Average burn',
      formula: 'spending ÷ completed days (savings transfers excluded)',
      worked:
        d.burnDays > 0
          ? `${formatINR(d.discretionarySpent)} ÷ ${d.burnDays} = ${formatINR(
              d.averageBurn,
            )} a day`
          : 'No completed day to average yet.',
    },
    {
      term: 'Projected end balance',
      formula: 'balance − commitments − average burn × remaining days',
      worked: `${formatINR(d.projectedEndBalance)} on day ${state.periodDays}`,
    },
    {
      term: 'Financial health',
      formula:
        'runway (30) + spending discipline (25) + savings progress (25) + commitment load (20)',
      worked: d.healthParts
        .map((p) => `${p.label} ${p.score}/${p.max}`)
        .concat(`total ${d.health}/100`)
        .join(' · '),
    },
    {
      term: 'Financial risk',
      formula: 'read straight off health: 75+ low, 55+ moderate, 35+ high, below that critical',
      worked: `health ${d.health} → ${d.risk}`,
    },
  ]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How every figure is calculated</DialogTitle>
          <DialogDescription>
            One engine produces all of these from a single state object, which is why changing
            any one input moves the rest. Below is the arithmetic, with your own numbers in it.
          </DialogDescription>
        </DialogHeader>

        <dl className="flex flex-col divide-y divide-border">
          {rows.map((r) => (
            <div key={r.term} className="py-3">
              <dt className="text-sm font-semibold">{r.term}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{r.formula}</dd>
              <dd className="mt-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs tabular-nums">
                {r.worked}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-2 text-xs text-muted-foreground">
          Money moved into a savings goal is recorded as leaving your spendable balance, so it is
          never counted twice — but it is kept out of the burn rate, because setting money aside
          is not spending it. Days after today use your average burn plus every scheduled charge
          on the exact day it lands.
        </p>
      </DialogContent>
    </Dialog>
  )
}
