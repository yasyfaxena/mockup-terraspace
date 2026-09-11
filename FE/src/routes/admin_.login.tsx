import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";
import { SignInForm } from "@/features/auth";

// Same sign-in-form.tsx as /login, not a separate implementation —
// role-gating happens after sign-in via requireRole("admin") on the admin
// shell route (features/auth.md §6).
export const Route = createFileRoute("/admin_/login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  return (
    <SiteShell>
      <PageHeader title="Admin sign in" description="Staff and admin access only." />
      <div className="container-page max-w-sm pb-16">
        <SignInForm redirectTo="/admin/dashboard" />
      </div>
    </SiteShell>
  );
}
