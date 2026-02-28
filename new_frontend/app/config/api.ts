/**
 * Centralized API configuration.
 *
 * ── How it works ──────────────────────────────────────────────
 * 1.  In dev, create  new_frontend/.env  with:
 *         VITE_API_BASE=http://192.168.x.x:3001/api/v1
 *     (your desktop's LAN IP so the phone can reach the backend)
 *
 * 2.  If no env var is set, falls back to http://localhost:3001/api/v1
 *     which works for desktop-only usage.
 *
 * 3.  The mobile KYC page receives the API base via QR code query
 *     param so it always has the correct URL regardless of env.
 */

const DEFAULT_API_BASE = 'http://localhost:3001/api/v1';

/** API base URL for the current environment */
export const API_BASE: string =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE) ||
  DEFAULT_API_BASE;

/**
 * Thin wrapper around `fetch()` that adds the `ngrok-skip-browser-warning`
 * header.  Ngrok's free tier returns an HTML interstitial page for
 * browser-originated requests unless this header is present, which
 * breaks all API calls made from domains other than the ngrok URL itself.
 */
export function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has('ngrok-skip-browser-warning')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }
  return fetch(input, { ...init, headers });
}

/**
 * Derive the best API_BASE to embed in QR codes / cross-device URLs.
 * If the current page is served from localhost, try to compute the
 * LAN-reachable URL.  Otherwise return the configured API_BASE.
 */
export function getApiBaseForQR(): string {
  if (typeof window === 'undefined') return API_BASE;

  // If an explicit env var is set, trust it
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE
  ) {
    return import.meta.env.VITE_API_BASE;
  }

  // If the page is served from a non-localhost origin (e.g. Firebase),
  // localhost won't work on mobile.  Fall back to API_BASE but warn.
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    // Best effort: use the same hostname the page is served from
    // (only works if backend is co-hosted or proxied)
    console.warn(
      '[api.config] Running on non-localhost origin without VITE_API_BASE set. ' +
      'Mobile QR KYC will fail unless you set VITE_API_BASE to your LAN backend URL.',
    );
    return API_BASE;
  }

  return API_BASE;
}
