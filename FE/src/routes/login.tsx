import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";
import { SignInForm } from "@/features/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <SiteShell>
      <PageHeader
        title="Welcome back"
        description="Sign in to book a space and manage your access."
      />
      <div className="container-page max-w-sm pb-16">
        <SignInForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          New to TerraSpace?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </SiteShell>
  );
}
