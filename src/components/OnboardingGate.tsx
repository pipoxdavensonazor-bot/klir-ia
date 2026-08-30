"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useKlirAuth } from "@/components/AuthProvider";

const SKIP = ["/onboarding", "/sign-in", "/sign-up", "/pricing", "/developers", "/studio", "/domains", "/forgot-password", "/reset-password", "/h/"];

export default function OnboardingGate({ children }: { children: ReactNode }) {
  const { isSignedIn, loading } = useKlirAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !isSignedIn) return;
    if (SKIP.some((p) => pathname.startsWith(p))) return;

    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.needsOnboarding) router.replace("/onboarding");
      })
      .catch(() => undefined);
  }, [isSignedIn, loading, pathname, router]);

  return children;
}
