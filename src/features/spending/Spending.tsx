import { Suspense, lazy } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Flame, Plus, Receipt, Repeat, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { EmptyState } from '@/components/ui/empty-state'
import { ChartSkeleton } from '@/components/charts/ChartSkeleton'
import { useStore } from '@/lib/store'
import { CATEGORIES, formatINR, type Category } from '@/lib/finance'
import { cn } from '@/lib/utils'

const CategoryBars = lazy(() =>
  import('@/components/charts/CategoryBars').then((m) => ({ default: m.CategoryBars })),
)

const txSchema = z.object({
  label: z.string().trim().min(2, 'Give it a name.').max(60, 'Keep it under 60 characters.'),
  amount: z.coerce
    .number({ invalid_type_error: 'Enter an amount in rupees.' })
    .positive('Enter an amount above zero.')
    .max(100000, 'That is larger than this month can model.'),
  category: z.enum(CATEGORIES as [Category, ...Category[]]),
  kind: z.enum(['expense', 'income']),
})

const subSchema = z.object({
  label: z.string().trim().min(2, 'Give it a name.').max(60, 'Keep it under 60 characters.'),
  amount: z.coerce
    .number({ invalid_type_error: 'Enter an amount in rupees.' })
    .positive('Enter an amount above zero.')
    .max(100000, 'That is larger than this month can model.'),
  chargeDay: z.coerce
    .number({ invalid_type_error: 'Enter a day between 1 and 30.' })
    .int()
    .min(1, 'Day 1 at the earliest.')
    .max(30, 'Day 30 at the latest.'),
})

export function Spending() {
  const {
    state,
    derived,
    addTransaction,
    removeTransaction,
    addSubscription,
    removeSubscription,
  } = useStore()

  const txForm = useForm<z.infer<typeof txSchema>>({
    resolver: zodResolver(txSchema),
    defaultValues: { label: '', amount: 0, category: 'Food', kind: 'expense' },
  })

  const subForm = useForm<z.infer<typeof subSchema>>({
    resolver: zodResolver(subSchema),
    defaultValues: { label: '', amount: 0, chargeDay: Math.min(state.currentDay + 1, 30) },
  })

  const transactions = [...state.transactions].sort((a, b) => b.day - a.day)
  const subscriptions = [...state.subscriptions].sort((a, b) => a.chargeDay - b.chargeDay)
  const subsTotal = subscriptions.reduce((sum, s) => sum + s.amount, 0)

  const stats = [
    {
      label: 'Spent so far',
      value: formatINR(derived.discretionarySpent),
      icon: Receipt,
      hint: `Across ${state.currentDay} ${
        state.currentDay === 1 ? 'day' : 'days'
      }. Subscriptions and money moved into goals are counted separately.`,
    },
    {
      label: 'Average burn',
      value: `${formatINR(derived.averageBurn)}/day`,
      icon: Flame,
      hint: `Against a daily allowance of ${formatINR(derived.dailyAllowance)}.`,
      bad: derived.averageBurn > derived.dailyAllowance,
    },
    {
      label: 'Subscriptions',
      value: formatINR(subsTotal),
      icon: Repeat,
      hint: `${formatINR(derived.chargedSubscriptions)} charged, ${formatINR(
        derived.upcomingCommitments,
      )} still to come.`,
    },
  ]

  return (
    <div className="container py-8">
      <PageHeader
        title="Spending and commitments"
        description="Everything that leaves your account: one-off spending by category, and the subscriptions that charge you on a schedule whether you think about them or not."
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">{s.label}</h2>
              <s.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>
            <p
              className={cn(
                'mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl',
                s.bad && 'text-destructive',
              )}
            >
              {s.value}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.hint}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ---- Where the money went -------------------------------------- */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle as="h2">Where the money went</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ranked by size, up to day {state.currentDay}.
            </p>
          </CardHeader>
          <CardContent>
            {derived.spendByCategory.length === 0 ? (
              <EmptyState
                as="h3"
                icon={Receipt}
                title="Nothing spent yet"
                description="Add an expense below and the breakdown will appear here."
              />
            ) : (
              <Suspense
                fallback={
                  <ChartSkeleton
                    height={Math.max(180, derived.spendByCategory.length * 42 + 28)}
                  />
                }
              >
                <CategoryBars data={derived.spendByCategory} />
              </Suspense>
            )}
          </CardContent>
        </Card>

        {/* ---- Add an entry ---------------------------------------------- */}
        <Card className="h-fit lg:col-span-2">
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <Plus className="size-4 text-muted-foreground" aria-hidden="true" />
              Record something
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Spending you have already done, or money that came in.
            </p>
          </CardHeader>
          <CardContent>
            <form
              noValidate
              className="flex flex-col gap-4"
              onSubmit={txForm.handleSubmit((values) => {
                addTransaction(values)
                toast.success(
                  values.kind === 'income' ? 'Income recorded' : 'Expense recorded',
                  { description: `${values.label} · ${formatINR(values.amount)}` },
                )
                txForm.reset({ label: '', amount: 0, category: values.category, kind: values.kind })
              })}
            >
              <Field
                label="What was it?"
                htmlFor="tx-label"
                error={txForm.formState.errors.label?.message}
                required
              >
                <Input
                  id="tx-label"
                  placeholder="Groceries"
                  aria-invalid={!!txForm.formState.errors.label}
                  aria-describedby={txForm.formState.errors.label ? 'tx-label-error' : undefined}
                  {...txForm.register('label')}
                />
              </Field>

              <Field
                label="Amount (₹)"
                htmlFor="tx-amount"
                error={txForm.formState.errors.amount?.message}
                required
              >
                <Input
                  id="tx-amount"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={10}
                  aria-invalid={!!txForm.formState.errors.amount}
                  aria-describedby={txForm.formState.errors.amount ? 'tx-amount-error' : undefined}
                  {...txForm.register('amount')}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Direction" htmlFor="tx-kind" required>
                  <Select id="tx-kind" {...txForm.register('kind')}>
                    <option value="expense">Money out</option>
                    <option value="income">Money in</option>
                  </Select>
                </Field>

                <Field label="Category" htmlFor="tx-category" required>
                  <Select id="tx-category" {...txForm.register('category')}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Button type="submit" loading={txForm.formState.isSubmitting}>
                Add to day {state.currentDay}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ---- Transactions --------------------------------------------- */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle as="h2">Every entry this month</CardTitle>
              <Badge variant="outline">{transactions.length} recorded</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <EmptyState
                as="h3"
                icon={Receipt}
                title="No entries yet"
                description="Record your first expense using the form above."
              />
            ) : (
              <ul className="flex max-h-[28rem] flex-col divide-y divide-border overflow-y-auto">
                {transactions.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Day {t.day} · {t.category}
                        {t.day > state.currentDay && ' · not counted yet'}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${t.label}, ${formatINR(t.amount)}`}
                      onClick={() => {
                        removeTransaction(t.id)
                        toast.success('Entry removed', { description: t.label })
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ---- Subscriptions -------------------------------------------- */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle as="h2">Subscriptions</CardTitle>
              <Badge variant={derived.upcomingCommitments > 0 ? 'warning' : 'secondary'}>
                {formatINR(derived.upcomingCommitments)} still to come
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              These are deducted from what is safe to spend before you have even spent it.
            </p>
          </CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <EmptyState
                as="h3"
                icon={Repeat}
                title="No subscriptions"
                description="Add one below to see how a recurring charge reshapes the month."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {subscriptions.map((s) => {
                  const charged = s.chargeDay <= state.currentDay
                  return (
                    <li key={s.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.label}</p>
                        <p className="text-xs text-muted-foreground">Day {s.chargeDay}</p>
                      </div>
                      <Badge variant={charged ? 'secondary' : 'warning'}>
                        {charged ? 'Charged' : `in ${s.chargeDay - state.currentDay}d`}
                      </Badge>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatINR(s.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Cancel ${s.label}, ${formatINR(s.amount)} on day ${s.chargeDay}`}
                        onClick={() => {
                          removeSubscription(s.id)
                          toast.success('Subscription cancelled', { description: s.label })
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}

            <form
              noValidate
              className="mt-5 flex flex-col gap-4 border-t border-border pt-5"
              onSubmit={subForm.handleSubmit((values) => {
                addSubscription(values)
                toast.success('Subscription added', {
                  description: `${values.label} · ${formatINR(values.amount)} on day ${values.chargeDay}`,
                })
                subForm.reset({
                  label: '',
                  amount: 0,
                  chargeDay: Math.min(state.currentDay + 1, 30),
                })
              })}
            >
              <h3 className="text-sm font-semibold">Add a subscription</h3>

              <Field
                label="Name"
                htmlFor="sub-label"
                error={subForm.formState.errors.label?.message}
                required
              >
                <Input
                  id="sub-label"
                  placeholder="Music streaming"
                  aria-invalid={!!subForm.formState.errors.label}
                  aria-describedby={subForm.formState.errors.label ? 'sub-label-error' : undefined}
                  {...subForm.register('label')}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Amount (₹)"
                  htmlFor="sub-amount"
                  error={subForm.formState.errors.amount?.message}
                  required
                >
                  <Input
                    id="sub-amount"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={10}
                    aria-invalid={!!subForm.formState.errors.amount}
                    aria-describedby={
                      subForm.formState.errors.amount ? 'sub-amount-error' : undefined
                    }
                    {...subForm.register('amount')}
                  />
                </Field>

                <Field
                  label="Charges on day"
                  htmlFor="sub-day"
                  error={subForm.formState.errors.chargeDay?.message}
                  required
                >
                  <Input
                    id="sub-day"
                    type="number"
                    min={1}
                    max={30}
                    aria-invalid={!!subForm.formState.errors.chargeDay}
                    aria-describedby={
                      subForm.formState.errors.chargeDay ? 'sub-day-error' : undefined
                    }
                    {...subForm.register('chargeDay')}
                  />
                </Field>
              </div>

              <Button type="submit" variant="outline">
                <Plus className="size-4" aria-hidden="true" />
                Add subscription
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
