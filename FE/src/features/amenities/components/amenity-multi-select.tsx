import type { AmenityDto } from "../amenities.types";

const labelCls = "text-[10px] uppercase tracking-wider text-white/35";

/**
 * Selects by amenity **id**, matching the junction-table contract
 * (`amenityIds: string[]` on `createLocationSchema`/`createWorkspaceSchema`)
 * — V1's version matched by display name, which breaks the moment two
 * amenities share a name or one gets renamed. Owns real amenity data, so it
 * lives here (not `components/admin-fields/`) and is exported through this
 * feature's `index.ts` for `locations`/`workspaces` to import.
 */
export function AmenityMultiSelect({
  options,
  selected,
  onChange,
  label = "Amenities",
}: {
  options: AmenityDto[];
  selected: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]);
  }

  return (
    <div className="grid gap-1.5">
      <span className={labelCls}>{label}</span>
      {options.length === 0 ? (
        <p className="text-xs text-white/30">No amenities in the database yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/[.08] bg-white/[.03] p-2.5">
          {options.map((amenity) => {
            const active = selected.includes(amenity.id);
            return (
              <button
                type="button"
                key={amenity.id}
                onClick={() => toggle(amenity.id)}
                className={
                  active
                    ? "rounded-full border border-primary/40 bg-primary/20 px-2.5 py-1 text-[11px] font-medium text-white"
                    : "rounded-full border border-white/[.08] bg-white/[.04] px-2.5 py-1 text-[11px] font-medium text-white/45 hover:text-white/70"
                }
              >
                {amenity.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
