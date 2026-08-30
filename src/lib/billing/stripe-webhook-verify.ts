import type Stripe from "stripe";
import type { PaymentOrderRow } from "@/lib/billing/subscriptions";

export type StripeCheckoutVerification =
  | { ok: true }
  | { ok: false; reason: string };

/** Valide qu'une session Stripe correspond à la commande avant fulfillment. */
export function verifyStripeCheckoutSession(
  session: Stripe.Checkout.Session,
  order: PaymentOrderRow
): StripeCheckoutVerification {
  if (session.payment_status !== "paid") {
    return { ok: false, reason: "payment_status not paid" };
  }

  if (session.metadata?.orderId !== order.id) {
    return { ok: false, reason: "orderId mismatch" };
  }

  const sessionUserId = session.metadata?.userId;
  if (sessionUserId && sessionUserId !== order.user_id) {
    return { ok: false, reason: "userId mismatch" };
  }

  if (session.amount_total == null || session.amount_total !== order.amount_cents) {
    return {
      ok: false,
      reason: `amount mismatch (expected ${order.amount_cents}, got ${session.amount_total ?? "null"})`,
    };
  }

  const paidCurrency = (session.currency ?? "usd").toLowerCase();
  if (paidCurrency !== order.currency.toLowerCase()) {
    return { ok: false, reason: "currency mismatch" };
  }

  return { ok: true };
}
