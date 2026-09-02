import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards-server";
import { APP_CONFIG } from "@/shared/constants";

export const adminUpdateBooking = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      status?: string;
      bookingDate?: string;
      startTime?: string;
      endTime?: string;
      totalAmount?: number;
      method?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const updated = await db.booking.update({
      where: { id: data.id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.bookingDate !== undefined ? { bookingDate: new Date(data.bookingDate) } : {}),
        ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
        ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
        ...(data.totalAmount !== undefined ? { totalAmount: BigInt(data.totalAmount) } : {}),
        ...(data.method !== undefined ? { method: data.method } : {}),
      },
    });
    return {
      id: updated.id,
      status: updated.status,
      booking_date: updated.bookingDate.toISOString().split("T")[0],
      start_time: updated.startTime,
      end_time: updated.endTime,
      total_amount: Number(updated.totalAmount),
      method: updated.method,
    };
  });

export const adminDeleteBooking = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    await db.booking.delete({ where: { id: data.id } });
    return { success: true };
  });

export const adminUpdateGuest = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      guestName?: string;
      guestEmail?: string | null;
      accessFrom?: string | null;
      accessUntil?: string | null;
      status?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    await db.guest.update({
      where: { id: data.id },
      data: {
        ...(data.guestName !== undefined ? { guestName: data.guestName } : {}),
        ...(data.guestEmail !== undefined ? { guestEmail: data.guestEmail } : {}),
        ...(data.accessFrom !== undefined ? { accessFrom: data.accessFrom } : {}),
        ...(data.accessUntil !== undefined ? { accessUntil: data.accessUntil } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
    const updated = await db.guest.findUniqueOrThrow({ where: { id: data.id } });
    const booking = await db.booking.findUniqueOrThrow({ where: { id: updated.bookingId } });
    return {
      id: updated.id,
      booking_id: updated.bookingId,
      guest_name: updated.guestName,
      guest_email: updated.guestEmail,
      access_from: updated.accessFrom,
      access_until: updated.accessUntil,
      status: updated.status,
      created_at: updated.createdAt.toISOString(),
      booking_reference: booking.reference,
      workspace_name: booking.workspaceName,
      location_slug: booking.locationSlug,
      booking_date: booking.bookingDate.toISOString().split("T")[0],
      user_id: booking.userId,
    };
  });

export const adminDeleteGuest = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    await db.guest.delete({ where: { id: data.id } });
    return { success: true };
  });

export const adminCreateBooking = createServerFn({ method: "POST" })
  .validator(
    (data: {
      userId: string;
      workspaceId: string;
      bookingDate: string;
      startTime: string;
      endTime: string;
      method?: string;
      status?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const workspace = await db.workspace.findUnique({ where: { id: data.workspaceId } });
    if (!workspace) throw new Error("Workspace not found");

    const [startHour, startMinute] = data.startTime.split(":").map(Number);
    const [endHour, endMinute] = data.endTime.split(":").map(Number);
    const durationMinutes = Math.max(
      APP_CONFIG.minimumBookingDurationMinutes,
      endHour * 60 + endMinute - (startHour * 60 + startMinute),
    );
    const totalAmount = Math.round(Number(workspace.price) * (durationMinutes / 60));
    const reference = `${APP_CONFIG.bookingReferencePrefix}${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
    const accessCode = `${APP_CONFIG.accessCodePrefix}|${reference}|${workspace.id}|${data.bookingDate}|${data.startTime}-${data.endTime}`;

    const booking = await db.booking.create({
      data: {
        userId: data.userId,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        locationSlug: workspace.locationSlug,
        bookingDate: new Date(data.bookingDate),
        startTime: data.startTime,
        endTime: data.endTime,
        totalAmount: BigInt(totalAmount),
        method: data.method ?? APP_CONFIG.defaultPaymentMethod,
        status: data.status ?? APP_CONFIG.defaultBookingStatus,
        reference,
        accessCode,
      },
    });

    return {
      id: booking.id,
      reference: booking.reference,
      booking_date: booking.bookingDate.toISOString().split("T")[0],
      total_amount: totalAmount,
    };
  });
