import { createFileRoute, Link } from "@tanstack/react-router";
import { Coffee, Lock, PresentationIcon, Volume2, Wifi } from "lucide-react";
import { SiteShell, PageHeader } from "@/frontend/site/site-shell";
import { Button } from "@/frontend/ui/button";
import { usePublicCatalog } from "@/frontend/data/catalog";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/amenities")({
  head: () => ({
    meta: [
      { title: "Amenities at Johor Bahru — TerraSpace" },
      {
        name: "description",
        content:
          "Wi-Fi, PA system, whiteboard, pantry and QR-based smart access at the Johor Bahru event space.",
      },
      { property: "og:title", content: "TerraSpace amenities" },
      {
        property: "og:description",
        content: "What is included with the Johor Bahru event space booking.",
      },
    ],
  }),
  component: AmenitiesPage,
});

function AmenitiesPage() {
  const { t, locale } = useI18n();
  const { amenities, locations } = usePublicCatalog();

  const iconFor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("wifi")) return Wifi;
    if (n.includes("pantry") || n.includes("coffee")) return Coffee;
    if (n.includes("pa") || n.includes("sound")) return Volume2;
    if (n.includes("whiteboard")) return PresentationIcon;
    return Lock;
  };
  const items = amenities.map((a) => ({
    icon: iconFor(a.name),
    name: locale === "id" && a.nameId ? a.nameId : a.name,
    detail:
      a.detail ||
      (locale === "id" ? "Fasilitas tersedia di venue." : "Amenity available at the venue."),
  }));

  return (
    <SiteShell>
      <PageHeader
        eyebrow={t("nav.amenities")}
        title={
          locale === "id" ? "Fasilitas Lengkap & Modern" : "Everything included, nothing to arrange"
        }
        description={
          locale === "id"
            ? "Semua fasilitas dirancang untuk kenyamanan dan produktivitas maksimal pertemuan Anda."
            : "Amenities are part of your booking. Experience seamless digital access and enterprise equipment."
        }
      />

      <section className="container-page py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.name}
              className="hover-glow rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
            >
              <item.icon className="size-6 text-primary" />
              <h2 className="mt-4 text-base font-bold text-foreground">{item.name}</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface py-12">
        <div className="container-page">
          <h2 className="text-h2 font-bold">
            {locale === "id" ? "Fasilitas per Lokasi" : "What each location offers"}
          </h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="p-4 text-left font-bold text-muted-foreground">
                    {t("common.location")}
                  </th>
                  <th className="p-4 text-left font-bold text-muted-foreground">
                    {t("detail.amenities")}
                  </th>
                  <th className="p-4 text-left font-bold text-muted-foreground">
                    {locale === "id" ? "Jam Operasional" : "Hours"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {locations.map((l) => (
                  <tr
                    key={l.slug}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="p-4 font-bold text-foreground">
                      <Link
                        to="/locations/$slug"
                        params={{ slug: l.slug }}
                        className="hover:underline"
                      >
                        {l.name}
                      </Link>
                    </td>
                    <td className="p-4 text-muted-foreground">{l.amenities.join(" · ")}</td>
                    <td className="p-4 text-muted-foreground">
                      {l.hours}
                      {l.access247
                        ? locale === "id"
                          ? " · Akses 24/7"
                          : " · 24/7 for members"
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button asChild size="lg" className="mt-8 bg-galaxy-accent font-semibold">
            <Link to="/workspaces">{t("cta.explore")}</Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
