import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CheckCircle2, Plus, Target, Trash2, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { EmptyState } from '@/components/ui/empty-state'
import { useStore } from '@/lib/store'
import { formatINR, type Goal } from '@/lib/finance'
import { cn } from '@/lib/utils'

const goalSchema = z.object({
  label: z.string().trim().min(2, 'Give the goal a name.').max(60, 'Keep it under 60 characters.'),
  target: z.coerce
    .number({ invalid_type_error: 'Enter a target in rupees.' })
    .positive('Enter a target above zero.')
    .max(100000, 'That is larger than this month can model.'),
  byDay: z.coerce
    .number({ invalid_type_error: 'Enter a day between 1 and 30.' })
    .int()
    .min(1, 'Day 1 at the earliest.')
    .max(30, 'Day 30 at the latest.'),
})

/** How far along a goal should be by today if it is to land on time. */
function pacing(goal: Goal, currentDay: number) {
  const expected = goal.target * Math.min(1, currentDay / Math.max(goal.byDay, 1))
  const done = goal.saved >= goal.target
  return {
    expected,
    done,
    onPace: done || goal.saved >= expected,
    shortfall: Math.max(0, expected - goal.saved),
    perDay:
      goal.byDay > currentDay
        ? Math.max(0, goal.target - goal.saved) / (goal.byDay - currentDay + 1)
        : Math.max(0, goal.target - goal.saved),
  }
}

function GoalCard({ goal }: { goal: Goal }) {
  const { state, derived, contributeToGoal, removeGoal } = useStore()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  const pace = pacing(goal, state.currentDay)
  const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100))
  const remaining = Math.max(0, goal.target - goal.saved)
  const inputId = `contribute-${goal.id}`

  function contribute(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount above zero.')
      return
    }
    if (value > remaining) {
      setError(`Only ${formatINR(remaining)} left to save for this goal.`)
      return
    }
    if (value > derived.balance) {
      setError(`You only have ${formatINR(derived.balance)} in your balance.`)
      return
    }
    setError(null)
    contributeToGoal(goal.id, value)
    setAmount('')
    toast.success('Moved to savings', {
      description: `${formatINR(value)} towards ${goal.label}. It has left your spendable balance.`,
    })
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle as="h2" className="truncate">
              {goal.label}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatINR(goal.saved)} of {formatINR(goal.target)} · due day {goal.byDay}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
            aria-label={`Delete goal ${goal.label}`}
            onClick={() => {
              removeGoal(goal.id)
              toast.success('Goal removed', { description: goal.label })
            }}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-semibold tabular-nums">{pct}%</span>
          <Badge variant={pace.done ? 'success' : pace.onPace ? 'success' : 'warning'}>
            {pace.done ? (
              <CheckCircle2 className="size-3" aria-hidden="true" />
            ) : pace.onPace ? (
              <CheckCircle2 className="size-3" aria-hidden="true" />
            ) : (
              <TriangleAlert className="size-3" aria-hidden="true" />
            )}
            {pace.done ? 'Complete' : pace.onPace ? 'On pace' : 'Behind pace'}
          </Badge>
        </div>

        <div
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${goal.label}: ${pct}% saved`}
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
              pace.done || pace.onPace ? 'bg-success' : 'bg-warning',
            )}
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          {pace.done
            ? 'Fully funded. Nothing more is being held back from your balance for this.'
            : pace.onPace
              ? `${formatINR(remaining)} to go — about ${formatINR(
                  pace.perDay,
                )} a day to land it by day ${goal.byDay}.`
              : `${formatINR(
                  pace.shortfall,
                )} behind where it should be by today. You would need ${formatINR(
                  pace.perDay,
                )} a day from here to still make day ${goal.byDay}.`}
        </p>

        {!pace.done && (
          <form onSubmit={contribute} noValidate className="mt-auto flex flex-col gap-2 pt-4">
            <label htmlFor={inputId} className="text-sm font-medium leading-none">
              Move money to this goal
            </label>
            <div className="flex gap-2">
              <Input
                id={inputId}
                type="number"
                inputMode="numeric"
                min={1}
                step={50}
                placeholder="₹ amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setError(null)
                }}
                aria-invalid={!!error}
                aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
              />
              <Button type="submit" variant="outline" className="shrink-0">
                Move
              </Button>
            </div>
            {error ? (
              <p id={`${inputId}-error`} role="alert" className="text-xs font-medium text-destructive">
                {error}
              </p>
            ) : (
              <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
                This leaves your spendable balance straight away.
              </p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export function Goals() {
  const { state, derived, addGoal } = useStore()

  const form = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: { label: '', target: 0, byDay: state.periodDays },
  })

  const totalTarget = state.goals.reduce((sum, g) => sum + g.target, 0)
  const totalSaved = state.goals.reduce((sum, g) => sum + Math.min(g.saved, g.target), 0)
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0
  const behind = state.goals.filter((g) => !pacing(g, state.currentDay).onPace).length

  return (
    <div className="container py-8">
      <PageHeader
        title="Savings goals"
        description="Money set aside is money you cannot spend. Every rupee promised to a goal comes straight out of what is safe to spend, which is why the goals page and the overview always agree."
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5 sm:col-span-2">
          <h2 className="text-sm font-medium text-muted-foreground">Overall progress</h2>
          <div className="mt-2 flex items-baseline gap-3">
            <p className="text-3xl font-semibold tracking-tight tabular-nums">{overallPct}%</p>
            <p className="text-sm text-muted-foreground">
              {formatINR(totalSaved)} of {formatINR(totalTarget)} saved
            </p>
          </div>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={overallPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Overall savings progress: ${overallPct}%`}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${Math.max(overallPct, 2)}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {behind === 0
              ? 'Every goal is keeping pace with the calendar.'
              : `${behind} ${behind === 1 ? 'goal is' : 'goals are'} behind pace for day ${state.currentDay} of ${state.periodDays}.`}
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Still owed to goals</h2>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
            {formatINR(derived.goalsOutstanding)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Held back from your {formatINR(derived.balance)} balance, which is why safe-to-spend is{' '}
            {formatINR(derived.safeToSpend)}.
          </p>
        </Card>
      </div>

      {state.goals.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Target}
            title="No savings goals yet"
            description="Add one below. It will immediately reduce what is safe to spend, because promised money is not spare money."
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {state.goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      <Card className="mt-6 lg:max-w-2xl">
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2">
            <Plus className="size-4 text-muted-foreground" aria-hidden="true" />
            Add a goal
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Watch your daily allowance change the moment you save it.
          </p>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit((values) => {
              addGoal(values)
              toast.success('Goal added', {
                description: `${values.label} · ${formatINR(values.target)} by day ${values.byDay}`,
              })
              form.reset({ label: '', target: 0, byDay: state.periodDays })
            })}
          >
            <Field
              label="What are you saving for?"
              htmlFor="goal-label"
              error={form.formState.errors.label?.message}
              required
            >
              <Input
                id="goal-label"
                placeholder="New headphones"
                aria-invalid={!!form.formState.errors.label}
                aria-describedby={form.formState.errors.label ? 'goal-label-error' : undefined}
                {...form.register('label')}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Target (₹)"
                htmlFor="goal-target"
                error={form.formState.errors.target?.message}
                required
              >
                <Input
                  id="goal-target"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={100}
                  aria-invalid={!!form.formState.errors.target}
                  aria-describedby={form.formState.errors.target ? 'goal-target-error' : undefined}
                  {...form.register('target')}
                />
              </Field>

              <Field
                label="Needed by day"
                htmlFor="goal-by-day"
                hint="Within the 30-day period."
                error={form.formState.errors.byDay?.message}
                required
              >
                <Input
                  id="goal-by-day"
                  type="number"
                  min={1}
                  max={state.periodDays}
                  aria-invalid={!!form.formState.errors.byDay}
                  aria-describedby={
                    form.formState.errors.byDay ? 'goal-by-day-error' : 'goal-by-day-hint'
                  }
                  {...form.register('byDay')}
                />
              </Field>
            </div>

            <Button type="submit">Create goal</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
