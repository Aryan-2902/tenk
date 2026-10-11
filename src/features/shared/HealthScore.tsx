import { cn } from '@/lib/utils'
import { RISK_LABEL, type Derived } from '@/lib/finance'

/** Health bands carry an icon or a word everywhere, never colour alone. */
function bandClasses(health: number) {
  if (health >= 75) return { stroke: 'stroke-success', text: 'text-success' }
  if (health >= 55) return { stroke: 'stroke-warning', text: 'text-warning' }
  return { stroke: 'stroke-destructive', text: 'text-destructive' }
}

interface Props {
  health: number
  risk: Derived['risk']
  size?: number
  className?: string
}

/**
 * A dial, because the score is a share of a fixed 100 and the arc shows that
 * at a glance. The number stays readable in the middle for anyone who needs
 * the exact value rather than the impression.
 */
export function HealthRing({ health, risk, size = 128, className }: Props) {
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const band = bandClasses(health)

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Financial health ${health} out of 100. ${RISK_LABEL[risk]}.`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - health / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={cn(band.stroke, 'transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none')}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-3xl font-semibold tabular-nums leading-none', band.text)}>
          {health}
        </span>
        <span className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          / 100
        </span>
      </div>
    </div>
  )
}

/** The four parts behind the score, so the number is explained, not asserted. */
export function HealthBreakdown({ parts }: { parts: Derived['healthParts'] }) {
  return (
    <ul className="flex flex-col gap-3.5">
      {parts.map((part) => {
        const pct = Math.round((part.score / part.max) * 100)
        return (
          <li key={part.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{part.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {part.score}/{part.max}
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
              role="meter"
              aria-valuenow={part.score}
              aria-valuemin={0}
              aria-valuemax={part.max}
              aria-label={`${part.label}: ${part.score} of ${part.max}`}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
                  pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-destructive',
                )}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{part.detail}</p>
          </li>
        )
      })}
    </ul>
  )
}
