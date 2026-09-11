import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { signInSchema, type SignInInput } from "../auth.schema";

/**
 * `redirectTo` lets `/admin/login` send a successful sign-in to
 * `/admin/dashboard` instead of the customer account page — a non-staff
 * user landing there is still bounced to `/` by that route's own
 * `requireRole("admin")` guard (features/auth.md §6's "redirects if not
 * staff/admin after sign-in"), so this form doesn't need to know the
 * user's role itself, just where to send them first.
 */
export function SignInForm({
  redirectTo = "/dashboard",
}: {
  redirectTo?: "/dashboard" | "/admin/dashboard";
}) {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const onSubmit = async (values: SignInInput) => {
    const { error } = await authClient.signIn.email(values);
    if (error) {
      setError("password", { message: error.message ?? "Invalid email or password." });
      return;
    }
    await navigate({ to: redirectTo });
  };

  const onGoogleSignIn = () => {
    void authClient.signIn.social({ provider: "google", callbackURL: redirectTo });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-xs text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p id="password-error" role="alert" className="text-xs text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
      <Button type="button" variant="outline" className="w-full" onClick={onGoogleSignIn}>
        Continue with Google
      </Button>
    </form>
  );
}
