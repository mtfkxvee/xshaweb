import { createFileRoute } from "@tanstack/react-router";
import { buildAppRedirect, loginOrSignupWithGoogle, resolveRequestOrigin } from "@/lib/erpnext/google-auth";

// Google redirects here after the user approves (or cancels) consent. We
// finish the OAuth code exchange + sign-in/sign-up server-side, then hand
// control back to the app via whichever return URL it asked for in
// /google/start (carried through Google's own `state` param) — the mobile
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
        const state = url.searchParams.get("state");

        if (error) {
          return Response.redirect(buildAppRedirect(state, { ok: "0", message: error }), 302);
        }
        if (!code) {
          return Response.redirect(
            buildAppRedirect(state, { ok: "0", message: "Kode Google tidak ditemukan." }),
            302,
          );
        }

        const redirectUri = `${resolveRequestOrigin(request)}/api/mobile/auth/google/callback`;
        const result = await loginOrSignupWithGoogle(code, redirectUri);

        if (!result.ok) {
          return Response.redirect(buildAppRedirect(state, { ok: "0", message: result.message }), 302);
        }
        return Response.redirect(
          buildAppRedirect(state, {
            ok: "1",
            token: result.sid,
            ...(result.isNewSignup ? { isNew: "1" } : {}),
          }),
          302,
        );
      },
    },
  },
});
