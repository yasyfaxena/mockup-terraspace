import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Coffee,
  Lock,
  PresentationIcon,
  Volume2,
  Wifi,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AmenityChip, amenitiesListQueryOptions, useAmenities } from "@/features/amenities";
import { locationsListQueryOptions, useLocations } from "@/features/locations";
import { useI18n } from "@/shared/i18n";

export const Route = createFileRoute("/amenities")({
  head: () => ({
    meta: [
      { title: "Amenities at Johor Bahru — TerraSpace" },
      {
        name: "description",
        content:
          "Wi-Fi, PA system, whiteboard, pantry, 4K screens, and QR-based smart access at the Johor Bahru event space.",
      },
      { property: "og:title", content: "TerraSpace amenities" },
      {
        property: "og:description",
        content: "Everything included with the Johor Bahru event space and workspace bookings.",
      },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(amenitiesListQueryOptions()),
      queryClient.ensureQueryData(locationsListQueryOptions()),
    ]),
  component: AmenitiesPage,
});

export function AmenitiesPage() {
  const { t, locale } = useI18n();
  const { data: amenitiesData, isPending: amenitiesPending } = useAmenities();
  const { data: locationsData, isPending: locationsPending } = useLocations();

  const amenities = amenitiesData?.data ?? [];
  const locations = locationsData?.data ?? [];

  const featuredAmenities = [
    {
      icon: Wifi,
      title: locale === "id" ? "Wi-Fi Berkecepatan Tinggi (1 Gbps)" : "High-Speed Wi-Fi (1 Gbps)",
      detail:
        locale === "id"
          ? "Koneksi serat optik simetris berkecepatan gigabit dengan redundansi jaringan ganda."
          : "Symmetric gigabit fiber connectivity with redundant failover for uninterrupted work.",
    },
    {
      icon: PresentationIcon,
      title:
        locale === "id"
          ? "Layar Presentasi 4K & Whiteboard"
          : "4K Presentation Display & Whiteboard",
      detail:
        locale === "id"
          ? "Layar ultra-HD 75 inci dengan input nirkabel (AirPlay/Chromecast/HDMI) dan papan tulis magnetik."
          : "75-inch ultra-HD display with wireless casting, HDMI inputs, and full-length whiteboards.",
    },
    {
      icon: Lock,
      title:
        locale === "id" ? "Akses Digital Mandiri (QR & Geolocation)" : "Smart Digital Door Access",
      detail:
        locale === "id"
          ? "Kredensial akses ganda: QR pass optik dan tombol buka pintu berbasis jarak di ponsel Anda."
          : "Dual digital credentials: high-resolution QR pass and proximity geolocation mobile unlock.",
    },
    {
      icon: Coffee,
      title: locale === "id" ? "Pantry & Kopi Artisan Gratis" : "Artisan Coffee & Gourmet Pantry",
      detail:
        locale === "id"
          ? "Espresso berkualitas kafe, teh pilihan, dan air mineral tak terbatas untuk rombongan Anda."
          : "Freshly roasted espresso, artisanal teas, and chilled filtered water included with every booking.",
    },
    {
      icon: Volume2,
      title:
        locale === "id" ? "Sound System & Mikrofon Nirkabel" : "Acoustic Audio & Wireless Mics",
      detail:
        locale === "id"
          ? "Sistem tata suara jernih dengan mikrofon genggam nirkabel untuk presentasi dan workshop."
          : "Clarity sound reinforcement with dual wireless microphones tuned for workshops and events.",
    },
    {
      icon: Sparkles,
      title:
        locale === "id"
          ? "Furnitur Ergonomis & Suasana Premium"
          : "Ergonomic Layout & Executive Comfort",
      detail:
        locale === "id"
          ? "Kursi ergonomis, meja modular yang dapat diatur ulang, dan tata cahaya ramah mata."
          : "Ergonomic seating, reconfigurable modular tables, and glare-free architectural lighting.",
    },
  ];

  const byCategory = new Map<string, typeof amenities>();
  for (const amenity of amenities) {
    const list = byCategory.get(amenity.category) ?? [];
    list.push(amenity);
    byCategory.set(amenity.category, list);
  }

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

      {/* Featured Amenities Grid */}
      <section className="container-page py-12">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="text-h2 font-bold">
            {locale === "id" ? "Standar Fasilitas Unggulan" : "Included Amenities & Standards"}
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredAmenities.map((item) => (
            <article
              key={item.title}
              className="hover-glow rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Complete Amenity Catalog by Category */}
      {amenities.length > 0 && (
        <section className="border-t border-border bg-card/50 py-12">
          <div className="container-page">
            <h2 className="text-h2 font-bold mb-6">
              {locale === "id" ? "Katalog Fasilitas Lengkap" : "Full Amenity Catalog"}
            </h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[...byCategory.entries()].map(([category, items]) => (
                <div
                  key={category}
                  className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {category}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {items.map((amenity) => (
                      <AmenityChip key={amenity.id} amenity={amenity} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Location Breakdown Table */}
      <section className="border-t border-border bg-surface py-12">
        <div className="container-page">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-h2 font-bold">
                {locale === "id" ? "Fasilitas per Lokasi" : "What each location offers"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {locale === "id"
                  ? "Lihat ketersediaan fasilitas dan jam operasional di setiap cabang TerraSpace."
                  : "Check available amenities and operational hours across TerraSpace venues."}
              </p>
            </div>
            <Button asChild size="sm" className="bg-galaxy-accent font-semibold text-white">
              <Link to="/workspaces">
                {t("cta.explore")} <ArrowRight className="size-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
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
                {locationsPending ? (
                  [0, 1].map((i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="p-4">
                        <Skeleton className="h-4 w-36" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-72" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-28" />
                      </td>
                    </tr>
                  ))
                ) : locations.length > 0 ? (
                  locations.map((l) => (
                    <tr
                      key={l.slug}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4 font-bold text-foreground">
                        <Link
                          to="/locations/$slug"
                          params={{ slug: l.slug }}
                          className="hover:underline hover:text-primary flex items-center gap-1.5"
                        >
                          {l.name}
                        </Link>
                        <span className="block text-[11px] font-normal text-muted-foreground">
                          {l.city}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {l.amenities.length > 0
                          ? l.amenities.map((a) => a.name).join(" · ")
                          : "High-speed Wi-Fi, 4K Screen, Smart Door Access"}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {l.openingHours || "08:00–22:00"}
                        {l.access247 && (
                          <span className="ml-1.5 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {locale === "id" ? "24/7" : "24/7 Member Access"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b border-border">
                    <td className="p-4 font-bold text-foreground">TerraSpace Johor Bahru</td>
                    <td className="p-4 text-muted-foreground">
                      1 Gbps Wi-Fi · 4K Screen · Smart Door Access · Pantry & Coffee
                    </td>
                    <td className="p-4 text-muted-foreground">08:00–22:00 · 24/7 Member Access</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
