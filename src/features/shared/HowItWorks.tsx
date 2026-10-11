import { Suspense, lazy, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * The trigger ships with the landing route; the dialog does not.
 *
 * Splitting them keeps the dialog library out of the first paint — nobody
 * sees this content until they ask for it, and the overview is the route
 * whose load time is measured.
 */
const HowItWorksDialog = lazy(() =>
  import('./HowItWorksDialog').then((m) => ({ default: m.HowItWorksDialog })),
)

export function HowItWorks() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <HelpCircle className="size-4" aria-hidden="true" />
        How the numbers work
      </Button>

      {open && (
        <Suspense fallback={null}>
          <HowItWorksDialog onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
