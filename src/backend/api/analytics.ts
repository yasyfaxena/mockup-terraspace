import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards-server";

export const adminGetAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();

  const [bookings, profiles] = await Promise.all([
    db.booking.findMany({
      select: {
        id: true,
        status: true,
        totalAmount: true,
        bookingDate: true,
        locationSlug: true,
        workspaceName: true,
        createdAt: true,
        userId: true,
      },
    }),
    db.profile.findMany({
      select: {
        id: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      total_amount: Number(b.totalAmount),
      booking_date: b.bookingDate.toISOString().split("T")[0],
      location_slug: b.locationSlug,
      workspace_name: b.workspaceName,
      created_at: b.createdAt.toISOString(),
      user_id: b.userId,
    })),
    profiles: profiles.map((p) => ({
      id: p.id,
      created_at: p.createdAt.toISOString(),
    })),
  };
});

// 14. Admin Get Dashboard Data (all bookings, limit 50, desc order)

export const adminGetDashboardBookings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();

  const bookings = await db.booking.findMany({
    take: 50,
    orderBy: { bookingDate: "desc" },
  });

  return bookings.map((b) => ({
    id: b.id,
    user_id: b.userId,
    workspace_id: b.workspaceId,
    workspace_name: b.workspaceName,
    location_slug: b.locationSlug,
    booking_date: b.bookingDate.toISOString().split("T")[0],
    start_time: b.startTime,
    end_time: b.endTime,
    total_amount: Number(b.totalAmount),
    method: b.method,
    status: b.status,
    reference: b.reference,
    access_code: b.accessCode,
    created_at: b.createdAt.toISOString(),
  }));
});

// 15. Admin Get Calendar Bookings (all bookings, ordered by date)

export const adminGetCalendarBookings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();

  const bookings = await db.booking.findMany({
    orderBy: { bookingDate: "asc" },
  });

  return bookings.map((b) => ({
    id: b.id,
    workspace_name: b.workspaceName,
    booking_date: b.bookingDate.toISOString().split("T")[0],
    start_time: b.startTime,
    end_time: b.endTime,
    total_amount: Number(b.totalAmount),
    status: b.status,
    reference: b.reference,
  }));
});

// 16. Admin Get Payments with customer names

export const adminGetPaymentsDetailed = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();

  const bookings = await db.booking.findMany({
    include: {
      user: {
        include: { profile: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return bookings.map((b) => ({
    id: b.id,
    reference: b.reference,
    workspace_name: b.workspaceName,
    total_amount: Number(b.totalAmount),
    method: b.method,
    status: b.status,
    booking_date: b.bookingDate.toISOString().split("T")[0],
    created_at: b.createdAt.toISOString(),
    user_id: b.userId,
    profiles: b.user.profile ? { full_name: b.user.profile.fullName } : null,
  }));
});
