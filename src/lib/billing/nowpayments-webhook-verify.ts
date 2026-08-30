import type { PaymentOrderRow } from "@/lib/billing/subscriptions";
import { expectedUsdtFromOrder } from "@/lib/billing/subscriptions";

export type NowPaymentsIpnPayload = {
  payment_status?: string;
  order_id?: string;
  payment_id?: string | number;
  pay_amount?: number | string;
  actually_paid?: number | string;
  price_amount?: number | string;
  price_currency?: string;
  pay_currency?: string;
};

export type NowPaymentsVerification =
  | { ok: true }
  | { ok: false; reason: string };

function parseAmount(value: number | string | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Valide montant IPN NOWPayments vs commande avant fulfillment. */
export function verifyNowPaymentsIpnAmount(
  body: NowPaymentsIpnPayload,
  order: PaymentOrderRow
): NowPaymentsVerification {
  if (body.order_id && body.order_id !== order.id) {
    return { ok: false, reason: "order_id mismatch" };
  }

  const paid =
    parseAmount(body.actually_paid) ??
    parseAmount(body.pay_amount) ??
    parseAmount(body.price_amount);

  if (paid == null) {
    return { ok: false, reason: "missing pay amount in IPN" };
  }

  const expected = expectedUsdtFromOrder(order);
  const tolerance = Math.max(0.02, expected * 0.02);

  if (paid + tolerance < expected) {
    return {
      ok: false,
      reason: `underpaid (expected ~${expected} USDT, got ${paid})`,
    };
  }

  if (paid > expected + tolerance * 2) {
    return {
      ok: false,
      reason: `overpaid anomaly (expected ~${expected} USDT, got ${paid})`,
    };
  }

  return { ok: true };
}
