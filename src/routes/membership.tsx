import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SiteShell, PageHeader } from "@/frontend/site/site-shell";
import { Button } from "@/frontend/ui/button";
import { usePublicCatalog } from "@/frontend/data/catalog";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "Pricing — Johor Bahru Event Space | TerraSpace" },
      {
        name: "description",
        content:
          "Pay-per-booking pricing for the Johor Bahru event space. No membership or subscription needed.",
      },
      { property: "og:title", content: "TerraSpace — Johor Bahru" },
      {
        property: "og:description",
        content: "Book the event space by the hour, whenever you need it.",
      },
    ],
  }),
  component: MembershipPage,
});

function MembershipPage() {
  const { t, money, locale } = useI18n();
  const { plans } = usePublicCatalog();
  const plan = plans[0];

  if (!plan) {
    return (
      <SiteShell>
        <div className="container-page py-24 text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <PageHeader
        eyebrow={t("nav.membership")}
        title={
          locale === "id"
            ? "Bayar Per Pemesanan, Tanpa Keanggotaan"
            : "Pay per booking, no membership needed"
        }
        description={
          locale === "id"
            ? "Saat ini TerraSpace Johor Bahru fokus pada satu ruang yang bisa langsung dipesan per jam — tidak ada paket bulanan untuk saat ini."
            : "TerraSpace Johor Bahru currently focuses on a single room you can book directly, by the hour — there's no monthly plan for now."
        }
      />

      <section className="container-page py-12">
        <div className="mx-auto max-w-md">
          <article className="hover-glow flex flex-col rounded-2xl border border-primary bg-card p-6 shadow-[var(--shadow-lift)]">
            <span className="mb-3 w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              TerraSpace Johor Bahru
            </span>
            <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {locale === "id"
                ? "Bayar per pemesanan. Tidak perlu keanggotaan atau kontrak bulanan."
                : plan.summary}
            </p>
            <p className="mt-5 text-2xl font-bold text-foreground">
              {money(plan.price)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {locale === "id" ? "/ jam" : plan.period}
              </span>
            </p>
            <ul className="mt-6 grid gap-2.5">
              {plan.benefits.map((b) => (
                <li key={b} className="flex gap-2.5 text-xs text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {b}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6 w-full bg-galaxy-accent font-semibold">
              <Link to="/workspaces">{locale === "id" ? "Pesan Sekarang" : "Book now"}</Link>
            </Button>
          </article>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {locale === "id"
              ? "Butuh paket keanggotaan atau kesepakatan multi-lokasi? Kami akan menambahkannya kembali seiring produk berkembang."
              : "Looking for a membership tier or a multi-location plan? Those will return as the product expands beyond this first booking flow."}
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
