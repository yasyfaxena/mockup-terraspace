import { Link } from "@tanstack/react-router";
import logoIcon from "@/src/assets/logo-icon.png";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { locale, t } = useI18n();

  const columns = [
    {
      title: locale === "id" ? "Ruang Kerja" : "Workspaces",
      links: [
        { label: t("nav.locations"), to: "/locations" },
        { label: t("nav.workspaces"), to: "/workspaces" },
        { label: t("nav.amenities"), to: "/amenities" },
        { label: t("nav.how"), to: "/how-it-works" },
      ],
    },
    {
      title: locale === "id" ? "Paket & Harga" : "Plans & Pricing",
      links: [
        { label: t("nav.pricing"), to: "/pricing" },
        // Enterprise link hidden from footer — route still reachable directly at /enterprise; keep code for future re-enable
        { label: t("cta.signup"), to: "/signup" },
      ],
    },
    {
      title: locale === "id" ? "Bantuan" : "Support",
      links: [
        { label: t("nav.help"), to: "/help" },
        { label: locale === "id" ? "Masuk" : "Log in", to: "/login" },
        { label: locale === "id" ? "Daftar Akun" : "Sign up", to: "/signup" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="TerraSpace" className="size-5 object-contain" />
            <span className="font-bold tracking-tight text-foreground">TerraSpace</span>
          </div>
          <p className="mt-3 max-w-xs text-xs text-muted-foreground leading-relaxed">
            {locale === "id"
              ? "Pesan ruang rapat dan ruang kerja eksklusif dalam hitungan menit. Kredensial pintar disiapkan bersamaan dengan pemesanan Anda."
              : "Book executive meeting rooms and collaborative spaces in minutes. Your smart credentials are ready the moment you book."}
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {col.title}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-3 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TerraSpace. Johor Bahru.</p>
          <div className="flex gap-5 text-xs">
            <Link to="/privacy" className="hover:text-foreground">
              {locale === "id" ? "Kebijakan Privasi" : "Privacy"}
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              {locale === "id" ? "Syarat & Ketentuan" : "Terms"}
            </Link>
            <span className="hover:text-foreground cursor-pointer">Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
