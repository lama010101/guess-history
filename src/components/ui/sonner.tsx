// Notifications are globally disabled.
// This wrapper intentionally exports a no-op Toaster and toast API
// to avoid runtime toasts anywhere in the app while preserving imports.
import React from "react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToasterProps = any

export const Toaster: React.FC<ToasterProps> = () => null

const noop = (..._args: unknown[]) => {}

// Provide common sonner API methods as no-ops
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toast: any = Object.assign(noop, {
  success: noop,
  error: noop,
  info: noop,
  warning: noop,
  message: noop,
  dismiss: noop,
  // keep signature compatible; returns a resolved promise
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  promise: (..._args: any[]) => Promise.resolve(undefined),
})

export default Toaster
