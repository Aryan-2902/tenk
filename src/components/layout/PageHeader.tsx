import { cn } from '@/lib/utils'

interface PageHeaderProps {
  /** Shown above the h1 in the problem statement's own wording, e.g. its title. */
  kicker?: string
  /** Becomes the page's single <h1>. Use the problem statement's own words. */
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ kicker, title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div>
        {kicker && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            {kicker}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>
      {/* `flex-wrap` is load-bearing: three buttons in a row are wider than a
          375px viewport, and `shrink-0` alone would push the page sideways. */}
      {actions && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
      )}
    </div>
  )
}
