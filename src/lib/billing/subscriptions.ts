import { getDb } from "@/lib/d1";
import { activatePass } from "@/lib/billing/passes";
import { getPlan, type PlanId, type PaymentMethod } from "@/lib/billing/plans";
import { usdtHtgRate } from "@/lib/billing/usdt";

export type SubscriptionRow = {
  user_id: string;
  plan_id: string;
  status: string;
  provider: string;
  provider_ref: string | null;
  current_period_end: number | null;
  credits_balance: number;
  free_grant_claimed: number;
  free_credits_refill_at: number | null;
  created_at: number;
  updated_at: number;
};

export type PaymentOrderRow = {
  id: string;
  user_id: string;
  plan_id: string;
  provider: string;
  status: string;
  amount_cents: number;
  currency: string;
  provider_ref: string | null;
  metadata: string | null;
  created_at: number;
  updated_at: number;
};

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const db = getDb();
  return db
    .prepare("SELECT * FROM subscriptions WHERE user_id = ?")
    .bind(userId)
    .first<SubscriptionRow>();
}

export async function upsertSubscription(input: {
  userId: string;
  planId: PlanId;
  status: SubscriptionRow["status"];
  provider: PaymentMethod | "none";
  providerRef?: string | null;
  currentPeriodEnd?: number | null;
}) {
  const db = getDb();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO subscriptions (user_id, plan_id, status, provider, provider_ref, current_period_end, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         plan_id = excluded.plan_id,
         status = excluded.status,
         provider = excluded.provider,
         provider_ref = excluded.provider_ref,
         current_period_end = excluded.current_period_end,
         updated_at = excluded.updated_at`
    )
    .bind(
      input.userId,
      input.planId,
      input.status,
      input.provider,
      input.providerRef ?? null,
      input.currentPeriodEnd ?? null,
      now,
      now
    )
    .run();
}

export async function createPaymentOrder(input: {
  userId: string;
  planId: string;
  provider: PaymentMethod;
  amountCents: number;
  currency: string;
  providerRef?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<PaymentOrderRow> {
  const db = getDb();
  const now = Date.now();
  const orderId = id("ord");
  await db
    .prepare(
      `INSERT INTO payment_orders
        (id, user_id, plan_id, provider, status, amount_cents, currency, provider_ref, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      orderId,
      input.userId,
      input.planId,
      input.provider,
      input.amountCents,
      input.currency,
      input.providerRef ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      now,
      now
    )
    .run();

  return {
    id: orderId,
    user_id: input.userId,
    plan_id: input.planId,
    provider: input.provider,
    status: "pending",
    amount_cents: input.amountCents,
    currency: input.currency,
    provider_ref: input.providerRef ?? null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    created_at: now,
    updated_at: now,
  };
}

export async function getPaymentOrder(orderId: string): Promise<PaymentOrderRow | null> {
  const db = getDb();
  return db
    .prepare("SELECT * FROM payment_orders WHERE id = ?")
    .bind(orderId)
    .first<PaymentOrderRow>();
}

export async function markOrderPaid(orderId: string, providerRef?: string) {
  const db = getDb();
  const now = Date.now();
  await db
    .prepare(
      `UPDATE payment_orders
       SET status = 'paid', provider_ref = COALESCE(?, provider_ref), updated_at = ?
       WHERE id = ?`
    )
    .bind(providerRef ?? null, now, orderId)
    .run();
}

/** Marque payé uniquement si la commande est encore pending (évite double activation). */
export async function markOrderPaidIfPending(
  orderId: string,
  providerRef: string
): Promise<boolean> {
  const db = getDb();
  const now = Date.now();
  const result = await db
    .prepare(
      `UPDATE payment_orders
       SET status = 'paid', provider_ref = ?, updated_at = ?
       WHERE id = ? AND status = 'pending'`
    )
    .bind(providerRef, now, orderId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

/** True si ce hash USDT a déjà activé une commande payée. */
export async function isUsdtTxHashUsed(txHash: string): Promise<boolean> {
  const db = getDb();
  const row = await db
    .prepare(
      `SELECT id FROM payment_orders
       WHERE provider = 'usdt' AND provider_ref = ? AND status = 'paid'
       LIMIT 1`
    )
    .bind(txHash)
    .first<{ id: string }>();
  return Boolean(row);
}

/**
 * Réserve atomiquement un txHash pour une commande pending (évite double usage).
 * Retourne false si le hash est déjà pris ou la commande n'est pas réservable.
 */
export async function reserveUsdtTxHash(orderId: string, txHash: string): Promise<boolean> {
  const db = getDb();
  const now = Date.now();

  if (await isUsdtTxHashUsed(txHash)) return false;

  const order = await getPaymentOrder(orderId);
  if (!order || order.status !== "pending" || order.provider !== "usdt") return false;

  try {
    const result = await db
      .prepare(
        `UPDATE payment_orders
         SET provider_ref = ?, updated_at = ?
         WHERE id = ? AND status = 'pending' AND provider = 'usdt'
           AND (provider_ref IS NULL OR provider_ref = '')`
      )
      .bind(txHash, now, orderId)
      .run();

    if ((result.meta.changes ?? 0) === 0) return false;

    const conflict = await db
      .prepare(
        `SELECT id FROM payment_orders
         WHERE provider = 'usdt' AND provider_ref = ? AND id != ?
         LIMIT 1`
      )
      .bind(txHash, orderId)
      .first<{ id: string }>();

    if (conflict) {
      await db
        .prepare(
          `UPDATE payment_orders SET provider_ref = NULL, updated_at = ? WHERE id = ? AND status = 'pending'`
        )
        .bind(now, orderId)
        .run();
      return false;
    }

    return true;
  } catch {
    await db
      .prepare(
        `UPDATE payment_orders SET provider_ref = NULL, updated_at = ? WHERE id = ? AND status = 'pending'`
      )
      .bind(now, orderId)
      .run()
      .catch(() => undefined);
    return false;
  }
}

export async function releaseUsdtTxReservation(orderId: string): Promise<void> {
  const db = getDb();
  const now = Date.now();
  await db
    .prepare(
      `UPDATE payment_orders SET provider_ref = NULL, updated_at = ?
       WHERE id = ? AND status = 'pending' AND provider = 'usdt'`
    )
    .bind(now, orderId)
    .run();
}

export function expectedUsdtFromOrder(order: PaymentOrderRow): number {
  let meta: Record<string, unknown> = {};
  if (order.metadata) {
    try {
      meta = JSON.parse(order.metadata) as Record<string, unknown>;
    } catch {
      meta = {};
    }
  }
  const fromMeta = meta.expectedUsdt;
  if (typeof fromMeta === "number" && fromMeta > 0) return fromMeta;
  if (typeof fromMeta === "string" && Number(fromMeta) > 0) return Number(fromMeta);
  const htg = order.amount_cents / 100;
  return Math.round((htg / usdtHtgRate()) * 100) / 100;
}

/** Active le forfait après paiement confirmé. */
export async function activateCreditPack(
  userId: string,
  planId: PlanId,
  provider: PaymentMethod = "usdt",
  providerRef?: string
) {
  const plan = getPlan(planId);
  if (!plan || plan.id === "free") return;

  if (plan.durationMs > 0) {
    await activatePass(userId, planId, provider, providerRef);
    return;
  }
}
