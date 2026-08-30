import { hashToken, randomToken } from "@/lib/auth/crypto";
import { getDb } from "@/lib/d1";
import { readEnv } from "@/lib/env";

const RESET_MS = 60 * 60 * 1000;

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function createPasswordReset(userId: string): Promise<string> {
  const db = getDb();
  const token = randomToken(32);
  const tokenHash = await hashToken(token);
  const now = Date.now();
  const resetId = id("rst");

  await db.prepare(`UPDATE auth_password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL`).bind(now, userId).run();

  await db
    .prepare(
      `INSERT INTO auth_password_resets (id, user_id, token_hash, expires_at, used_at, created_at)
       VALUES (?, ?, ?, ?, NULL, ?)`
    )
    .bind(resetId, userId, tokenHash, now + RESET_MS, now)
    .run();

  return token;
}

export async function consumePasswordReset(token: string): Promise<string | null> {
  const db = getDb();
  const tokenHash = await hashToken(token);
  const row = await db
    .prepare(
      `SELECT user_id FROM auth_password_resets
       WHERE token_hash = ? AND expires_at > ? AND used_at IS NULL`
    )
    .bind(tokenHash, Date.now())
    .first<{ user_id: string }>();
  return row?.user_id ?? null;
}

export async function markPasswordResetUsed(token: string): Promise<void> {
  const db = getDb();
  const tokenHash = await hashToken(token);
  await db
    .prepare(`UPDATE auth_password_resets SET used_at = ? WHERE token_hash = ?`)
    .bind(Date.now(), tokenHash)
    .run();
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
  const apiKey = readEnv("RESEND_API_KEY");
  const from = readEnv("EMAIL_FROM") || "Klir IA <noreply@klirline.io>";
  if (!apiKey) {
    console.warn("[auth] RESEND_API_KEY manquant — courriel reset non envoyé");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Réinitialiser votre mot de passe — Klir IA",
      html: `<p>Bonjour,</p><p>Cliquez pour choisir un nouveau mot de passe (lien valide 1 h) :</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Si vous n'avez pas demandé ce courriel, ignorez-le.</p>`,
    }),
  });

  return res.ok;
}
