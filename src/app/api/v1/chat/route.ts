import { NextResponse } from "next/server";
import {
  buildSystemPrompt,
  detectSkill,
  listSkills,
} from "@/lib/ai/catalog";
import { chat } from "@/lib/ai/chat-provider";
import type { ChatTurn } from "@/lib/ai/types";
import { extractBearer, resolveApiKey } from "@/lib/api-keys";
import { checkChatAccess } from "@/lib/billing/passes";
import { chargeActionCredit, ensureWallet } from "@/lib/billing/credits";
import { computeChatCreditCost } from "@/lib/billing/credit-pricing";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * API publique Klir IA — intégration tierce.
 * Auth : Authorization: Bearer klir_sk_live_…
 * Nécessite un forfait actif (24h / 7j / 30j).
 */
export async function POST(req: Request) {
  const bearer = extractBearer(req);
  if (!bearer) {
    return NextResponse.json(
      {
        error: "Clé API manquante. Header : Authorization: Bearer klir_sk_live_…",
        docs: "https://klirline.io/developers",
      },
      { status: 401 }
    );
  }

  const resolved = await resolveApiKey(bearer);
  if (!resolved) {
    return NextResponse.json(
      {
        error: "Clé API invalide, révoquée ou forfait expiré.",
        docs: "https://klirline.io/developers",
      },
      { status: 403 }
    );
  }

  const ip = getClientIp(req);
  const limit = await checkRateLimit(`api:${ip}`);
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  let body: { messages?: ChatTurn[]; skill?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const messages = body.messages ?? [];
  if (!messages.length) {
    return NextResponse.json({ error: "messages requis" }, { status: 400 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const creditCost = computeChatCreditCost({ message: lastUser });

  const wallet = await ensureWallet(resolved.userId);
  const access = await checkChatAccess(resolved.userId, wallet.balance, creditCost);
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason, code: "PAYWALL", creditCost }, { status: 402 });
  }

  if (!access.passActive) {
    const charge = await chargeActionCredit(resolved.userId, creditCost);
    if (!charge.charged) {
      return NextResponse.json(
        { error: "Crédits insuffisants.", code: "PAYWALL", creditCost },
        { status: 402 }
      );
    }
  }

  const skills = listSkills();
  const skillName =
    body.skill && skills.some((s) => s.name === body.skill)
      ? body.skill
      : detectSkill(lastUser, skills) ?? undefined;

  const system = buildSystemPrompt(skillName);

  try {
    const result = await chat({ system, messages });
    return NextResponse.json({
      content: result.content,
      provider: result.provider,
      model: result.model,
      skill: skillName ?? null,
      passActive: access.passActive,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur IA" },
      { status: 503 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Klir IA API",
    version: "1",
    endpoint: "POST /api/v1/chat",
    auth: "Bearer klir_sk_live_…",
    docs: "https://klirline.io/developers",
  });
}
