import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth-guards-server";
import { APP_CONFIG } from "@/shared/constants";

// 1. Get Bookings for Date (for workspace)
export const getBookingsForDate = createServerFn({ method: "POST" })
  .validator((data: { workspaceId: string; date: string }) => data)
  .handler(async ({ data: { workspaceId, date } }) => {
    const bookingDate = new Date(date);
    const bookings = await db.booking.findMany({
      where: {
        workspaceId,
        bookingDate,
        status: { not: "cancelled" },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        workspaceName: true,
      },
    });

    // Map fields back to camelCase for the frontend (or compatible structure)
    return bookings.map((b) => ({
      id: b.id,
      start_time: b.startTime,
      end_time: b.endTime,
      status: b.status,
      workspace_name: b.workspaceName,
    }));
  });

// 2. Create Booking (with optional guests)
export const createBooking = createServerFn({ method: "POST" })
  .validator(
    (data: {
      workspaceId: string;
      date: string;
      start: string;
      end: string;
      total: number;
      method: string;
      guests: string[];
    }) => data,
  )
  .handler(async ({ data }) => {
    const { user } = await requireAuth();
    if (!user) throw new Error("Unauthorized");

    const workspace = await db.workspace.findUnique({ where: { id: data.workspaceId } });
    if (!workspace) throw new Error("Workspace not found");

    const reference = `${APP_CONFIG.bookingReferencePrefix}${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
    const accessCode = `${APP_CONFIG.accessCodePrefix}|${reference}|${workspace.id}|${data.date}|${data.start}-${data.end}`;

    const booking = await db.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          userId: user.id,
          workspaceId: data.workspaceId,
          workspaceName: workspace.name,
          locationSlug: workspace.locationSlug,
          bookingDate: new Date(data.date),
          startTime: data.start,
          endTime: data.end,
          totalAmount: BigInt(data.total),
          method: data.method,
          reference,
          accessCode,
        },
      });

      if (data.guests.length > 0) {
        await tx.guest.createMany({
          data: data.guests.map((email) => ({
            bookingId: newBooking.id,
            guestName: email,
            guestEmail: email,
            accessFrom: data.start,
            accessUntil: data.end,
            status: "scheduled",
          })),
        });
      }

      return newBooking;
    });

    return {
      id: booking.id,
      reference: booking.reference,
      total_amount: Number(booking.totalAmount),
    };
  });

// 3. Get User Bookings
export const getUserBookings = createServerFn({ method: "GET" }).handler(async () => {
  const { user } = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const bookings = await db.booking.findMany({
    where: { userId: user.id },
    orderBy: { bookingDate: "desc" },
  });

  return bookings.map((b) => ({
    ...b,
    booking_date: b.bookingDate.toISOString().split("T")[0],
    total_amount: Number(b.totalAmount),
    user_id: b.userId,
    workspace_id: b.workspaceId,
    workspace_name: b.workspaceName,
    location_slug: b.locationSlug,
    start_time: b.startTime,
    end_time: b.endTime,
    access_code: b.accessCode,
    created_at: b.createdAt.toISOString(),
  }));
});

// 4. Cancel Booking (accessible by owner or admin)
export const cancelBooking = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data: { id } }) => {
    const auth = await requireAuth();
    if (!auth.user) throw new Error("Unauthorized");

    const booking = await db.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    const isAdmin = auth.profile?.role === "admin" || auth.profile?.role === "staff";
    if (booking.userId !== auth.user.id && !isAdmin) {
      throw new Error("Unauthorized");
    }

    const updated = await db.booking.update({
      where: { id },
      data: { status: "cancelled" },
    });

    return {
      success: true,
      booking: {
        ...updated,
        total_amount: Number(updated.totalAmount),
      },
    };
  });
