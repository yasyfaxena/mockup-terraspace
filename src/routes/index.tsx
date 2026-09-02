import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck,
  CreditCard,
  DoorOpen,
  KeyRound,
  Laptop,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";
import heroImage from "@/assets/hero-coworking.jpg";
import { Button } from "@/frontend/ui/button";
import { SiteShell } from "@/frontend/site/site-shell";
import { SearchModule } from "@/frontend/site/search-module";
import { LocationCard } from "@/frontend/site/cards";
import { usePublicCatalog } from "@/frontend/data/catalog";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TerraSpace — Book the Johor Bahru event space" },
      {
        name: "description",
        content:
          "Book the Johor Bahru event space by the hour. Pay and get your access ready before you arrive.",
      },
      { property: "og:title", content: "TerraSpace — Find your workspace" },
      {
        property: "og:description",
        content:
          "Real-time availability, transparent pricing and access that is ready the moment your booking is confirmed.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { t, money, locale } = useI18n();
  const { amenities, locations, workspaces } = usePublicCatalog();
  const workspaceTypes = Array.from(
    new Map(
      workspaces.map((w) => [
        w.type,
        {
          type: w.type,
          what: w.description,
          who: "Teams and event organisers",
          from: w.price,
        },
      ]),
    ).values(),
  );

  const steps = [
    {
      icon: Laptop,
      title: locale === "id" ? "Pilih Ruang" : "Choose Space",
      copy:
        locale === "id"
          ? "Pilih ruangan eksklusif yang sesuai dengan agenda rapat Anda."
          : "Pick a premium workspace that fits your day.",
    },
    {
      icon: CalendarCheck,
      title: locale === "id" ? "Tentukan Jam" : "Select Time",
      copy:
        locale === "id"
          ? "Pilih tanggal, jam mulai dan jam selesai dengan presisi menit."
          : "Select date, start and end time with custom minutes.",
    },
    {
      icon: CreditCard,
      title: locale === "id" ? "Bayar Instan" : "Instant Pay",
      copy:
        locale === "id"
          ? "Bayar via kartu kredit, e-wallet (GoPay, OVO, QRIS) atau transfer."
          : "Pay by card, e-wallet or transfer.",
    },
    {
      icon: KeyRound,
      title: locale === "id" ? "Kredensial Siap" : "Get Access",
      copy:
        locale === "id"
          ? "Kredensial QR dan tombol buka pintu digital aktif otomatis."
          : "Your smart digital pass is prepared as soon as payment clears.",
    },
    {
      icon: DoorOpen,
      title: locale === "id" ? "Buka Pintu" : "Open Doors",
      copy:
        locale === "id"
          ? "Pindai QR atau tekan tombol buka pintu saat di venue."
          : "Scan your QR or tap the door unlock button at the entrance.",
    },
    {
      icon: Sparkles,
      title: locale === "id" ? "Mulai Rapat" : "Start Meeting",
      copy:
        locale === "id"
          ? "Wi-Fi 1 Gbps, monitor 4K, dan minuman telah siap menyambut Anda."
          : "Wi-Fi, 4K screen, and complimentary beverages are ready.",
    },
  ];

  const reasons = [
    {
      title: locale === "id" ? "Jadwal Fleksibel" : "Flexible Scheduling",
      copy:
        locale === "id"
          ? "Input jam dan menit mulai serta selesai langsung tanpa batasan slot kaku."
          : "Enter custom start and end minutes with instant transparent pricing.",
    },
    {
      title: locale === "id" ? "Ketersediaan Real-Time" : "Real-time Availability",
      copy:
        locale === "id"
          ? "Tampilan agenda jam 08:00 – 17:00 menampilkan ketersediaan ruangan terkini."
          : "Google Calendar-style room agenda shows live booked vs available hours.",
    },
    {
      title: locale === "id" ? "Dual Smart Door Access" : "Dual Smart Access",
      copy:
        locale === "id"
          ? "Dua metode akses: Kode QR instan dan tombol buka pintu berbasis radius GPS 50m."
          : "Two access methods: instant QR pass and proximity door unlock button.",
    },
    {
      title: locale === "id" ? "Kredensial Digital" : "Digital Credentials",
      copy:
        locale === "id"
          ? "Akses otomatis aktif 30 menit sebelum jadwal Anda dimulai."
          : "Access automatically activates 30 minutes before your meeting starts.",
    },
  ];

  return (
    <SiteShell>
      {/* Hero + booking search */}
      <section className="relative isolate overflow-hidden border-b border-border">
        <img
          src={heroImage}
          alt="Members working in a TerraSpace coworking lounge"
          width={1920}
          height={1200}
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-[oklch(0.18_0.06_265/0.82)]" />

        <div className="container-page pb-12 pt-20 md:pb-16 md:pt-28">
          <div className="max-w-2xl text-[oklch(0.985_0.006_95)]">
            <p className="text-eyebrow text-cyan-300 font-semibold">TerraSpace · Johor Bahru</p>
            <h1 className="text-display mt-3 font-bold">{t("home.heroTitle")}</h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[oklch(0.92_0.01_95)]">
              {t("home.heroSubtitle")}
            </p>
          </div>

          <SearchModule className="mt-8" />

          <p className="mt-4 text-xs font-medium text-[oklch(0.9_0.01_95)]">{t("home.stats")}</p>
        </div>
      </section>

      {/* Workspace catalog */}
      <section className="section-y">
        <div className="container-page">
          <p className="text-eyebrow">{t("home.typesTitle")}</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-h2 font-bold">{t("home.typesSubtitle")}</h2>
            <Button asChild variant="ghost" className="gap-1.5 font-medium">
              <Link to="/workspaces">
                {t("cta.viewAll")} <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div
            className={
              workspaceTypes.length === 1
                ? "mt-8 grid gap-6 lg:grid-cols-2 lg:items-stretch"
                : "mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            }
          >
            {workspaceTypes.map((tItem) => (
              <article
                key={tItem.type}
                className={
                  "flex flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-[var(--shadow-lift)] hover:border-primary/50" +
                  (workspaceTypes.length === 1 ? " max-w-md" : "")
                }
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">{tItem.type}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tItem.what}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {locale === "id" ? "Cocok untuk: " : "Ideal for: "}
                  </span>
                  {tItem.who}
                </p>
                <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-base font-bold text-foreground">
                    {tItem.from ? `${money(tItem.from)} / ${t("common.hour")}` : "On request"}
                  </span>
                  <Button asChild className="bg-galaxy-accent font-semibold" size="sm">
                    <Link to="/workspaces">{t("cta.explore")}</Link>
                  </Button>
                </div>
              </article>
            ))}

            {workspaceTypes.length === 1 ? (
              <div className="flex flex-col justify-center rounded-2xl border border-dashed border-border bg-surface/60 p-6">
                <p className="text-eyebrow">{locale === "id" ? "Segera Hadir" : "Coming soon"}</p>
                <h3 className="mt-2 text-lg font-bold text-foreground">
                  {locale === "id"
                    ? "Lebih Banyak Tipe Ruang Kerja"
                    : "More workspace types on the way"}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {locale === "id"
                    ? "Kami sedang menambah pilihan ruang meeting, event, dan private office. Lihat katalog lengkap untuk ketersediaan terkini."
                    : "We're adding meeting rooms, event spaces and private offices soon. Check the full catalog for the latest availability."}
                </p>
                <Button asChild variant="outline" className="mt-5 w-fit font-medium">
                  <Link to="/workspaces">
                    {t("cta.viewAll")} <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Featured locations */}
      <section className="section-y border-y border-border bg-surface">
        <div className="container-page">
          <p className="text-eyebrow">{t("nav.locations")}</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-h2 font-bold">
              {locale === "id"
                ? "Lokasi yang Sedang Kami Fokuskan"
                : "Where we're focused right now"}
            </h2>
            <Button asChild variant="outline" className="font-medium">
              <Link to="/locations">
                {locale === "id" ? "Lihat Detail Lokasi" : "View Location"}
              </Link>
            </Button>
          </div>
          <div
            className={
              locations.length === 1
                ? "mt-8 grid gap-6 lg:grid-cols-2 lg:items-stretch"
                : "mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            }
          >
            {locations.map((l) => (
              <div key={l.slug} className={locations.length === 1 ? "max-w-md" : undefined}>
                <LocationCard location={l} />
              </div>
            ))}

            {locations.length === 1 ? (
              <div className="flex flex-col justify-center rounded-2xl border border-dashed border-border bg-surface/60 p-6">
                <p className="text-eyebrow">
                  {locale === "id" ? "Ekspansi Berlanjut" : "Expanding soon"}
                </p>
                <h3 className="mt-2 text-lg font-bold text-foreground">
                  {locale === "id"
                    ? "Kota Berikutnya Segera Menyusul"
                    : "New cities are coming next"}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {locale === "id"
                    ? "Saat ini kami fokus memberikan pengalaman terbaik di Johor Bahru sebelum membuka lokasi baru."
                    : "Right now we're focused on making Johor Bahru great before opening new locations."}
                </p>
                <Button asChild variant="outline" className="mt-5 w-fit font-medium">
                  <Link to="/locations">
                    {locale === "id" ? "Lihat Detail Lokasi" : "View Location"}
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="section-y border-b border-border bg-card">
        <div className="container-page">
          <p className="text-eyebrow">{t("home.featuresTitle")}</p>
          <h2 className="text-h2 mt-2 font-bold">{t("home.featuresSubtitle")}</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {locale === "id"
              ? "Sistem akses pintar kami terhubung langsung dengan pemesanan Anda. Buka pintu menggunakan QR Pass atau tombol akses proximity saat Anda tiba."
              : "Our smart credential system connects directly with your booking. Unlock the entrance and room via instant QR pass or proximity button."}
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((r) => (
              <div key={r.title} className="rounded-xl border border-border bg-surface/60 p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">{r.title}</h3>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{r.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section-y">
        <div className="container-page">
          <p className="text-eyebrow">{t("nav.how")}</p>
          <h2 className="text-h2 mt-2 font-bold">
            {locale === "id"
              ? "Enam Langkah Mudah Menuju Ruang Kerja Anda"
              : "Six Steps from Search to Seat"}
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {steps.map((s, i) => (
              <li key={s.title} className="hover-glow rounded-2xl border border-border bg-card p-5">
                <s.icon className="size-6 text-primary" />
                <p className="mt-4 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  {locale === "id" ? `Langkah ${i + 1}` : `Step ${i + 1}`}
                </p>
                <h3 className="text-sm font-bold text-foreground mt-1">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Amenities */}
      <section className="section-y border-y border-border bg-surface">
        <div className="container-page">
          <p className="text-eyebrow">{t("nav.amenities")}</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-h2 font-bold">
              {locale === "id" ? "Fasilitas Premium Termasuk" : "Included at Every Location"}
            </h2>
            <Button asChild variant="ghost" className="gap-1.5 font-medium">
              <Link to="/amenities">
                {locale === "id" ? "Lihat Semua Fasilitas" : "See all amenities"}{" "}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {amenities.map((a) => (
              <div
                key={a.name}
                className="flex gap-3 rounded-xl border border-border/80 bg-card p-4"
              >
                <Wifi className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">{a.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
