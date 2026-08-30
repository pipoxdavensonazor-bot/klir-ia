import { NextResponse } from "next/server";
import { extractBearer, resolveApiKey } from "@/lib/api-keys";
import { checkChatAccess } from "@/lib/billing/passes";
import { ensureWallet } from "@/lib/billing/credits";

export async function GET(req: Request) {
  const bearer = extractBearer(req);
  if (!bearer) {
    return NextResponse.json({ error: "Authorization Bearer requis" }, { status: 401 });
  }

  const resolved = await resolveApiKey(bearer);
  if (!resolved) {
    return NextResponse.json({ error: "Clé invalide ou forfait expiré" }, { status: 403 });
  }

  const wallet = await ensureWallet(resolved.userId);
  const access = await checkChatAccess(resolved.userId, wallet.balance);

  return NextResponse.json({
    userId: resolved.userId,
    passActive: access.passActive,
    passExpiresAt: access.passExpiresAt,
    credits: access.credits,
    allowed: access.allowed,
  });
}
