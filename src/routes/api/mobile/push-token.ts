import { createFileRoute } from "@tanstack/react-router";
import { registerPushToken, unregisterPushToken } from "@/lib/erpnext/push";
import { corsPreflight, json, requireMobileUser } from "@/lib/erpnext/mobile-request";

// The mobile app registers its Expo push token here after login (and
// unregisters it on logout) so order updates can be pushed to the device.
export const Route = createFileRoute("/api/mobile/push-token")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      POST: async ({ request }) => {
        const user = await requireMobileUser(request);
        if (!user?.customer) return json({ ok: false, message: "Belum login." }, { status: 401 });

        const body = (await request.json().catch(() => null)) as {
          token?: string;
          action?: "register" | "unregister";
        } | null;
        if (!body?.token) return json({ ok: false, message: "Token wajib diisi." }, { status: 400 });

        const result =
          body.action === "unregister"
            ? await unregisterPushToken(user.customer.id, body.token)
            : await registerPushToken(user.customer.id, body.token);
        return json(result, { status: result.ok ? 200 : 400 });
      },
    },
  },
});
