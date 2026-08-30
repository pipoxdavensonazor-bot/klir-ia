import { getAuthUser } from "@/lib/auth/server";
import {
  adjustCreditBalance,
  findUserIdByEmail,
  setCreditBalance,
} from "@/lib/billing/credit-admin";
import {
  getCreditPublicConfig,
  isKlirAdminEmail,
  verifyKlirAdminSecret,
} from "@/lib/billing/credit-config";
import { NextResponse } from "next/server";

async function assertAdmin(request: Request) {
  const secretOk = verifyKlirAdminSecret(request.headers.get("x-klir-admin-secret"));
  if (secretOk) return { ok: true as const };

  const { user } = await getAuthUser();
  if (user && isKlirAdminEmail(user.email)) {
    return { ok: true as const, email: user.email };
  }

  return { ok: false as const };
}

export async function GET() {
  const { user } = await getAuthUser();
  const admin = user ? isKlirAdminEmail(user.email) : false;
  return NextResponse.json({
    admin,
    config: getCreditPublicConfig(),
  });
}

export async function PATCH(request: Request) {
  const gate = await assertAdmin(request);
  if (!gate.ok) {
    return NextResponse.json({ error: "Accès admin requis" }, { status: 403 });
  }

  let body: { email?: string; action?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const action = body.action;
  const amount = Number(body.amount);

  if (!email || !action || !Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "email, action et amount requis" }, { status: 400 });
  }

  if (!["set", "grant", "deduct"].includes(action)) {
    return NextResponse.json({ error: "action invalide" }, { status: 400 });
  }

  const userId = await findUserIdByEmail(email);
  if (!userId) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  try {
    let wallet;
    if (action === "set") {
      wallet = await setCreditBalance(userId, amount);
    } else if (action === "grant") {
      wallet = await adjustCreditBalance(userId, amount);
    } else {
      wallet = await adjustCreditBalance(userId, -amount);
    }

    return NextResponse.json({
      email,
      action,
      balance: wallet.balance,
      planId: wallet.planId,
    });
  } catch {
    return NextResponse.json({ error: "Mise à jour impossible" }, { status: 503 });
  }
}
