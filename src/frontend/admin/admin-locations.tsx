import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { CheckCircle2, Edit3, MapPin, Plus, Trash2, X, XCircle } from "lucide-react";
import {
  adminCreateLocation,
  adminDeleteLocation,
  adminGetCatalog,
  adminUpdateLocation,
} from "@/backend";
import { useI18n } from "@/lib/i18n";
import { useAdminNotifications } from "@/lib/admin-notifications";
import { ImageField, AmenityMultiSelect } from "@/frontend/admin/admin-form-fields";
import { LocationCoordsField } from "@/frontend/admin/location-coords-field";
import type { Amenity } from "@/frontend/data/catalog";

const LOCATION_DEFAULTS = {
  hours: "Mon–Sun 09:00–22:00",
  access247: false,
  accessRadiusMeters: 50,
  status: "active",
} as const;

type Location = {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  image: string | null;
  hours: string;
  access247: boolean;
  amenities: string[];
  description: string;
  latitude: number | null;
  longitude: number | null;
  accessRadiusMeters: number;
  status: string;
};

type LocationDraft = Omit<Location, "id"> & { id?: string; imageUrl?: string | null };

const emptyDraft = (): LocationDraft => ({
  slug: "",
  name: "",
  address: "",
  city: "",
  image: null,
  imageUrl: null,
  hours: LOCATION_DEFAULTS.hours,
  access247: LOCATION_DEFAULTS.access247,
  amenities: [],
  description: "",
  latitude: null,
  longitude: null,
  accessRadiusMeters: LOCATION_DEFAULTS.accessRadiusMeters,
  status: LOCATION_DEFAULTS.status,
});

export function AdminLocations() {
  const { locale } = useI18n();
  const isId = locale === "id";
  const { notify } = useAdminNotifications();
  const [items, setItems] = useState<Location[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [draft, setDraft] = useState<LocationDraft | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await adminGetCatalog();
      setItems(data.locations as Location[]);
      setAmenities(data.amenities as Amenity[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!draft?.name.trim() || !draft.slug.trim() || !draft.address.trim() || !draft.city.trim())
      return;
    const isEdit = Boolean(draft.id);
    const payload = { ...draft, imageUrl: draft.imageUrl ?? draft.image ?? null };
    try {
      if (draft.id) await adminUpdateLocation({ data: payload });
      else await adminCreateLocation({ data: payload });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Save failed");
      return;
    }
    setDraft(null);
    await load();
    notify({
      kind: isEdit ? "updated" : "created",
      title: isEdit
        ? isId
          ? `Lokasi diperbarui — ${draft.name}`
          : `Location updated — ${draft.name}`
        : isId
          ? `Lokasi ditambahkan — ${draft.name}`
          : `Location created — ${draft.name}`,
      subtitle: draft.city,
    });
  }

  async function remove(id: string, name: string) {
    if (!confirm(isId ? "Hapus lokasi ini?" : "Delete this location?")) return;
    await adminDeleteLocation({ data: { id } });
    await load();
    notify({
      kind: "deleted",
      title: isId ? `Lokasi dihapus — ${name}` : `Location deleted — ${name}`,
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-white/35">
          {isId
            ? "Kelola lokasi dari database bersama website."
            : "Manage locations from the shared website database."}
        </p>
        <button
          onClick={() => setDraft(emptyDraft())}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
        >
          <Plus className="size-3.5" /> {isId ? "Tambah Lokasi" : "Add Location"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[.07]">
          {items.map((location) => (
            <div
              key={location.id}
              className="flex items-center gap-4 border-b border-white/[.04] px-5 py-4"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{location.name}</p>
                <p className="truncate text-xs text-white/30">
                  {location.address}, {location.city}
                </p>
              </div>
              {location.status === "active" ? (
                <CheckCircle2 className="size-4 text-emerald-400" />
              ) : (
                <XCircle className="size-4 text-white/30" />
              )}
              <button
                onClick={() => setDraft({ ...location, imageUrl: location.image })}
                className="p-2 text-white/35 hover:text-white"
              >
                <Edit3 className="size-3.5" />
              </button>
              <button
                onClick={() => void remove(location.id, location.name)}
                className="p-2 text-white/30 hover:text-red-400"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {draft ? (
        <LocationModal
          draft={draft}
          setDraft={setDraft}
          isId={isId}
          amenities={amenities}
          onClose={() => setDraft(null)}
          onSave={() => void save()}
        />
      ) : null}
    </div>
  );
}

function LocationModal({
  draft,
  setDraft,
  isId,
  amenities,
  onClose,
  onSave,
}: {
  draft: LocationDraft;
  setDraft: Dispatch<SetStateAction<LocationDraft | null>>;
  isId: boolean;
  amenities: Amenity[];
  onClose: () => void;
  onSave: () => void;
}) {
  const field = (key: keyof LocationDraft, label: string, type = "text") => (
    <label className="grid gap-1">
      <span className="text-[10px] uppercase tracking-wider text-white/35">{label}</span>
      <input
        type={type}
        value={draft[key] == null ? "" : String(draft[key])}
        onChange={(event) =>
          setDraft((current) =>
            current
              ? {
                  ...current,
                  [key]: type === "number" ? Number(event.target.value) : event.target.value,
                }
              : current,
          )
        }
        className="w-full rounded-lg border border-white/[.08] bg-white/[.05] px-3 py-2 text-sm text-white"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/[.1] bg-[#0d1224] p-6">
        <div className="mb-5 flex justify-between">
          <h3 className="text-sm font-bold text-white">
            {draft.id
              ? isId
                ? "Edit Lokasi"
                : "Edit Location"
              : isId
                ? "Tambah Lokasi"
                : "Add Location"}
          </h3>
          <button onClick={onClose} className="text-white/30">
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-3">
          {field("name", isId ? "Nama" : "Name")}
          {field("slug", "Slug")}
          <LocationCoordsField
            isId={isId}
            latitude={draft.latitude}
            longitude={draft.longitude}
            onChange={({ latitude, longitude }) =>
              setDraft((current) => (current ? { ...current, latitude, longitude } : current))
            }
          />
          {field("address", isId ? "Alamat" : "Address")}
          {field("city", isId ? "Kota" : "City")}
          {field("hours", isId ? "Jam operasional" : "Opening hours")}
          <ImageField
            label={isId ? "Gambar" : "Image"}
            value={draft.imageUrl ?? ""}
            onChange={(value) =>
              setDraft((current) => (current ? { ...current, imageUrl: value || null } : current))
            }
            isId={isId}
          />
          {field(
            "accessRadiusMeters",
            isId ? "Radius akses (meter)" : "Access radius (meters)",
            "number",
          )}
          {field("description", isId ? "Deskripsi" : "Description")}
          <label className="flex items-center gap-2 text-xs text-white/60">
            <input
              type="checkbox"
              checked={draft.access247}
              onChange={(event) =>
                setDraft((current) =>
                  current ? { ...current, access247: event.target.checked } : current,
                )
              }
            />
            24/7 access
          </label>
          <AmenityMultiSelect
            label="Amenities"
            options={amenities}
            selected={draft.amenities}
            onChange={(value) =>
              setDraft((current) => (current ? { ...current, amenities: value } : current))
            }
            isId={isId}
          />
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
