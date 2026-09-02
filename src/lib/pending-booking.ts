export type PendingBooking = {
  workspace: string;
  date: string;
  start: string;
  end: string;
};

const KEY = "terraspace-pending-booking";

export function savePendingBooking(booking: PendingBooking) {
  window.sessionStorage.setItem(KEY, JSON.stringify(booking));
}

export function loadPendingBooking(): PendingBooking | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingBooking;
  } catch {
    return null;
  }
}

export function clearPendingBooking() {
  window.sessionStorage.removeItem(KEY);
}
