import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { SiteShell } from "@/frontend/site/site-shell";
import { Button } from "@/frontend/ui/button";
import { Input } from "@/frontend/ui/input";
import { Label } from "@/frontend/ui/label";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { clearPendingBooking, loadPendingBooking } from "@/lib/pending-booking";

type LoginSearch = {
  redirect?: string;
};

export const Route = createFileRoute("/login")({
  ssr: false,
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

function LoginPage() {
  const { signIn, session, resendConfirmation } = useAuth();
  const { t } = useI18n();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const needsConfirmation = error?.toLowerCase().includes("belum dikonfirmasi") ?? false;

  const onResend = async () => {
    setResendBusy(true);
    setResendSent(false);
    const { error: err } = await resendConfirmation(email);
    setResendBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setResendSent(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResendSent(false);
    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    const pending = loadPendingBooking();
    if (pending) {
      clearPendingBooking();
      navigate({ to: "/booking/review", search: pending });
      return;
    }
    if (search.redirect) {
      navigate({ to: search.redirect } as Parameters<typeof navigate>[0]);
      return;
    }
    navigate({ to: "/dashboard" });
  };

  const pending = typeof window !== "undefined" ? loadPendingBooking() : null;

  return (
    <SiteShell>
      <section className="container-page flex justify-center py-16">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="TerraSpace" className="size-5" />
            <span className="text-sm font-semibold">TerraSpace</span>
          </div>

          <h1 className="text-h1 mt-6">{t("auth.loginTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>

          {pending || search.redirect ? (
            <p className="mt-4 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
              {t("auth.loginRequired")}
            </p>
          ) : null}

          <form className="mt-8 grid gap-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="grid gap-1.5">
              <Label htmlFor="l-email">{t("auth.email")}</Label>
              <Input
                id="l-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.co.id"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="l-password">{t("auth.password")}</Label>
              <div className="relative">
                <Input
                  id="l-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                <p className="flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" /> {error}
                </p>
                {needsConfirmation ? (
                  <button
                    type="button"
                    onClick={() => void onResend()}
                    disabled={resendBusy || !email}
                    className="mt-2 text-sm font-medium underline underline-offset-2 disabled:opacity-50"
                  >
                    {resendBusy ? "Mengirim ulang..." : "Kirim ulang email konfirmasi"}
                  </button>
                ) : null}
                {resendSent ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Email konfirmasi baru sudah dikirim ke {email}. Cek juga folder spam.
                  </p>
                ) : null}
              </div>
            ) : null}

            <Button type="submit" size="lg" className="bg-galaxy-accent" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> {t("auth.signingIn")}
                </>
              ) : (
                t("cta.login")
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link
              to="/signup"
              search={search.redirect ? { redirect: search.redirect } : {}}
              className="text-primary hover:underline"
            >
              {t("auth.createAccount")}
            </Link>
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
