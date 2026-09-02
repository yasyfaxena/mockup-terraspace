import { createServerFn } from "@tanstack/react-start";
import { setCookie, getCookie, deleteCookie } from "@tanstack/react-start/server";
import { db } from "./db";
import { hashPassword, verifyPassword } from "./password-server";

// Get the current user from the session cookie
export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const sessionId = getCookie("session_id");

  if (!sessionId) {
    return { session: null, user: null, profile: null };
  }

  const dbSession = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!dbSession || dbSession.expiresAt < new Date()) {
    if (dbSession) {
      await db.session.delete({ where: { id: sessionId } }).catch(() => {});
    }
    deleteCookie("session_id");
    return { session: null, user: null, profile: null };
  }

  // Re-format user and profile to match frontend expectations
  const { passwordHash, ...userWithoutPassword } = dbSession.user;

  return {
    session: {
      access_token: dbSession.id,
      token_type: "bearer",
      expires_in: Math.floor((dbSession.expiresAt.getTime() - Date.now()) / 1000),
      refresh_token: "",
      user: {
        id: userWithoutPassword.id,
        app_metadata: {},
        user_metadata: {
          full_name: userWithoutPassword.profile?.fullName ?? "",
        },
        aud: "authenticated",
        role: "authenticated",
        email: userWithoutPassword.email,
        created_at: userWithoutPassword.createdAt.toISOString(),
      },
    },
    user: {
      id: userWithoutPassword.id,
      email: userWithoutPassword.email,
    },
    profile: userWithoutPassword.profile
      ? {
          id: userWithoutPassword.profile.id,
          full_name: userWithoutPassword.profile.fullName,
          phone: userWithoutPassword.profile.phone,
          company: userWithoutPassword.profile.company,
          role: userWithoutPassword.profile.role,
        }
      : null,
  };
});

// Sign In
export const signInServer = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data: { email, password } }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return { error: "Email atau password salah.", session: null, user: null, profile: null };
    }

    // Create session (expires in 7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await db.session.create({
      data: {
        userId: user.id,
        expiresAt,
      },
    });

    setCookie("session_id", session.id, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      expires: expiresAt,
    });

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      error: null,
      session: {
        access_token: session.id,
        token_type: "bearer",
        expires_in: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
        refresh_token: "",
        user: {
          id: userWithoutPassword.id,
          app_metadata: {},
          user_metadata: {
            full_name: userWithoutPassword.profile?.fullName ?? "",
          },
          aud: "authenticated",
          role: "authenticated",
          email: userWithoutPassword.email,
          created_at: userWithoutPassword.createdAt.toISOString(),
        },
      },
      user: {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
      },
      profile: userWithoutPassword.profile
        ? {
            id: userWithoutPassword.profile.id,
            full_name: userWithoutPassword.profile.fullName,
            phone: userWithoutPassword.profile.phone,
            company: userWithoutPassword.profile.company,
            role: userWithoutPassword.profile.role,
          }
        : null,
    };
  });

// Sign Up
export const signUpServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      company?: string;
    }) => data,
  )
  .handler(async ({ data: { email, password, fullName, phone, company } }) => {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return { error: "Email sudah digunakan.", session: null, user: null, profile: null };
    }

    // Check if it's the very first user; if so, make them admin!
    const userCount = await db.user.count();
    const role = userCount === 0 ? "admin" : "customer";

    const hashedPassword = await hashPassword(password);

    // Create user and profile in a transaction
    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: hashedPassword,
        },
      });

      const newProfile = await tx.profile.create({
        data: {
          id: newUser.id,
          fullName,
          phone: phone || null,
          company: company || null,
          role,
        },
      });

      return {
        ...newUser,
        profile: newProfile,
      };
    });

    // Create session (expires in 7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await db.session.create({
      data: {
        userId: user.id,
        expiresAt,
      },
    });

    setCookie("session_id", session.id, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      expires: expiresAt,
    });

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      error: null,
      session: {
        access_token: session.id,
        token_type: "bearer",
        expires_in: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
        refresh_token: "",
        user: {
          id: userWithoutPassword.id,
          app_metadata: {},
          user_metadata: {
            full_name: userWithoutPassword.profile?.fullName ?? "",
          },
          aud: "authenticated",
          role: "authenticated",
          email: userWithoutPassword.email,
          created_at: userWithoutPassword.createdAt.toISOString(),
        },
      },
      user: {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
      },
      profile: userWithoutPassword.profile
        ? {
            id: userWithoutPassword.profile.id,
            full_name: userWithoutPassword.profile.fullName,
            phone: userWithoutPassword.profile.phone,
            company: userWithoutPassword.profile.company,
            role: userWithoutPassword.profile.role,
          }
        : null,
    };
  });

// Sign Out
export const signOutServer = createServerFn({ method: "POST" }).handler(async () => {
  const sessionId = getCookie("session_id");

  if (sessionId) {
    await db.session.delete({ where: { id: sessionId } }).catch(() => {});
    deleteCookie("session_id");
  }

  return { success: true };
});
