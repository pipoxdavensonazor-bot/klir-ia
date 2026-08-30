import { getAuthUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { detectProductType } from "@/lib/billing/catalog";
import { fulfillPaidOrder } from "@/lib/billing/fulfill-order";
import { getPassExpiry } from "@/lib/billing/passes";
import { getPlan, type PlanId } from "@/lib/billing/plans";
import {
  expectedUsdtFromOrder,
  getPaymentOrder,
  markOrderPaidIfPending,
  releaseUsdtTxReservation,
  reserveUsdtTxHash,
} from "@/lib/billing/subscriptions";
import { verifyUsdtPayment } from "@/lib/billing/usdt-verify";
import { getDb } from "@/lib/d1";

type Body = {
  orderId?: string;
  txHash?: string;
};

/** Soumet la preuve de transfert USDT → vérifie on-chain puis active le produit. */
export async function POST(req: Request) {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const txHash = body.txHash?.trim().toLowerCase();
  if (!orderId || !txHash || !/^[a-f0-9]{64}$/.test(txHash)) {
    return NextResponse.json(
      { error: "orderId et txHash (64 caractères hex) requis." },
      { status: 400 }
    );
  }

  const order = await getPaymentOrder(orderId);
  if (!order || order.user_id !== userId) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (order.status === "paid") {
    return NextResponse.json({ message: "Commande déjà payée.", orderId });
  }
  if (order.provider !== "usdt") {
    return NextResponse.json({ error: "Commande invalide." }, { status: 400 });
  }

  const plan = getPlan(order.plan_id as PlanId);
  const productKind = detectProductType(order.plan_id);
  if (productKind === "pass" && (!plan || plan.id === "free")) {
    return NextResponse.json({ error: "Forfait invalide." }, { status: 400 });
  }

  const reserved = await reserveUsdtTxHash(orderId, txHash);
  if (!reserved) {
    return NextResponse.json(
      { error: "Ce hash de transaction a déjà été utilisé pour un autre paiement." },
      { status: 409 }
    );
  }

  const htgAmount = Math.round(order.amount_cents / 100);
  const expectedUsdt = expectedUsdtFromOrder(order);
  const verified = await verifyUsdtPayment({ txHash, htgAmount, expectedUsdt });
  if (!verified.ok) {
    await releaseUsdtTxReservation(orderId);
    return NextResponse.json({ error: verified.error }, { status: 422 });
  }

  const marked = await markOrderPaidIfPending(orderId, txHash);
  if (!marked) {
    await releaseUsdtTxReservation(orderId);
    return NextResponse.json({ message: "Commande déjà payée.", orderId });
  }

  const db = getDb();
  const now = Date.now();
  let priorMeta: Record<string, unknown> = {};
  if (order.metadata) {
    try {
      priorMeta = JSON.parse(order.metadata) as Record<string, unknown>;
    } catch {
      priorMeta = {};
    }
  }

  await db
    .prepare(`UPDATE payment_orders SET metadata = ? WHERE id = ?`)
    .bind(
      JSON.stringify({
        ...priorMeta,
        txHash,
        submittedAt: now,
        verifiedAmountUsdt: verified.amountUsdt,
        verifiedTo: verified.toAddress,
      }),
      orderId
    )
    .run();

  await fulfillPaidOrder(order, "usdt", txHash);

  const passExpiresAt = productKind === "pass" ? await getPassExpiry(userId) : null;

  return NextResponse.json({
    ok: true,
    orderId,
    productType: productKind,
    planId: order.plan_id,
    passExpiresAt,
    message:
      productKind === "hosting"
        ? "Site publié sur Klirline."
        : productKind === "domain"
          ? "Commande domaine enregistrée — activation sous 24–48 h."
          : plan
            ? `Forfait ${plan.durationLabel} activé.`
            : "Paiement confirmé.",
  });
}
