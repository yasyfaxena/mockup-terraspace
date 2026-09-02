import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Mail,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { SiteShell } from "@/frontend/site/site-shell";
import { Button } from "@/frontend/ui/button";
import { Checkbox } from "@/frontend/ui/checkbox";
import { Input } from "@/frontend/ui/input";
import { RadioGroup, RadioGroupItem } from "@/frontend/ui/radio-group";
import { Separator } from "@/frontend/ui/separator";
import { usePublicCatalog } from "@/frontend/data/catalog";
import { createBooking } from "@/backend";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { clearPendingBooking, savePendingBooking } from "@/lib/pending-booking";
import { APP_CONFIG } from "@/shared/constants";

type ReviewSearch = {
  workspace?: string;
  date?: string;
  start?: string;
  end?: string;
};

export const Route = createFileRoute("/booking/review")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): ReviewSearch => ({
    workspace: typeof search["workspace"] === "string" ? search["workspace"] : undefined,
    date:
      typeof search["date"] === "string" ? search["date"] : new Date().toISOString().slice(0, 10),
    start: typeof search["start"] === "string" ? search["start"] : APP_CONFIG.defaultBookingStart,
    end: typeof search["end"] === "string" ? search["end"] : APP_CONFIG.defaultBookingEnd,
  }),
  head: () => ({
    meta: [
      { title: "Review your booking — TerraSpace" },
      {
        name: "description",
        content:
          "Check your workspace, date, time, guests and price breakdown, then pay by card, e-wallet or transfer.",
      },
      { property: "og:title", content: "Review your booking" },
      { property: "og:description", content: "Confirm the details and pay securely." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookingReview,
});

function BookingReview() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { money, t, formatDuration, locale } = useI18n();
  const { workspaces: catalogWorkspaces, locations: catalogLocations } = usePublicCatalog();
  const workspace = catalogWorkspaces.find((w) => w.id === (search.workspace ?? ""));
  const location = workspace
    ? catalogLocations.find((item) => item.slug === workspace.locationSlug)
    : undefined;

  const date = search.date ?? new Date().toISOString().slice(0, 10);
  const start = search.start ?? APP_CONFIG.defaultBookingStart;
  const end = search.end ?? APP_CONFIG.defaultBookingEnd;

  const [guestInput, setGuestInput] = useState("");
  const [guestError, setGuestError] = useState("");
  const [guests, setGuests] = useState<string[]>([]);
  const [promo, setPromo] = useState("");
  const [promoState, setPromoState] = useState<"idle" | "applied" | "invalid">("idle");
  const [method, setMethod] = useState("card");
  const [status, setStatus] = useState<"draft" | "processing" | "failed">("draft");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const totalMinutes = useMemo(() => {
    const [sh = 0, sm = 0] = start.split(":").map(Number);
    const [eh = 0, em = 0] = end.split(":").map(Number);
    return Math.max(30, eh * 60 + em - (sh * 60 + sm));
  }, [start, end]);

  const durationHours = Math.max(0.5, totalMinutes / 60);
  const subtotal = Math.round((workspace?.price ?? 0) * durationHours);
  const discount = promoState === "applied" ? Math.round(subtotal * 0.1) : 0;
  const tax = Math.round((subtotal - discount) * 0.11);
  const total = subtotal - discount + tax;

  useEffect(() => {
    if (loading) return;
    if (!session) {
      if (workspace) {
        savePendingBooking({ workspace: workspace.id, date, start, end });
      }
      navigate({ to: "/login", replace: true });
    }
  }, [loading, session, navigate, workspace, date, start, end]);

  if (!workspace || !location) {
    return (
      <SiteShell>
        <div className="container-page py-24 text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      </SiteShell>
    );
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const maxGuests = APP_CONFIG.maxGuestsPerBooking;

  const addGuest = () => {
    const value = guestInput.trim();
    if (!value) return;
    if (guests.length >= maxGuests) {
      setGuestError(
        locale === "id"
          ? `Maksimal ${maxGuests} tamu untuk pemesanan ini.`
          : `You can add up to ${maxGuests} guest${maxGuests === 1 ? "" : "s"} for this booking.`,
      );
      return;
    }
    if (!emailPattern.test(value)) {
      setGuestError(
        locale === "id" ? "Masukkan alamat email yang valid." : "Enter a valid email address.",
      );
      return;
    }
    if (guests.includes(value)) {
      setGuestError(
        locale === "id" ? "Tamu ini sudah ditambahkan." : "This guest is already added.",
      );
      return;
    }
    setGuests((prev) => [...prev, value]);
    setGuestInput("");
    setGuestError("");
  };

  const removeGuest = (email: string) => {
    setGuests((prev) => prev.filter((g) => g !== email));
  };

  const submit = async () => {
    if (!session) return;
    if (!agreedToTerms) return;
    setStatus("processing");
    if (method === "bank") {
      window.setTimeout(() => setStatus("failed"), 900);
      return;
    }
    try {
      const booking = await createBooking({
        data: {
          workspaceId: workspace.id,
          date,
          start,
          end,
          total,
          method,
          guests,
        },
      });
      clearPendingBooking();
      navigate({
        to: "/booking/confirmation",
        search: {
          workspace: workspace.id,
          date,
          start,
          end,
          method,
          total: booking.total_amount,
          ref: booking.reference,
        },
      });
    } catch {
      setStatus("failed");
    }
  };

  const paymentOptions = [
    // Membership feature disabled — "credits" payment option hidden until membership is re-enabled.
    // {
    //   id: "credits",
    //   label: locale === "id" ? "Kredit Keanggotaan" : "Membership credits",
    //   hint:
    //     locale === "id" ? "Tersedia 6 kredit ruang pertemuan" : "You have 6 meeting room credits",
    // },
    {
      id: "card",
      label: locale === "id" ? "Kartu Kredit / Debit" : "Credit / debit card",
      hint: "Visa, Mastercard, JCB, QRIS",
    },
    {
      id: "ewallet",
      label: "E-Wallet",
      hint: "GoPay, OVO, DANA, ShopeePay",
    },
    {
      id: "bank",
      label:
        locale === "id" ? "Transfer Bank / Virtual Account" : "Bank transfer / virtual account",
      hint: "BCA, Mandiri, BNI, BRI",
    },
  ];

  return (
    <SiteShell>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-8">
          <h1 className="text-h1 mt-2">{t("book.review")}</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {locale === "id"
              ? "Periksa rincian pemesanan Anda di bawah ini. Akses digital disiapkan setelah konfirmasi."
              : "Check the details below. Your digital smart access is prepared as soon as payment is confirmed."}
          </p>
        </div>
      </section>

      <section className="container-page grid gap-8 py-10 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="grid gap-6">
          <article className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-base font-bold text-foreground">{t("dash.viewDetails")}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail
                icon={Building2}
                label={t("common.location")}
                value={`${location.name}, ${location.city}`}
              />
              <Detail
                icon={Building2}
                label={t("nav.workspaces")}
                value={`${workspace.name} · ${workspace.floor}`}
              />
              <Detail
                icon={CalendarDays}
                label={t("detail.date")}
                value={formatDate(date, locale)}
              />
              <Detail
                icon={Clock}
                label={t("detail.duration")}
                value={`${start} – ${end} (${formatDuration(totalMinutes)})`}
              />
              <Detail
                icon={Clock}
                label={t("detail.cancellation")}
                value={workspace.cancellation}
              />
            </div>
          </article>

          {!workspace.simpleBooking ? (
            <article className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-foreground">{t("book.addGuest")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t("book.addGuestHint")}</p>
                </div>
                <span className="shrink-0 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  {guests.length}/{maxGuests} {locale === "id" ? "slot" : "slots"}
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="rekan@perusahaan.com"
                  value={guestInput}
                  disabled={guests.length >= maxGuests}
                  onChange={(e) => {
                    setGuestInput(e.target.value);
                    if (guestError) setGuestError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addGuest();
                    }
                  }}
                  className="h-10 text-xs"
                />
                <Button
                  variant="outline"
                  type="button"
                  disabled={guests.length >= maxGuests}
                  className="h-10 shrink-0 gap-1.5 text-xs"
                  onClick={addGuest}
                >
                  <UserPlus className="size-3.5" />
                  {t("book.addGuest")}
                </Button>
              </div>
              {guestError ? (
                <p className="mt-2 text-xs font-medium text-destructive">{guestError}</p>
              ) : null}

              {guests.length > 0 ? (
                <ul className="mt-4 grid gap-2">
                  {guests.map((email) => (
                    <li
                      key={email}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground">
                        <Mail className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate">{email}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeGuest(email)}
                        className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={locale === "id" ? `Hapus ${email}` : `Remove ${email}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ) : null}

          <article className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-base font-bold text-foreground">{t("book.paymentMethod")}</h2>
            <RadioGroup value={method} onValueChange={setMethod} className="mt-4 grid gap-3">
              {paymentOptions.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                    method === m.id
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border hover:bg-muted/60"
                  }`}
                >
                  <RadioGroupItem value={m.id} id={m.id} />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{m.label}</span>
                    <span className="block text-xs text-muted-foreground">{m.hint}</span>
                  </span>
                  {m.id === "credits" ? (
                    <Wallet className="size-5 text-primary" />
                  ) : (
                    <CreditCard className="size-5 text-primary" />
                  )}
                </label>
              ))}
            </RadioGroup>

            {status === "failed" ? (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                <AlertCircle className="mt-0.5 size-4 text-destructive" />
                <div>
                  <p className="text-sm font-semibold text-destructive">
                    {locale === "id" ? "Pembayaran belum berhasil" : "Payment failed"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {locale === "id"
                      ? "Virtual account gagal dibuat. Silakan coba metode pembayaran kartu atau e-wallet."
                      : "The virtual account could not be created. Please try credit card or e-wallet."}
                  </p>
                </div>
              </div>
            ) : null}
          </article>
        </div>

        <aside className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-lift)] lg:sticky lg:top-24">
          <h2 className="text-base font-bold text-foreground">
            {locale === "id" ? "Ringkasan Pembayaran" : "Price Summary"}
          </h2>

          <dl className="mt-5 space-y-2.5 text-sm">
            <Row
              label={`${workspace.name} (${formatDuration(totalMinutes)})`}
              value={money(subtotal)}
            />
            <Row label={t("book.discount")} value={discount ? `− ${money(discount)}` : "—"} />
            <Row label={t("book.tax")} value={money(tax)} />
          </dl>

          <div className="mt-4 flex gap-2">
            <Input
              placeholder={locale === "id" ? "Kode promo" : "Promo code"}
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              className="h-9 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() =>
                setPromoState(promo.trim().toUpperCase() === "WORK10" ? "applied" : "invalid")
              }
            >
              {locale === "id" ? "Gunakan" : "Apply"}
            </Button>
          </div>
          {promoState === "applied" ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-success font-medium">
              <CheckCircle2 className="size-3.5" /> WORK10 — 10% discount applied!
            </p>
          ) : promoState === "invalid" ? (
            <p className="mt-2 text-xs text-destructive">
              {locale === "id"
                ? "Kode tidak valid. Coba WORK10."
                : "Invalid promo code. Try WORK10."}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {locale === "id"
                ? "Gunakan kode WORK10 untuk diskon 10%."
                : "Use code WORK10 for 10% discount."}
            </p>
          )}

          <Separator className="my-5" />

          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">{t("book.total")}</span>
            <span className="text-2xl font-bold text-foreground">{money(total)}</span>
          </div>

          <label className="mt-6 flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3.5 text-xs text-muted-foreground cursor-pointer">
            <Checkbox
              checked={agreedToTerms}
              onCheckedChange={(v) => setAgreedToTerms(v === true)}
              className="mt-0.5"
            />
            <span>
              {locale === "id"
                ? "Saya telah membaca dan menyetujui "
                : "I have read and agree to the "}
              <Link
                to="/terms"
                target="_blank"
                className="font-semibold text-primary underline underline-offset-2"
              >
                {locale === "id" ? "Syarat & Ketentuan" : "Terms & Conditions"}
              </Link>
              {locale === "id"
                ? ", termasuk kebijakan ganti rugi untuk barang yang rusak, patah, atau hilang."
                : ", including the policy on charges for damaged, broken, or lost items."}
            </span>
          </label>

          <Button
            size="lg"
            className="mt-3 w-full bg-galaxy-accent font-semibold"
            onClick={() => void submit()}
            disabled={status === "processing" || !agreedToTerms}
          >
            {status === "processing" ? (
              <>
                <Loader2 className="size-4 animate-spin" /> {t("book.processing")}
              </>
            ) : !agreedToTerms ? (
              locale === "id" ? (
                "Setujui Syarat & Ketentuan untuk melanjutkan"
              ) : (
                "Agree to Terms to continue"
              )
            ) : (
              t("book.pay")
            )}
          </Button>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {workspace.cancellation}
          </p>

          <div className="mt-5 rounded-xl bg-surface p-4 text-xs">
            <p className="font-semibold text-foreground">{t("detail.accessInfo")}</p>
            <p className="mt-1 text-muted-foreground">{t("detail.accessDesc")}</p>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
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
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function formatDate(value: string, locale: "en" | "id" = "en") {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
