import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageField } from "@/components/admin-fields/image-field";
import { AmenityMultiSelect, useAmenities } from "@/features/amenities";
// Concrete path, not the `@/features/locations` barrel: that barrel's
// location-card.tsx imports AvailabilityBadge from this feature's own
// index.ts, and this file is part of that same index.ts's export graph —
// importing the barrel here would be a real (not just type-level) circular
// import between the two features.
import { useAdminLocations } from "@/features/locations/locations.queries";
import { workspaceFormSchema, type WorkspaceFormInput } from "../workspaces.schema";
import type { AdminWorkspaceDto, WorkspaceType, WorkspaceAvailability } from "../workspaces.types";
import { useCreateWorkspace, useUpdateWorkspace } from "../workspaces.queries";

const WORKSPACE_TYPES: { value: WorkspaceType; label: string }[] = [
  { value: "hot_desk", label: "Hot desk" },
  { value: "dedicated_desk", label: "Dedicated desk" },
  { value: "private_office", label: "Private office" },
  { value: "meeting_room", label: "Meeting room" },
  { value: "event_space", label: "Event space" },
];

const WORKSPACE_AVAILABILITIES: WorkspaceAvailability[] = [
  "available",
  "limited",
  "full",
  "maintenance",
  "disabled",
];

const DEFAULT_VALUES: WorkspaceFormInput = {
  locationId: "",
  name: "",
  type: "hot_desk",
  floor: "",
  pricePerHour: 0,
  availability: "available",
  simpleBooking: false,
  imageUrl: null,
  description: "",
  cancellationPolicy: "",
  amenityIds: [],
};

export function AdminWorkspaceForm({
  open,
  onOpenChange,
  workspace,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: AdminWorkspaceDto | null;
}) {
  const { data: locationsData } = useAdminLocations();
  const locations = useMemo(() => locationsData?.data ?? [], [locationsData]);
  const { data: amenitiesData } = useAmenities();
  const amenities = amenitiesData?.data ?? [];
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const isEdit = Boolean(workspace);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<WorkspaceFormInput>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      workspace
        ? {
            locationId: workspace.locationId,
            name: workspace.name,
            type: workspace.type,
            floor: workspace.floor,
            pricePerHour: Number(workspace.pricePerHour),
            availability: workspace.availability,
            simpleBooking: workspace.simpleBooking,
            imageUrl: workspace.imageUrl,
            description: workspace.description,
            cancellationPolicy: workspace.cancellationPolicy,
            amenityIds: workspace.amenityIds,
          }
        : { ...DEFAULT_VALUES, locationId: locations[0]?.id ?? "" },
    );
  }, [open, workspace, locations, reset]);

  const onSubmit = async (values: WorkspaceFormInput) => {
    try {
      if (workspace) {
        await updateWorkspace.mutateAsync({ id: workspace.id, input: values });
        toast.success(`Workspace updated — ${values.name}`);
      } else {
        await createWorkspace.mutateAsync(values);
        toast.success(`Workspace created — ${values.name}`);
      }
      onOpenChange(false);
    } catch {
      // query-client's global handler already toasts the real ApiError message
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit workspace" : "Add workspace"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ws-name">Name</Label>
            <Input id="ws-name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKSPACE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />

          <div className="grid gap-1.5">
            <Label htmlFor="ws-floor">Floor</Label>
            <Input id="ws-floor" {...register("floor")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ws-price">Price/hour (IDR)</Label>
            <Input
              id="ws-price"
              type="number"
              {...register("pricePerHour", { valueAsNumber: true })}
            />
          </div>

          <Controller
            control={control}
            name="imageUrl"
            render={({ field }) => (
              <ImageField
                label="Image"
                value={field.value ?? ""}
                onChange={(value) => field.onChange(value || null)}
              />
            )}
          />

          <div className="grid gap-1.5">
            <Label htmlFor="ws-description">Description</Label>
            <Input id="ws-description" {...register("description")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ws-cancellation">Cancellation policy</Label>
            <Input id="ws-cancellation" {...register("cancellationPolicy")} />
          </div>

          <Controller
            control={control}
            name="locationId"
            render={({ field }) => (
              <div className="grid gap-1.5">
                <Label>Location</Label>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />

          <Controller
            control={control}
            name="availability"
            render={({ field }) => (
              <div className="grid gap-1.5">
                <Label>Availability</Label>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKSPACE_AVAILABILITIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />

          <Controller
            control={control}
            name="amenityIds"
            render={({ field }) => (
              <AmenityMultiSelect
                options={amenities}
                selected={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="simpleBooking"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-xs text-white/60">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(Boolean(v))}
                />
                Simple one-room booking
              </label>
            )}
          />

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
