import { activatePass } from "@/lib/billing/passes";
import { detectProductType } from "@/lib/billing/catalog";
import { activateCreditPack } from "@/lib/billing/subscriptions";
import type { PaymentOrderRow } from "@/lib/billing/subscriptions";
import { activateDomainOrder, activateHostingOrder } from "@/lib/billing/product-activation";
import { getPlan, type PlanId, type PaymentMethod } from "@/lib/billing/plans";

/** Active le produit associé à une commande payée. */
export async function fulfillPaidOrder(
  order: PaymentOrderRow,
  provider: PaymentMethod,
  providerRef?: string
): Promise<void> {
  const kind = detectProductType(order.plan_id);

  if (kind === "hosting") {
    await activateHostingOrder(order);
    return;
  }

  if (kind === "domain") {
    await activateDomainOrder(order);
    return;
  }

  const plan = getPlan(order.plan_id as PlanId);
  if (plan && plan.id !== "free") {
    await activateCreditPack(order.user_id, plan.id, provider, providerRef);
  }
}
