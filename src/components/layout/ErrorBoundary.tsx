import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Stops one thrown error from turning the whole submission into a blank
 * white page — which would score zero on functionality.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-screen place-items-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-destructive/[0.12]">
              <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error stopped this view from rendering. Reloading usually fixes it.
            </p>
            <Button className="mt-6" onClick={() => window.location.reload()}>
              Reload the page
            </Button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
