import { useState } from "react";
import { ExternalLink, Menu, Sun, Moon } from "lucide-react";
import { ADMIN_NAV_GROUPS, AdminSidebar, type AdminTab } from "./admin-sidebar";

interface AdminShellProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  children: React.ReactNode;
  notifCount?: number;
  themeMode?: "dark" | "light";
  onToggleTheme?: () => void;
}

export function AdminShell({
  activeTab,
  onTabChange,
  children,
  notifCount = 0,
  themeMode = "dark",
  onToggleTheme,
}: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageLabel =
    ADMIN_NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeTab)?.label ?? "Admin";
  const isLight = themeMode === "light";

  return (
    <div data-admin-theme={themeMode} className="min-h-screen bg-[#070b14] text-white flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 border-r border-white/[0.06] bg-[#09101f]/90 backdrop-blur-xl shrink-0 h-screen sticky top-0">
        <AdminSidebar activeTab={activeTab} onTabChange={onTabChange} notifCount={notifCount} />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-60 bg-[#09101f] border-r border-white/[0.08] flex flex-col h-full">
            <AdminSidebar
              activeTab={activeTab}
              onTabChange={onTabChange}
              notifCount={notifCount}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Bar */}
        <header className="h-13 shrink-0 border-b border-white/[0.06] bg-[#09101f]/60 backdrop-blur-xl flex items-center px-4 lg:px-5 gap-3 sticky top-0 z-30">
          <button
            className="lg:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
          <h1 className="text-sm font-bold text-white flex-1">{pageLabel}</h1>
          <div className="flex items-center gap-2">
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                title={isLight ? "Switch to dark mode" : "Switch to light mode"}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-medium text-white/50 hover:text-white transition-all"
              >
                {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isLight ? "Dark" : "Light"}</span>
              </button>
            )}
            <a
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-medium text-white/50 hover:text-white transition-all"
            >
              <ExternalLink className="w-3 h-3" />
              Client Site
            </a>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
