import { getDb } from "@/lib/d1";
import { getFreeCredits, getFreeCreditsRefillMs } from "@/lib/billing/credit-config";
import { hasActivePass } from "@/lib/billing/passes";

type RefillRow = {
  plan_id: string;
  current_period_end: number | null;
  credits_balance: number;
  free_credits_refill_at: number | null;
  created_at: number;
};

export function getNextFreeRefillAt(lastRefillAt: number): number {
  return lastRefillAt + getFreeCreditsRefillMs();
}

/** Recharge le solde gratuit à FREE_CREDITS si l'intervalle est écoulé (sans forfait actif). */
export async function applyFreeCreditRefill(userId: string): Promise<{
  refilled: boolean;
  balance: number;
  nextRefillAt: number | null;
}> {
  const db = getDb();
  const row = await db
    .prepare(
      `SELECT plan_id, current_period_end, credits_balance, free_credits_refill_at, created_at
       FROM subscriptions WHERE user_id = ?`
    )
    .bind(userId)
    .first<RefillRow>();

  if (!row) {
    return { refilled: false, balance: 0, nextRefillAt: null };
  }

  if (hasActivePass(row)) {
    return {
      refilled: false,
      balance: row.credits_balance ?? 0,
      nextRefillAt: null,
    };
  }

  const cap = getFreeCredits();
  const refillMs = getFreeCreditsRefillMs();
  const now = Date.now();
  const lastRefill = row.free_credits_refill_at ?? row.created_at ?? now;
  const due = now - lastRefill >= refillMs;

  if (due) {
    await db
      .prepare(
        `UPDATE subscriptions
         SET credits_balance = ?, free_credits_refill_at = ?, updated_at = ?
         WHERE user_id = ?`
      )
      .bind(cap, now, now, userId)
      .run();
    return { refilled: true, balance: cap, nextRefillAt: getNextFreeRefillAt(now) };
  }

  let balance = row.credits_balance ?? 0;
  if (balance > cap) {
    balance = cap;
    await db
      .prepare(`UPDATE subscriptions SET credits_balance = ?, updated_at = ? WHERE user_id = ?`)
      .bind(balance, now, userId)
      .run();
  }

  return { refilled: false, balance, nextRefillAt: getNextFreeRefillAt(lastRefill) };
}

export function formatRefillCountdown(nextRefillAt: number | null): string | null {
  if (!nextRefillAt) return null;
  const ms = nextRefillAt - Date.now();
  if (ms <= 0) return "bientôt";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h} h ${m} min`;
  if (h > 0) return `${h} h`;
  return `${m} min`;
}
