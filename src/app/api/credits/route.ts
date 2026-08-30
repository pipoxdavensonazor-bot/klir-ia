import { getAuthUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { ensureWallet } from "@/lib/billing/credits";
import { getCreditPublicConfig } from "@/lib/billing/credit-config";

export async function GET() {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  try {
    const wallet = await ensureWallet(userId);
    return NextResponse.json({
      ...wallet,
      config: getCreditPublicConfig(),
    });
  } catch {
    return NextResponse.json({ error: "Crédits indisponibles" }, { status: 503 });
  }
}
