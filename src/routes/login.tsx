import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Icon } from "@/components/icon";
import { AUTH_QUERY_KEY } from "@/hooks/use-auth";
import { loginCustomer } from "@/lib/erpnext/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Masuk Member | X-SHA" }],
  }),
  component: Login,
});

const schema = z.object({
  usr: z.string().min(1, "Email/username wajib diisi"),
  pwd: z.string().min(1, "Kata sandi wajib diisi"),
});

type FormValues = z.infer<typeof schema>;

function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    const result = await loginCustomer({ data: values });
    if (!result.ok) {
      setError("root", { message: result.message });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    navigate({ to: "/akun" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl glass-panel p-8">
        <div className="mb-8 text-center">
          <p className="font-display text-[28px] font-extrabold text-primary">X-SHA</p>
          <h1 className="mt-2 text-headline-md text-on-surface">Masuk Member</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Gunakan akun member X-SHA Anda untuk melihat poin, promo, dan riwayat transaksi.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="usr"
              className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant"
            >
              Email / Username
            </label>
            <input
              id="usr"
              type="text"
              autoComplete="username"
              {...register("usr")}
              className="w-full rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-body-md outline-none transition-all focus:ring-2 focus:ring-primary/50"
            />
            {errors.usr && <p className="text-xs text-error">{errors.usr.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pwd"
              className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant"
            >
              Kata Sandi
            </label>
            <input
              id="pwd"
              type="password"
              autoComplete="current-password"
              {...register("pwd")}
              className="w-full rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-body-md outline-none transition-all focus:ring-2 focus:ring-primary/50"
            />
            {errors.pwd && <p className="text-xs text-error">{errors.pwd.message}</p>}
          </div>

          {errors.root && (
            <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
              {errors.root.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl primary-gradient py-3 font-bold text-on-primary transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting && <Icon name="progress_activity" className="animate-spin text-[18px]" />}
            Masuk
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-on-surface-variant">
          Belum punya akun member? Hubungi outlet X-SHA terdekat untuk didaftarkan.
        </p>
      </div>
    </div>
  );
}
