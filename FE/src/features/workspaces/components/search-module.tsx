import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocations } from "@/features/locations";
import { cn } from "@/lib/utils";
import type { WorkspaceType } from "../workspaces.types";

const WORKSPACE_TYPES: { value: WorkspaceType; label: string }[] = [
  { value: "hot_desk", label: "Hot desk" },
  { value: "dedicated_desk", label: "Dedicated desk" },
  { value: "private_office", label: "Private office" },
  { value: "meeting_room", label: "Meeting room" },
  { value: "event_space", label: "Event space" },
];

/**
 * Only location + type filter here — both map to real `/workspaces` query
 * params (`locationSlug`, `type`). V1's date/time inputs are dropped: the
 * list endpoint has no date/time filter, so they never did anything real
 * (frontend-spec.md §2's shortcuts list).
 */
export function SearchModule({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { data } = useLocations();
  const locations = data?.data ?? [];
  const [location, setLocation] = useState("all");
  const [type, setType] = useState("all");

  return (
    <form
      className={cn(
        "grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-lift)] md:items-end",
        locations.length > 1 ? "md:grid-cols-[1.3fr_1fr_auto]" : "md:grid-cols-[1fr_auto]",
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        void navigate({
          to: "/workspaces",
          search: {
            location: location === "all" ? undefined : location,
            type: type === "all" ? undefined : type,
          },
        });
      }}
    >
      {locations.length > 1 ? (
        <div className="grid gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Location</Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-full text-xs">
              <SelectValue placeholder="Any location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.slug} value={l.slug}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="grid gap-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">Workspace type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full text-xs">
            <SelectValue placeholder="Any type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {WORKSPACE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" size="lg" className="h-10 gap-2 bg-galaxy-accent font-semibold">
        <Search className="size-4" /> Search
      </Button>
    </form>
  );
}
