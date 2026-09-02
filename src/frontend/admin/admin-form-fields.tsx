import { useRef, useState } from "react";
import { ImagePlus, X, ChevronDown } from "lucide-react";

const labelCls = "text-[10px] uppercase tracking-wider text-white/35";
const inputCls =
  "w-full rounded-lg border border-white/[.08] bg-white/[.05] px-3 py-2 text-sm normal-case text-white";

/** Reads a File as a base64 data URL for inline preview/storage (no external storage in this project). */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function ImageField({
  label,
  value,
  onChange,
  isId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isId?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(isId ? "File harus berupa gambar." : "File must be an image.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onChange(dataUrl);
    } catch {
      setError(isId ? "Gagal membaca file." : "Failed to read file.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-1.5">
      <span className={labelCls}>{label}</span>

      {value ? (
        <div className="relative w-full overflow-hidden rounded-lg border border-white/[.08] bg-white/[.03]">
          <img src={value} alt="" className="h-32 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1.5 right-1.5 flex items-center justify-center rounded-full bg-black/60 p-1 text-white/80 hover:text-white hover:bg-black/80 transition-colors"
            title={isId ? "Hapus gambar" : "Remove image"}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[.15] bg-white/[.02] text-white/35 hover:text-white/60 hover:border-white/25 transition-colors"
        >
          <ImagePlus className="size-4" />
          <span className="text-[11px]">
            {uploading
              ? isId
                ? "Mengunggah…"
                : "Uploading…"
              : isId
                ? "Klik untuk unggah gambar"
                : "Click to upload an image"}
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/25 shrink-0">{isId ? "atau URL" : "or URL"}</span>
        <input
          type="text"
          value={value.startsWith("data:") ? "" : value}
          placeholder={
            value.startsWith("data:")
              ? isId
                ? "(file terunggah)"
                : "(uploaded file)"
              : "https://…"
          }
          onChange={(event) => onChange(event.target.value)}
          className="flex-1 rounded-lg border border-white/[.08] bg-white/[.05] px-2.5 py-1.5 text-xs text-white"
        />
      </div>

      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}

/** Multi-select of amenity names, sourced from the amenities already stored in the database. */
export function AmenityMultiSelect({
  label,
  options,
  selected,
  onChange,
  isId,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  isId?: boolean;
}) {
  function toggle(name: string) {
    onChange(selected.includes(name) ? selected.filter((v) => v !== name) : [...selected, name]);
  }

  return (
    <div className="grid gap-1.5">
      <span className={labelCls}>{label}</span>
      {options.length === 0 ? (
        <p className="text-xs text-white/30">
          {isId
            ? "Belum ada fasilitas di database. Tambahkan dulu di menu Amenities."
            : "No amenities in the database yet. Add some in the Amenities tab first."}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/[.08] bg-white/[.03] p-2.5">
          {options.map((opt) => {
            const active = selected.includes(opt.name);
            return (
              <button
                type="button"
                key={opt.id}
                onClick={() => toggle(opt.name)}
                className={
                  active
                    ? "rounded-full border border-primary/40 bg-primary/20 px-2.5 py-1 text-[11px] font-medium text-white"
                    : "rounded-full border border-white/[.08] bg-white/[.04] px-2.5 py-1 text-[11px] font-medium text-white/45 hover:text-white/70"
                }
              >
                {opt.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Dropdown of existing distinct values from the database, with an inline "add new" fallback. */
export function DbSelectField({
  label,
  value,
  options,
  onChange,
  isId,
  placeholder,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  isId?: boolean;
  placeholder?: string;
}) {
  const [customMode, setCustomMode] = useState(() => value !== "" && !options.includes(value));

  if (customMode) {
    return (
      <label className="grid gap-1">
        <span className={labelCls}>{label}</span>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className={inputCls}
          />
          {options.length > 0 && (
            <button
              type="button"
              title={isId ? "Pilih dari database" : "Pick from database"}
              onClick={() => setCustomMode(false)}
              className="shrink-0 rounded-lg border border-white/[.08] bg-white/[.05] px-2.5 text-white/40 hover:text-white"
            >
              <ChevronDown className="size-3.5" />
            </button>
          )}
        </div>
      </label>
    );
  }

  return (
    <label className="grid gap-1">
      <span className={labelCls}>{label}</span>
      <div className="flex gap-1.5">
        <select
          value={value}
          onChange={(event) => {
            if (event.target.value === "__new__") {
              setCustomMode(true);
              onChange("");
            } else {
              onChange(event.target.value);
            }
          }}
          className={inputCls}
        >
          {!value && <option value="">{isId ? "Pilih…" : "Select…"}</option>}
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value="__new__">{isId ? "+ Baru…" : "+ New…"}</option>
        </select>
      </div>
    </label>
  );
}

export { labelCls, inputCls };
