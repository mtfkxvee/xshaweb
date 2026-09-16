import { createFileRoute } from "@tanstack/react-router";
import { loginOrSignupWithGoogle } from "@/lib/erpnext/google-auth";

// Google redirects here after the user approves (or cancels) consent. We
// finish the OAuth code exchange + sign-in/sign-up server-side, then hand
// control back to the app via its own custom URL scheme — the mobile
// client's in-app browser session (expo-web-browser's
// openAuthSessionAsync) is watching for exactly that redirect and closes
// itself the moment it sees it, returning the token to the app.
export const Route = createFileRoute("/api/mobile/auth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          return Response.redirect(`xsha://auth?ok=0&message=${encodeURIComponent(error)}`, 302);
        }
        if (!code) {
          return Response.redirect(`xsha://auth?ok=0&message=${encodeURIComponent("Kode Google tidak ditemukan.")}`, 302);
        }

        const redirectUri = `${url.origin}/api/mobile/auth/google/callback`;
        const result = await loginOrSignupWithGoogle(code, redirectUri);

        if (!result.ok) {
          return Response.redirect(`xsha://auth?ok=0&message=${encodeURIComponent(result.message)}`, 302);
        }
        return Response.redirect(`xsha://auth?ok=1&token=${encodeURIComponent(result.sid)}`, 302);
      },
    },
  },
});
