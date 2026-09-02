import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Edit3, Plus, Tag, Trash2, X } from "lucide-react";
import {
  adminCreateAmenity,
  adminDeleteAmenity,
  adminGetCatalog,
  adminUpdateAmenity,
} from "@/backend";
import { type Amenity } from "@/frontend/data/catalog";
import { CATALOG_STATUS } from "@/shared/constants";
import { useI18n } from "@/lib/i18n";
import { useAdminNotifications } from "@/lib/admin-notifications";

const AMENITY_DEFAULTS = {
  name: "",
  nameId: "",
  category: "General",
  icon: "tag",
  status: CATALOG_STATUS.active,
} as const;
type AmenityDraft = Omit<Amenity, "id"> & { id?: string };
const emptyDraft = (): AmenityDraft => ({ ...AMENITY_DEFAULTS });

export function AdminAmenities() {
  const { locale } = useI18n();
  const isId = locale === "id";
  const { notify } = useAdminNotifications();
  const [items, setItems] = useState<Amenity[]>([]);
  const [draft, setDraft] = useState<AmenityDraft | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setItems((await adminGetCatalog()).amenities as Amenity[]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!draft?.name.trim()) return;
    const isEdit = Boolean(draft.id);
    // The Indonesian-language field has been retired — keep nameId in sync with name.
    const payload = { ...draft, nameId: draft.name.trim() };
    if (draft.id) await adminUpdateAmenity({ data: payload });
    else await adminCreateAmenity({ data: payload });
    setDraft(null);
    await load();
    notify({
      kind: isEdit ? "updated" : "created",
      title: isEdit
        ? isId
          ? `Fasilitas diperbarui — ${draft.name}`
          : `Amenity updated — ${draft.name}`
        : isId
          ? `Fasilitas ditambahkan — ${draft.name}`
          : `Amenity created — ${draft.name}`,
      subtitle: draft.category,
    });
  }

  async function remove(id: string, name: string) {
    if (!confirm(isId ? "Hapus fasilitas ini?" : "Delete this amenity?")) return;
    await adminDeleteAmenity({ data: { id } });
    await load();
    notify({
      kind: "deleted",
      title: isId ? `Fasilitas dihapus — ${name}` : `Amenity deleted — ${name}`,
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <p className="text-xs text-white/35">
          {isId
            ? "Kelola fasilitas dari database bersama website."
            : "Manage amenities from the shared database."}
        </p>
        <button
          onClick={() => setDraft(emptyDraft())}
          className="flex gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
        >
          <Plus className="size-3.5" />
          {isId ? "Tambah Fasilitas" : "Add Amenity"}
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[.07]">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 border-b border-white/[.04] px-5 py-4"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/5">
                <Tag className="size-3.5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <p className="text-[10px] text-white/30">
                  {item.category} · {item.status}
                </p>
              </div>
              <button onClick={() => setDraft(item)} className="p-2 text-white/35 hover:text-white">
                <Edit3 className="size-3.5" />
              </button>
              <button
                onClick={() => void remove(item.id, item.name)}
                className="p-2 text-white/30 hover:text-red-400"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {draft ? (
        <AmenityModal
          draft={draft}
          setDraft={setDraft}
          isId={isId}
          onClose={() => setDraft(null)}
          onSave={() => void save()}
        />
      ) : null}
    </div>
  );
}

function AmenityModal({
  draft,
  setDraft,
  isId,
  onClose,
  onSave,
}: {
  draft: AmenityDraft;
  setDraft: Dispatch<SetStateAction<AmenityDraft | null>>;
  isId: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const field = (key: "name" | "category" | "icon", label: string) => (
    <label className="grid gap-1 text-[10px] uppercase text-white/35">
      {label}
      <input
        value={String(draft[key] ?? "")}
        onChange={(event) =>
          setDraft((current) => (current ? { ...current, [key]: event.target.value } : current))
        }
        className="rounded-lg border border-white/[.08] bg-white/[.05] px-3 py-2 text-sm normal-case text-white"
      />
    </label>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1224] p-6">
        <div className="mb-5 flex justify-between">
          <h3 className="text-sm font-bold text-white">
            {draft.id
              ? isId
                ? "Edit Fasilitas"
                : "Edit Amenity"
              : isId
                ? "Tambah Fasilitas"
                : "Add Amenity"}
          </h3>
          <button onClick={onClose} className="text-white/30">
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-3">
          {field("name", "Name")}
          {field("category", "Category")}
          {field("icon", "Icon")}
          <label className="grid gap-1 text-[10px] uppercase text-white/35">
            Status
            <select
              value={draft.status ?? CATALOG_STATUS.active}
              onChange={(event) =>
                setDraft((current) =>
                  current ? { ...current, status: event.target.value } : current,
                )
              }
              className="mt-1 rounded-lg border border-white/[.08] bg-white/[.05] px-3 py-2 text-sm normal-case text-white"
            >
              <option value={CATALOG_STATUS.active}>active</option>
              <option value={CATALOG_STATUS.inactive}>inactive</option>
            </select>
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
