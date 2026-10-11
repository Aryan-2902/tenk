import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Navbar, type NavItem } from './Navbar'
import { Footer } from './Footer'
import { useTheme } from '@/hooks/useTheme'

interface AppShellProps {
  brand: string
  nav: NavItem[]
  /** One-line description shown in the footer under the name. */
  tagline?: string
  children: React.ReactNode
}

/**
 * The semantic frame every page sits in:
 *   skip link → <header> → <main id="main"> → <footer>
 * Exactly one <h1> belongs inside each page (see PageHeader).
 */
export function AppShell({ brand, nav, tagline, children }: AppShellProps) {
  const { theme } = useTheme()
  const { pathname } = useLocation()

  // Move focus and scroll to the top on navigation — without this, a screen
  // reader stays parked on the old page after a route change.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only-focusable">
        Skip to main content
      </a>

      <Navbar brand={brand} items={nav} />

      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>

      <Footer brand={brand} tagline={tagline} />

      <Toaster
        theme={theme}
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{ duration: 3500 }}
      />
    </div>
  )
}
