import {
  Car,
  CheckCircle2,
  Coffee,
  MonitorSpeaker,
  Projector,
  Printer,
  Sofa,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AmenityDto } from "../amenities.types";

const ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  car: Car,
  coffee: Coffee,
  projector: Projector,
  printer: Printer,
  desk: Sofa,
  whiteboard: MonitorSpeaker,
};

export function AmenityChip({ amenity, className }: { amenity: AmenityDto; className?: string }) {
  const Icon = ICONS[amenity.icon] ?? CheckCircle2;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5 text-primary" />
      {amenity.name}
    </span>
  );
}
