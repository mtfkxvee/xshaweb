import { createFileRoute } from "@tanstack/react-router";
import { getErpnextConfig } from "@/lib/erpnext/config";

// Some ERPNext attachments (e.g. promo banners) are uploaded as "private"
// files — anonymous requests to their /private/files/... URL 403. The web
// app never hit this because those images are only ever fetched from a
// browser that... doesn't have a session either, so in practice this proxy
// fixes a pre-existing gap for both clients: it re-fetches the file
// server-side using the admin API key (never sent to any client) and
// streams the bytes back.
export const Route = createFileRoute("/api/mobile/image-proxy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const path = new URL(request.url).searchParams.get("path");
        // This proxy exists for exactly one thing: re-fetching a private
        // file attachment with the admin key so an anonymous client can see
        // it. It must never forward to an arbitrary ERPNext path — that
        // would let anyone use the admin API key to read any REST/method
        // endpoint (Customer, User, anything) through this route.
        if (!path || !path.startsWith("/private/files/") || path.includes("..")) {
          return new Response("Missing or invalid path", { status: 400 });
        }

        const config = getErpnextConfig();
        if (!config) return new Response("Not configured", { status: 503 });

        const upstream = await fetch(`${config.url}${path}`, {
          headers: { Authorization: `token ${config.apiKey}:${config.apiSecret}` },
        });

        if (!upstream.ok || !upstream.body) {
          return new Response("Image not found", { status: 404 });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
