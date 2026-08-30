import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/crypto";
import { consumePasswordReset, markPasswordResetUsed } from "@/lib/auth/password-reset";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { getDb } from "@/lib/d1";

type Body = { token?: string; password?: string };

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = await checkRateLimit(`auth:reset:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const token = body.token?.trim();
  const password = body.password ?? "";
  if (!token || password.length < 8) {
    return NextResponse.json(
      { error: "Token et mot de passe (8 caractères min.) requis." },
      { status: 400 }
    );
  }

  const userId = await consumePasswordReset(token);
  if (!userId) {
    return NextResponse.json({ error: "Lien expiré ou invalide." }, { status: 400 });
  }

  const password_hash = await hashPassword(password);
  const db = getDb();
  const now = Date.now();

  await db
    .prepare(`UPDATE auth_users SET password_hash = ?, updated_at = ? WHERE id = ?`)
    .bind(password_hash, now, userId)
    .run();

  await markPasswordResetUsed(token);
  await db.prepare(`DELETE FROM auth_sessions WHERE user_id = ?`).bind(userId).run();

  return NextResponse.json({ ok: true, message: "Mot de passe mis à jour. Connectez-vous." });
}
