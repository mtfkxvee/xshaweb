import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, json } from "@/lib/erpnext/mobile-request";

// Lets the server retire app versions that can no longer work (an API
// change that old builds can't understand). The default accepts everyone;
// set MOBILE_MIN_VERSION (e.g. "1.2.0") to require at least that version.
export const Route = createFileRoute("/api/mobile/app-config")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async () => {
        return json({ minVersion: process.env.MOBILE_MIN_VERSION || "0.0.0" });
      },
    },
  },
});
