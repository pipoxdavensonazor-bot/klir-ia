import { NextResponse } from "next/server";
import { createSession, applySessionCookie } from "@/lib/auth/session";
import { verifyUserCredentials } from "@/lib/auth/users";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashEmailBucket } from "@/lib/security-hash";

type Body = { email?: string; password?: string };

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  const ip = getClientIp(req);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Courriel et mot de passe requis." }, { status: 400 });
  }

  const ipLimit = await checkRateLimit(`auth:login:ip:${ip}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  const emailHash = await hashEmailBucket(email);
  const emailLimit = await checkRateLimit(`auth:login:email:${emailHash}`, 5, WINDOW_MS);
  if (!emailLimit.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives pour ce courriel. Réessayez plus tard." },
      { status: 429 }
    );
  }

  const user = await verifyUserCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
  }

  const session = await createSession(user.id);
  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    redirect: "/#chat",
  });
  applySessionCookie(res, session.token, session.expiresAt);
  return res;
}
