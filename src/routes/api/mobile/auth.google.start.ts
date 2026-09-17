import { createFileRoute } from "@tanstack/react-router";
import { buildGoogleAuthUrl, resolveRequestOrigin } from "@/lib/erpnext/google-auth";

// The mobile app opens this in an in-app browser — it just bounces straight
// to Google's consent screen with the right client_id/redirect_uri, so the
// app itself never needs to know those details.
export const Route = createFileRoute("/api/mobile/auth/google/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = resolveRequestOrigin(request);
        const clientRedirect = new URL(request.url).searchParams.get("client_redirect");
        const authUrl = buildGoogleAuthUrl(origin, clientRedirect);
        if (!authUrl) return new Response("Google OAuth belum dikonfigurasi.", { status: 503 });
        return Response.redirect(authUrl, 302);
      },
    },
  },
});
