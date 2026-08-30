import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { fulfillPaidOrder } from "@/lib/billing/fulfill-order";
import { verifyStripeCheckoutSession } from "@/lib/billing/stripe-webhook-verify";
import { getPaymentOrder, markOrderPaidIfPending } from "@/lib/billing/subscriptions";
import { readEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = readEnv("STRIPE_WEBHOOK_SECRET");
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook non configuré" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature invalide";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (!orderId) return NextResponse.json({ received: true });

      const order = await getPaymentOrder(orderId);
      if (!order || order.status === "paid") {
        return NextResponse.json({ received: true });
      }

      const verification = verifyStripeCheckoutSession(session, order);
      if (!verification.ok) {
        console.error("stripe webhook verification failed:", verification.reason, {
          orderId,
          sessionId: session.id,
        });
        return NextResponse.json({ received: true });
      }

      const marked = await markOrderPaidIfPending(orderId, session.id);
      if (marked) {
        await fulfillPaidOrder(order, "stripe", session.id);
      }
    }
  } catch (err) {
    console.error("stripe webhook handler:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
