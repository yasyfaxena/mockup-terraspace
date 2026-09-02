import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Building2, Edit3, Plus, Trash2, X } from "lucide-react";
import {
  adminCreateWorkspace,
  adminDeleteWorkspace,
  adminGetCatalog,
  adminUpdateWorkspace,
} from "@/backend";
import { formatUSD, type Amenity, type Location, type Workspace } from "@/frontend/data/catalog";
import { WORKSPACE_AVAILABILITY } from "@/shared/constants";
import { useI18n, BASE_TO_USD_RATE, USD_TO_BASE_RATE } from "@/lib/i18n";
import { useAdminNotifications } from "@/lib/admin-notifications";
import { ImageField, AmenityMultiSelect, DbSelectField } from "@/frontend/admin/admin-form-fields";

const AVAILABILITY_OPTIONS = Object.values(WORKSPACE_AVAILABILITY);

type WorkspaceDraft = Omit<Workspace, "id" | "image"> & { id?: string; imageUrl?: string | null };

const emptyDraft = (locationSlug: string): WorkspaceDraft => ({
  locationSlug,
  name: "",
  type: "",
  floor: "Ground Floor",
  price: 0,
  unit: "hour",
  amenities: [],
  availability: WORKSPACE_AVAILABILITY.available,
  slots: [],
  imageUrl: null,
  description: "",
  cancellation: "",
  simpleBooking: false,
  calendarSync: null,
  qrProvider: null,
});

export function AdminSpaces() {
  const { locale } = useI18n();
  const isId = locale === "id";
  const { notify } = useAdminNotifications();
  const [items, setItems] = useState<Workspace[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [draft, setDraft] = useState<WorkspaceDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await adminGetCatalog();
      setItems(data.workspaces as Workspace[]);
      setLocations(data.locations as Location[]);
      setAmenities(data.amenities as Amenity[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const existingTypes = useMemo(
    () => [...new Set(items.map((w) => w.type).filter(Boolean))].sort(),
    [items],
  );

  const filtered = items.filter((item) => {
    const value = query.toLowerCase();
    return (
      !value || item.name.toLowerCase().includes(value) || item.type.toLowerCase().includes(value)
    );
  });

  async function save() {
    if (!draft?.name.trim() || !draft.locationSlug || !draft.type.trim()) return;
    const isEdit = Boolean(draft.id);
    // The admin form works in USD, but the database stores the raw base-currency
    // value, so convert back before saving (this is what was making saved prices
    // show up as $0.00 — the raw dollar amount was being saved unconverted).
    const payload = { ...draft, price: Math.round(draft.price * USD_TO_BASE_RATE) };
    if (draft.id) await adminUpdateWorkspace({ data: payload });
    else await adminCreateWorkspace({ data: payload });
    setDraft(null);
    await load();
    notify({
      kind: isEdit ? "updated" : "created",
      title: isEdit
        ? isId
          ? `Ruangan diperbarui — ${draft.name}`
          : `Space updated — ${draft.name}`
        : isId
          ? `Ruangan ditambahkan — ${draft.name}`
          : `Space created — ${draft.name}`,
      subtitle: draft.type,
    });
  }

  async function remove(id: string, name: string) {
    if (!confirm(isId ? "Hapus ruangan ini?" : "Delete this workspace?")) return;
    try {
      await adminDeleteWorkspace({ data: { id } });
      await load();
      notify({
        kind: "deleted",
        title: isId ? `Ruangan dihapus — ${name}` : `Space deleted — ${name}`,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={isId ? "Cari ruangan…" : "Search spaces…"}
          className="flex-1 rounded-lg border border-white/[.08] bg-white/[.04] px-3 py-2 text-sm text-white"
        />
        <button
          onClick={() => setDraft(emptyDraft(locations[0]?.slug ?? ""))}
          disabled={!locations.length}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          <Plus className="size-3.5" /> {isId ? "Tambah Ruangan" : "Add Workspace"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[.07]">
          {filtered.map((workspace) => (
            <div
              key={workspace.id}
              className="grid grid-cols-1 items-center gap-3 border-b border-white/[.04] px-5 py-4 md:grid-cols-[1fr_auto_auto_auto_auto_auto] md:gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="size-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{workspace.name}</p>
                  <p className="text-xs text-white/30">
                    {locations.find((location) => location.slug === workspace.locationSlug)?.name ??
                      workspace.locationSlug}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/50">
                {workspace.type}
              </span>
              <span className="text-xs text-white/40">{workspace.floor}</span>
              <span className="text-xs font-semibold text-white">{formatUSD(workspace.price)}</span>
              <span className="text-[10px] text-white/60">{workspace.availability}</span>
              <div className="flex gap-1">
                <button
                  onClick={() =>
                    setDraft({
                      ...workspace,
                      // Convert the stored base-currency value to USD for editing.
                      price: Math.round(workspace.price * BASE_TO_USD_RATE * 100) / 100,
                      imageUrl: workspace.image,
                    })
                  }
                  className="p-2 text-white/35 hover:text-white"
                >
                  <Edit3 className="size-3.5" />
                </button>
                <button
                  onClick={() => void remove(workspace.id, workspace.name)}
                  className="p-2 text-white/30 hover:text-red-400"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {draft ? (
        <WorkspaceModal
          draft={draft}
          setDraft={setDraft}
          isId={isId}
          locations={locations}
          amenities={amenities}
          existingTypes={existingTypes}
          onClose={() => setDraft(null)}
          onSave={() => void save()}
        />
      ) : null}
    </div>
  );
}

function WorkspaceModal({
  draft,
  setDraft,
  isId,
  locations,
  amenities,
  existingTypes,
  onClose,
  onSave,
}: {
  draft: WorkspaceDraft;
  setDraft: Dispatch<SetStateAction<WorkspaceDraft | null>>;
  isId: boolean;
  locations: Location[];
  amenities: Amenity[];
  existingTypes: string[];
  onClose: () => void;
  onSave: () => void;
}) {
  const update = <K extends keyof WorkspaceDraft>(key: K, value: WorkspaceDraft[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1224] p-6">
        <div className="mb-5 flex justify-between">
          <h3 className="text-sm font-bold text-white">
            {draft.id
              ? isId
                ? "Edit Ruangan"
                : "Edit Workspace"
              : isId
                ? "Tambah Ruangan"
                : "Add Workspace"}
          </h3>
          <button onClick={onClose} className="text-white/30">
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-3">
          <Field label="Name" value={draft.name} onChange={(value) => update("name", value)} />
          <DbSelectField
            label="Type"
            value={draft.type}
            options={existingTypes}
            onChange={(value) => update("type", value)}
            isId={isId}
            placeholder={isId ? "mis. Ruang Acara" : "e.g. Event Space"}
          />
          <Field label="Floor" value={draft.floor} onChange={(value) => update("floor", value)} />
          <Field
            label={isId ? "Harga/jam ($)" : "Price/hour ($)"}
            type="number"
            value={String(draft.price)}
            onChange={(value) => update("price", Number(value))}
          />
          <ImageField
            label={isId ? "Gambar" : "Image"}
            value={draft.imageUrl ?? ""}
            onChange={(value) => update("imageUrl", value || null)}
            isId={isId}
          />
          <Field
            label="Description"
            value={draft.description}
            onChange={(value) => update("description", value)}
          />
          <Field
            label="Cancellation"
            value={draft.cancellation}
            onChange={(value) => update("cancellation", value)}
          />
          <label className="grid gap-1 text-[10px] uppercase text-white/35">
            Location
            <select
              value={draft.locationSlug}
              onChange={(event) => update("locationSlug", event.target.value)}
              className="mt-1 rounded-lg border border-white/[.08] bg-white/[.05] px-3 py-2 text-sm normal-case text-white"
            >
              {locations.map((location) => (
                <option key={location.slug} value={location.slug}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[10px] uppercase text-white/35">
            Availability
            <select
              value={draft.availability}
              onChange={(event) => update("availability", event.target.value)}
              className="mt-1 rounded-lg border border-white/[.08] bg-white/[.05] px-3 py-2 text-sm normal-case text-white"
            >
              {AVAILABILITY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <AmenityMultiSelect
            label="Amenities"
            options={amenities}
            selected={draft.amenities}
            onChange={(value) => update("amenities", value)}
            isId={isId}
          />
          <Field
            label="Slots (comma separated)"
            value={draft.slots.join(", ")}
            onChange={(value) =>
              update(
                "slots",
                value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
          />
          <label className="flex gap-2 text-xs text-white/60">
            <input
              type="checkbox"
              checked={draft.simpleBooking}
              onChange={(event) => update("simpleBooking", event.target.checked)}
            />
            Simple one-room booking
          </label>
        </div>
        <button
          onClick={onSave}
          className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-[10px] uppercase tracking-wider text-white/35">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-white/[.08] bg-white/[.05] px-3 py-2 text-sm normal-case text-white"
      />
    </label>
  );
}
