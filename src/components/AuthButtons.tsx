"use client";

import { useKlirAuth } from "@/components/AuthProvider";

export default function AuthButtons() {
  const { isSignedIn, user, loading, logout } = useKlirAuth();

  if (loading) return null;

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <a
          href="/sign-in"
          className="text-sm font-medium px-3 py-1.5 rounded-lg bg-klir-primary text-white hover:bg-klir-dark transition"
        >
          Connexion
        </a>
      </div>
    );
  }

  const label = user?.name || user?.email?.split("@")[0] || "Compte";

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline text-xs text-klir-ink/55 truncate max-w-[8rem]">{label}</span>
      <button
        type="button"
        onClick={() => logout()}
        className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-klir-primary/20 text-klir-primary hover:bg-klir-primary/5 transition"
      >
        Déconnexion
      </button>
    </div>
  );
}
