import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards-server";

export const adminCreateGuest = createServerFn({ method: "POST" })
  .validator(
    (data: {
      bookingId: string;
      guestName: string;
      guestEmail?: string | null;
      accessFrom?: string | null;
      accessUntil?: string | null;
      status?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const guest = await db.guest.create({
      data: {
        bookingId: data.bookingId,
        guestName: data.guestName.trim(),
        guestEmail: data.guestEmail ?? null,
        accessFrom: data.accessFrom ?? null,
        accessUntil: data.accessUntil ?? null,
        status: data.status ?? "scheduled",
      },
      include: { booking: true },
    });
    return {
      id: guest.id,
      booking_id: guest.bookingId,
      guest_name: guest.guestName,
      guest_email: guest.guestEmail,
      access_from: guest.accessFrom,
      access_until: guest.accessUntil,
      status: guest.status,
      created_at: guest.createdAt.toISOString(),
      booking_reference: guest.booking.reference,
      workspace_name: guest.booking.workspaceName,
      location_slug: guest.booking.locationSlug,
      booking_date: guest.booking.bookingDate.toISOString().split("T")[0],
      user_id: guest.booking.userId,
    };
  });
