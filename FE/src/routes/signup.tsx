import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { SiteShell } from "@/components/layout/site-shell";
import { SignUpForm } from "@/features/auth";
import { useI18n } from "@/shared/i18n";

type SignupSearch = {
  redirect?: string;
};

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>): SignupSearch =>
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {},
  head: () => ({
    meta: [
      { title: "Create your TerraSpace account" },
      {
        name: "description",
        content:
          "Sign up in minutes, then book workspaces and get your QR access pass without visiting a reception desk.",
      },
      { property: "og:title", content: "Sign up — TerraSpace" },
      {
        property: "og:description",
        content: "Fully digital onboarding: register, book, enter with instant credentials.",
      },
    ],
  }),
  component: SignupPage,
});

export function SignupPage() {
  const { t, locale } = useI18n();
  const search = Route.useSearch();

  const benefits = [
    locale === "id" ? "Daftar akun dalam 1 menit" : "Create your account online",
    locale === "id"
      ? "Pilih ruangan dan jam sesuai kebutuhan"
      : "Pick a room and the exact hours you need",
    locale === "id"
      ? "Bayar instan dan aman secara online"
      : "Pay securely with instant verification",
    locale === "id"
      ? "Kredensial QR dan akses pintu langsung aktif"
      : "Get your QR access pass on screen immediately",
  ];

  return (
    <SiteShell>
      <section className="container-page grid gap-12 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        {/* Left column - value props */}
        <div className="max-w-md">
          <p className="text-eyebrow text-primary font-bold">{t("cta.signup")}</p>
          <h1 className="text-h1 mt-2 font-bold text-foreground">
            {locale === "id" ? "Registrasi Akun Digital Mandiri" : "Set up your account online"}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {locale === "id"
              ? "Semua alur terintegrasi secara digital — tanpa perlu antre di meja resepsionis. Segera setelah akun aktif, Anda dapat memesan ruangan per jam dan mendapatkan QR access pass pintar."
              : "Everything happens here — no visit to a reception desk. Once your account is active you can book a room by the hour and get a smart QR access pass instantly."}
          </p>

          <ul className="mt-8 grid gap-3">
            {benefits.map((b) => (
              <li
                key={b}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-xs font-semibold text-foreground shadow-[var(--shadow-soft)]"
              >
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-start gap-3.5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {locale === "id"
                ? "Kredensial akses pintu Anda diterbitkan otomatis saat pemesanan pertama terkonfirmasi, sehingga pintu dapat dibuka begitu Anda tiba di venue."
                : "Your access credential is issued with your first confirmed booking, so entry works seamlessly the moment you arrive."}
            </p>
          </div>
        </div>

        {/* Right column - Sign up card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-lift)]">
          <div className="flex items-center gap-2 mb-6">
            <img src={logoIcon} alt="TerraSpace" className="size-5 object-contain" />
            <span className="text-sm font-bold text-foreground tracking-tight">TerraSpace</span>
          </div>

          <h2 className="text-xl font-bold text-foreground">
            {locale === "id" ? "Buat Akun Baru" : "Create your account"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {locale === "id"
              ? "Daftar gratis untuk mulai memesan ruang rapat dan fasilitas eksekutif."
              : "Sign up in seconds to reserve executive workspaces and smart access."}
          </p>

          <div className="mt-6">
            <SignUpForm redirectTo={search.redirect ?? "/dashboard"} />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {locale === "id" ? "Sudah memiliki akun?" : "Already have an account?"}{" "}
            <Link
              to="/login"
              search={search.redirect ? { redirect: search.redirect } : {}}
              className="font-semibold text-primary hover:underline"
            >
              {locale === "id" ? "Masuk di sini" : "Sign in"}
            </Link>
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
