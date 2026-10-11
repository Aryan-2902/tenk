import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import { formatINR, formatINRShort } from '@/lib/finance'
import { token } from '@/lib/utils'

interface Props {
  data: { label: string; value: number }[]
}

/**
 * Ranked horizontal bars, one hue. Categories are not a scale and the order
 * already carries the ranking, so five colours would add decoration and no
 * information. The leader is emphasised; the rest step back.
 */
export function CategoryBars({ data }: Props) {
  const rows = data.map((d) => ({ ...d, Spent: d.value }))
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <figure className="m-0">
      <div
        className="w-full"
        style={{ height: Math.max(180, rows.length * 42 + 28) }}
        role="img"
        aria-label={`Spending by category, ${formatINR(total)} in total. ${data
          .map((d) => `${d.label} ${formatINR(d.value)}`)
          .join(', ')}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 0, right: 56, bottom: 0, left: 0 }}
            barCategoryGap={10}
          >
            <CartesianGrid stroke={token('border')} strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: token('muted-foreground'), fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatINRShort}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: token('foreground'), fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={96}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: token('foreground', 0.05) }}
            />
            <Bar dataKey="Spent" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {rows.map((_, i) => (
                <Cell key={i} fill={token('chart-1', i === 0 ? 1 : 0.55)} />
              ))}
              <LabelList
                dataKey="Spent"
                position="right"
                formatter={(v: number) => formatINR(v)}
                fill={token('muted-foreground')}
                fontSize={11}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
