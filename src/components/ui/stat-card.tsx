import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from './card'

interface StatCardProps {
  label: string
  value: string | number
  /** Signed percentage, e.g. 12.4 or -3.1. Omit to hide the delta. */
  delta?: number
  deltaLabel?: string
  icon?: LucideIcon
  className?: string
}

/**
 * The number is the hero: large, tabular, high contrast. The delta carries
 * an icon as well as a colour so it does not rely on colour alone.
 */
export function StatCard({
  label,
  value,
  delta,
  deltaLabel = 'vs last period',
  icon: Icon,
  className,
}: StatCardProps) {
  const isUp = (delta ?? 0) >= 0
  const TrendIcon = isUp ? TrendingUp : TrendingDown

  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      </div>

      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>

      {delta !== undefined && (
        <p className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium',
              isUp ? 'bg-success/[0.12] text-success' : 'bg-destructive/[0.12] text-destructive',
            )}
          >
            <TrendIcon className="size-3" aria-hidden="true" />
            {isUp ? '+' : ''}
            {delta}%
          </span>
          <span className="text-muted-foreground">{deltaLabel}</span>
        </p>
      )}
    </Card>
  )
}
