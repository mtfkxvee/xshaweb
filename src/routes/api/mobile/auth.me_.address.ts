import { createFileRoute } from "@tanstack/react-router";
import { fetchAddressForCustomer } from "@/lib/erpnext/profile";
import { corsPreflight, json, requireMobileUser } from "@/lib/erpnext/mobile-request";

// Backs the mobile "Edit Profil" form, which needs to pre-fill the
// customer's existing address the same way the web edit-profile page does.
export const Route = createFileRoute("/api/mobile/auth/me_/address")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request }) => {
        const user = await requireMobileUser(request);
        if (!user?.customer) return json(null);
        return json(await fetchAddressForCustomer(user.customer.id));
      },
    },
  },
});
