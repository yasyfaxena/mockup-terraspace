import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, CreditCard, DoorOpen, KeyRound, Laptop, Sparkles } from "lucide-react";
import { SiteShell, PageHeader } from "@/frontend/site/site-shell";
import { Button } from "@/frontend/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How booking and access work — TerraSpace" },
      {
        name: "description",
        content:
          "Choose, book, pay, get access, enter and work. See how a confirmed booking prepares your access credential and how the access window behaves.",
      },
      { property: "og:title", content: "How TerraSpace booking and access work" },
      {
        property: "og:description",
        content: "From search to seat in six steps, with access prepared automatically.",
      },
    ],
  }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  const { t, locale } = useI18n();

  const steps = [
    {
      icon: Laptop,
      title: locale === "id" ? "Pilih Ruangan" : "Choose",
      copy:
        locale === "id"
          ? "Cari lokasi, tanggal, dan ruang rapat eksekutif. Ketersediaan terhubung live."
          : "Search by location, date, time and workspace type. Availability counts are live.",
    },
    {
      icon: CalendarCheck,
      title: locale === "id" ? "Tentukan Jam & Menit" : "Book Custom Time",
      copy:
        locale === "id"
          ? "Input jam dan menit mulai & selesai sesuai kebutuhan Anda tanpa batasan kaku."
          : "Set custom start and end hours and minutes tailored to your agenda.",
    },
    {
      icon: CreditCard,
      title: locale === "id" ? "Bayar Instan" : "Pay",
      copy:
        locale === "id"
          ? "Gunakan QRIS, Virtual Account, kartu debit/kredit, atau saldo instan."
          : "Use QRIS, Virtual Account, card, or instant bank transfer with instant clearing.",
    },
    {
      icon: KeyRound,
      title: locale === "id" ? "Terima Kredensial Pintar" : "Get Smart Pass",
      copy:
        locale === "id"
          ? "Setelah pembayaran, QR Pass dan tombol akses pintu otomatis aktif di Dashboard."
          : "Once confirmed, your QR Pass and Proximity Door Unlock button are ready.",
    },
    {
      icon: DoorOpen,
      title: locale === "id" ? "Akses Pintu Masuk" : "Enter Instantly",
      copy:
        locale === "id"
          ? "Pindai QR Pass di scanner pintu atau tekan tombol buka pintu pada radius 50m."
          : "Scan your QR pass at the entrance scanner or tap the Door Unlock button nearby.",
    },
    {
      icon: Sparkles,
      title: locale === "id" ? "Mulai Rapat Anda" : "Productive Work",
      copy:
        locale === "id"
          ? "Ruangan siap dengan layar 4K, Wi-Fi 1 Gbps, dan kopi artisan gratis."
          : "Your room is set up, Wi-Fi is connected, and artisan coffee is ready.",
    },
  ];

  const accessStates = [
    {
      state: locale === "id" ? "Menunggu Pembayaran" : "Pending Payment",
      copy:
        locale === "id"
          ? "Pemesanan dibuat namun menunggu proses verifikasi pembayaran."
          : "The booking exists but payment has not completed yet.",
    },
    {
      state: locale === "id" ? "Siap Digunakan" : "Ready / Scheduled",
      copy:
        locale === "id"
          ? "Pembayaran berhasil. Kredensial QR dan tombol buka pintu siap diakses."
          : "Payment confirmed. Your credential is prepared and waiting.",
    },
    {
      state: locale === "id" ? "Akses Aktif" : "Active Window",
      copy:
        locale === "id"
          ? "Anda berada dalam jendela waktu pemesanan (±30 menit) dan dapat masuk."
          : "You are inside the access window and can enter.",
    },
    {
      state: locale === "id" ? "Selesai" : "Completed",
      copy:
        locale === "id"
          ? "Sesi pemesanan telah selesai. Pintu keluar tetap dapat dibuka kapan saja."
          : "The session has concluded. Exits always open from the inside.",
    },
  ];

  return (
    <SiteShell>
      <PageHeader
        eyebrow={t("nav.how")}
        title={
          locale === "id"
            ? "Alur Pemesanan & Akses Mandiri"
            : "From search to seat, without asking anyone"
        }
        description={
          locale === "id"
            ? "Pemesanan dan kredensial akses terintegrasi tanpa perlu menunggu staf resepsionis."
            : "Booking and access are one flow. You never need to email a manager or wait at a reception desk."
        }
      />

      <section className="container-page py-12">
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="hover-glow rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
            >
              <s.icon className="size-6 text-primary" />
              <p className="mt-4 text-xs font-semibold text-primary">
                {locale === "id" ? `Langkah ${i + 1}` : `Step ${i + 1}`}
              </p>
              <h2 className="text-base font-bold text-foreground">{s.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-surface py-12">
        <div className="container-page grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-h2 font-bold">
              {locale === "id" ? "Jendela Akses Digital" : "Your access window"}
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {locale === "id"
                ? "Setiap pemesanan dilengkapi jendela akses pintar yang aktif 30 menit sebelum waktu mulai hingga 30 menit setelah waktu selesai. Anda dapat membuka pintu melalui QR code atau tombol proximity."
                : "Every booking comes with an access window that starts 30 minutes before your booking and ends 30 minutes after. You can unlock via QR pass or proximity button."}
            </p>
            <div className="mt-6 rounded-2xl border border-border bg-card p-5 font-mono text-xs shadow-[var(--shadow-soft)] space-y-1">
              <p className="font-bold text-primary">BOOKING CONFIRMED</p>
              <p className="text-muted-foreground">Workspace: Event Space (Johor Bahru)</p>
              <p className="text-muted-foreground">Date: {new Date().toISOString().slice(0, 10)}</p>
              <p className="text-muted-foreground">Time: 09:00–11:00 (2 hrs)</p>
              <p className="text-muted-foreground">Access: Dual (QR Pass + Geolocation Unlock)</p>
              <p className="text-muted-foreground">Window: 08:30–11:30</p>
            </div>
          </div>

          <div>
            <h2 className="text-h2 font-bold">
              {locale === "id" ? "Status Akses Pemesanan" : "Access states you may see"}
            </h2>
            <div className="mt-5 grid gap-3">
              {accessStates.map((s) => (
                <div
                  key={s.state}
                  className="rounded-xl border border-border bg-card px-5 py-4 shadow-[var(--shadow-soft)]"
                >
                  <p className="text-xs font-bold text-foreground">{s.state}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
          <div>
            <h2 className="text-h2 font-bold">
              {locale === "id" ? "Siap Memulai?" : "Ready to try it?"}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {locale === "id"
                ? "Pesan ruang rapat Anda sekarang dan nikmati fasilitas eksekutif instan."
                : "Book an executive meeting room and enjoy instant smart access."}
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild size="lg" className="bg-galaxy-accent font-semibold">
              <Link to="/workspaces">{t("cta.book")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/signup">{t("cta.signup")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
