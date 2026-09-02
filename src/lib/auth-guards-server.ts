import { getCookie, deleteCookie } from "@tanstack/react-start/server";
import { db } from "./db";

export async function requireAuth() {
  const sessionId = getCookie("session_id");
  if (!sessionId) throw new Error("Unauthorized");

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: { include: { profile: true } } },
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) await db.session.delete({ where: { id: sessionId } }).catch(() => {});
    deleteCookie("session_id");
    throw new Error("Unauthorized");
  }

  return {
    session,
    user: { id: session.user.id, email: session.user.email },
    profile: session.user.profile
      ? {
          id: session.user.profile.id,
          fullName: session.user.profile.fullName,
          phone: session.user.profile.phone,
          company: session.user.profile.company,
          role: session.user.profile.role,
        }
      : null,
  };
}

export async function requireAdmin() {
  const auth = await requireAuth();
  const role = auth.profile?.role;
  if (role !== "admin" && role !== "staff") throw new Error("Forbidden");
  return auth;
}
