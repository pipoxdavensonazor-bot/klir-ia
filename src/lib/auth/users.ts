import { hashPassword, newUserId, verifyPassword } from "@/lib/auth/crypto";
import type { AuthUserRow } from "@/lib/auth/session";
import { getDb } from "@/lib/d1";
import { ensureWallet } from "@/lib/billing/credits";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<(AuthUserRow & { password_hash: string }) | null> {
  const db = getDb();
  return (
    (await db
      .prepare(`SELECT id, email, name, password_hash FROM auth_users WHERE email = ?`)
      .bind(normalizeEmail(email))
      .first<AuthUserRow & { password_hash: string }>()) ?? null
  );
}

export async function createUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthUserRow> {
  const db = getDb();
  const email = normalizeEmail(input.email);
  const existing = await findUserByEmail(email);
  if (existing) throw new Error("EMAIL_TAKEN");

  const id = newUserId();
  const now = Date.now();
  const password_hash = await hashPassword(input.password);

  await db
    .prepare(
      `INSERT INTO auth_users (id, email, password_hash, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(id, email, password_hash, input.name?.trim() || null, now, now)
    .run();

  await ensureWallet(id);

  return { id, email, name: input.name?.trim() || null };
}

export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<AuthUserRow | null> {
  const row = await findUserByEmail(email);
  if (!row) return null;
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return null;
  return { id: row.id, email: row.email, name: row.name };
}
