import { getDb } from "@/lib/d1";
import { getCreditPublicConfig } from "@/lib/billing/credit-config";
import { applyFreeCreditRefill, formatRefillCountdown } from "@/lib/billing/credit-refill";
import { getPlan, type PlanId, type PaymentMethod } from "@/lib/billing/plans";
import type { SubscriptionRow } from "@/lib/billing/subscriptions";

export function hasActivePass(row: Pick<SubscriptionRow, "current_period_end"> | null): boolean {
  if (!row?.current_period_end) return false;
  return row.current_period_end > Date.now();
}

export async function getPassExpiry(userId: string): Promise<number | null> {
  const db = getDb();
  const row = await db
    .prepare("SELECT current_period_end FROM subscriptions WHERE user_id = ?")
    .bind(userId)
    .first<{ current_period_end: number | null }>();
  if (!row?.current_period_end || row.current_period_end <= Date.now()) return null;
  return row.current_period_end;
}

/** Prolonge ou active un forfait temps (24h / 7j / 30j). */
export async function activatePass(
  userId: string,
  planId: PlanId,
  provider: PaymentMethod,
  providerRef?: string
): Promise<{ expiresAt: number }> {
  const plan = getPlan(planId);
  if (!plan || plan.id === "free" || !plan.durationMs) {
    throw new Error("Forfait invalide");
  }

  const db = getDb();
  const now = Date.now();
  const existing = await db
    .prepare("SELECT current_period_end FROM subscriptions WHERE user_id = ?")
    .bind(userId)
    .first<{ current_period_end: number | null }>();

  const base =
    existing?.current_period_end && existing.current_period_end > now
      ? existing.current_period_end
      : now;
  const expiresAt = base + plan.durationMs;

  await db
    .prepare(
      `INSERT INTO subscriptions (user_id, plan_id, status, provider, provider_ref, current_period_end, created_at, updated_at)
       VALUES (?, ?, 'active', ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         plan_id = excluded.plan_id,
         status = 'active',
         provider = excluded.provider,
         provider_ref = COALESCE(excluded.provider_ref, subscriptions.provider_ref),
         current_period_end = excluded.current_period_end,
         updated_at = excluded.updated_at`
    )
    .bind(userId, planId, provider, providerRef ?? null, expiresAt, now, now)
    .run();

  return { expiresAt };
}

export type AccessStatus = {
  allowed: boolean;
  reason?: string;
  passActive: boolean;
  passExpiresAt: number | null;
  credits: number;
};

export async function checkChatAccess(
  userId: string,
  credits: number,
  requiredCredits = 1
): Promise<AccessStatus> {
  const refill = await applyFreeCreditRefill(userId);
  const db = getDb();
  const row = await db
    .prepare("SELECT current_period_end, credits_balance FROM subscriptions WHERE user_id = ?")
    .bind(userId)
    .first<{ current_period_end: number | null; credits_balance: number }>();

  const passActive = hasActivePass(row);
  const passExpiresAt =
    row?.current_period_end && row.current_period_end > Date.now() ? row.current_period_end : null;
  const balance = row?.credits_balance ?? refill.balance ?? credits;
  const need = Math.max(1, requiredCredits);

  if (passActive) {
    return { allowed: true, passActive: true, passExpiresAt, credits: balance };
  }
  if (balance >= need) {
    return { allowed: true, passActive: false, passExpiresAt: null, credits: balance };
  }

  const countdown = formatRefillCountdown(refill.nextRefillAt);
  const creditCfg = getCreditPublicConfig();
  const reason = countdown
    ? `Crédits épuisés. Prochaine recharge (${creditCfg.freeCredits} cr.) dans ${countdown} — ou forfait sur /pricing.`
    : `Crédits épuisés. ${creditCfg.refillLabel} — ou forfait sur /pricing.`;

  return {
    allowed: false,
    reason,
    passActive: false,
    passExpiresAt: null,
    credits: balance,
  };
}

/** Accès Pro unifié : chat, génération sites, analyses trading complètes. */
export async function checkProAccess(userId: string, credits: number): Promise<AccessStatus> {
  return checkChatAccess(userId, credits);
}

export const PRO_PAYWALL_MESSAGE =
  "Forfait ou crédits requis pour les sites HTML pro et les analyses trading complètes. Voir /pricing — domaines et hébergement en supplément.";
