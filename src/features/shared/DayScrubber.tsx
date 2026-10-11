import { CalendarDays } from 'lucide-react'
import { useStore } from '@/lib/store'

/**
 * Moves "today" within the 30-day period.
 *
 * It exists because every figure in the app is a function of the day: without
 * a way to move through the month you cannot see that the forecast, the
 * allowance and the health score all respond to time passing, not only to
 * spending. A native range input gets keyboard support for free.
 */
export function DayScrubber() {
  const { state, derived, setCurrentDay } = useStore()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor="day-scrubber"
          className="flex items-center gap-2 text-sm font-medium leading-none"
        >
          <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
          Day {state.currentDay} of {state.periodDays}
        </label>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {derived.daysLeft} {derived.daysLeft === 1 ? 'day' : 'days'} left
        </span>
      </div>

      <input
        id="day-scrubber"
        type="range"
        min={1}
        max={state.periodDays}
        step={1}
        value={state.currentDay}
        onChange={(e) => setCurrentDay(Number(e.target.value))}
        aria-describedby="day-scrubber-hint"
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted
                   accent-primary focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-ring focus-visible:ring-offset-2
                   focus-visible:ring-offset-background"
      />

      <p id="day-scrubber-hint" className="text-xs text-muted-foreground">
        Move through the month to see how every figure responds to time passing.
      </p>
    </div>
  )
}
