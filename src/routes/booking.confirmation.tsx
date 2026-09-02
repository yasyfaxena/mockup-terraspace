import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  KeyRound,
  Lock,
  MapPin,
  QrCode,
  Smartphone,
} from "lucide-react";
import { SiteShell } from "@/frontend/site/site-shell";
import { Button } from "@/frontend/ui/button";
import { usePublicCatalog } from "@/frontend/data/catalog";
import { QrPass } from "@/frontend/site/qr-pass";
import { useI18n } from "@/lib/i18n";
import { APP_CONFIG } from "@/shared/constants";

type ConfirmSearch = {
  workspace?: string;
  date?: string;
  start?: string;
  end?: string;
  method?: string;
  total?: number;
  ref?: string;
};

export const Route = createFileRoute("/booking/confirmation")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): ConfirmSearch => ({
    workspace: typeof search["workspace"] === "string" ? search["workspace"] : undefined,
    date:
      typeof search["date"] === "string" ? search["date"] : new Date().toISOString().slice(0, 10),
    start: typeof search["start"] === "string" ? search["start"] : APP_CONFIG.defaultBookingStart,
    end: typeof search["end"] === "string" ? search["end"] : APP_CONFIG.defaultBookingEnd,
    method:
      typeof search["method"] === "string" ? search["method"] : APP_CONFIG.defaultPaymentMethod,
    ref: typeof search["ref"] === "string" ? search["ref"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Booking confirmed — TerraSpace" },
      {
        name: "description",
        content: "Your workspace booking is confirmed and your access credential is ready.",
      },
      { property: "og:title", content: "Booking confirmed" },
      { property: "og:description", content: "Your access is ready for your booking window." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookingConfirmation,
});

function BookingConfirmation() {
  const search = Route.useSearch();
  const { t, money, locale } = useI18n();
  const { workspaces, locations } = usePublicCatalog();
  const workspace = workspaces.find((item) => item.id === (search.workspace ?? ""));
  const location = workspace
    ? locations.find((item) => item.slug === workspace.locationSlug)
    : undefined;

  if (!workspace || !location) {
    return (
      <SiteShell>
        <div className="container-page py-24 text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      </SiteShell>
    );
  }

  const start = search.start ?? APP_CONFIG.defaultBookingStart;
  const end = search.end ?? APP_CONFIG.defaultBookingEnd;
  const accessFrom = shift(start, -APP_CONFIG.bookingAccessBufferMinutes);
  const accessTo = shift(end, APP_CONFIG.bookingAccessBufferMinutes);
  const date = search.date ?? new Date().toISOString().slice(0, 10);
  const reference = search.ref;
  if (!reference) {
    return (
      <SiteShell>
        <div className="container-page py-24 text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      </SiteShell>
    );
  }
  const accessCode = `TERRASPACE|${reference}|${workspace.id}|${date}|${start}-${end}`;

  const methodLabel: Record<string, string> = {
    card: locale === "id" ? "Kartu Kredit / Debit" : "Credit / debit card",
    ewallet: "E-wallet",
    credits: locale === "id" ? "Kredit Keanggotaan" : "Membership credits",
    bank: locale === "id" ? "Transfer Bank" : "Bank transfer",
  };

  return (
    <SiteShell>
      <section className="container-page py-12">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-6">
            <CheckCircle2 className="size-7 text-success shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-foreground">{t("book.confirmed")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("book.confirmedSub")}</p>
            </div>
          </div>

          <article className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-2">
              <QrCode className="size-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">{t("book.qrTitle")}</h2>
              {workspace.qrProvider === "sattabi-preview" ? (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {locale === "id" ? "Sattabi · Pratinjau" : "Sattabi · Preview"}
                </span>
              ) : null}
            </div>
            <div className="rounded-xl bg-white p-3 shadow-md">
              <QrPass value={accessCode} size={224} />
            </div>
            <p className="font-mono text-xs font-semibold text-primary">{reference}</p>
            <p className="max-w-md text-xs text-muted-foreground">{t("book.qrHint")}</p>
            {workspace.qrProvider === "sattabi-preview" ? (
              <p className="max-w-md text-[11px] text-muted-foreground/80">
                {locale === "id"
                  ? "QR ini adalah pratinjau (belum terhubung ke API Sattabi). Kode QR asli dari Sattabi akan menggantikan ini setelah integrasi API tersedia."
                  : "This QR is a preview (not yet connected to the live Sattabi API). The real Sattabi-issued QR will replace this once the API integration is available."}
              </p>
            ) : null}
          </article>

          <article className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-foreground">{t("dash.viewDetails")}</h2>
              <span className="rounded-md bg-muted px-2.5 py-1 font-mono text-xs font-semibold text-foreground">
                {reference}
              </span>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail
                icon={MapPin}
                label={t("common.location")}
                value={`${location.name}, ${location.city}`}
              />
              <Detail
                icon={BadgeCheck}
                label={t("nav.workspaces")}
                value={`${workspace.name} · ${workspace.floor}`}
              />
              <Detail
                icon={CalendarDays}
                label={t("detail.date")}
                value={formatLong(date, locale)}
              />
              <Detail icon={Clock} label={t("detail.duration")} value={`${start} – ${end}`} />
              <Detail
                icon={CreditCard}
                label={t("dash.method")}
                value={`${money(search.total ?? 0)} · ${methodLabel[search.method ?? "card"] ?? "Card"}`}
              />
            </dl>

            <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
              {workspace.cancellation}
            </p>
          </article>

          <article className="mt-6 rounded-2xl border border-primary/25 bg-primary/5 p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">
                {locale === "id" ? "Akses Pintar Siap Digunakan" : "Your Smart Access is Ready"}
              </h2>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {locale === "id"
                ? `Akses aktif mulai pukul ${accessFrom} hingga ${accessTo}. Anda dapat menggunakan Kode QR atau Tombol Buka Pintu (dengan radius 50m) di halaman Akun Saya.`
                : `Access is valid from ${accessFrom} until ${accessTo}. You can unlock via the QR Pass or the Smart Door Unlock Button (within 50m radius) in My Account.`}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <QrCode className="size-5 text-primary mb-2" />
                <h4 className="text-xs font-bold text-foreground">1. QR Access Pass</h4>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {locale === "id"
                    ? "Tunjukkan kode QR di turnstile atau scanner pintu masuk."
                    : "Scan the QR code at the turnstile or entrance scanner."}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <Lock className="size-5 text-primary mb-2" />
                <h4 className="text-xs font-bold text-foreground">2. Smart Door Unlock Button</h4>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {locale === "id"
                    ? "Buka pintu via tombol di halaman Akun Saya saat berada dalam radius 50m venue."
                    : "Tap the Unlock Door button in My Account when within 50m of the venue."}
                </p>
              </div>
            </div>
          </article>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="bg-galaxy-accent font-semibold">
              <Link to="/dashboard">{t("cta.dashboard")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/workspaces">
                {locale === "id" ? "Pesan Ruang Lain" : "Book another workspace"}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 border-t border-border pt-4">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div>
        <dt className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
      </div>
    </div>
  );
}

function shift(time: string, minutes: number) {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const total = (h * 60 + m + minutes + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatLong(value: string, locale: "en" | "id" = "en") {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
