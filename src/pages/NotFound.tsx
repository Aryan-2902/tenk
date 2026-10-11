import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="container grid min-h-[60vh] place-items-center py-16 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Error 404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          We could not find that page
        </h1>
        <p className="mt-3 text-muted-foreground">
          The link may be out of date, or the address may have a typo in it.
        </p>
        <Button className="mt-8" asChild>
          <Link to="/">Back to the home page</Link>
        </Button>
      </div>
    </div>
  )
}
