interface FooterProps {
  brand?: string
  /** Optional one-line description shown under the name. */
  tagline?: string
}

export function Footer({ brand = 'TenK', tagline }: FooterProps) {
  return (
    <footer className="mt-auto border-t border-border py-8">
      <div className="container flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
        <div className="text-center sm:text-left">
          <p>
            © {new Date().getFullYear()} {brand}
          </p>
          {tagline && <p className="mt-0.5">{tagline}</p>}
        </div>
        <p>
          Built with{' '}
          <span className="font-medium text-foreground">React · TypeScript · Tailwind CSS</span>
        </p>
      </div>
    </footer>
  )
}
