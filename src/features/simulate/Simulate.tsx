import { Suspense, lazy, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Beaker,
  CheckCircle2,
  Check,
  OctagonAlert,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { ChartSkeleton } from '@/components/charts/ChartSkeleton'
import { DeltaRow } from '@/features/shared/DeltaRow'
import { HealthRing } from '@/features/shared/HealthScore'
import { RiskPill } from '@/features/shared/RiskPill'
import { useStore } from '@/lib/store'
import {
  CATEGORIES,
  formatINR,
  simulate,
  type Category,
  type Decision,
} from '@/lib/finance'
import { cn } from '@/lib/utils'

const CompareForecastChart = lazy(() =>
  import('@/components/charts/CompareForecastChart').then((m) => ({
    default: m.CompareForecastChart,
  })),
)

const schema = z.object({
  type: z.enum(['expense', 'subscription', 'saving']),
  label: z.string().trim().max(60, 'Keep it under 60 characters.'),
  amount: z.coerce
    .number({ invalid_type_error: 'Enter an amount in rupees.' })
    .positive('Enter an amount above zero.')
    .max(100000, 'That is larger than this month can model.'),
  category: z.enum(CATEGORIES as [Category, ...Category[]]),
  chargeDay: z.coerce.number().int().min(1, 'Day 1 at the earliest.').max(30, 'Day 30 at the latest.'),
  goalId: z.string(),
})

type FormValues = z.infer<typeof schema>

const TYPES = [
  { value: 'expense', label: 'One-off expense', hint: 'A ticket, a repair, a night out.' },
  { value: 'subscription', label: 'New subscription', hint: 'A charge that repeats every month.' },
  { value: 'saving', label: 'Move to savings', hint: 'Put money aside for a goal.' },
] as const

/** Real decisions a student actually faces, so the first click is instant. */
const PRESETS: { label: string; apply: Partial<FormValues> }[] = [
  {
    label: 'Concert ticket · ₹1,200',
    apply: { type: 'expense', label: 'Concert ticket', amount: 1200, category: 'Entertainment' },
  },
  {
    label: 'Phone screen repair · ₹2,800',
    apply: { type: 'expense', label: 'Phone screen repair', amount: 2800, category: 'Other' },
  },
  {
    label: 'Weekend trip · ₹3,500',
    apply: { type: 'expense', label: 'Weekend trip', amount: 3500, category: 'Entertainment' },
  },
  {
    label: 'Streaming plan · ₹199/mo',
    apply: { type: 'subscription', label: 'Streaming plan', amount: 199, chargeDay: 15 },
  },
  {
    label: 'Coffee habit · ₹90 a day',
    apply: { type: 'expense', label: 'Coffee for the week', amount: 630, category: 'Food' },
  },
]

export function Simulate() {
  const { state, derived, commit } = useStore()
  const [taken, setTaken] = useState<string | null>(null)

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      type: 'expense',
      label: '',
      amount: 1200,
      category: 'Entertainment',
      chargeDay: Math.min(state.currentDay + 3, state.periodDays),
      goalId: state.goals[0]?.id ?? '',
    },
  })

  const values = watch()
  const amount = Number(values.amount)
  const valid = Number.isFinite(amount) && amount > 0 && !errors.amount

  /**
   * The decision object is rebuilt on every keystroke and run through the
   * same pure engine the rest of the app uses. Nothing is written anywhere:
   * `simulate` derives a second reality from a copy of the state.
   */
  const decision: Decision | null = useMemo(() => {
    if (!valid) return null
    if (values.type === 'subscription') {
      return {
        type: 'subscription',
        label: values.label || 'New subscription',
        amount,
        chargeDay: Number(values.chargeDay) || state.currentDay,
      }
    }
    if (values.type === 'saving') {
      if (!values.goalId) return null
      return { type: 'saving', goalId: values.goalId, amount }
    }
    return {
      type: 'expense',
      label: values.label || 'New expense',
      amount,
      category: values.category,
    }
  }, [valid, values.type, values.label, values.chargeDay, values.goalId, values.category, amount, state.currentDay])

  const result = useMemo(
    () => (decision ? simulate(state, decision) : null),
    [decision, state],
  )

  const before = result?.before ?? derived
  const after = result?.after ?? derived

  const verdict = useMemo(() => {
    if (!result) return null
    const a = result.after
    if (a.runsOutOnDay !== null) {
      return {
        tone: 'destructive' as const,
        icon: OctagonAlert,
        title: `You would run out of money on day ${a.runsOutOnDay}`,
        body: `This decision pushes the month ${formatINR(
          Math.abs(a.projectedEndBalance),
        )} into the red. You would need to cut about ${formatINR(
          Math.abs(a.projectedEndBalance) / Math.max(a.daysLeft, 1),
        )} a day to survive it.`,
      }
    }
    if (a.safeToSpend < 0) {
      return {
        tone: 'warning' as const,
        icon: TriangleAlert,
        title: 'Affordable, but it borrows from your commitments',
        body: `Safe-to-spend goes ${formatINR(
          Math.abs(a.safeToSpend),
        )} negative, which means the money is coming out of your subscriptions or your savings goals rather than out of spare cash.`,
      }
    }
    if (a.health < before.health - 12) {
      return {
        tone: 'warning' as const,
        icon: TriangleAlert,
        title: 'You can afford it, but it costs you a lot of headroom',
        body: `Health drops ${before.health - a.health} points to ${a.health}. Your daily allowance falls to ${formatINR(
          a.dailyAllowance,
        )} for the remaining ${a.daysLeft} ${a.daysLeft === 1 ? 'day' : 'days'}.`,
      }
    }
    return {
      tone: 'success' as const,
      icon: CheckCircle2,
      title: 'This fits comfortably',
      body: `You would still have ${formatINR(
        a.safeToSpend,
      )} genuinely free and ${formatINR(a.dailyAllowance)} a day to spend on.`,
    }
  }, [result, before.health])

  const daysOfAllowance =
    before.dailyAllowance > 0 && valid ? amount / before.dailyAllowance : null

  function applyPreset(preset: Partial<FormValues>) {
    for (const [key, value] of Object.entries(preset)) {
      setValue(key as keyof FormValues, value as never, {
        shouldValidate: true,
        shouldDirty: true,
      })
    }
    setTaken(null)
  }

  function onSubmit() {
    if (!decision) return
    commit(decision)
    const name =
      decision.type === 'saving'
        ? state.goals.find((g) => g.id === decision.goalId)?.label ?? 'your goal'
        : decision.label
    setTaken(`${name} · ${formatINR(amount)}`)
    toast.success('Decision taken', {
      description: 'Every figure across the app has been updated.',
    })
  }

  const goalsBefore = before.goalsOutstanding
  const goalsAfter = after.goalsOutstanding

  return (
    <div className="container py-8">
      <PageHeader
        title="Simulate a decision before you take it"
        description="Describe what you are thinking of doing. Every figure below updates live — balance, daily allowance, savings goals, monthly forecast, financial risk and overall financial health — and nothing is committed until you say so."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ---- Decision builder ----------------------------------------- */}
        <Card className="h-fit lg:col-span-2 lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <Beaker className="size-4 text-muted-foreground" aria-hidden="true" />
              What are you thinking of doing?
            </CardTitle>
          </CardHeader>

          <CardContent>
            {/* Presets */}
            <fieldset className="min-w-0">
              <legend className="mb-2 text-sm font-medium">Start from a common one</legend>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p.apply)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium
                               transition-colors hover:bg-accent hover:text-accent-foreground
                               focus-visible:outline-none focus-visible:ring-2
                               focus-visible:ring-ring focus-visible:ring-offset-2
                               focus-visible:ring-offset-background"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="mt-6 flex flex-col gap-4"
              noValidate
            >
              {/* Kind of decision */}
              <fieldset className="min-w-0">
                <legend className="mb-2 text-sm font-medium leading-none">
                  Kind of decision
                </legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {TYPES.map((t) => {
                    const active = values.type === t.value
                    return (
                      <label
                        key={t.value}
                        className={cn(
                          'cursor-pointer rounded-lg border p-3 text-left transition-colors',
                          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                          'focus-within:ring-offset-background',
                          active
                            ? 'border-primary bg-primary/[0.08]'
                            : 'border-border hover:bg-accent',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            value={t.value}
                            {...register('type')}
                            className="sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={cn(
                              'grid size-4 shrink-0 place-items-center rounded-full border',
                              active ? 'border-primary bg-primary' : 'border-input',
                            )}
                          >
                            {active && (
                              <Check
                                className="size-2.5 text-primary-foreground"
                                aria-hidden="true"
                              />
                            )}
                          </span>
                          <span className="text-sm font-medium">{t.label}</span>
                        </span>
                        <span className="mt-1 block pl-6 text-xs text-muted-foreground">
                          {t.hint}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              {values.type !== 'saving' && (
                <Field
                  label={values.type === 'subscription' ? 'Subscription name' : 'What is it?'}
                  htmlFor="sim-label"
                  error={errors.label?.message}
                >
                  <Input
                    id="sim-label"
                    placeholder={
                      values.type === 'subscription' ? 'Streaming plan' : 'Concert ticket'
                    }
                    aria-invalid={!!errors.label}
                    aria-describedby={errors.label ? 'sim-label-error' : undefined}
                    {...register('label')}
                  />
                </Field>
              )}

              <Field
                label={values.type === 'subscription' ? 'Monthly amount (₹)' : 'Amount (₹)'}
                htmlFor="sim-amount"
                hint={
                  daysOfAllowance !== null
                    ? `That is ${daysOfAllowance.toFixed(1)} days of your current allowance.`
                    : undefined
                }
                error={errors.amount?.message}
                required
              >
                <Input
                  id="sim-amount"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={10}
                  aria-invalid={!!errors.amount}
                  aria-describedby={errors.amount ? 'sim-amount-error' : 'sim-amount-hint'}
                  {...register('amount')}
                />
              </Field>

              {values.type === 'expense' && (
                <Field label="Category" htmlFor="sim-category" required>
                  <Select id="sim-category" {...register('category')}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {values.type === 'subscription' && (
                <Field
                  label="Charges on day"
                  htmlFor="sim-charge-day"
                  hint="Which day of the 30-day period the money leaves your account."
                  error={errors.chargeDay?.message}
                  required
                >
                  <Input
                    id="sim-charge-day"
                    type="number"
                    min={1}
                    max={state.periodDays}
                    aria-invalid={!!errors.chargeDay}
                    aria-describedby={
                      errors.chargeDay ? 'sim-charge-day-error' : 'sim-charge-day-hint'
                    }
                    {...register('chargeDay')}
                  />
                </Field>
              )}

              {values.type === 'saving' && (
                <Field
                  label="Which goal?"
                  htmlFor="sim-goal"
                  hint="Money moved to a goal leaves your spendable balance."
                  required
                >
                  <Select id="sim-goal" aria-describedby="sim-goal-hint" {...register('goalId')}>
                    {state.goals.length === 0 && <option value="">No goals yet</option>}
                    {state.goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label} — {formatINR(g.saved)} of {formatINR(g.target)}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
                <Button type="submit" disabled={!decision} className="sm:flex-1">
                  Take this decision
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => applyPreset({ amount: 0, label: '' })}
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Clear
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Nothing is saved while you explore. Taking the decision writes it to your month and
                every other page follows.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* ---- Consequences --------------------------------------------- */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          {taken && (
            <Card
              role="status"
              aria-live="polite"
              className="border-success/40 bg-success/[0.06] p-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-success"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="font-medium">Decision taken — {taken}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Your balance, allowance, forecast, risk and health have all been recalculated.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto shrink-0"
                  onClick={() => setTaken(null)}
                >
                  Dismiss
                </Button>
              </div>
            </Card>
          )}

          {/* Verdict */}
          {verdict ? (
            <Card
              key={verdict.title}
              role="status"
              aria-live="polite"
              className={cn(
                'animate-fade-in p-5',
                verdict.tone === 'success' && 'border-success/40 bg-success/[0.06]',
                verdict.tone === 'warning' && 'border-warning/40 bg-warning/[0.06]',
                verdict.tone === 'destructive' && 'border-destructive/40 bg-destructive/[0.06]',
              )}
            >
              <div className="flex items-start gap-3">
                <verdict.icon
                  className={cn(
                    'mt-0.5 size-5 shrink-0',
                    verdict.tone === 'success' && 'text-success',
                    verdict.tone === 'warning' && 'text-warning',
                    verdict.tone === 'destructive' && 'text-destructive',
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <h2 className="font-semibold">{verdict.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{verdict.body}</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <h2 className="font-semibold">Enter an amount to see the consequences</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick one of the common decisions above, or type your own. Everything below will
                update as you go.
              </p>
            </Card>
          )}

          {/* Health before/after */}
          <Card>
            <CardHeader>
              <CardTitle as="h2">Financial health and risk</CardTitle>
              <p className="text-sm text-muted-foreground">
                The same score you see on the overview, recalculated for this decision.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-start sm:gap-10">
                <div className="flex flex-col items-center gap-2">
                  <HealthRing health={before.health} risk={before.risk} size={104} />
                  <span className="text-xs font-medium text-muted-foreground">As things stand</span>
                  <RiskPill risk={before.risk} />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <HealthRing health={after.health} risk={after.risk} size={104} />
                  <span className="text-xs font-medium text-muted-foreground">
                    After this decision
                  </span>
                  <RiskPill risk={after.risk} />
                </div>
                {/* `basis-full` on small screens: as a plain flex-1 sibling
                    this paragraph gets whatever is left beside the two rings
                    — about 25px — and its longest word then pushes the page
                    sideways. It takes its own row until there is space. */}
                <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                  <p className="text-center text-sm text-muted-foreground sm:text-left">
                    {!result
                      ? 'No decision simulated yet.'
                      : after.health === before.health
                        ? 'This decision leaves your health score where it is.'
                        : after.health > before.health
                          ? `Health improves by ${after.health - before.health} points.`
                          : `Health falls by ${before.health - after.health} points, and risk ${
                              after.risk === before.risk
                                ? `stays ${before.risk}`
                                : `moves from ${before.risk} to ${after.risk}`
                            }.`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* The numbers */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle as="h2">Every figure this would move</CardTitle>
                <Badge variant="outline">
                  {result ? 'Simulated — not saved' : 'Waiting for an amount'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <DeltaRow
                  label="Balance"
                  hint="What is actually in the account."
                  before={formatINR(before.balance)}
                  after={formatINR(after.balance)}
                  change={after.balance - before.balance}
                  format={(c) => formatINR(c)}
                />
                <DeltaRow
                  label="Safe to spend"
                  hint="Balance minus commitments and goals still owed."
                  before={formatINR(before.safeToSpend)}
                  after={formatINR(after.safeToSpend)}
                  change={after.safeToSpend - before.safeToSpend}
                  format={(c) => formatINR(c)}
                />
                <DeltaRow
                  label="Daily allowance"
                  hint={`Spread across the ${after.daysLeft} ${
                    after.daysLeft === 1 ? 'day' : 'days'
                  } left.`}
                  before={formatINR(before.dailyAllowance)}
                  after={formatINR(after.dailyAllowance)}
                  change={after.dailyAllowance - before.dailyAllowance}
                  format={(c) => formatINR(c)}
                />
                <DeltaRow
                  label="Projected end balance"
                  hint={`Where day ${state.periodDays} lands at your current rate.`}
                  before={formatINR(before.projectedEndBalance)}
                  after={formatINR(after.projectedEndBalance)}
                  change={after.projectedEndBalance - before.projectedEndBalance}
                  format={(c) => formatINR(c)}
                />
                <DeltaRow
                  label="Still owed to savings goals"
                  hint="Lower is better — this is money your goals are waiting for."
                  before={formatINR(goalsBefore)}
                  after={formatINR(goalsAfter)}
                  change={goalsAfter - goalsBefore}
                  higherIsBetter={false}
                  format={(c) => formatINR(c)}
                />
                <DeltaRow
                  label="Financial health"
                  hint="Out of 100, from runway, discipline, savings and commitments."
                  before={String(before.health)}
                  after={String(after.health)}
                  change={after.health - before.health}
                  format={(c) => `${c > 0 ? '+' : ''}${Math.round(c)} pts`}
                />
                <DeltaRow
                  label="Money runs out on"
                  hint="&quot;Never&quot; means the balance lasts the whole month."
                  before={before.runsOutOnDay ? `Day ${before.runsOutOnDay}` : 'Never'}
                  after={after.runsOutOnDay ? `Day ${after.runsOutOnDay}` : 'Never'}
                  change={
                    (after.runsOutOnDay ?? state.periodDays + 1) -
                    (before.runsOutOnDay ?? state.periodDays + 1)
                  }
                  // "−2 days" is meaningless when the month used to survive
                  // intact, so the crossings in and out of solvency get
                  // their own wording.
                  format={(c) => {
                    if (before.runsOutOnDay === null) return 'Now runs out'
                    if (after.runsOutOnDay === null) return 'No longer runs out'
                    return `${c > 0 ? '+' : ''}${Math.round(c)} days`
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Forecast comparison */}
          <Card>
            <CardHeader>
              <CardTitle as="h2">What it does to the rest of the month</CardTitle>
              <p className="text-sm text-muted-foreground">
                The gap between the two lines is the cost of the decision, day by day.
              </p>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton height={256} />}>
                <CompareForecastChart
                  before={before.forecast}
                  after={after.forecast}
                  currentDay={state.currentDay}
                  periodDays={state.periodDays}
                />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
