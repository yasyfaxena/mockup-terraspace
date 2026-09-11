import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";
import { requireAuth } from "@/features/auth";
import { meQueryOptions, ProfileForm } from "@/features/users";

export const Route = createFileRoute("/profile")({
  beforeLoad: () => requireAuth(),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(meQueryOptions()),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <SiteShell>
      <PageHeader title="My profile" description="Update your name, phone, and company." />
      <section className="container-page max-w-xl py-8">
        <ProfileForm />
      </section>
    </SiteShell>
  );
}
