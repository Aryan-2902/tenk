import { AlertTriangle, CheckCircle2, OctagonAlert, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { RISK_LABEL, type RiskLevel } from '@/lib/finance'

const MAP: Record<
  RiskLevel,
  { variant: 'success' | 'warning' | 'destructive'; icon: typeof CheckCircle2 }
> = {
  low: { variant: 'success', icon: CheckCircle2 },
  moderate: { variant: 'warning', icon: AlertTriangle },
  high: { variant: 'destructive', icon: TriangleAlert },
  critical: { variant: 'destructive', icon: OctagonAlert },
}

/** Risk always arrives as a word plus an icon — never as a colour alone. */
export function RiskPill({ risk }: { risk: RiskLevel }) {
  const { variant, icon: Icon } = MAP[risk]
  return (
    <Badge variant={variant}>
      <Icon className="size-3" aria-hidden="true" />
      {RISK_LABEL[risk]}
    </Badge>
  )
}
