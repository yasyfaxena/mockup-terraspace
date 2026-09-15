import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UserCircle } from "lucide-react";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/features/auth";
import { meQueryOptions, ProfileForm } from "@/features/users";
import { useI18n } from "@/shared/i18n";

export const Route = createFileRoute("/profile")({
  beforeLoad: ({ location }) => requireAuth(location),
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(meQueryOptions()).catch(() => null),
  head: () => ({
    meta: [
      { title: "My Profile — TerraSpace" },
      { name: "description", content: "Manage your TerraSpace account details and contact info." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProfilePage,
});

export function ProfilePage() {
  const { t, locale } = useI18n();

  return (
    <SiteShell>
      <PageHeader
        eyebrow={t("dash.title")}
        title={locale === "id" ? "Profil Saya" : "My Profile"}
        description={
          locale === "id"
            ? "Perbarui informasi kontak, nama lengkap, dan data perusahaan akun Anda."
            : "Update your name, phone number, and organization details."
        }
      >
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
            <Link to="/dashboard">
              <ArrowLeft className="size-3.5" />
              {t("dash.bookings")}
            </Link>
          </Button>
        </div>
      </PageHeader>

      <section className="container-page max-w-2xl py-12">
        <div className="flex items-center gap-2 mb-6">
          <UserCircle className="size-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">
            {locale === "id" ? "Pengaturan Akun" : "Account Settings"}
          </h2>
        </div>
        <ProfileForm />
      </section>
    </SiteShell>
  );
}
