import { getAuthUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import {
  productAmount,
  productPlanId,
  resolveCheckoutProduct,
  type ProductType,
} from "@/lib/billing/catalog";
import { createMonCashPayment, moncashConfigured } from "@/lib/billing/moncash";
import { createStripeCheckout } from "@/lib/billing/stripe-checkout";
import { stripeConfigured } from "@/lib/billing/stripe";
import { createPaymentOrder } from "@/lib/billing/subscriptions";
import { createUsdtPayment, usdtConfigured, usdtHtgRate } from "@/lib/billing/usdt";
import { assertSlugAvailableForUser, normalizeSlug } from "@/lib/hosting/sites";
import { readEnv } from "@/lib/env";
import type { PaymentMethod } from "@/lib/billing/plans";
import { getPassExpiry } from "@/lib/billing/passes";
import { getDomainProduct } from "@/lib/billing/catalog";

type Body = {
  planId?: string;
  method?: PaymentMethod;
  productType?: ProductType;
  domain?: string;
  draftId?: string;
  siteSlug?: string;
  title?: string;
  businessCountry?: string;
};

function appUrl() {
  return readEnv("NEXT_PUBLIC_APP_URL") || "https://klirline.io";
}

function successPath(productType: ProductType): string {
  if (productType === "hosting") return `${appUrl()}/hosting/success?order=`;
  if (productType === "domain") return `${appUrl()}/domains/success?order=`;
  return `${appUrl()}/pricing/success?order=`;
}

function cancelPath(productType: ProductType): string {
  if (productType === "hosting") return `${appUrl()}/studio/site?canceled=1`;
  if (productType === "domain") return `${appUrl()}/domains?canceled=1`;
  return `${appUrl()}/pricing?canceled=1`;
}

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

  const method = body.method ?? "moncash";
  const productType = body.productType ?? "pass";
  let product = resolveCheckoutProduct({
    productType,
    planId: body.planId,
    domain: body.domain,
  });

  if (productType === "domain" && body.domain?.trim()) {
    const passActive = (await getPassExpiry(userId)) !== null;
    product = getDomainProduct(body.domain, { passDiscount: passActive }) ?? product;
  }

  if (!product) {
    return NextResponse.json({ error: "Produit invalide." }, { status: 400 });
  }

  if (productType === "hosting") {
    const slug = normalizeSlug(body.siteSlug ?? "");
    if (!slug) {
      return NextResponse.json({ error: "Choisissez un nom d'URL valide (3–30 caractères)." }, { status: 400 });
    }
    if (!body.draftId?.trim()) {
      return NextResponse.json({ error: "Générez d'abord votre site dans le Studio." }, { status: 400 });
    }
    try {
      await assertSlugAvailableForUser(userId, slug);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Nom d'URL indisponible." },
        { status: 409 }
      );
    }
  }

  if (productType === "domain" && !body.domain?.trim()) {
    return NextResponse.json({ error: "Nom de domaine requis." }, { status: 400 });
  }

  const amounts = productAmount(product);
  const planId = productPlanId(product);
  const metadata: Record<string, unknown> = {
    productType,
    draftId: body.draftId,
    siteSlug: body.siteSlug ? normalizeSlug(body.siteSlug) : undefined,
    title: body.title,
    domain: body.domain,
    country: body.businessCountry?.slice(0, 2).toUpperCase() || "HT",
  };

  const successUrl = successPath(productType);
  const cancelUrl = cancelPath(productType);

  try {
    if (method === "stripe") {
      if (!stripeConfigured()) {
        return NextResponse.json({ error: "Stripe non configuré." }, { status: 503 });
      }

      const order = await createPaymentOrder({
        userId,
        planId,
        provider: "stripe",
        amountCents: Math.round(amounts.usd * 100),
        currency: "usd",
        metadata,
      });

      const { url } = await createStripeCheckout({
        userId,
        product,
        orderId: order.id,
        successUrl: `${successUrl}${order.id}`,
        cancelUrl,
        extraMetadata: {
          draftId: body.draftId ?? "",
          siteSlug: body.siteSlug ?? "",
          domain: body.domain ?? "",
        },
      });

      return NextResponse.json({
        orderId: order.id,
        method: "stripe",
        url,
        product: { id: planId, name: product.name, usd: product.usd, productType },
      });
    }

    if (method === "moncash") {
      if (!moncashConfigured()) {
        return NextResponse.json({ error: "MonCash non configuré." }, { status: 503 });
      }

      const order = await createPaymentOrder({
        userId,
        planId,
        provider: "moncash",
        amountCents: amounts.htg * 100,
        currency: "htg",
        metadata,
      });

      const { redirectUrl } = await createMonCashPayment(order.id, amounts.htg);

      return NextResponse.json({
        orderId: order.id,
        method: "moncash",
        redirectUrl,
        product: { id: planId, name: product.name, htg: amounts.htg, productType },
      });
    }

    if (method === "usdt") {
      if (!usdtConfigured()) {
        return NextResponse.json({ error: "Paiement USDT non configuré." }, { status: 503 });
      }

      const expectedUsdt = Math.round((amounts.htg / usdtHtgRate()) * 100) / 100;

      const order = await createPaymentOrder({
        userId,
        planId,
        provider: "usdt",
        amountCents: amounts.htg * 100,
        currency: "htg",
        metadata: { ...metadata, expectedUsdt },
      });

      const usdt = await createUsdtPayment({
        orderId: order.id,
        htgAmount: amounts.htg,
        successUrl: `${successUrl}${order.id}`,
        cancelUrl,
      });

      return NextResponse.json({
        orderId: order.id,
        method: "usdt",
        product: { id: planId, name: product.name, htg: amounts.htg, productType },
        usdt,
        htgRate: usdtHtgRate(),
      });
    }

    return NextResponse.json({ error: "Méthode invalide" }, { status: 400 });
  } catch (err) {
    console.error("checkout error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur checkout" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    stripe: stripeConfigured(),
    moncash: moncashConfigured(),
    usdt: usdtConfigured(),
    htgRate: usdtHtgRate(),
  });
}
