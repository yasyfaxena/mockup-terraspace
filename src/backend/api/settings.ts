import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards-server";

// 5. Admin Get Settings
export const adminGetSettings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const settings = await db.adminSettings.findUnique({
    where: { id: true },
  });

  if (!settings) return null;

  return {
    id: settings.id,
    company_name: settings.companyName,
    support_email: settings.supportEmail,
    currency: settings.currency,
    tax_percent: Number(settings.taxPercent),
    cancellation_window_hours: settings.cancellationWindowHours,
    advance_booking_days: settings.advanceBookingDays,
    email_notifications_enabled: settings.emailNotificationsEnabled,
    updated_at: settings.updatedAt.toISOString(),
  };
});

// 6. Admin Update Settings
export const adminUpdateSettings = createServerFn({ method: "POST" })
  .validator(
    (data: {
      company_name?: string;
      support_email?: string | null;
      currency?: string;
      tax_percent?: number;
      cancellation_window_hours?: number;
      advance_booking_days?: number;
      email_notifications_enabled?: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    const updated = await db.adminSettings.update({
      where: { id: true },
      data: {
        ...(data.company_name !== undefined ? { companyName: data.company_name } : {}),
        ...(data.support_email !== undefined ? { supportEmail: data.support_email } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.tax_percent !== undefined ? { taxPercent: data.tax_percent } : {}),
        ...(data.cancellation_window_hours !== undefined
          ? { cancellationWindowHours: data.cancellation_window_hours }
          : {}),
        ...(data.advance_booking_days !== undefined
          ? { advanceBookingDays: data.advance_booking_days }
          : {}),
        ...(data.email_notifications_enabled !== undefined
          ? { emailNotificationsEnabled: data.email_notifications_enabled }
          : {}),
      },
    });

    return {
      success: true,
      settings: {
        id: updated.id,
        company_name: updated.companyName,
        support_email: updated.supportEmail,
        currency: updated.currency,
        tax_percent: Number(updated.taxPercent),
        cancellation_window_hours: updated.cancellationWindowHours,
        advance_booking_days: updated.advanceBookingDays,
        email_notifications_enabled: updated.emailNotificationsEnabled,
        updated_at: updated.updatedAt.toISOString(),
      },
    };
  });

// 7. Admin Get Payments (All bookings with amount > 0)
