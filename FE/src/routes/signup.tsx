import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";
import { SignUpForm } from "@/features/auth";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  return (
    <SiteShell>
      <PageHeader title="Create your account" description="Book a space in minutes." />
      <div className="container-page max-w-sm pb-16">
        <SignUpForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </SiteShell>
  );
}
