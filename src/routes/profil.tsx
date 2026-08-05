import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { AUTH_QUERY_KEY, useAuth } from "@/hooks/use-auth";
import { getMyAddress, updateMyProfile } from "@/lib/erpnext/profile";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [{ title: "Lengkapi Profil | X-SHA" }],
  }),
  component: Profil,
});

const schema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  mobile: z.string().min(1, "Nomor HP wajib diisi"),
  birthDate: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function Profil() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, isLoggedIn } = useAuth();

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate({ to: "/login" });
    }
  }, [authLoading, isLoggedIn, navigate]);

  const { data: address } = useQuery({
    queryKey: ["my-address"],
    queryFn: () => getMyAddress(),
    enabled: isLoggedIn,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: user?.customer?.name ?? "",
      mobile: user?.customer?.mobile ?? "",
      birthDate: user?.customer?.birthDate ?? "",
      addressLine1: address?.line1 ?? "",
      city: address?.city ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    const result = await updateMyProfile({
      data: {
        name: values.name,
        mobile: values.mobile,
        birthDate: values.birthDate ?? "",
        addressLine1: values.addressLine1 ?? "",
        city: values.city ?? "",
      },
    });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    await queryClient.invalidateQueries({ queryKey: ["my-address"] });
    toast.success("Profil berhasil diperbarui.");
    navigate({ to: "/akun" });
  };

  if (!isLoggedIn) return null;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-container-max px-gutter pb-stack-lg">
        <div className="mx-auto w-full max-w-lg">
          <Link
            to="/akun"
            className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            Kembali ke Akun
          </Link>

          <h1 className="mb-1 text-headline-lg-mobile text-on-surface md:text-display-lg">
            Lengkapi Profil
          </h1>
          <p className="mb-6 text-on-surface-variant">
            Data ini digunakan untuk mempercepat proses checkout dan komunikasi seputar pesanan
            Anda.
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 rounded-3xl glass-panel p-6 md:p-8"
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="name"
                className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Nama Lengkap
              </label>
              <input
                id="name"
                type="text"
                {...register("name")}
                className="w-full rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-body-md outline-none transition-all focus:ring-2 focus:ring-primary/50"
              />
              {errors.name && <p className="text-xs text-error">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="mobile"
                className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Nomor HP / WhatsApp
              </label>
              <input
                id="mobile"
                type="tel"
                placeholder="08xxxxxxxxxx"
                {...register("mobile")}
                className="w-full rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-body-md outline-none transition-all focus:ring-2 focus:ring-primary/50"
              />
              {errors.mobile && <p className="text-xs text-error">{errors.mobile.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="birthDate"
                className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Tanggal Lahir
              </label>
              <input
                id="birthDate"
                type="date"
                {...register("birthDate")}
                className="w-full rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-body-md outline-none transition-all focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="addressLine1"
                className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Alamat
              </label>
              <textarea
                id="addressLine1"
                rows={3}
                placeholder="Jalan, nomor rumah, RT/RW, kelurahan..."
                {...register("addressLine1")}
                className="w-full resize-none rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-body-md outline-none transition-all focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="city"
                className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Kota / Kabupaten
              </label>
              <input
                id="city"
                type="text"
                placeholder="Tasikmalaya"
                {...register("city")}
                className="w-full rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-body-md outline-none transition-all focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">
                Email
              </label>
              <input
                type="email"
                value={user?.email ?? ""}
                disabled
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-body-md text-on-surface-variant"
              />
              <p className="text-xs text-on-surface-variant">
                Email login tidak bisa diubah sendiri, hubungi outlet untuk mengganti.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl primary-gradient py-3 font-bold text-on-primary transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {isSubmitting && (
                <Icon name="progress_activity" className="animate-spin text-[18px]" />
              )}
              Simpan Perubahan
            </button>
          </form>
        </div>
      </div>
    </SiteLayout>
  );
}
