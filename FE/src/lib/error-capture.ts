/**
 * Single chokepoint every route-group error boundary reports to
 * (development-phases.md Phase 8). Not the Sentry SDK — there is no
 * error-tracking service wired into this app. It logs full `Error`/`cause`
 * detail (both client and server side) so a boundary catching an error
 * doesn't just silently swallow it; if a browser error-tracking SDK is
 * adopted later, this is the one place that call gets added.
 */
export function captureError(error: unknown, info?: { componentStack: string }): void {
  if (error instanceof Error) {
    console.error(error.message, { name: error.name, stack: error.stack, cause: error.cause });
  } else {
    console.error("Non-Error thrown to an error boundary:", error);
  }
  if (info?.componentStack) {
    console.error(info.componentStack);
  }
}
