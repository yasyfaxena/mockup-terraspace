import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards-server";
import { hashPassword } from "@/lib/password-server";

export const adminUpdateProfile = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      fullName?: string;
      phone?: string | null;
      company?: string | null;
      role?: string;
      email?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const profileData = {
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.company !== undefined ? { company: data.company } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
    };
    await db.profile.update({ where: { id: data.id }, data: profileData });
    if (data.email !== undefined) {
      await db.user.update({
        where: { id: data.id },
        data: { email: data.email.trim().toLowerCase() },
      });
    }
    const profile = await db.profile.findUniqueOrThrow({ where: { id: data.id } });
    const user = await db.user.findUniqueOrThrow({
      where: { id: data.id },
      select: { email: true },
    });
    return {
      id: profile.id,
      full_name: profile.fullName,
      phone: profile.phone,
      company: profile.company,
      role: profile.role,
      email: user.email,
      created_at: profile.createdAt.toISOString(),
    };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    await db.user.delete({ where: { id: data.id } });
    return { success: true };
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .validator(
    (data: {
      email: string;
      password: string;
      fullName: string;
      phone?: string | null;
      company?: string | null;
      role?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const email = data.email.trim().toLowerCase();
    if (!email || !data.password || !data.fullName.trim())
      throw new Error("Missing required user fields");
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) throw new Error("Email already exists");

    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, passwordHash: await hashPassword(data.password) },
      });
      await tx.profile.create({
        data: {
          id: created.id,
          fullName: data.fullName.trim(),
          phone: data.phone ?? null,
          company: data.company ?? null,
          role: data.role ?? "customer",
        },
      });
      return created;
    });
    return { id: user.id, email: user.email };
  });
