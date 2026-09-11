import { useState } from "react";
import { ChevronDown } from "lucide-react";

const labelCls = "text-[10px] uppercase tracking-wider text-white/35";
const inputCls =
  "w-full rounded-lg border border-white/[.08] bg-white/[.05] px-3 py-2 text-sm normal-case text-white";

/**
 * Dropdown of existing distinct values, with an inline "add new" fallback —
 * business-agnostic (components/admin-fields/), unlike `amenity-multi-select.tsx`
 * which owns real amenity data and lives in `features/amenities/`.
 */
export function DbSelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
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
              title="Pick from database"
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
        {!value && <option value="">Select…</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value="__new__">+ New…</option>
      </select>
    </label>
  );
}
