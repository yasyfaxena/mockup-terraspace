import { useEffect, useState } from "react";
import {
  Building2,
  CalendarClock,
  CreditCard,
  Bell as BellIcon,
  Save,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { adminGetSettings, adminUpdateSettings } from "@/backend";
import { useAdminNotifications } from "@/lib/admin-notifications";

interface Settings {
  company_name: string;
  support_email: string | null;
  currency: string;
  tax_percent: number;
  cancellation_window_hours: number;
  advance_booking_days: number;
  email_notifications_enabled: boolean;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/[0.05] last:border-0 gap-4">
      <div>
        <p className="text-sm text-white">{label}</p>
        {hint && <p className="text-xs text-white/30 mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.FC<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-[#818cf8]" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

const inputCls =
  "px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white text-right focus:outline-none focus:border-[#6366f1]/50 transition-all w-40";

export function AdminSettings() {
  const { locale } = useI18n();
  const isId = locale === "id";
  const { notify } = useAdminNotifications();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await adminGetSettings();
      if (data) setSettings(data as Settings);
      setLoading(false);
    }
    void load();
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    await adminUpdateSettings({ data: settings });
    setSaving(false);
    {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    notify({ kind: "updated", title: isId ? "Pengaturan disimpan" : "Settings saved" });
  }

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  if (loading || !settings) {
    return (
      <div className="py-20 text-center text-white/25 text-sm flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        {isId ? "Memuat pengaturan…" : "Loading settings…"}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Section icon={Building2} title={isId ? "Umum" : "General"}>
        <Field label={isId ? "Nama Perusahaan" : "Company Name"}>
          <input
            className={inputCls}
            value={settings.company_name}
            onChange={(e) => set("company_name", e.target.value)}
          />
        </Field>
        <Field label={isId ? "Email Dukungan" : "Support Email"}>
          <input
            className={inputCls}
            value={settings.support_email ?? ""}
            onChange={(e) => set("support_email", e.target.value)}
            placeholder="support@terraspace.com"
          />
        </Field>
      </Section>

      <Section icon={CalendarClock} title={isId ? "Aturan Booking" : "Booking Rules"}>
        <Field
          label={isId ? "Jendela Pembatalan" : "Cancellation Window"}
          hint={
            isId
              ? "Jam sebelum booking, batas boleh batal"
              : "Hours before start time cancellation is allowed"
          }
        >
          <input
            type="number"
            className={inputCls}
            value={settings.cancellation_window_hours}
            onChange={(e) => set("cancellation_window_hours", Number(e.target.value))}
          />
        </Field>
        <Field
          label={isId ? "Batas Booking di Muka" : "Advance Booking Window"}
          hint={
            isId ? "Berapa hari ke depan boleh booking" : "How many days ahead members can book"
          }
        >
          <input
            type="number"
            className={inputCls}
            value={settings.advance_booking_days}
            onChange={(e) => set("advance_booking_days", Number(e.target.value))}
          />
        </Field>
      </Section>

      <Section icon={CreditCard} title={isId ? "Pembayaran" : "Payments"}>
        <Field label={isId ? "Mata Uang" : "Currency"}>
          <select
            className={inputCls}
            value="USD"
            disabled
            onChange={(e) => set("currency", e.target.value)}
          >
            <option value="USD">USD</option>
          </select>
        </Field>
        <Field label={isId ? "Pajak (%)" : "Tax (%)"}>
          <input
            type="number"
            step="0.1"
            className={inputCls}
            value={settings.tax_percent}
            onChange={(e) => set("tax_percent", Number(e.target.value))}
          />
        </Field>
      </Section>

      <Section icon={BellIcon} title={isId ? "Notifikasi" : "Notifications"}>
        <Field
          label={isId ? "Notifikasi Email" : "Email Notifications"}
          hint={isId ? "Kirim email untuk aktivitas booking" : "Send emails for booking activity"}
        >
          <button
            onClick={() =>
              set("email_notifications_enabled", !settings.email_notifications_enabled)
            }
            className={`w-10 h-5.5 rounded-full transition-colors relative ${settings.email_notifications_enabled ? "bg-[#6366f1]" : "bg-white/10"}`}
          >
            <span
              className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${settings.email_notifications_enabled ? "translate-x-[22px]" : "translate-x-0.5"}`}
            />
          </button>
        </Field>
      </Section>

      <div className="flex items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#0ea5e9] text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isId ? "Simpan Perubahan" : "Save Changes"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> {isId ? "Tersimpan" : "Saved"}
          </span>
        )}
      </div>
    </div>
  );
}
