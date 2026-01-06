export async function register() {
  // Firebase Hosting SSR runs Next.js in a Node.js runtime, but Next may also
  // evaluate instrumentation in other runtimes. Keep this hook defensive.
  //
  // The deployed SSR runtime can emit MaxListenersExceededWarning for
  // process-level handlers (uncaughtException/unhandledRejection) registered by
  // framework internals. Raising the listener cap on `process` avoids noisy logs.
  try {
    const proc = process as unknown as { setMaxListeners?: (n: number) => void };
    proc?.setMaxListeners?.(50);
  } catch {
    // Ignore if `process` is unavailable (e.g. Edge runtime).
  }
}
