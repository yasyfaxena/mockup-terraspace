import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { SiteShell, PageHeader } from "@/frontend/site/site-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/frontend/ui/accordion";
import { Button } from "@/frontend/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — bookings, payments and access | TerraSpace" },
      {
        name: "description",
        content:
          "Answers about booking changes, cancellations, payments, guest passes and how workspace access works.",
      },
      { property: "og:title", content: "TerraSpace Help Center" },
      {
        property: "og:description",
        content: "Common questions about bookings, payments and access, plus how to reach us.",
      },
    ],
  }),
  component: HelpPage,
});

const faqsEn = [
  {
    q: "How do I change or cancel a booking?",
    a: "Open the booking history from your dashboard and choose details. Meeting rooms can be modified up to 4 hours prior to the start time.",
  },
  {
    q: "When does my door access start and stop working?",
    a: "Access begins 30 minutes before your booked start time and remains valid for 30 minutes after your end time. Doors always open freely from the inside.",
  },
  {
    q: "Which access methods are supported?",
    a: "We provide dual digital access: a high-resolution QR Code pass for optical scanners and an interactive Proximity Door Unlock button enabled when within 50 meters of the venue.",
  },
  {
    q: "Can I bring guests or team members?",
    a: "Yes — the Event Space is an open floor booked as a whole room, not by headcount. Your QR pass covers access for your entire group.",
  },
  {
    q: "What payment methods are supported?",
    a: "We support instant QRIS, Virtual Account (BCA, Mandiri, BNI, BRI), Credit/Debit Card (Visa, Mastercard), and digital wallets with instant confirmation.",
  },
];

const faqsId = [
  {
    q: "Bagaimana cara mengubah atau membatalkan pemesanan?",
    a: "Buka riwayat pemesanan di Dashboard Anda. Ruang rapat dapat diubah jadwalnya hingga 4 jam sebelum waktu mulai sesi.",
  },
  {
    q: "Kapan akses pintu mulai dan selesai berlaku?",
    a: "Kredensial akses aktif 30 menit sebelum jam mulai dan berlaku hingga 30 menit setelah jam selesai. Pintu keluar selalu dapat dibuka dari dalam tanpa terkunci.",
  },
  {
    q: "Metode akses pintu apa saja yang tersedia?",
    a: "Tersedia 2 metode akses digital mandiri: QR Code Pass untuk scanner optik di pintu dan tombol Buka Pintu Berbasis Jarak (Proximity Geolocation) saat Anda berada dalam radius ≤ 50 meter dari venue.",
  },
  {
    q: "Apakah saya bisa membawa tim atau tamu?",
    a: "Bisa — Event Space adalah ruang terbuka yang dipesan sebagai satu ruangan penuh, bukan berdasarkan jumlah orang. QR pass Anda berlaku untuk seluruh rombongan Anda.",
  },
  {
    q: "Metode pembayaran apa saja yang diterima?",
    a: "Kami menerima QRIS instan, Virtual Account (BCA, Mandiri, BNI, BRI), Kartu Kredit/Debit, dan e-wallet dengan verifikasi instan.",
  },
];

function HelpPage() {
  const { t, locale } = useI18n();
  const currentFaqs = locale === "id" ? faqsId : faqsEn;

  return (
    <SiteShell>
      <PageHeader
        eyebrow={t("nav.help")}
        title={locale === "id" ? "Pusat Bantuan & Pertanyaan" : "How can we help?"}
        description={
          locale === "id"
            ? "Temukan jawaban lengkap seputar pemesanan ruang, pembayaran, dan akses pintu mandiri pintar."
            : "Answers about booking changes, payments, guest passes and smart door access."
        }
      />

      <section className="container-page grid gap-10 py-12 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div>
          <h2 className="text-h2 font-bold">
            {locale === "id" ? "Pertanyaan yang Sering Diajukan" : "Frequently asked questions"}
          </h2>
          <Accordion type="single" collapsible className="mt-5">
            {currentFaqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left text-sm font-semibold">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <aside className="grid gap-6 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-base font-bold text-foreground">
              {locale === "id" ? "Hubungi Kami" : "Contact us"}
            </h2>
            <ul className="mt-4 grid gap-3 text-xs text-muted-foreground">
              <li className="flex items-center gap-2.5">
                <MessageSquare className="size-4 text-primary" />{" "}
                {locale === "id" ? "Live Chat, 08:00–20:00 WIB" : "Live chat, 08:00–20:00 WIB"}
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 text-primary" /> support@terraspace.com
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 text-primary" /> +62 21 5000 8800
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-base font-bold text-foreground">
              {locale === "id" ? "Navigasi Cepat" : "Quick links"}
            </h2>
            <div className="mt-4 grid gap-2">
              <Button asChild variant="outline" className="justify-start text-xs font-semibold">
                <Link to="/workspaces">{t("cta.book")}</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start text-xs font-semibold">
                <Link to="/pricing">{t("nav.pricing")}</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start text-xs font-semibold">
                <Link to="/how-it-works">{t("nav.how")}</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start text-xs font-semibold">
                <Link to="/dashboard">{t("cta.dashboard")}</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-base font-bold text-foreground">
              {locale === "id" ? "Legal" : "Legal"}
            </h2>
            <div className="mt-4 grid gap-2">
              <Button asChild variant="outline" className="justify-start text-xs font-semibold">
                <Link to="/terms">
                  {locale === "id" ? "Syarat & Ketentuan" : "Terms of Service"}
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start text-xs font-semibold">
                <Link to="/privacy">
                  {locale === "id" ? "Kebijakan Privasi" : "Privacy Policy"}
                </Link>
              </Button>
            </div>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}
