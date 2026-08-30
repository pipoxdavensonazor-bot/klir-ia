"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type KlirUser = {
  id: string;
  email: string;
  name: string | null;
};

type AuthState = {
  user: KlirUser | null;
  isSignedIn: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  isSignedIn: false,
  loading: true,
  refresh: async () => undefined,
  logout: async () => undefined,
});

export function useKlirAuth() {
  return useContext(AuthContext);
}

/** @deprecated alias compat */
export function useAuth() {
  const { isSignedIn, user, loading } = useKlirAuth();
  return { isSignedIn, userId: user?.id ?? null, isLoaded: !loading };
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<KlirUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setUser(null);
    window.location.href = "/";
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isSignedIn: Boolean(user),
        loading,
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
