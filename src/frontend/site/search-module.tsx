import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/frontend/ui/button";
import { Input } from "@/frontend/ui/input";
import { Label } from "@/frontend/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/frontend/ui/select";
import { usePublicCatalog } from "@/frontend/data/catalog";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function SearchModule({
  className,
  defaults,
}: {
  className?: string;
  defaults?: { location?: string; date?: string; time?: string; type?: string };
}) {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const { locations, workspaces } = usePublicCatalog();
  const workspaceTypes = Array.from(new Set(workspaces.map((workspace) => workspace.type)));
  const today = new Date().toISOString().slice(0, 10);
  const [location, setLocation] = useState(defaults?.location ?? "all");
  const [date, setDate] = useState(defaults?.date ?? today);
  const [time, setTime] = useState(defaults?.time ?? "09:00");
  const [type, setType] = useState(defaults?.type ?? "all");

  return (
    <form
      className={cn(
        "grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-lift)] md:items-end",
        locations.length > 1
          ? "md:grid-cols-[1.3fr_1fr_0.8fr_1.1fr_auto]"
          : "md:grid-cols-[1fr_0.8fr_1.1fr_auto]",
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        navigate({ to: "/workspaces", search: { location, date, time, type } });
      }}
    >
      {locations.length > 1 ? (
        <div className="grid gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">
            {t("common.location")}
          </Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-full text-xs">
              <SelectValue placeholder={locale === "id" ? "Semua lokasi" : "Any location"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {locale === "id" ? "Semua lokasi" : "All locations"}
              </SelectItem>
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
        <Label className="text-xs font-semibold text-muted-foreground" htmlFor="search-date">
          {t("detail.date")}
        </Label>
        <Input
          id="search-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-xs"
        />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs font-semibold text-muted-foreground" htmlFor="search-time">
          {t("detail.startTime")}
        </Label>
        <Input
          id="search-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="text-xs"
        />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">
          {locale === "id" ? "Tipe Ruangan" : "Workspace type"}
        </Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full text-xs">
            <SelectValue placeholder={locale === "id" ? "Semua tipe" : "Any type"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{locale === "id" ? "Semua tipe" : "All types"}</SelectItem>
            {workspaceTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" size="lg" className="h-10 gap-2 bg-galaxy-accent font-semibold">
        <Search className="size-4" /> {t("common.search")}
      </Button>
    </form>
  );
}
