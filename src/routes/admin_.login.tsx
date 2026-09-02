import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import logoIcon from "@/assets/logo-icon.png";

export const Route = createFileRoute("/admin_/login")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Admin Login — TerraSpace" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const { signIn, session, profile, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in as an admin — skip straight to the panel.
  useEffect(() => {
    if (!loading && session && isAdmin) {
      navigate({ to: "/admin", replace: true });
    }
  }, [loading, session, isAdmin, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error: err } = await signIn(email, password);

    if (err) {
      setBusy(false);
      setError(err);
      return;
    }

    // AuthProvider now loads the profile itself. Do not issue another
    // profile request here; that race was causing the admin page to hang.
    setBusy(false);
  };

  // Signed in but not an admin — show a clear message instead of a form.
  if (!loading && session && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0d1224] p-6 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm font-semibold text-white">
            Signed in as {profile?.full_name ?? "user"}, but this account isn't an admin.
          </p>
          <button
            onClick={() => void signOut()}
            className="w-full py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm font-semibold text-white hover:bg-white/[0.1] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
            <img src={logoIcon} alt="TerraSpace" className="w-6 h-6 object-contain" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white leading-none">TerraSpace</p>
            <p className="text-[9px] text-white/35 font-medium uppercase tracking-widest leading-none mt-0.5">
              Admin Panel
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-[#818cf8]" />
            <h1 className="text-base font-bold text-white">Admin sign in</h1>
          </div>
          <p className="text-xs text-white/35 mb-6">
            Staff & admin access only. Not a coworking member? Use the regular site login instead.
          </p>

          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@terraspace.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#6366f1]/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#6366f1]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3.5 py-2.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#0ea5e9] text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
