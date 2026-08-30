import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { generateStudioSite, type SiteGenerationMode } from "@/lib/studio/site";
import type { SiteWizardAnswers } from "@/lib/studio/site-wizard";
import { defaultSiteWizardAnswers } from "@/lib/studio/site-wizard";
import { getSiteTemplateMeta, isProTemplate } from "@/lib/studio/templates/catalog";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkChatAccess } from "@/lib/billing/passes";
import { chargeActionCredit, ensureWallet } from "@/lib/billing/credits";
import { getCreditPublicConfig } from "@/lib/billing/credit-config";
import { formatRefillCountdown } from "@/lib/billing/credit-refill";
import { computeSiteCreditCost } from "@/lib/billing/credit-pricing";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = await checkRateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  let userId: string | null = null;
  try {
    userId = (await getAuthUser()).userId;
  } catch {
    userId = null;
  }
  if (!userId) {
    return NextResponse.json(
      { error: "Connectez-vous pour générer un site.", code: "SIGNUP_REQUIRED" },
      { status: 401 }
    );
  }

  let body: {
    brief?: string;
    answers?: Partial<SiteWizardAnswers>;
    mode?: SiteGenerationMode;
    templateId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode: SiteGenerationMode = body.mode === "ai" ? "ai" : "template";
  const templateId =
    body.templateId ?? body.answers?.templateId ?? defaultSiteWizardAnswers().templateId;
  const needsBilling = mode === "ai" || isProTemplate(templateId);

  if (needsBilling) {
    const briefText =
      body.brief?.trim() ||
      JSON.stringify(body.answers ?? {}).slice(0, 2000);
    const creditCost = computeSiteCreditCost(briefText);

    const wallet = await ensureWallet(userId);
    const access = await checkChatAccess(userId, wallet.balance, creditCost);
    if (!access.allowed) {
      return NextResponse.json(
        {
          error:
            access.reason ??
            (isProTemplate(templateId)
              ? "Template Pro — forfait ou crédits requis. Choisissez un template gratuit ou voir /pricing."
              : "Crédits épuisés ou forfait expiré. Utilisez un template gratuit ou voir /pricing."),
          code: "PAYWALL",
          passExpiresAt: access.passExpiresAt,
          credits: access.credits,
          nextRefillAt: wallet.nextRefillAt,
          pricingUrl: "/pricing",
          creditCost,
        },
        { status: 402 }
      );
    }

    const charge = await chargeActionCredit(userId, creditCost);
    if (!charge.passActive && !charge.charged) {
      const countdown = formatRefillCountdown(charge.nextRefillAt);
      const creditCfg = getCreditPublicConfig();
      return NextResponse.json(
        {
          error: countdown
            ? `Crédits insuffisants (${creditCost} requis). Prochaine recharge (${creditCfg.freeCredits} cr.) dans ${countdown}.`
            : `Crédits insuffisants (${creditCost} requis). ${creditCfg.refillLabel}.`,
          code: "PAYWALL",
          credits: charge.balance,
          nextRefillAt: charge.nextRefillAt,
          pricingUrl: "/pricing",
          creditCost,
        },
        { status: 402 }
      );
    }
  }

  const answers: SiteWizardAnswers | undefined = body.answers
    ? {
        ...defaultSiteWizardAnswers(),
        ...body.answers,
        templateId: body.templateId ?? body.answers.templateId ?? defaultSiteWizardAnswers().templateId,
      }
    : undefined;
  const brief = body.brief?.trim() || (answers ? undefined : "");

  if (!brief && !answers?.brandName?.trim()) {
    return NextResponse.json({ error: "brief ou answers requis" }, { status: 400 });
  }

  if (answers?.templateId && !getSiteTemplateMeta(answers.templateId)) {
    return NextResponse.json({ error: "Template invalide." }, { status: 400 });
  }

  try {
    const site = await generateStudioSite(brief || "", answers, { mode });
    return NextResponse.json({ site });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur génération site" },
      { status: 503 }
    );
  }
}
