import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, Building2, CheckCircle2, CreditCard, ShieldCheck, Users } from "lucide-react";
import { SiteShell, PageHeader } from "@/frontend/site/site-shell";
import { Button } from "@/frontend/ui/button";
import { Input } from "@/frontend/ui/input";
import { Label } from "@/frontend/ui/label";
import { Textarea } from "@/frontend/ui/textarea";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/enterprise")({
  head: () => ({
    meta: [
      { title: "Enterprise workspace for distributed teams — TerraSpace" },
      {
        name: "description",
        content:
          "Multi-location workspace with team management, centralised billing, access management and usage analytics. Talk to our sales team.",
      },
      { property: "og:title", content: "TerraSpace for enterprise teams" },
      {
        property: "og:description",
        content: "One agreement, one invoice, and control over who can access which location.",
      },
    ],
  }),
  component: EnterprisePage,
});

function EnterprisePage() {
  const { t, locale } = useI18n();
  const [sent, setSent] = useState(false);

  const features = [
    {
      icon: Building2,
      title: locale === "id" ? "Manajemen Pemesanan Terpusat" : "Centralized booking management",
      copy:
        locale === "id"
          ? "Alokasikan jam pemesanan ruang untuk tim Anda di bawah satu kontrak."
          : "Allocate booking hours for your team under one agreement.",
    },
    {
      icon: Users,
      title: locale === "id" ? "Manajemen Anggota Tim" : "Team management",
      copy:
        locale === "id"
          ? "Tambah atau hapus akses staf, atur kuota kredit pemesanan dengan mudah."
          : "Add and remove people, and set booking allowances with ease.",
    },
    {
      icon: CreditCard,
      title: locale === "id" ? "Faktur Terpusat" : "Centralised billing",
      copy:
        locale === "id"
          ? "Satu invoice bulanan dengan rincian PPN, referensi PO, dan laporan komprehensif."
          : "One monthly invoice with cost centres, PO references and VAT breakdown.",
    },
    {
      icon: ShieldCheck,
      title: locale === "id" ? "Kontrol Akses Digital" : "Access management",
      copy:
        locale === "id"
          ? "Atur zona gedung yang dapat diakses tim dan masa aktif kredensial pintu pintar."
          : "Decide which zones each team can enter and when access should end.",
    },
    {
      icon: BarChart3,
      title: locale === "id" ? "Analitik Penggunaan" : "Usage analytics",
      copy:
        locale === "id"
          ? "Pantau utilisasi ruang rapat dan okupansi kerja secara real-time."
          : "See how much space your teams actually use before you commit to more.",
    },
    {
      icon: CheckCircle2,
      title: locale === "id" ? "Dukungan Khusus" : "Dedicated support",
      copy:
        locale === "id"
          ? "Account manager personal dan onboarding prioritas untuk tim korporat Anda."
          : "A named account manager and onboarding for every new joiner.",
    },
  ];

  return (
    <SiteShell>
      <PageHeader
        eyebrow={t("nav.enterprise")}
        title={
          locale === "id"
            ? "Solusi Ruang Kerja Skala Korporat"
            : "Workspace for teams in more than one city"
        }
        description={
          locale === "id"
            ? "Untuk perusahaan 20 hingga 500 orang yang menginginkan fleksibilitas ruang tanpa terikat sewa properti konvensional."
            : "For companies of 20 to 500 people who want flexible space without signing four separate leases."
        }
      />

      <section className="container-page grid gap-10 py-12 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((f) => (
            <article
              key={f.title}
              className="hover-glow rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
            >
              <f.icon className="size-6 text-primary" />
              <h2 className="mt-4 text-base font-bold text-foreground">{f.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.copy}</p>
            </article>
          ))}
        </div>

        <aside className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-lift)] lg:sticky lg:top-24">
          <h2 className="text-base font-bold text-foreground">
            {locale === "id" ? "Konsultasi Tim Penjualan" : "Talk to Sales"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {locale === "id"
              ? "Sampaikan kebutuhan ruang kerja Anda, tim kami akan merespons dalam 1 hari kerja."
              : "Tell us roughly what you need and we will come back within one business day."}
          </p>

          {sent ? (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
              <CheckCircle2 className="mt-0.5 size-4 text-emerald-400" />
              <div>
                <p className="text-xs font-bold text-foreground">
                  {locale === "id" ? "Permintaan Terkirim" : "Request received"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {locale === "id"
                    ? "Tim enterprise kami akan segera menghubungi email perusahaan Anda."
                    : "Our enterprise team will contact you at the address you provided."}
                </p>
              </div>
            </div>
          ) : (
            <form
              className="mt-5 grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="e-company" className="text-xs font-semibold">
                  {locale === "id" ? "Nama Perusahaan" : "Company"}
                </Label>
                <Input
                  id="e-company"
                  placeholder="Nusantara Digital Tech"
                  required
                  className="text-xs"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="e-name" className="text-xs font-semibold">
                  {locale === "id" ? "Nama Kontak" : "Contact name"}
                </Label>
                <Input id="e-name" placeholder="Rifqi Pratama" required className="text-xs" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="e-email" className="text-xs font-semibold">
                  {locale === "id" ? "Email Kantor" : "Work email"}
                </Label>
                <Input
                  id="e-email"
                  type="email"
                  placeholder="rifqi@company.co.id"
                  required
                  className="text-xs"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="e-size" className="text-xs font-semibold">
                  {locale === "id" ? "Jumlah Anggota Tim" : "Team size"}
                </Label>
                <Input id="e-size" type="number" min={5} defaultValue={25} className="text-xs" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="e-note" className="text-xs font-semibold">
                  {locale === "id" ? "Kebutuhan Khusus" : "What do you need?"}
                </Label>
                <Textarea
                  id="e-note"
                  rows={3}
                  placeholder={
                    locale === "id"
                      ? "Contoh: sewa rutin Event Space di Johor Bahru untuk acara bulanan."
                      : "e.g. recurring bookings of the Event Space in Johor Bahru for monthly events."
                  }
                  className="text-xs"
                />
              </div>
              <Button type="submit" size="lg" className="bg-galaxy-accent font-semibold">
                {locale === "id" ? "Kirim Permintaan" : "Talk to Sales"}
              </Button>
            </form>
          )}
        </aside>
      </section>
    </SiteShell>
  );
}
