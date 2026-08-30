import type { PaymentOrderRow } from "@/lib/billing/subscriptions";
import { geoProfileForCountry } from "@/lib/geo/locale";
import { ensureSiteAdmin } from "@/lib/hosting/site-admin";
import { publishHostedSiteFromDraft } from "@/lib/hosting/sites";
import { registerDomainOrder } from "@/lib/domains/registrations";

export async function activateHostingOrder(order: PaymentOrderRow): Promise<void> {
  let meta: { draftId?: string; siteSlug?: string; title?: string; country?: string } = {};
  if (order.metadata) {
    try {
      meta = JSON.parse(order.metadata) as typeof meta;
    } catch {
      meta = {};
    }
  }
  if (!meta.draftId || !meta.siteSlug) {
    throw new Error("Commande hébergement sans brouillon de site.");
  }
  const site = await publishHostedSiteFromDraft({
    userId: order.user_id,
    draftId: meta.draftId,
    slug: meta.siteSlug,
    title: meta.title ?? meta.siteSlug,
    paymentOrderId: order.id,
    planId: order.plan_id,
  });
  const geo = geoProfileForCountry(meta.country ?? "HT");
  await ensureSiteAdmin(site, geo, meta.title ?? site.title);
}

export async function activateDomainOrder(order: PaymentOrderRow): Promise<void> {
  const domain = order.plan_id.replace(/^domain:/, "");
  const result = await registerDomainOrder({
    userId: order.user_id,
    domain,
    paymentOrderId: order.id,
    amountCents: order.amount_cents,
    currency: order.currency,
  });
  if (result.status === "failed") {
    throw new Error(result.message || "Échec enregistrement domaine.");
  }
}
