import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { listUserDomains } from "@/lib/domains/registrations";
import { getPassExpiry } from "@/lib/billing/passes";
import { PASS_DOMAIN_DISCOUNT_PCT } from "@/lib/billing/catalog";
import { registrarConfigured, registrarProvider, recommendedRegistrarNote } from "@/lib/domains/registrar";

export async function GET() {
  let userId: string | null = null;
  try {
    userId = (await getAuthUser()).userId;
  } catch {
    userId = null;
  }

  if (!userId) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  const [domains, passExpiresAt] = await Promise.all([
    listUserDomains(userId),
    getPassExpiry(userId),
  ]);

  return NextResponse.json({
    domains,
    passExpiresAt,
    passDomainDiscountPct: passExpiresAt ? PASS_DOMAIN_DISCOUNT_PCT : 0,
    registrar: {
      provider: registrarProvider(),
      automated: registrarConfigured(),
      note: recommendedRegistrarNote(),
    },
  });
}
