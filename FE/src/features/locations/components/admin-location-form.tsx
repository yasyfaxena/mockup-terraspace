import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
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
import { ImageField } from "@/components/admin-fields/image-field";
import { AmenityMultiSelect, useAmenities } from "@/features/amenities";
import { locationFormSchema, type LocationFormInput } from "../locations.schema";
import type { AdminLocationDto } from "../locations.types";
import { useCreateLocation, useUpdateLocation } from "../locations.queries";
import { LocationCoordsField } from "./location-coords-field";

const DEFAULT_VALUES: LocationFormInput = {
  slug: "",
  name: "",
  address: "",
  city: "",
  imageUrl: null,
  openingHours: "Mon–Sun 09:00–22:00",
  access247: false,
  description: "",
  latitude: null,
  longitude: null,
  accessRadiusMeters: 50,
  timezone: "Asia/Jakarta",
  status: "active",
  amenityIds: [],
};

export function AdminLocationForm({
  open,
  onOpenChange,
  location,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: AdminLocationDto | null;
}) {
  const { data: amenitiesData } = useAmenities();
  const amenities = amenitiesData?.data ?? [];
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const isEdit = Boolean(location);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormInput>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      location
        ? {
            slug: location.slug,
            name: location.name,
            address: location.address,
            city: location.city,
            imageUrl: location.imageUrl,
            openingHours: location.openingHours,
            access247: location.access247,
            description: location.description,
            latitude: location.latitude ? Number(location.latitude) : null,
            longitude: location.longitude ? Number(location.longitude) : null,
            accessRadiusMeters: location.accessRadiusMeters,
            timezone: location.timezone,
            status: location.status,
            amenityIds: location.amenityIds,
          }
        : DEFAULT_VALUES,
    );
  }, [open, location, reset]);

  const onSubmit = async (values: LocationFormInput) => {
    try {
      if (location) {
        await updateLocation.mutateAsync({ id: location.id, input: values });
        toast.success(`Location updated — ${values.name}`);
      } else {
        await createLocation.mutateAsync(values);
        toast.success(`Location created — ${values.name}`);
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
          <DialogTitle>{isEdit ? "Edit location" : "Add location"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="loc-name">Name</Label>
            <Input id="loc-name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="loc-slug">Slug</Label>
            <Input id="loc-slug" {...register("slug")} />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>

          <Controller
            control={control}
            name="latitude"
            render={({ field: latField }) => (
              <Controller
                control={control}
                name="longitude"
                render={({ field: lngField }) => (
                  <LocationCoordsField
                    latitude={latField.value}
                    longitude={lngField.value}
                    onChange={({ latitude, longitude }) => {
                      latField.onChange(latitude);
                      lngField.onChange(longitude);
                    }}
                  />
                )}
              />
            )}
          />

          <div className="grid gap-1.5">
            <Label htmlFor="loc-address">Address</Label>
            <Input id="loc-address" {...register("address")} />
            {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="loc-city">City</Label>
            <Input id="loc-city" {...register("city")} />
            {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="loc-hours">Opening hours</Label>
            <Input id="loc-hours" {...register("openingHours")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="loc-timezone">Timezone (IANA)</Label>
            <Input id="loc-timezone" {...register("timezone")} />
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
            <Label htmlFor="loc-radius">Access radius (meters)</Label>
            <Input
              id="loc-radius"
              type="number"
              {...register("accessRadiusMeters", { valueAsNumber: true })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="loc-description">Description</Label>
            <Input id="loc-description" {...register("description")} />
          </div>

          <Controller
            control={control}
            name="access247"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-xs text-white/60">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(Boolean(v))}
                />
                24/7 access
              </label>
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
