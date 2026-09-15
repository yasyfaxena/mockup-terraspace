import { cn } from "@/lib/utils";

/**
 * Covers both the workspace's raw `availability` enum (available/limited/
 * full/maintenance/disabled) and a location's computed occupancy stat
 * (available/limited/unavailable) — two different BE enums, one badge.
 */
export type BadgeAvailability =
  "available" | "limited" | "full" | "maintenance" | "disabled" | "unavailable";

const LABELS: Record<BadgeAvailability, string> = {
  available: "Available",
  limited: "Limited",
  full: "Full",
  maintenance: "Maintenance",
  disabled: "Unavailable",
  unavailable: "Unavailable",
};

const STYLES: Record<BadgeAvailability, string> = {
  available: "bg-success/12 text-success border-success/25",
  limited: "bg-warning/18 text-warning-foreground border-warning/40",
  full: "bg-muted text-muted-foreground border-border",
  maintenance: "bg-info/12 text-info border-info/25",
  disabled: "bg-destructive/10 text-destructive border-destructive/25",
  unavailable: "bg-destructive/10 text-destructive border-destructive/25",
};

export function AvailabilityBadge({
  status,
  label,
  className,
}: {
  status: BadgeAvailability;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        STYLES[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label ?? LABELS[status]}
    </span>
  );
}
