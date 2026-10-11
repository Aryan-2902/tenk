import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { SkeletonCard } from '@/components/ui/skeleton'
import { StoreProvider } from '@/lib/store'
import { Overview } from '@/features/overview/Overview'
import { NotFound } from '@/pages/NotFound'

const BRAND = 'TenK'

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/simulate', label: 'Simulate' },
  { to: '/spending', label: 'Spending' },
  { to: '/goals', label: 'Goals' },
]

// Overview is eager because it is the landing route; the rest are split so the
// first paint carries only what it needs.
const Simulate = lazy(() =>
  import('@/features/simulate/Simulate').then((m) => ({ default: m.Simulate })),
)
const Spending = lazy(() =>
  import('@/features/spending/Spending').then((m) => ({ default: m.Spending })),
)
const Goals = lazy(() => import('@/features/goals/Goals').then((m) => ({ default: m.Goals })))

function RouteFallback() {
  return (
    <div className="container py-8" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading page</span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell
        brand={BRAND}
        nav={NAV}
        tagline="Simulate a decision before you take it."
      >
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/simulate" element={<Simulate />} />
            <Route path="/spending" element={<Spending />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AppShell>
    </StoreProvider>
  )
}
