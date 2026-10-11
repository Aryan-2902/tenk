import { ArrowRight, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  before: string
  after: string
  /** Signed change in the underlying number. */
  change: number
  /** False when a rise is a bad thing, e.g. money going out. */
  higherIsBetter?: boolean
  hint?: string
  format?: (change: number) => string
}

/**
 * One metric, before and after, with the direction stated in words as well as
 * colour. The "good or bad" judgement is explicit per row, because a rising
 * number is welcome for savings and unwelcome for commitments.
 */
export function DeltaRow({
  label,
  before,
  after,
  change,
  higherIsBetter = true,
  hint,
  format,
}: Props) {
  const flat = Math.round(change) === 0
  const up = change > 0
  const good = flat ? null : up === higherIsBetter

  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown
  const tone = flat
    ? 'text-muted-foreground'
    : good
      ? 'text-success'
      : 'text-destructive'

  const printed = format
    ? format(change)
    : `${up ? '+' : ''}${Math.round(change).toLocaleString('en-IN')}`

  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2.5 text-sm">
        <span className="tabular-nums text-muted-foreground">{before}</span>
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="font-semibold tabular-nums">{after}</span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums',
            flat
              ? 'bg-muted'
              : good
                ? 'bg-success/[0.12]'
                : 'bg-destructive/[0.12]',
            tone,
          )}
        >
          <Icon className="size-3" aria-hidden="true" />
          <span className="sr-only">
            {flat ? 'unchanged' : good ? 'improves by' : 'worsens by'}{' '}
          </span>
          {flat ? 'No change' : printed}
        </span>
      </div>
    </div>
  )
}
