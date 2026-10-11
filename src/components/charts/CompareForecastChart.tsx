import { useMemo } from 'react'
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import { formatINR, formatINRShort, type Derived } from '@/lib/finance'
import { token } from '@/lib/utils'

interface Props {
  before: Derived['forecast']
  after: Derived['forecast']
  currentDay: number
  periodDays: number
}

/**
 * The same 30 days twice: as things stand, and as they would stand if the
 * decision were taken. The gap between the two lines *is* the consequence,
 * which is more honest than two separate charts side by side.
 */
export function CompareForecastChart({ before, after, currentDay, periodDays }: Props) {
  const rows = useMemo(
    () =>
      before.map((d, i) => ({
        day: d.day,
        'As things stand': d.balance,
        'After this decision': after[i]?.balance ?? d.balance,
      })),
    [before, after],
  )

  const endBefore = before[before.length - 1]?.balance ?? 0
  const endAfter = after[after.length - 1]?.balance ?? 0

  return (
    <figure className="m-0">
      <div
        className="h-56 w-full sm:h-64"
        role="img"
        aria-label={`Balance across ${periodDays} days compared. Without the decision the period ends at ${formatINR(
          endBefore,
        )}; with it, ${formatINR(endAfter)}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid stroke={token('border')} strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="day"
              tick={{ fill: token('muted-foreground'), fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: token('border') }}
              ticks={[1, 10, 20, periodDays]}
              tickFormatter={(v) => `D${v}`}
            />
            <YAxis
              tick={{ fill: token('muted-foreground'), fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={formatINRShort}
            />

            <ReferenceLine y={0} stroke={token('destructive')} strokeWidth={1.5} />
            <ReferenceLine x={currentDay} stroke={token('foreground', 0.45)} strokeDasharray="4 4">
              <Label
                value="Today"
                position="insideTopLeft"
                fill={token('muted-foreground')}
                fontSize={11}
                offset={8}
              />
            </ReferenceLine>

            <Tooltip
              content={<ChartTooltip labelPrefix="Day" />}
              cursor={{ stroke: token('border'), strokeWidth: 1 }}
            />

            <Line
              type="monotone"
              dataKey="As things stand"
              stroke={token('muted-foreground')}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="After this decision"
              stroke={token('chart-1')}
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-0.5 w-5 rounded-full"
            style={{
              backgroundImage: `repeating-linear-gradient(to right, ${token(
                'muted-foreground',
              )} 0 5px, transparent 5px 9px)`,
            }}
          />
          As things stand
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-0.5 w-5 rounded-full"
            style={{ background: token('chart-1') }}
          />
          After this decision
        </span>
      </figcaption>
    </figure>
  )
}
