import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/shared/format";
import { updateProfileSchema, type UpdateProfileInput } from "../users.schema";
import { useMe, useUpdateProfile } from "../users.queries";

const DEFAULT_VALUES: UpdateProfileInput = { name: "", phone: null, company: null };

/**
 * Name/phone/company only — `PATCH /me` (features/users.md §2/§4). Email,
 * role, and ban status never appear here: email changes aren't part of
 * self-service profile edit, and role/ban are admin-only inputs on a
 * separate schema entirely.
 */
export function ProfileForm() {
  const { data: me, isPending } = useMe();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!me) return;
    reset({ name: me.name, phone: me.phone, company: me.company });
  }, [me, reset]);

  async function onSubmit(values: UpdateProfileInput) {
    try {
      await updateProfile.mutateAsync(values);
      toast.success("Profile updated.");
    } catch {
      // query-client's global handler already toasts the real ApiError message
    }
  }

  if (isPending || !me) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:grid-cols-3">
        <div>
          <p className="text-[11px] text-muted-foreground">Bookings</p>
          <p className="text-lg font-bold text-foreground">{me.stats.totalBookings}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Upcoming</p>
          <p className="text-lg font-bold text-foreground">{me.stats.upcomingBookings}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Total spent</p>
          <p className="text-lg font-bold text-foreground">{formatMoney(me.stats.totalSpent)}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
      >
        <div className="grid gap-1.5">
          <Label>Email</Label>
          <Input value={me.email} disabled />
          <p className="text-[11px] text-muted-foreground">
            {me.emailVerified ? "Verified" : "Not verified"} — email can't be changed here.
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="profile-name">Full name</Label>
          <Input
            id="profile-name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "profile-name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p id="profile-name-error" role="alert" className="text-xs text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="profile-phone">Phone</Label>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <Input
                id="profile-phone"
                type="tel"
                placeholder="+62812xxxxxxx"
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value.trim() === "" ? null : e.target.value)
                }
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "profile-phone-error" : undefined}
              />
            )}
          />
          <p className="text-[11px] text-muted-foreground">Include the country code, e.g. +62.</p>
          {errors.phone && (
            <p id="profile-phone-error" role="alert" className="text-xs text-destructive">
              {errors.phone.message}
            </p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="profile-company">Company (optional)</Label>
          <Controller
            control={control}
            name="company"
            render={({ field }) => (
              <Input
                id="profile-company"
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value.trim() === "" ? null : e.target.value)
                }
              />
            )}
          />
          {errors.company && (
            <p role="alert" className="text-xs text-destructive">
              {errors.company.message}
            </p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting || updateProfile.isPending}>
          {isSubmitting || updateProfile.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
