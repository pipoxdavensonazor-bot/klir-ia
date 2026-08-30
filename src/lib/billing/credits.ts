import { getDb } from "@/lib/d1";
import { getCreditsPerAction, getFreeCredits } from "@/lib/billing/credit-config";
import { applyFreeCreditRefill, getNextFreeRefillAt } from "@/lib/billing/credit-refill";
import { hasActivePass } from "@/lib/billing/passes";
import { getPlan, type PlanId } from "@/lib/billing/plans";
import type { SubscriptionRow } from "@/lib/billing/subscriptions";

export type CreditWallet = {
  balance: number;
  planId: PlanId;
  support: boolean;
  passActive: boolean;
  nextRefillAt: number | null;
};

type SubscriptionCreditRow = SubscriptionRow & {
  credits_balance?: number;
  free_grant_claimed?: number;
  free_credits_refill_at?: number | null;
};

function walletFromRow(row: SubscriptionCreditRow, balance: number, nextRefillAt: number | null): CreditWallet {
  const plan = getPlan(row.plan_id);
  const passActive = hasActivePass(row);
  return {
    balance,
    planId: (row.plan_id as PlanId) || "free",
    support: Boolean(plan?.support),
    passActive,
    nextRefillAt: passActive ? null : nextRefillAt,
  };
}

export async function getWallet(userId: string): Promise<CreditWallet | null> {
  const refill = await applyFreeCreditRefill(userId);

  const db = getDb();
  const row = await db
    .prepare("SELECT * FROM subscriptions WHERE user_id = ?")
    .bind(userId)
    .first<SubscriptionCreditRow>();

  if (!row) return null;

  return walletFromRow(row, refill.balance, refill.nextRefillAt);
}

/** Crée le compte crédits + grant gratuit initial. */
export async function ensureWallet(userId: string): Promise<CreditWallet> {
  const freeCredits = getFreeCredits();
  const db = getDb();
  const now = Date.now();
  const existing = await db
    .prepare("SELECT * FROM subscriptions WHERE user_id = ?")
    .bind(userId)
    .first<SubscriptionCreditRow>();

  if (!existing) {
    await db
      .prepare(
        `INSERT INTO subscriptions
          (user_id, plan_id, status, provider, provider_ref, current_period_end, credits_balance, free_grant_claimed, free_credits_refill_at, created_at, updated_at)
         VALUES (?, 'free', 'active', 'none', NULL, NULL, ?, 1, ?, ?, ?)`
      )
      .bind(userId, freeCredits, now, now, now)
      .run();
    const row: SubscriptionCreditRow = {
      user_id: userId,
      plan_id: "free",
      status: "active",
      provider: "none",
      provider_ref: null,
      current_period_end: null,
      credits_balance: freeCredits,
      free_grant_claimed: 1,
      free_credits_refill_at: now,
      created_at: now,
      updated_at: now,
    };
    return walletFromRow(row, freeCredits, getNextFreeRefillAt(now));
  }

  if (!existing.free_grant_claimed) {
    const balance = Math.min((existing.credits_balance ?? 0) + freeCredits, freeCredits);
    await db
      .prepare(
        `UPDATE subscriptions
         SET credits_balance = ?, free_grant_claimed = 1, free_credits_refill_at = ?, updated_at = ?
         WHERE user_id = ?`
      )
      .bind(balance, now, now, userId)
      .run();
    existing.free_credits_refill_at = now;
    existing.credits_balance = balance;
    return walletFromRow(existing, balance, getNextFreeRefillAt(now));
  }

  const refill = await applyFreeCreditRefill(userId);
  return walletFromRow(existing, refill.balance, refill.nextRefillAt);
}

export async function grantCredits(userId: string, planId: PlanId, amount: number) {
  const db = getDb();
  const now = Date.now();
  await ensureWallet(userId);
  await db
    .prepare(
      `UPDATE subscriptions
       SET credits_balance = credits_balance + ?,
           plan_id = ?,
           status = 'active',
           updated_at = ?
       WHERE user_id = ?`
    )
    .bind(amount, planId, now, userId)
    .run();
  const plan = getPlan(planId);
  return { granted: amount, support: Boolean(plan?.support) };
}

export async function deductCredits(userId: string, amount: number = getCreditsPerAction()): Promise<boolean> {
  const wallet = await ensureWallet(userId);
  if (wallet.passActive) return true;
  if (wallet.balance < amount) return false;

  const db = getDb();
  const now = Date.now();
  const result = await db
    .prepare(
      `UPDATE subscriptions
       SET credits_balance = credits_balance - ?, updated_at = ?
       WHERE user_id = ? AND credits_balance >= ?`
    )
    .bind(amount, now, userId, amount)
    .run();

  return (result.meta.changes ?? 0) > 0;
}

/** Débite un montant variable (ignoré si forfait actif). */
export async function chargeActionCredit(
  userId: string,
  amount: number = getCreditsPerAction()
): Promise<{
  charged: boolean;
  passActive: boolean;
  balance: number;
  nextRefillAt: number | null;
  amount: number;
}> {
  const wallet = await ensureWallet(userId);
  if (wallet.passActive) {
    return {
      charged: false,
      passActive: true,
      balance: wallet.balance,
      nextRefillAt: null,
      amount: 0,
    };
  }

  const ok = await deductCredits(userId, amount);
  const updated = await getWallet(userId);
  return {
    charged: ok,
    passActive: false,
    balance: updated?.balance ?? wallet.balance,
    nextRefillAt: updated?.nextRefillAt ?? wallet.nextRefillAt,
    amount,
  };
}

/** @deprecated Utiliser chargeActionCredit avec un montant explicite. */
export async function chargeSearchCredit(userId: string, amount?: number) {
  return chargeActionCredit(userId, amount ?? getCreditsPerAction());
}
