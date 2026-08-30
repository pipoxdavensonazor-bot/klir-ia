import { NextResponse } from "next/server";
import { fulfillPaidOrder } from "@/lib/billing/fulfill-order";
import { verifyNowPaymentsIpnSignature, nowPaymentsIpnConfigured } from "@/lib/billing/nowpayments-ipn";
import {
  verifyNowPaymentsIpnAmount,
  type NowPaymentsIpnPayload,
} from "@/lib/billing/nowpayments-webhook-verify";
import {
  getPaymentOrder,
  markOrderPaidIfPending,
} from "@/lib/billing/subscriptions";
import { readEnv } from "@/lib/env";

/**
 * IPN NOWPayments — active le plan quand payment_status = finished.
 * Signature HMAC-SHA512 requise (NOWPAYMENTS_IPN_SECRET).
 */
export async function POST(req: Request) {
  const apiKey = readEnv("NOWPAYMENTS_API_KEY");
  if (!apiKey) {
    return NextResponse.json({ error: "NOWPayments non configuré" }, { status: 503 });
  }

  if (!nowPaymentsIpnConfigured()) {
    return NextResponse.json(
      { error: "NOWPAYMENTS_IPN_SECRET requis pour accepter les webhooks." },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-nowpayments-sig");

  const valid = await verifyNowPaymentsIpnSignature(rawBody, signature);
  if (!valid) {
    return NextResponse.json({ error: "Signature IPN invalide." }, { status: 401 });
  }

  let body: NowPaymentsIpnPayload;
  try {
    body = JSON.parse(rawBody) as NowPaymentsIpnPayload;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const orderId = body.order_id;
  const status = (body.payment_status || "").toLowerCase();
  if (!orderId) return NextResponse.json({ ok: true });

  if (status !== "finished" && status !== "confirmed") {
    return NextResponse.json({ ok: true, ignored: status });
  }

  const order = await getPaymentOrder(orderId);
  if (!order || order.provider !== "usdt") {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  if (order.status === "paid") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  const amountCheck = verifyNowPaymentsIpnAmount(body, order);
  if (!amountCheck.ok) {
    console.error("NOWPayments IPN amount rejected:", amountCheck.reason, orderId);
    return NextResponse.json({ error: amountCheck.reason }, { status: 422 });
  }

  const providerRef =
    body.payment_id != null ? String(body.payment_id) : `np_${orderId}_${Date.now()}`;

  const paid = await markOrderPaidIfPending(orderId, providerRef);
  if (!paid) {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  await fulfillPaidOrder(order, "usdt", providerRef);

  return NextResponse.json({ ok: true });
}
