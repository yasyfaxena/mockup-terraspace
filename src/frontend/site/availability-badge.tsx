import { cn } from "@/lib/utils";
import { availabilityLabel, type Availability } from "@/frontend/data/catalog";

const styles: Record<Availability, string> = {
  available: "bg-success/12 text-success border-success/25",
  limited: "bg-warning/18 text-warning-foreground border-warning/40",
  full: "bg-muted text-muted-foreground border-border",
  unavailable: "bg-destructive/10 text-destructive border-destructive/25",
};

export function AvailabilityBadge({
  status,
  label,
  className,
}: {
  status: Availability;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        styles[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label ?? availabilityLabel[status]}
    </span>
  );
}
