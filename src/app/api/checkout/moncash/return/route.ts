import { NextResponse } from "next/server";
import { retrieveMonCashOrder } from "@/lib/billing/moncash";
import { fulfillPaidOrder } from "@/lib/billing/fulfill-order";
import { getPaymentOrder, markOrderPaidIfPending } from "@/lib/billing/subscriptions";
import { getSessionUser } from "@/lib/auth/session";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { readEnv } from "@/lib/env";

export async function GET(req: Request) {
  const base = readEnv("NEXT_PUBLIC_APP_URL") || "https://klirline.io";
  const ip = getClientIp(req);
  const limit = await checkRateLimit(`moncash:return:ip:${ip}`, 30, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.redirect(`${base}/pricing?error=rate_limit`);
  }

  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId") || url.searchParams.get("order");

  if (!orderId) {
    return NextResponse.redirect(`${base}/pricing?error=missing_order`);
  }

  const order = await getPaymentOrder(orderId);
  if (!order || order.provider !== "moncash") {
    return NextResponse.redirect(`${base}/pricing?error=order_not_found`);
  }

  const user = await getSessionUser();
  if (!user || user.id !== order.user_id) {
    const returnPath = `/api/checkout/moncash/return?orderId=${encodeURIComponent(orderId)}`;
    return NextResponse.redirect(
      `${base}/sign-in?redirect_url=${encodeURIComponent(returnPath)}`
    );
  }

  const productType = order.plan_id.startsWith("domain:")
    ? "domain"
    : order.plan_id.startsWith("host")
      ? "hosting"
      : "pass";

  const successBase =
    productType === "hosting"
      ? `${base}/hosting/success?order=`
      : productType === "domain"
        ? `${base}/domains/success?order=`
        : `${base}/pricing/success?order=`;

  if (order.status === "paid") {
    return NextResponse.redirect(`${successBase}${orderId}`);
  }

  try {
    const payment = await retrieveMonCashOrder(orderId);
    if (payment.status === "SUCCESSFUL") {
      const marked = await markOrderPaidIfPending(orderId, payment.transactionId ?? orderId);
      if (marked) {
        await fulfillPaidOrder(order, "moncash", payment.transactionId ?? orderId);
      }
      return NextResponse.redirect(`${successBase}${orderId}`);
    }
    if (payment.status === "PENDING") {
      return NextResponse.redirect(`${successBase}${orderId}&pending=1`);
    }
  } catch (err) {
    console.error("moncash return:", err);
  }

  return NextResponse.redirect(`${base}/pricing?error=moncash_failed`);
}
