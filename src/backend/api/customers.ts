import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards-server";

export const adminGetNotifications = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();

  const [bookings, profiles] = await Promise.all([
    db.booking.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          include: { profile: true },
        },
      },
    }),
    db.profile.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    bookings: bookings.map((b) => ({
      id: b.id,
      workspace_name: b.workspaceName,
      reference: b.reference,
      status: b.status,
      created_at: b.createdAt.toISOString(),
      profiles: {
        full_name: b.user.profile?.fullName ?? b.user.email,
      },
    })),
    profiles: profiles.map((p) => ({
      id: p.id,
      full_name: p.fullName,
      created_at: p.createdAt.toISOString(),
    })),
  };
});

// 11. Admin Get Guests

export const adminGetGuests = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();

  const guests = await db.guest.findMany({
    include: {
      booking: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return guests.map((g) => ({
    id: g.id,
    booking_id: g.bookingId,
    guest_name: g.guestName,
    guest_email: g.guestEmail,
    access_from: g.accessFrom,
    access_until: g.accessUntil,
    status: g.status,
    created_at: g.createdAt.toISOString(),
    booking_reference: g.booking.reference,
    workspace_name: g.booking.workspaceName,
    location_slug: g.booking.locationSlug,
    booking_date: g.booking.bookingDate.toISOString().split("T")[0],
    user_id: g.booking.userId,
  }));
});

// 12. Admin Get Clients/Members

export const adminGetClients = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();

  const [profiles, bookings] = await Promise.all([
    db.profile.findMany({ include: { user: { select: { email: true } } } }),
    db.booking.findMany({
      select: {
        userId: true,
        totalAmount: true,
        bookingDate: true,
      },
    }),
  ]);

  return {
    profiles: profiles.map((p) => ({
      id: p.id,
      full_name: p.fullName,
      phone: p.phone,
      company: p.company,
      role: p.role,
      email: p.user.email,
      created_at: p.createdAt.toISOString(),
    })),
    bookings: bookings.map((b) => ({
      user_id: b.userId,
      total_amount: Number(b.totalAmount),
      booking_date: b.bookingDate.toISOString().split("T")[0],
    })),
  };
});

// 13. Admin Get Analytics
