import { resolveCurrentUser } from "./auth";
import type { CurrentUser } from "./types";

// The mobile app has no cookie jar — it authenticates every request with
// `Authorization: Bearer <erpnext-sid>` instead of the web's httpOnly
// cookie. The sid itself is the same ERPNext session id either way; only
// how it's carried on the wire differs.
export function getBearerSid(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

export async function requireMobileUser(request: Request): Promise<CurrentUser | null> {
  return resolveCurrentUser(getBearerSid(request));
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function json(data: unknown, init?: { status?: number }): Response {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ERPNext file URLs that point at "/private/files/..." 403 for anonymous
// requests (no ERPNext session) — the mobile app has neither a session nor
// the admin API key, so route those through our own image-proxy route,
// which fetches them server-side with the key and streams the bytes back.
// Public "/files/..." URLs are left untouched.
export function proxyPrivateImage(imageUrl: string, requestUrl: string): string {
  const marker = "/private/files/";
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return imageUrl;
  const path = imageUrl.slice(idx);
  const origin = new URL(requestUrl).origin;
  return `${origin}/api/mobile/image-proxy?path=${encodeURIComponent(path)}`;
}
