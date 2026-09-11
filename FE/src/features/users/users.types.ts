import type { Role } from "@/features/auth";

/** Mirrors BE `users.mapper.js`'s `toAuthMethodDto`. */
export type AuthMethodDto = {
  providerId: string;
  linkedAt: string;
};

/**
 * Mirrors BE `users.mapper.js`'s `toMeDto` — the full profile record
 * (phone, company, spend/booking stats), distinct from `features/auth`'s
 * `useSession()`, which only answers "is someone logged in and what's
 * their role" (features/users.md §3).
 */
export type MeDto = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  company: string | null;
  image: string | null;
  emailVerified: boolean;
  role: Role;
  createdAt: string;
  stats: {
    totalBookings: number;
    upcomingBookings: number;
    totalSpent: string;
    currency: string;
  };
  authMethods: AuthMethodDto[];
};
