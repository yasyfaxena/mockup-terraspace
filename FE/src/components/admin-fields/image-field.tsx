import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

const labelCls = "text-[10px] uppercase tracking-wider text-white/35";

/** Reads a File as a base64 data URL — V2 has no multipart upload endpoint, so this stays. */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Business-agnostic image input — a pasted URL or a local file converted to
 * a `data:` URI client-side (features/workspaces.md §4, features/locations.md
 * §6). Not feature-owned: lives in components/admin-fields/.
 */
export function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("File must be an image.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      onChange(await readFileAsDataUrl(file));
    } catch {
      setError("Failed to read file.");
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
            className="absolute right-1.5 top-1.5 flex items-center justify-center rounded-full bg-black/60 p-1 text-white/80 transition-colors hover:bg-black/80 hover:text-white"
            title="Remove image"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[.15] bg-white/[.02] text-white/35 transition-colors hover:border-white/25 hover:text-white/60"
        >
          <ImagePlus className="size-4" />
          <span className="text-[11px]">
            {uploading ? "Uploading…" : "Click to upload an image"}
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
        <span className="shrink-0 text-[10px] text-white/25">or URL</span>
        <input
          type="text"
          value={value.startsWith("data:") ? "" : value}
          placeholder={value.startsWith("data:") ? "(uploaded file)" : "https://…"}
          onChange={(event) => onChange(event.target.value)}
          className="flex-1 rounded-lg border border-white/[.08] bg-white/[.05] px-2.5 py-1.5 text-xs text-white"
        />
      </div>

      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
