import { createFileRoute } from "@tanstack/react-router";
import { authenticateWithErpnext } from "@/lib/erpnext/auth";
import { corsPreflight, json } from "@/lib/erpnext/mobile-request";

export const Route = createFileRoute("/api/mobile/auth/login")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as { usr?: string; pwd?: string } | null;
        if (!body?.usr || !body?.pwd) {
          return json({ ok: false, message: "Email dan kata sandi wajib diisi." }, { status: 400 });
        }

        const result = await authenticateWithErpnext(body.usr, body.pwd);
        if (!result.ok) return json(result);

        // Unlike the web login, the mobile client has no cookie jar — hand
        // the ERPNext sid back as the response body itself, for the app to
        // store in expo-secure-store and replay as `Authorization: Bearer`.
        return json({ ok: true, token: result.sid });
      },
    },
  },
});
