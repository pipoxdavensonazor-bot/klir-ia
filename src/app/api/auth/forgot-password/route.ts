import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/auth/users";
import { createPasswordReset, sendPasswordResetEmail } from "@/lib/auth/password-reset";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashEmailBucket } from "@/lib/security-hash";
import { readEnv } from "@/lib/env";

type Body = { email?: string };

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = await checkRateLimit(`auth:forgot:ip:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Courriel requis." }, { status: 400 });
  }

  const emailHash = await hashEmailBucket(email);
  const emailLimit = await checkRateLimit(`auth:forgot:email:${emailHash}`, 3, 60 * 60 * 1000);
  if (!emailLimit.ok) {
    return NextResponse.json({ error: "Trop de demandes pour ce courriel. Réessayez plus tard." }, { status: 429 });
  }

  const user = await findUserByEmail(email);
  if (user) {
    const token = await createPasswordReset(user.id);
    const base = readEnv("NEXT_PUBLIC_APP_URL") || "https://klirline.io";
    const resetUrl = `${base}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  return NextResponse.json({
    ok: true,
    message:
      "Si ce courriel existe, un lien de réinitialisation a été envoyé (valide 1 h). Vérifiez vos courriels indésirables.",
  });
}
