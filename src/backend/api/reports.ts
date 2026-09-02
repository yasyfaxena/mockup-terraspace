import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards-server";

export const adminGetPayments = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();

  const bookings = await db.booking.findMany({
    where: {
      totalAmount: { gt: 0 },
    },
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
    amount: Number(b.totalAmount),
    method: b.method,
    status: b.status === "cancelled" ? "refunded" : "paid",
    created_at: b.createdAt.toISOString(),
    customer_name: b.user.profile?.fullName ?? b.user.email,
  }));
});

// 8. Admin Get Overview/Dashboard Data

export const adminGetOverview = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookings = await db.booking.findMany({
    where: {
      bookingDate: today,
    },
    include: {
      user: {
        include: { profile: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return bookings.map((b) => ({
    id: b.id,
    user_id: b.userId,
    workspace_name: b.workspaceName,
    start_time: b.startTime,
    end_time: b.endTime,
    status: b.status,
    total_amount: Number(b.totalAmount),
    booking_date: b.bookingDate.toISOString().split("T")[0],
    customer_name: b.user.profile?.fullName ?? b.user.email,
  }));
});

// 9. Admin Get Bookings list

export const adminGetBookings = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();

  const bookings = await db.booking.findMany({
    include: {
      user: {
        include: { profile: true },
      },
    },
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
    customer_name: b.user.profile?.fullName ?? b.user.email,
  }));
});

// 10. Admin Get Notifications
