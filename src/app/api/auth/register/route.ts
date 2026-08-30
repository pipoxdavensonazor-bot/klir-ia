import { NextResponse } from "next/server";
import { createSession, applySessionCookie } from "@/lib/auth/session";
import { createUser } from "@/lib/auth/users";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashEmailBucket } from "@/lib/security-hash";

type Body = { email?: string; password?: string; name?: string };

const MAX_REGISTER_IP = 10;
const WINDOW_MS = 60 * 60 * 1000;

function retryMinutes(resetAt: number): number {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 60_000));
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit(`auth:register:ip:${ip}`, MAX_REGISTER_IP, WINDOW_MS);
  if (!ipLimit.ok) {
    const mins = retryMinutes(ipLimit.resetAt);
    return NextResponse.json(
      { error: `Trop de tentatives depuis cette adresse. Réessayez dans ${mins} min.` },
      { status: 429 }
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Courriel invalide." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Mot de passe : 8 caractères minimum." }, { status: 400 });
  }

  const emailHash = await hashEmailBucket(email);
  const emailLimit = await checkRateLimit(`auth:register:email:${emailHash}`, 5, WINDOW_MS);
  if (!emailLimit.ok) {
    const mins = retryMinutes(emailLimit.resetAt);
    return NextResponse.json(
      { error: `Inscription temporairement bloquée pour ce courriel. Réessayez dans ${mins} min.` },
      { status: 429 }
    );
  }

  try {
    const user = await createUser({ email, password, name: body.name });
    const session = await createSession(user.id);
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      redirect: "/onboarding",
    });
    applySessionCookie(res, session.token, session.expiresAt);
    return res;
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_TAKEN") {
      return NextResponse.json(
        {
          error: "Ce courriel est déjà utilisé. Connectez-vous ou réinitialisez votre mot de passe.",
          code: "EMAIL_TAKEN",
        },
        { status: 409 }
      );
    }
    console.error("register error:", err);
    return NextResponse.json(
      { error: "Inscription impossible. Réessayez dans un instant ou contactez contact@klirline.ca." },
      { status: 500 }
    );
  }
}
