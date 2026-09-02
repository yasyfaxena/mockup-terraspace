import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { adminGetNotifications } from "@/backend";

export type AdminNotifKind =
  "created" | "updated" | "deleted" | "new_booking" | "cancellation" | "new_member";

export interface AdminNotif {
  id: string;
  kind: AdminNotifKind;
  title: string;
  subtitle: string;
  timestamp: string;
  read: boolean;
}

const STORAGE_KEY = "terraspace_admin_notifs_v1";
const POLL_MS = 12000;
const MAX_ITEMS = 60;

function loadStored(): AdminNotif[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AdminNotif[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStored(items: AdminNotif[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // storage unavailable — ignore
  }
}

interface Ctx {
  items: AdminNotif[];
  unreadCount: number;
  notify: (input: {
    kind: AdminNotifKind;
    title: string;
    subtitle?: string;
    silent?: boolean;
  }) => void;
  markAllRead: () => void;
}

const NotifContext = createContext<Ctx | null>(null);

export function AdminNotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AdminNotif[]>(() =>
    typeof window === "undefined" ? [] : loadStored(),
  );
  const seenRef = useState(() => new Set<string>(items.map((i) => i.id)))[0];

  const notify = useCallback<Ctx["notify"]>(({ kind, title, subtitle = "", silent }) => {
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry: AdminNotif = {
      id,
      kind,
      title,
      subtitle,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setItems((prev) => {
      const next = [entry, ...prev].slice(0, MAX_ITEMS);
      saveStored(next);
      return next;
    });
    if (!silent) {
      if (kind === "deleted") toast.error(title, { description: subtitle || undefined });
      else toast.success(title, { description: subtitle || undefined });
    }
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      if (prev.every((i) => i.read)) return prev;
      const next = prev.map((i) => ({ ...i, read: true }));
      saveStored(next);
      return next;
    });
  }, []);

  // "Realtime" polling: pick up new bookings/members created anywhere (e.g. by customers on
  // the public site) and surface them as notifications without a manual refresh.
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await adminGetNotifications();
        if (cancelled) return;
        const fresh: AdminNotif[] = [];

        for (const b of data.bookings) {
          const id = `srv-b-${b.id}`;
          if (seenRef.has(id)) continue;
          seenRef.add(id);
          fresh.push({
            id,
            kind: b.status === "cancelled" ? "cancellation" : "new_booking",
            title:
              b.status === "cancelled"
                ? `Booking cancelled — ${b.workspace_name}`
                : `New booking — ${b.workspace_name}`,
            subtitle: `${b.profiles?.full_name ?? "—"} · ${b.reference}`,
            timestamp: b.created_at,
            read: false,
          });
        }
        for (const p of data.profiles) {
          const id = `srv-p-${p.id}`;
          if (seenRef.has(id)) continue;
          seenRef.add(id);
          fresh.push({
            id,
            kind: "new_member",
            title: "New member registered",
            subtitle: p.full_name || "—",
            timestamp: p.created_at,
            read: false,
          });
        }

        if (fresh.length) {
          setItems((prev) => {
            const next = [...fresh, ...prev].slice(0, MAX_ITEMS);
            saveStored(next);
            return next;
          });
        }
      } catch {
        // silent — polling is best-effort
      }
    }

    void poll();
    const interval = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // seenRef is a stable ref-like Set, safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep multiple admin tabs in sync.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setItems(loadStored());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);

  const value = useMemo<Ctx>(
    () => ({ items, unreadCount, notify, markAllRead }),
    [items, unreadCount, notify, markAllRead],
  );

  return <NotifContext.Provider value={value}>{children}</NotifContext.Provider>;
}

export function useAdminNotifications() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error("useAdminNotifications must be used inside AdminNotificationsProvider");
  return ctx;
}

/* -------------------------------------------------------------------------- */
/* Light / dark theme                                                          */
/* -------------------------------------------------------------------------- */

type AdminThemeMode = "dark" | "light";
const THEME_KEY = "terraspace_admin_theme_v1";

interface ThemeCtx {
  mode: AdminThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AdminThemeMode>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(THEME_KEY) as AdminThemeMode) || "dark";
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  const toggle = useCallback(() => setMode((m) => (m === "dark" ? "light" : "dark")), []);

  const value = useMemo<ThemeCtx>(() => ({ mode, toggle }), [mode, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAdminTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAdminTheme must be used inside AdminThemeProvider");
  return ctx;
}
