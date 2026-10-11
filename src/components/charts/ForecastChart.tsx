import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Label,
  Line,
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
  forecast: Derived['forecast']
  currentDay: number
  periodDays: number
  runsOutOnDay: number | null
}

/**
 * Balance across the whole 30 days: solid up to today, dashed after it.
 *
 * Two series rather than one, because "what happened" and "what we expect to
 * happen" are different claims and should not look identical. The day that is
 * today carries both values, which is what joins the two lines.
 */
export function ForecastChart({ forecast, currentDay, periodDays, runsOutOnDay }: Props) {
  const rows = useMemo(
    () =>
      forecast.map((d) => ({
        day: d.day,
        Actual: d.actual ? d.balance : null,
        Projected: !d.actual || d.day === currentDay ? d.balance : null,
      })),
    [forecast, currentDay],
  )

  const endBalance = forecast[forecast.length - 1]?.balance ?? 0
  const todayBalance = forecast[currentDay - 1]?.balance ?? 0

  return (
    <figure className="m-0">
      <div
        className="h-64 w-full sm:h-72"
        role="img"
        aria-label={`Balance forecast across ${periodDays} days. ${formatINR(
          todayBalance,
        )} on day ${currentDay}, projected to ${formatINR(endBalance)} by day ${periodDays}.${
          runsOutOnDay ? ` The balance falls below zero on day ${runsOutOnDay}.` : ''
        }`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="forecast-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={token('chart-1')} stopOpacity={0.28} />
                <stop offset="100%" stopColor={token('chart-1')} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke={token('border')} strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="day"
              tick={{ fill: token('muted-foreground'), fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: token('border') }}
              ticks={[1, 5, 10, 15, 20, 25, periodDays]}
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

            <ReferenceLine
              x={currentDay}
              stroke={token('foreground', 0.45)}
              strokeDasharray="4 4"
            >
              <Label
                value="Today"
                position="insideTopLeft"
                fill={token('muted-foreground')}
                fontSize={11}
                offset={8}
              />
            </ReferenceLine>

            {runsOutOnDay && (
              <ReferenceLine x={runsOutOnDay} stroke={token('destructive')} strokeDasharray="4 4">
                <Label
                  value="Runs out"
                  position="insideTopRight"
                  fill={token('destructive')}
                  fontSize={11}
                  offset={8}
                />
              </ReferenceLine>
            )}

            <Tooltip
              content={<ChartTooltip labelPrefix="Day" />}
              cursor={{ stroke: token('border'), strokeWidth: 1 }}
            />

            <Area
              type="monotone"
              dataKey="Actual"
              stroke={token('chart-1')}
              strokeWidth={2.5}
              fill="url(#forecast-fill)"
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="Projected"
              stroke={token('chart-1')}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-0.5 w-5 rounded-full"
            style={{ background: token('chart-1') }}
          />
          Spent so far
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-0.5 w-5 rounded-full"
            style={{
              backgroundImage: `repeating-linear-gradient(to right, ${token(
                'chart-1',
              )} 0 5px, transparent 5px 9px)`,
            }}
          />
          Projected at your current rate
        </span>
      </figcaption>
    </figure>
  )
}
