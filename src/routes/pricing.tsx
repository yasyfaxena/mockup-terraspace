import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Tag } from "lucide-react";
import { SiteShell, PageHeader } from "@/frontend/site/site-shell";
import { Button } from "@/frontend/ui/button";
import { useI18n } from "@/lib/i18n";
import { usePublicCatalog } from "@/frontend/data/catalog";

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
  component: PricingPage,
});

type Row = { item: string; detail: string; price: string };

function PricingPage() {
  const { t, money, locale } = useI18n();
  const { workspaces } = usePublicCatalog();
  const rows: Row[] = workspaces.map((w) => ({
    item: `${w.name} (${w.type})`,
    detail: w.amenities.join(", "),
    price: `${money(w.price)} / ${w.unit}`,
  }));

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
          {rows.map((row) => (
            <div
              key={row.item}
              className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-muted/40 transition-colors"
            >
              <div>
                <p className="text-sm font-bold text-foreground">{row.item}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p>
              </div>
              <p className="text-sm font-bold text-foreground">{row.price}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-border bg-card p-6 lg:col-span-2 shadow-[var(--shadow-soft)]">
            <h2 className="text-base font-bold text-foreground">
              {locale === "id" ? "Bagaimana Pemesanan Bekerja" : "How booking works"}
            </h2>
            <ol className="mt-4 grid gap-3 text-xs text-muted-foreground leading-relaxed">
              <li className="flex gap-3">
                <span className="font-bold text-foreground">1.</span>
                {locale === "id"
                  ? "Pilih tanggal dan jam yang tersedia untuk Event Space."
                  : "Choose an available date and time for the Event Space."}
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-foreground">2.</span>
                {locale === "id"
                  ? "Setujui Syarat & Ketentuan, lalu selesaikan pembayaran."
                  : "Agree to the Terms & Conditions, then complete payment."}
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-foreground">3.</span>
                {locale === "id"
                  ? "Kredensial QR disiapkan otomatis untuk akses masuk venue."
                  : "Your QR credential is prepared automatically for venue access."}
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
                ? "Cek ketersediaan Event Space dan pesan langsung."
                : "Check availability for the Event Space and book directly."}
            </p>
            <Button asChild className="mt-6 w-full gap-1.5 bg-galaxy-accent font-semibold">
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
