import * as React from 'react'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  /** Must match the id of the control rendered inside. */
  htmlFor: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * Wires label → control → hint/error with the right ids, so every input is
 * named and every error is announced. Pass the ids through to the control:
 *
 *   <Field label="Email" htmlFor="email" error={errors.email?.message}>
 *     <Input id="email" aria-describedby="email-error" aria-invalid={!!errors.email} />
 *   </Field>
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium leading-none">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}

      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
