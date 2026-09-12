import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Tag } from "lucide-react";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaces, workspacesListQueryOptions } from "@/features/workspaces";
import { formatMoney } from "@/shared/format";
import { useI18n } from "@/shared/i18n";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Johor Bahru Event Space | TerraSpace" },
      {
        name: "description",
        content: "Transparent hourly rate for the Johor Bahru event space. No hidden fees.",
      },
      { property: "og:title", content: "TerraSpace pricing" },
      {
        property: "og:description",
        content: "One room, one transparent hourly rate — Johor Bahru.",
      },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(workspacesListQueryOptions()),
  component: PricingPage,
});

type PricingRow = {
  id: string;
  item: string;
  detail: string;
  price: string;
};

function formatType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function PricingPage() {
  const { t, locale } = useI18n();
  const { data, isPending } = useWorkspaces();
  const workspaces = data?.data ?? [];

  const rows: PricingRow[] =
    workspaces.length > 0
      ? workspaces.map((w) => ({
          id: w.id,
          item: `${w.name} (${formatType(w.type)})`,
          detail:
            w.amenities.length > 0
              ? w.amenities.map((a) => a.name).join(", ")
              : w.description || "High-speed Wi-Fi, presentation display & smart access",
          price: `${formatMoney(w.pricePerHour)} / hour`,
        }))
      : [
          {
            id: "fallback-event-space",
            item: "Event Space (Event Space)",
            detail: "High-speed Wi-Fi (1 Gbps), 4K Display Screen, Smart Door Access",
            price: `${formatMoney(150000)} / hour`,
          },
        ];

  return (
    <SiteShell>
      <PageHeader
        eyebrow={t("nav.pricing")}
        title={
          locale === "id" ? "Satu Ruang, Satu Tarif Transparan" : "One room, one transparent rate"
        }
        description={
          locale === "id"
            ? "Harga di bawah ini untuk TerraSpace Johor Bahru. Akses digital (QR) disiapkan otomatis setelah pembayaran."
            : "This is the current rate for TerraSpace Johor Bahru. Digital access (QR) is prepared automatically after payment."
        }
      />

      <section className="container-page py-12">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          {isPending ? (
            <div className="divide-y divide-border">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center justify-between p-5">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-72" />
                  </div>
                  <Skeleton className="h-5 w-28" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-5 transition-colors hover:bg-muted/40"
                >
                  <div>
                    <p className="text-sm font-bold text-foreground">{row.item}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                      {row.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] lg:col-span-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">
                {locale === "id" ? "Bagaimana Pemesanan Bekerja" : "How booking works"}
              </h2>
            </div>
            <ol className="mt-4 grid gap-3 text-xs leading-relaxed text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-bold text-foreground">1.</span>
                <span>
                  {locale === "id"
                    ? "Pilih tanggal dan jam yang tersedia untuk ruang pilihan Anda."
                    : "Choose an available date and time for your selected space."}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-foreground">2.</span>
                <span>
                  {locale === "id"
                    ? "Setujui Syarat & Ketentuan, lalu selesaikan pembayaran instan."
                    : "Agree to the Terms & Conditions, then complete payment."}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-foreground">3.</span>
                <span>
                  {locale === "id"
                    ? "Kredensial QR disiapkan otomatis untuk akses masuk venue."
                    : "Your QR credential is prepared automatically for venue access."}
                </span>
              </li>
            </ol>
          </article>

          <article className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <Tag className="size-5 text-primary" />
            <h2 className="mt-3 text-base font-bold text-foreground">
              {locale === "id" ? "Siap Memesan?" : "Ready to book?"}
            </h2>
            <p className="mt-3 text-xs text-muted-foreground">
              {locale === "id"
                ? "Cek ketersediaan ruang dan pesan langsung dengan konfirmasi instan."
                : "Check availability for the space and book directly with instant confirmation."}
            </p>
            <Button
              asChild
              className="bg-galaxy-accent mt-6 w-full gap-1.5 font-semibold text-white"
            >
              <Link to="/workspaces">
                {t("cta.checkAvailability")} <ArrowRight className="size-4" />
              </Link>
            </Button>
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
