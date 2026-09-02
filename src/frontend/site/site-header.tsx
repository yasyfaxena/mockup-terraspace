import { Link, useNavigate } from "@tanstack/react-router";
import {
  Briefcase,
  Building2,
  ChevronDown,
  HelpCircle,
  Layers,
  LogOut,
  MapPin,
  Menu,
  Sparkles,
  Tag,
  User,
  Compass,
} from "lucide-react";
import { useState } from "react";
import logoIcon from "@/assets/logo-icon.png";
import { Button } from "@/frontend/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/frontend/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/frontend/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl transition-all">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5 group">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 transition-transform group-hover:scale-105 group-hover:border-primary/40 shadow-sm overflow-hidden">
            <img src={logoIcon} alt="TerraSpace" className="size-6 object-contain" />
          </div>
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-extrabold tracking-tight text-foreground">
              TerraSpace
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Workspaces
            </span>
          </span>
        </Link>

        {/* Desktop Clean Navigation with Dropdowns */}
        <nav className="hidden items-center gap-1 md:flex">
          {/* Home Link */}
          <Link
            to="/"
            activeProps={{ className: "text-primary font-bold bg-primary/10 border-primary/30" }}
            className="rounded-xl border border-transparent px-3 py-2 text-xs font-bold text-muted-foreground transition-all duration-200 hover:text-primary hover:bg-primary/10 hover:border-primary/30 hover:shadow-[0_0_12px_rgba(56,189,248,0.15)]"
          >
            {t("nav.home")}
          </Link>

          {/* Workspaces Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="group flex items-center gap-1.5 rounded-xl border border-transparent px-3 py-2 text-xs font-bold text-muted-foreground transition-all duration-200 hover:text-primary hover:bg-primary/10 hover:border-primary/30 hover:shadow-[0_0_12px_rgba(56,189,248,0.15)] data-[state=open]:text-primary data-[state=open]:bg-primary/10 data-[state=open]:border-primary/30 outline-none cursor-pointer">
              <span>{t("nav.spacesDropdown")}</span>
              <ChevronDown className="size-3.5 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-80 rounded-2xl border border-border/80 bg-card/95 p-2 backdrop-blur-2xl shadow-2xl space-y-1"
            >
              <DropdownMenuItem asChild className="p-0 focus:bg-transparent cursor-pointer">
                <Link
                  to="/workspaces"
                  className="flex items-start gap-3 rounded-xl p-2.5 transition-all hover:bg-primary/10 hover:border-primary/20 border border-transparent focus:bg-primary/10"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Layers className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">{t("nav.workspaces")}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {t("nav.spacesDesc")}
                    </div>
                  </div>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="p-0 focus:bg-transparent cursor-pointer">
                <Link
                  to="/locations"
                  className="flex items-start gap-3 rounded-xl p-2.5 transition-all hover:bg-purple-500/10 hover:border-purple-500/20 border border-transparent focus:bg-purple-500/10"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Building2 className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">{t("nav.locations")}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {t("nav.locationsDesc")}
                    </div>
                  </div>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="p-0 focus:bg-transparent cursor-pointer">
                <Link
                  to="/amenities"
                  className="flex items-start gap-3 rounded-xl p-2.5 transition-all hover:bg-cyan-500/10 hover:border-cyan-500/20 border border-transparent focus:bg-cyan-500/10"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">{t("nav.amenities")}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {t("nav.amenitiesDesc")}
                    </div>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Plans & Pricing Dropdown */}

          {/* Pricing Link */}
          <Link
            to="/pricing"
            activeProps={{
              className: "text-primary font-bold bg-primary/10 border-primary/30",
            }}
            className="rounded-xl border border-transparent px-3 py-2 text-xs font-bold text-muted-foreground transition-all duration-200 hover:text-primary hover:bg-primary/10 hover:border-primary/30 hover:shadow-[0_0_12px_rgba(56,189,248,0.15)]"
          >
            {t("nav.pricing")}
          </Link>
          {/* How It Works Link */}
          <Link
            to="/how-it-works"
            activeProps={{ className: "text-primary font-bold bg-primary/10 border-primary/30" }}
            className="rounded-xl border border-transparent px-3 py-2 text-xs font-bold text-muted-foreground transition-all duration-200 hover:text-primary hover:bg-primary/10 hover:border-primary/30 hover:shadow-[0_0_12px_rgba(56,189,248,0.15)]"
          >
            {t("nav.how")}
          </Link>

          {/* Help Center Link */}
          <Link
            to="/help"
            activeProps={{ className: "text-primary font-bold bg-primary/10 border-primary/30" }}
            className="rounded-xl border border-transparent px-3 py-2 text-xs font-bold text-muted-foreground transition-all duration-200 hover:text-primary hover:bg-primary/10 hover:border-primary/30 hover:shadow-[0_0_12px_rgba(56,189,248,0.15)]"
          >
            {t("nav.help")}
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* User Auth state - FIXED CONTRAST & HOVER */}
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="group flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-[0_0_18px_rgba(56,189,248,0.4)] cursor-pointer outline-none"
                >
                  <User className="size-3.5 transition-colors group-hover:text-primary-foreground" />
                  <span className="font-extrabold tracking-wide transition-colors group-hover:text-primary-foreground">
                    {profile?.full_name?.split(" ")[0] ?? t("cta.dashboard")}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-2xl border-border/80 bg-card/95 p-2 backdrop-blur-2xl shadow-2xl"
              >
                <DropdownMenuLabel className="truncate text-[11px] font-medium text-muted-foreground px-2">
                  {session.user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  asChild
                  className="rounded-xl text-xs font-bold cursor-pointer hover:bg-primary/15 hover:text-primary"
                >
                  <Link to="/dashboard">{t("cta.dashboard")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="rounded-xl text-xs font-bold text-destructive hover:bg-destructive/15 focus:bg-destructive/15 cursor-pointer"
                >
                  <LogOut className="size-3.5 mr-1" /> {t("cta.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/10"
              >
                <Link to="/login">{t("cta.login")}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="text-xs font-bold border-border/80 bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/40"
              >
                <Link to="/signup">{t("cta.signup")}</Link>
              </Button>
            </div>
          )}

          {/* Primary CTA */}
          <Button
            asChild
            size="sm"
            className="hidden sm:inline-flex bg-galaxy-accent font-bold text-xs shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:opacity-90 transition-all hover:scale-[1.02]"
          >
            <Link to="/workspaces">{t("cta.book")}</Link>
          </Button>

          {/* Mobile Sheet Trigger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-xl border-border/80 bg-card/70 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[86vw] max-w-sm rounded-l-3xl border-l border-border/80 bg-card/95 p-5 backdrop-blur-2xl"
            >
              <SheetTitle className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-foreground">
                <img src={logoIcon} alt="" className="size-5" /> TerraSpace
              </SheetTitle>

              <nav className="mt-6 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
                {/* Home Link */}
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
                >
                  <Compass className="size-4" /> {t("nav.home")}
                </Link>

                {/* Section 1 */}
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2 mb-2">
                    Workspaces & Locations
                  </div>
                  <div className="grid gap-1">
                    <Link
                      to="/workspaces"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-foreground/90 transition-colors hover:bg-muted/70"
                    >
                      <Layers className="size-4 text-primary" /> {t("nav.workspaces")}
                    </Link>
                    <Link
                      to="/locations"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-foreground/90 transition-colors hover:bg-muted/70"
                    >
                      <Building2 className="size-4 text-purple-400" /> {t("nav.locations")}
                    </Link>
                    <Link
                      to="/amenities"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-foreground/90 transition-colors hover:bg-muted/70"
                    >
                      <Sparkles className="size-4 text-cyan-400" /> {t("nav.amenities")}
                    </Link>
                  </div>
                </div>

                {/* Section 2 */}
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2 mb-2">
                    Pricing
                  </div>
                  <div className="grid gap-1">
                    <Link
                      to="/pricing"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-foreground/90 transition-colors hover:bg-muted/70"
                    >
                      <Tag className="size-4 text-primary" /> {t("nav.pricing")}
                    </Link>
                    {/* Membership feature disabled — keep code for future re-enable */}
                    {/* Enterprise nav entry hidden from menu — route still reachable directly at /enterprise; keep code for future re-enable */}
                  </div>
                </div>

                {/* Section 3 */}
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2 mb-2">
                    Guides & Support
                  </div>
                  <div className="grid gap-1">
                    <Link
                      to="/how-it-works"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-foreground/90 transition-colors hover:bg-muted/70"
                    >
                      <Compass className="size-4 text-primary" /> {t("nav.how")}
                    </Link>
                    <Link
                      to="/help"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-foreground/90 transition-colors hover:bg-muted/70"
                    >
                      <HelpCircle className="size-4 text-cyan-400" /> {t("nav.help")}
                    </Link>
                  </div>
                </div>

                {/* Mobile Auth actions */}
                <div className="mt-2 grid gap-2">
                  {session ? (
                    <>
                      <Button
                        asChild
                        variant="outline"
                        className="rounded-xl text-xs font-bold"
                        onClick={() => setOpen(false)}
                      >
                        <Link to="/dashboard">{t("cta.dashboard")}</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setOpen(false);
                          void handleSignOut();
                        }}
                      >
                        {t("cta.logout")}
                      </Button>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        asChild
                        variant="outline"
                        className="rounded-xl text-xs font-bold"
                        onClick={() => setOpen(false)}
                      >
                        <Link to="/login">{t("cta.login")}</Link>
                      </Button>
                      <Button
                        asChild
                        variant="secondary"
                        className="rounded-xl text-xs font-bold"
                        onClick={() => setOpen(false)}
                      >
                        <Link to="/signup">{t("cta.signup")}</Link>
                      </Button>
                    </div>
                  )}

                  <Button
                    asChild
                    className="bg-galaxy-accent rounded-xl text-xs font-bold"
                    onClick={() => setOpen(false)}
                  >
                    <Link to="/workspaces">{t("cta.book")}</Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
