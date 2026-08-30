import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hashToken, newSessionId, randomToken } from "@/lib/auth/crypto";
import { getDb } from "@/lib/d1";

export const SESSION_COOKIE = "klir_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthUserRow = {
  id: string;
  email: string;
  name: string | null;
};

export async function createSession(userId: string): Promise<{ token: string; expiresAt: number }> {
  const db = getDb();
  const token = randomToken();
  const tokenHash = await hashToken(token);
  const now = Date.now();
  const expiresAt = now + SESSION_MS;
  const id = newSessionId();

  await db
    .prepare(
      `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(id, userId, tokenHash, expiresAt, now)
    .run();

  return { token, expiresAt };
}

export async function resolveSessionToken(token: string): Promise<string | null> {
  if (!token) return null;
  try {
    const db = getDb();
    const tokenHash = await hashToken(token);
    const row = await db
      .prepare(
        `SELECT s.user_id AS user_id
         FROM auth_sessions s
         WHERE s.token_hash = ? AND s.expires_at > ?`
      )
      .bind(tokenHash, Date.now())
      .first<{ user_id: string }>();
    return row?.user_id ?? null;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<AuthUserRow | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const userId = await resolveSessionToken(token);
    if (!userId) return null;

    const db = getDb();
    const row = await db
      .prepare(`SELECT id, email, name FROM auth_users WHERE id = ?`)
      .bind(userId)
      .first<AuthUserRow>();
    return row ?? null;
  } catch {
    return null;
  }
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  try {
    const db = getDb();
    const tokenHash = await hashToken(token);
    await db.prepare(`DELETE FROM auth_sessions WHERE token_hash = ?`).bind(tokenHash).run();
  } catch {
    // ignore
  }
}

export function applySessionCookie(res: NextResponse, token: string, expiresAt: number): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
