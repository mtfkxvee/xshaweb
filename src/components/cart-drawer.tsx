import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Icon } from "./icon";
import { useCart } from "./cart-context";
import { useOutlet } from "./outlet-context";
import { useAuth } from "@/hooks/use-auth";
import { formatIDR } from "@/lib/utils";
import { DEFAULT_WHATSAPP_NUMBER } from "@/lib/erpnext/outlets";
import { createOrder } from "@/lib/erpnext/orders";

const schema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  outlet: z.string().min(1, "Pilih outlet"),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CartDrawer() {
  const { items, open, closeCart, total, setQty, remove, clear } = useCart();
  const { isLoggedIn, user } = useAuth();
  const { outlets, selectedOutlet } = useOutlet();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", outlet: "", note: "" },
  });

  // Pre-fill from the logged-in customer once their data loads, without
  // clobbering anything the person already typed (e.g. ordering for someone
  // else).
  useEffect(() => {
    const name = user?.customer?.name;
    if (name && !getValues("name")) {
      setValue("name", name);
    }
  }, [user, getValues, setValue]);

  // Pre-fill from the outlet already picked globally (top-nav filter),
  // without clobbering a manual change made inside the drawer itself.
  useEffect(() => {
    if (selectedOutlet && !getValues("outlet")) {
      setValue("outlet", selectedOutlet.code);
    }
  }, [selectedOutlet, getValues, setValue]);

  if (!open) return null;

  const buildWaMessage = (v: FormValues, outletName: string) =>
    encodeURIComponent(
      [
        `Halo X-SHA, saya ${v.name} ingin memesan:`,
        ...items.map((i) => `- ${i.name} x${i.qty} (${formatIDR(i.price * i.qty)})`),
        `Outlet: ${outletName}`,
        v.note ? `Catatan: ${v.note}` : "",
        `Estimasi total: ${formatIDR(total)}`,
      ]
        .filter(Boolean)
        .join("\n"),
    );

  const onSubmit = async (v: FormValues) => {
    const selectedOutlet = outlets?.find((o) => o.code === v.outlet);
    const outletName = selectedOutlet?.name ?? v.outlet;
    const waNumber = selectedOutlet?.whatsapp ?? DEFAULT_WHATSAPP_NUMBER;

    if (isLoggedIn) {
      const result = await createOrder({
        data: {
          items: items.map((i) => ({
            itemCode: i.id,
            itemName: i.name,
            qty: i.qty,
            rate: i.price,
          })),
          note: v.note ? `Outlet: ${outletName}. ${v.note}` : `Outlet: ${outletName}`,
        },
      });
      if (result.ok) {
        toast.success(`Pesanan ${result.orderId} tercatat di sistem X-SHA.`);
      } else if (result.reason === "erpnext_error") {
        toast.error("Pesanan belum tercatat di sistem, tapi tetap bisa dikirim via WhatsApp.");
      }
    }

    window.open(
      `https://wa.me/${waNumber}?text=${buildWaMessage(v, outletName)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <>
      <button
        type="button"
        aria-label="Tutup keranjang"
        onClick={closeCart}
        className="fixed inset-0 z-60 bg-on-surface/20 backdrop-blur-sm transition-opacity"
      />
      <aside className="fixed right-0 top-0 z-70 flex h-full w-full flex-col border-l border-white/30 bg-white/40 shadow-glass-lg backdrop-blur-[24px] animate-drawer-in md:w-[480px]">
        <div className="flex items-center justify-between border-b border-white/20 px-gutter py-stack-md">
          <div className="flex items-center gap-3">
            <Icon name="shopping_cart" filled className="text-primary" />
            <h2 className="font-display text-headline-md text-primary">Keranjang Belanja</h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Tutup"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/30"
          >
            <Icon name="close" className="text-on-surface-variant" />
          </button>
        </div>

        <form
          id="cart-checkout-form"
          onSubmit={handleSubmit(onSubmit)}
          className="scroll-hide flex-1 space-y-stack-md overflow-y-auto p-gutter"
        >
          {items.length === 0 && (
            <p className="py-12 text-center text-body-md text-on-surface-variant">
              Keranjang Anda masih kosong.
            </p>
          )}

          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 rounded-xl glass-panel p-4 transition-transform hover:scale-[1.01]"
              >
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                  <img
                    src={item.image}
                    alt={item.alt}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-label-md font-bold text-on-surface">{item.name}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-display text-body-md font-extrabold text-primary">
                          {formatIDR(item.price)}
                        </span>
                        {item.oldPrice && (
                          <span className="text-[12px] text-on-surface-variant line-through">
                            {formatIDR(item.oldPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      aria-label={`Hapus ${item.name}`}
                      className="text-error transition-transform hover:scale-110"
                    >
                      <Icon name="delete" className="text-[20px]" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      aria-label="Kurangi jumlah"
                      onClick={() => setQty(item.id, item.qty - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/40 hover:bg-white/20"
                    >
                      −
                    </button>
                    <span className="w-4 text-center text-label-md">{item.qty}</span>
                    <button
                      type="button"
                      aria-label="Tambah jumlah"
                      onClick={() => setQty(item.id, item.qty + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/40 hover:bg-white/20"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-5 border-t border-white/20 pt-4">
            <h4 className="font-display text-[18px] font-semibold">Informasi Pemesan</h4>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="cart-name"
                  className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant"
                >
                  Nama Lengkap*
                </label>
                <input
                  id="cart-name"
                  type="text"
                  placeholder="Masukkan nama Anda"
                  {...register("name")}
                  className="w-full rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-body-md transition-all placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {errors.name && <p className="text-xs text-error">{errors.name.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="cart-outlet"
                  className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant"
                >
                  Pilih Outlet Terdekat*
                </label>
                <div className="relative">
                  <select
                    id="cart-outlet"
                    {...register("outlet")}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-body-md transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Pilih outlet</option>
                    {outlets?.map((o) => (
                      <option key={o.code} value={o.code}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <Icon
                    name="expand_more"
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  />
                </div>
                {errors.outlet && <p className="text-xs text-error">{errors.outlet.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="cart-note"
                  className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant"
                >
                  Catatan Tambahan
                </label>
                <textarea
                  id="cart-note"
                  rows={3}
                  placeholder="Contoh: Ukuran L, warna alternatif..."
                  {...register("note")}
                  className="w-full resize-none rounded-xl border border-white/30 bg-white/20 px-4 py-3 text-body-md transition-all placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>
        </form>

        <div className="space-y-4 glass-panel border-t-0 p-gutter shadow-[0_-8px_32px_0_rgba(107,33,168,0.05)]">
          <div className="flex items-center justify-between">
            <span className="font-medium text-on-surface-variant">Estimasi Total</span>
            <span className="font-display text-[28px] font-extrabold text-primary">
              {formatIDR(total)}
            </span>
          </div>
          <p className="px-4 text-center text-[12px] italic leading-relaxed text-on-surface-variant">
            Harga estimasi — total final akan dikonfirmasi admin saat pesanan diproses.
            {isLoggedIn ? " Pesanan otomatis tercatat di akun member Anda." : ""}
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              form="cart-checkout-form"
              disabled={items.length === 0 || isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl primary-gradient py-4 font-bold text-on-primary transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              <Icon name="chat" />
              Kirim via WhatsApp
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={items.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-error transition-colors hover:bg-error/10 disabled:opacity-50"
            >
              <Icon name="delete_sweep" className="text-[20px]" />
              Kosongkan Keranjang
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
