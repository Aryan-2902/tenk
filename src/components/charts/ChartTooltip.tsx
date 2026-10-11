import type { TooltipProps } from 'recharts'
import { formatINR } from '@/lib/finance'

interface Props extends TooltipProps<number, string> {
  /** Prefix for the tooltip heading, e.g. "Day". */
  labelPrefix?: string
  currency?: boolean
}

/**
 * Tooltip text wears text tokens; only the small swatch carries the series
 * colour. That keeps identity off colour-alone and legible in both themes.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelPrefix = '',
  currency = true,
}: Props) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        {labelPrefix}
        {labelPrefix ? ' ' : ''}
        {label}
      </p>
      <ul className="flex flex-col gap-1">
        {payload.map((item) => (
          <li key={item.name} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: item.color }}
            />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-popover-foreground">
              {typeof item.value === 'number' && currency
                ? formatINR(item.value)
                : String(item.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
