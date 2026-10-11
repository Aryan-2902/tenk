import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  /**
   * Heading level. Defaults to h2 because an empty state usually sits
   * directly under the page's h1 — rendering an h3 there skips a level and
   * fails the heading-order audit. Pass "h3" when it nests under an h2.
   */
  as?: 'h2' | 'h3' | 'h4'
}

/**
 * Never ship a blank area. An explained empty state is a visible UI/UX
 * quality signal and costs three lines to use.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  as: Heading = 'h2',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed',
        'border-border px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <Heading className="text-base font-semibold">{title}</Heading>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
