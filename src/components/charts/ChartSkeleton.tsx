/**
 * Reserves the chart's exact height while its chunk loads, so nothing on the
 * page jumps when it arrives. Charts are split out because recharts is the
 * single largest dependency here and no first paint needs it.
 */
export function ChartSkeleton({ height = 256 }: { height?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="w-full animate-pulse rounded-md bg-muted"
      style={{ height }}
    >
      <span className="sr-only">Loading chart</span>
    </div>
  )
}
