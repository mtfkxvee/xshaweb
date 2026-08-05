import { createFileRoute, redirect } from "@tanstack/react-router";

// `/member` and `/akun` used to be two separate, inconsistently-styled
// dashboards. They're merged into one responsive page at `/akun`; this
// route stays only so old links/bookmarks don't break.
export const Route = createFileRoute("/member")({
  beforeLoad: () => {
    throw redirect({ to: "/akun" });
  },
});
