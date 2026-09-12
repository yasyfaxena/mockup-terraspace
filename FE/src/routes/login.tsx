import { createFileRoute, Link } from "@tanstack/react-router";
import logoIcon from "@/assets/logo-icon.png";
import { SiteShell } from "@/components/layout/site-shell";
import { SignInForm } from "@/features/auth";

type LoginSearch = {
  redirect?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch =>
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {},
  head: () => ({
    meta: [
      { title: "Log in to your TerraSpace account" },
      {
        name: "description",
        content: "Sign in to manage bookings and workspace access.",
      },
      { property: "og:title", content: "Log in — TerraSpace" },
      { property: "og:description", content: "Access your bookings and workspace access." },
    ],
  }),
  component: LoginPage,
});

export function LoginPage() {
  const search = Route.useSearch();

  return (
    <SiteShell>
      <section className="container-page flex justify-center py-16">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="TerraSpace" className="size-5" />
            <span className="text-sm font-semibold">TerraSpace</span>
          </div>

          <h1 className="text-h1 mt-6">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to book a space and manage your access.
          </p>

          <div className="mt-8">
            <SignInForm redirectTo={search.redirect ?? "/dashboard"} />
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to TerraSpace?{" "}
            <Link
              to="/signup"
              search={search.redirect ? { redirect: search.redirect } : {}}
              className="text-primary hover:underline font-semibold"
            >
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
