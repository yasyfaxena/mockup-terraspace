import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { amenityFormSchema, type AmenityFormInput } from "../amenities.schema";
import type { AdminAmenityDto } from "../amenities.types";
import { useCreateAmenity, useUpdateAmenity } from "../amenities.queries";

export function AdminAmenityForm({
  open,
  onOpenChange,
  amenity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amenity: AdminAmenityDto | null;
}) {
  const createAmenity = useCreateAmenity();
  const updateAmenity = useUpdateAmenity();
  const isEdit = Boolean(amenity);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AmenityFormInput>({
    resolver: zodResolver(amenityFormSchema),
    defaultValues: { name: "", category: "General", icon: "tag", status: "active" },
  });

  useEffect(() => {
    if (open) {
      reset(
        amenity
          ? {
              name: amenity.name,
              category: amenity.category,
              icon: amenity.icon,
              status: amenity.status,
            }
          : { name: "", category: "General", icon: "tag", status: "active" },
      );
    }
  }, [open, amenity, reset]);

  const onSubmit = async (values: AmenityFormInput) => {
    try {
      if (amenity) {
        await updateAmenity.mutateAsync({ id: amenity.id, input: values });
        toast.success(`Amenity updated — ${values.name}`);
      } else {
        await createAmenity.mutateAsync(values);
        toast.success(`Amenity created — ${values.name}`);
      }
      onOpenChange(false);
    } catch {
      // query-client's global handler already toasts the real ApiError message
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit amenity" : "Add amenity"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="amenity-name">Name</Label>
            <Input id="amenity-name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="amenity-category">Category</Label>
            <Input id="amenity-category" {...register("category")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="amenity-icon">Icon</Label>
            <Input id="amenity-icon" {...register("icon")} />
          </div>
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select
              value={watch("status")}
              onValueChange={(v) => setValue("status", v as "active" | "inactive")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="inactive">inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
