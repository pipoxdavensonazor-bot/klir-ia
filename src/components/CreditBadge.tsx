"use client";

import { useKlirAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";

type Wallet = {
  balance: number;
  planId: string;
  passActive?: boolean;
  nextRefillAt?: number | null;
};

function formatCountdown(nextRefillAt: number): string {
  const ms = nextRefillAt - Date.now();
  if (ms <= 0) return "bientôt";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}h${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export default function CreditBadge() {
  const { isSignedIn, loading } = useKlirAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    if (loading || !isSignedIn) {
      setWallet(null);
      return;
    }
    fetch("/api/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.balance === "number") setWallet(d);
      })
      .catch(() => undefined);
  }, [isSignedIn, loading]);

  if (loading || !isSignedIn || !wallet) return null;

  if (wallet.passActive) {
    return (
      <span className="hidden sm:inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-800">
        Illimité
      </span>
    );
  }

  const low = wallet.balance <= 10;
  const empty = wallet.balance <= 0;
  const countdown =
    empty && wallet.nextRefillAt ? formatCountdown(wallet.nextRefillAt) : null;

  return (
    <a
      href="/pricing"
      title={countdown ? `Recharge dans ${countdown}` : "Voir forfaits"}
      className={`hidden sm:inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium border transition ${
        low
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-klir-primary/15 bg-klir-primary/5 text-klir-primary hover:bg-klir-primary/10"
      }`}
    >
      <span>{wallet.balance.toLocaleString("fr-CA")} cr.</span>
      {countdown ? <span className="opacity-75">· {countdown}</span> : null}
    </a>
  );
}
