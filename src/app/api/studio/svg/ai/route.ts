import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { chat } from "@/lib/ai/chat-provider";
import { checkChatAccess } from "@/lib/billing/passes";
import { chargeActionCredit, ensureWallet } from "@/lib/billing/credits";
import { extractSvgFromAiResponse } from "@/lib/studio/svg-studio";
import { validateSvgMarkup } from "@/lib/studio/svg-studio";
import { computeChatCreditCost } from "@/lib/billing/credit-pricing";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

const SYSTEM = `Tu es SVG Visual Studio — assistant de modification SVG pour analyses graphiques et marketing Klirline.

Règles strictes :
- Retourne UNIQUEMENT le document SVG complet (avec <?xml?> optionnel), sans markdown ni commentaire.
- Format trading recommandé : viewBox="0 0 680 320", fond sombre, titre paire (ex. BTC / USD), prix en gros, courbe type TradingView, zones support (vert) et résistance (rouge).
- Conserve viewBox, xmlns et la structure existante sauf demande contraire.
- Pour le trading : style graphique professionnel (grille, prix, variation %, zones semi-transparentes).
- Couleurs marque si pertinent : #004F6E (primaire), #D4AF37 (accent).
- Pas de script, foreignObject ni contenu externe.`;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = await checkRateLimit(`studio-svg-ai:${ip}`);
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json(
      { error: "Connectez-vous pour utiliser Klir IA sur le SVG.", code: "SIGNUP_REQUIRED" },
      { status: 401 }
    );
  }

  let body: { prompt?: string; svg?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  const svg = body.svg?.trim();
  if (!prompt || !svg) {
    return NextResponse.json({ error: "prompt et svg requis" }, { status: 400 });
  }

  const creditCost = computeChatCreditCost({ message: prompt });

  const wallet = await ensureWallet(userId);
  const access = await checkChatAccess(userId, wallet.balance, creditCost);
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason, code: "PAYWALL", credits: access.credits, creditCost },
      { status: 402 }
    );
  }

  if (!access.passActive) {
    const charge = await chargeActionCredit(userId, creditCost);
    if (!charge.charged) {
      return NextResponse.json(
        {
          error: `Crédits insuffisants (${creditCost} requis).`,
          code: "PAYWALL",
          credits: charge.balance,
          creditCost,
        },
        { status: 402 }
      );
    }
  }

  try {
    const result = await chat({
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `SVG actuel :\n${svg}\n\nDemande :\n${prompt}`,
        },
      ],
      maxTokens: 4096,
      skipHumanize: true,
      skipEnrich: true,
    });

    const nextSvg = extractSvgFromAiResponse(result.content);
    const validation = validateSvgMarkup(nextSvg);
    if (!validation.ok) {
      return NextResponse.json(
        { error: `SVG généré invalide : ${validation.message}` },
        { status: 422 }
      );
    }

    return NextResponse.json({
      svg: nextSvg,
      provider: result.provider,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur IA" },
      { status: 503 }
    );
  }
}
