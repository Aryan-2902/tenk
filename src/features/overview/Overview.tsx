import { Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  PiggyBank,
  RotateCcw,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChartSkeleton } from '@/components/charts/ChartSkeleton'
import { HealthBreakdown, HealthRing } from '@/features/shared/HealthScore'
import { RiskPill } from '@/features/shared/RiskPill'
import { DayScrubber } from '@/features/shared/DayScrubber'
import { HowItWorks } from '@/features/shared/HowItWorks'
import { useStore } from '@/lib/store'
import { formatINR } from '@/lib/finance'
import { cn } from '@/lib/utils'

// Split out so the landing route paints its numbers without waiting on the
// charting library, which is by far the heaviest dependency in the project.
const ForecastChart = lazy(() =>
  import('@/components/charts/ForecastChart').then((m) => ({ default: m.ForecastChart })),
)

export function Overview() {
  const { state, derived, reset } = useStore()

  const {
    balance,
    safeToSpend,
    dailyAllowance,
    averageBurn,
    projectedEndBalance,
    upcomingCommitments,
    goalsOutstanding,
    runsOutOnDay,
    health,
    healthParts,
    risk,
    forecast,
    daysLeft,
  } = derived

  const upcoming = state.subscriptions
    .filter((s) => s.chargeDay > state.currentDay)
    .sort((a, b) => a.chargeDay - b.chargeDay)

  const recent = state.transactions
    .filter((t) => t.day <= state.currentDay)
    .sort((a, b) => b.day - a.day)
    .slice(0, 6)

  const overspending = averageBurn > dailyAllowance && dailyAllowance > 0

  const metrics = [
    {
      label: 'Balance',
      value: formatINR(balance),
      icon: Wallet,
      hint: `${formatINR(state.budget)} budget${
        derived.income > 0 ? ` plus ${formatINR(derived.income)} earned` : ''
      }, minus everything paid so far.`,
    },
    {
      label: 'Safe to spend',
      value: formatINR(safeToSpend),
      icon: CircleDollarSign,
      hint: `Balance minus ${formatINR(upcomingCommitments)} of commitments and ${formatINR(
        goalsOutstanding,
      )} still owed to your goals.`,
      emphasis: true,
    },
    {
      label: 'Daily allowance',
      value: formatINR(dailyAllowance),
      icon: CalendarClock,
      hint: `What is safe to spend, spread across the ${daysLeft} ${
        daysLeft === 1 ? 'day' : 'days'
      } that are left.`,
    },
    {
      label: 'Projected end balance',
      value: formatINR(projectedEndBalance),
      icon: PiggyBank,
      hint:
        projectedEndBalance >= 0
          ? `Where day ${state.periodDays} lands if you keep spending ${formatINR(
              averageBurn,
            )} a day.`
          : `You would overshoot by ${formatINR(Math.abs(projectedEndBalance))} at your current rate.`,
      bad: projectedEndBalance < 0,
    },
  ]

  return (
    <div className="container py-8">
      <PageHeader
        kicker="Broke But Functional — Survive the Month"
        title="₹10,000. 30 days. Every consequence visible."
        description="Your income, balance, spending, commitments, savings goals and financial health all come from one calculation — so changing any one of them moves the rest."
        actions={
          <>
            <HowItWorks />
            <Button asChild>
              <Link to="/simulate">
                Simulate a decision
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" size="icon" aria-label="Reset to the sample month" onClick={reset}>
              <RotateCcw className="size-4" aria-hidden="true" />
            </Button>
          </>
        }
      />

      {/* ---- Headline figures ------------------------------------------- */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <Card
            key={m.label}
            className={cn(
              'h-full animate-fade-in p-5',
              m.emphasis && 'border-primary/40 bg-primary/[0.04]',
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">{m.label}</h2>
              <m.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>
            <p
              className={cn(
                'mt-2 text-3xl font-semibold tracking-tight tabular-nums',
                m.bad && 'text-destructive',
              )}
            >
              {m.value}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{m.hint}</p>
          </Card>
        ))}
      </div>

      {/* ---- Warnings ---------------------------------------------------- */}
      {(runsOutOnDay !== null || overspending) && (
        <div className="mt-4 flex flex-col gap-3" role="status" aria-live="polite">
          {runsOutOnDay !== null && (
            <Card className="border-destructive/40 bg-destructive/[0.06] p-4">
              <div className="flex items-start gap-3">
                <TriangleAlert
                  className="mt-0.5 size-5 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium">Your money runs out on day {runsOutOnDay}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    That is {state.periodDays - runsOutOnDay}{' '}
                    {state.periodDays - runsOutOnDay === 1 ? 'day' : 'days'} short of the month.
                    Cutting roughly{' '}
                    {formatINR(Math.abs(projectedEndBalance) / Math.max(daysLeft, 1))} a day would
                    close the gap.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {overspending && (
            <Card className="border-warning/40 bg-warning/[0.06] p-4">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
                <div>
                  <p className="font-medium">
                    You are spending {formatINR(averageBurn - dailyAllowance)} a day over your
                    allowance
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatINR(averageBurn)} a day against {formatINR(dailyAllowance)} that is
                    actually free.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ---- Forecast + health ------------------------------------------ */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle as="h2">30-day balance forecast</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Real spending up to today, then your average burn plus every scheduled charge.
                </p>
              </div>
              <Badge variant="outline">
                {formatINR(averageBurn)}/day average
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartSkeleton height={288} />}>
              <ForecastChart
                forecast={forecast}
                currentDay={state.currentDay}
                periodDays={state.periodDays}
                runsOutOnDay={runsOutOnDay}
              />
            </Suspense>
            <div className="mt-5 border-t border-border pt-5">
              <DayScrubber />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Financial health</CardTitle>
            <p className="text-sm text-muted-foreground">
              Four parts, each one explained — not a mystery number.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-5">
              <HealthRing health={health} risk={risk} />
              <div className="min-w-0">
                <RiskPill risk={risk} />
                <p className="mt-2 text-sm text-muted-foreground">
                  {health >= 75
                    ? 'Comfortable. The month finishes with room to spare.'
                    : health >= 55
                      ? 'Workable, but the margin is thin. Watch the next few decisions.'
                      : health >= 35
                        ? 'Under strain. Commitments and burn rate are crowding the balance.'
                        : 'The plan does not survive the month as it stands.'}
                </p>
              </div>
            </div>
            <div className="mt-6 border-t border-border pt-5">
              <HealthBreakdown parts={healthParts} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---- Commitments + recent activity ------------------------------ */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle as="h2">Commitments still to come</CardTitle>
              <Badge variant={upcomingCommitments > 0 ? 'warning' : 'secondary'}>
                {formatINR(upcomingCommitments)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Already promised. This is why the balance is not the number to spend from.
            </p>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="rounded-md bg-muted px-3 py-4 text-sm text-muted-foreground">
                Nothing left to be charged this month.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {upcoming.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Charges on day {s.chargeDay} · in {s.chargeDay - state.currentDay}{' '}
                        {s.chargeDay - state.currentDay === 1 ? 'day' : 'days'}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatINR(s.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/spending">Manage subscriptions</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Recent activity</CardTitle>
            <p className="text-sm text-muted-foreground">The last few things to move your balance.</p>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="rounded-md bg-muted px-3 py-4 text-sm text-muted-foreground">
                Nothing recorded yet this month.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {recent.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Day {t.day} · {t.category}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-sm font-semibold tabular-nums',
                        t.kind === 'income' ? 'text-success' : 'text-foreground',
                      )}
                    >
                      {t.kind === 'income' ? '+' : '−'}
                      {formatINR(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/spending">See all spending</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
