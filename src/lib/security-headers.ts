// Applied to every response from the Worker's top-level fetch handler (see
// server.ts) to close the gaps flagged by Mozilla's HTTP Observatory: no
// CSP, no HSTS, no X-Frame-Options/X-Content-Type-Options/Referrer-Policy.
//
// script-src keeps 'unsafe-inline': TanStack Start emits an inline <script>
// with per-request serialized state for hydration (no static content to
// hash, and this app has no nonce-injection hook into Start's renderer), so
// a strict script-src would break every page load. Every other directive
// stays locked down — this still blocks the thing CSP mainly exists to
// block here: loading scripts/frames/objects from an attacker-controlled
// origin.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://erp.x-sha.id https://lh3.googleusercontent.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// CSP and the anti-framing headers are skipped in dev:
// - Vite's dev client needs 'unsafe-eval' and a websocket connection for
//   HMR that a locked-down connect-src would block.
// - Lovable's editor renders the dev server inside its own live-preview
//   iframe; X-Frame-Options: DENY / frame-ancestors 'none' would break that
//   preview (harmless in prod, where nothing legitimately frames the site).
// HSTS is safe to always send regardless — browsers only honor it over
// HTTPS, so it's a no-op on plain-HTTP localhost.
export function applySecurityHeaders(response: Response, isDev: boolean): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  if (!isDev) {
    headers.set("Content-Security-Policy", CSP);
    headers.set("X-Frame-Options", "DENY");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
