import { getStripe } from "@/lib/billing/stripe";
import { detectProductType } from "@/lib/billing/catalog";
import type { CheckoutProduct } from "@/lib/billing/catalog";
import { productPlanId } from "@/lib/billing/catalog";

export async function createStripeCheckout(input: {
  userId: string;
  product: CheckoutProduct;
  orderId: string;
  successUrl: string;
  cancelUrl: string;
  extraMetadata?: Record<string, string>;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe non configuré");

  const planId = productPlanId(input.product);
  const lineItems = [
    {
      price_data: {
        currency: "usd",
        unit_amount: Math.round(input.product.usd * 100),
        product_data: {
          name: `Klir IA — ${input.product.name}`,
          description: input.product.tagline,
          metadata: { plan_id: planId, product_type: detectProductType(planId) },
        },
      },
      quantity: 1,
    },
  ];

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${input.successUrl}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: input.cancelUrl,
    client_reference_id: input.userId,
    metadata: {
      userId: input.userId,
      planId,
      orderId: input.orderId,
      productType: detectProductType(planId),
      ...(input.extraMetadata ?? {}),
    },
  });

  if (!session.url) throw new Error("Stripe : pas d’URL checkout");
  return { url: session.url };
}
