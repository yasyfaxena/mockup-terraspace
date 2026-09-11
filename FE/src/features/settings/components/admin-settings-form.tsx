import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateSettingsSchema, type UpdateSettingsInput } from "../settings.schema";
import { useAdminSettings, useUpdateAdminSettings } from "../settings.queries";
import { SUPPORTED_CURRENCIES } from "../settings.types";

const DEFAULT_VALUES: UpdateSettingsInput = {
  companyName: "",
  supportEmail: null,
  currency: "IDR",
  taxPercent: 0,
  cancellationWindowHours: 0,
  advanceBookingDays: 0,
  emailNotificationsEnabled: true,
};

/**
 * A genuinely editable currency select, unlike V1's disabled/USD-locked
 * field (development-phases.md Phase 7) — restricted to the exact
 * currencies BE's `CURRENCY_EXPONENT` knows how to charge, and `taxPercent`
 * is validated client-side to ≤2 decimal places to mirror BE's own
 * `Number.isInteger(value * 100)` check before it ever reaches the server.
 */
export function AdminSettingsForm() {
  const { data: settings, isPending } = useAdminSettings();
  const updateSettings = useUpdateAdminSettings();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UpdateSettingsInput>({
    resolver: zodResolver(updateSettingsSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!settings) return;
    reset({
      companyName: settings.companyName,
      supportEmail: settings.supportEmail,
      currency: settings.currency,
      taxPercent: Number(settings.taxPercent),
      cancellationWindowHours: settings.cancellationWindowHours,
      advanceBookingDays: settings.advanceBookingDays,
      emailNotificationsEnabled: settings.emailNotificationsEnabled,
    });
  }, [settings, reset]);

  async function onSubmit(values: UpdateSettingsInput) {
    try {
      await updateSettings.mutateAsync(values);
      toast.success("Settings saved.");
    } catch {
      // query-client's global handler already toasts the real ApiError message
    }
  }

  if (isPending || !settings) {
    return <p className="text-sm text-white/40">Loading…</p>;
  }

  const inputClass = "border-white/[.1] bg-white/[.05] text-white placeholder:text-white/30";
  const labelClass = "text-xs font-medium text-white/60";

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="max-w-lg space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="settings-company" className={labelClass}>
          Company name
        </Label>
        <Input id="settings-company" className={inputClass} {...register("companyName")} />
        {errors.companyName && (
          <p className="text-xs text-destructive">{errors.companyName.message}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="settings-email" className={labelClass}>
          Support email
        </Label>
        <Controller
          control={control}
          name="supportEmail"
          render={({ field }) => (
            <Input
              id="settings-email"
              type="email"
              className={inputClass}
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value || null)}
            />
          )}
        />
        {errors.supportEmail && (
          <p className="text-xs text-destructive">{errors.supportEmail.message}</p>
        )}
      </div>

      <Controller
        control={control}
        name="currency"
        render={({ field }) => (
          <div className="grid gap-1.5">
            <Label className={labelClass}>Currency</Label>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-white/35">
              Changing this only relabels future charges — it does not convert existing amounts.
            </p>
          </div>
        )}
      />

      <div className="grid gap-1.5">
        <Label htmlFor="settings-tax" className={labelClass}>
          Tax percent
        </Label>
        <Input
          id="settings-tax"
          type="number"
          min={0}
          max={100}
          step="0.01"
          className={inputClass}
          {...register("taxPercent", { valueAsNumber: true })}
        />
        {errors.taxPercent && (
          <p className="text-xs text-destructive">{errors.taxPercent.message}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="settings-cancel" className={labelClass}>
          Cancellation window (hours)
        </Label>
        <Input
          id="settings-cancel"
          type="number"
          min={0}
          step="1"
          className={inputClass}
          {...register("cancellationWindowHours", { valueAsNumber: true })}
        />
        {errors.cancellationWindowHours && (
          <p className="text-xs text-destructive">{errors.cancellationWindowHours.message}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="settings-advance" className={labelClass}>
          Advance booking window (days)
        </Label>
        <Input
          id="settings-advance"
          type="number"
          min={0}
          step="1"
          className={inputClass}
          {...register("advanceBookingDays", { valueAsNumber: true })}
        />
        {errors.advanceBookingDays && (
          <p className="text-xs text-destructive">{errors.advanceBookingDays.message}</p>
        )}
      </div>

      <Controller
        control={control}
        name="emailNotificationsEnabled"
        render={({ field }) => (
          <label className="flex items-center gap-2.5 text-sm text-white/70">
            <Switch checked={field.value} onCheckedChange={field.onChange} />
            Email notifications enabled
          </label>
        )}
      />

      <Button type="submit" disabled={isSubmitting || updateSettings.isPending}>
        {isSubmitting || updateSettings.isPending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
