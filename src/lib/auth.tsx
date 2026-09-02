import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCurrentUser, signInServer, signUpServer, signOutServer } from "./auth-server";

type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  company: string | null;
  role: string;
};

// App-level user/session shapes kept stable for the existing UI
type AppUser = {
  id: string;
  app_metadata: Record<string, unknown>;
  user_metadata: {
    full_name?: string;
  };
  aud: string;
  role: string;
  email?: string;
  created_at: string;
};

type AppSession = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: AppUser;
};

type UserSummary = {
  id: string;
  email: string;
};

type AuthCtx = {
  session: AppSession | null;
  user: UserSummary | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    company?: string;
  }) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error: string | null }>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      if (data.session && data.user) {
        setSession(data.session as unknown as AppSession);
        setUser(data.user);
        setProfile(data.profile);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error("[Auth] Initial auth check failed:", error);
      setSession(null);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const signIn = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { error: "Email wajib diisi." };
    }
    if (!password) {
      return { error: "Password wajib diisi." };
    }
    try {
      setLoading(true);
      const res = await signInServer({ data: { email: normalizedEmail, password } });
      if (res.error) {
        return { error: res.error };
      }
      setSession(res.session as unknown as AppSession);
      setUser(res.user);
      setProfile(res.profile);
      return { error: null };
    } catch (err) {
      console.error("[Auth] Unexpected login error:", err);
      return {
        error: err instanceof Error ? err.message : "Terjadi kesalahan saat login.",
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback<AuthCtx["signUp"]>(async (input) => {
    const email = input.email.trim().toLowerCase();
    if (!email) {
      return { error: "Email wajib diisi.", needsConfirmation: false };
    }
    if (!input.password) {
      return { error: "Password wajib diisi.", needsConfirmation: false };
    }
    try {
      setLoading(true);
      const res = await signUpServer({
        data: {
          email,
          password: input.password,
          fullName: input.fullName,
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.company !== undefined ? { company: input.company } : {}),
        },
      });
      if (res.error) {
        return { error: res.error, needsConfirmation: false };
      }
      setSession(res.session as unknown as AppSession);
      setUser(res.user);
      setProfile(res.profile);
      return { error: null, needsConfirmation: false };
    } catch (err) {
      console.error("[Auth] Unexpected signup error:", err);
      return {
        error: err instanceof Error ? err.message : "Terjadi kesalahan saat membuat akun.",
        needsConfirmation: false,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await signOutServer();
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    // No-op for custom auth
    return { error: null };
  }, []);

  const isAdmin = profile?.role === "admin" || profile?.role === "staff";

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      user,
      profile,
      loading,
      isAdmin,
      signIn,
      signUp,
      signOut,
      resendConfirmation,
    }),
    [session, user, profile, loading, isAdmin, signIn, signUp, signOut, resendConfirmation],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
