import { getDb } from "@/lib/d1";
import { ensureWallet, getWallet, type CreditWallet } from "@/lib/billing/credits";

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const db = getDb();
  const row = await db
    .prepare("SELECT id FROM auth_users WHERE lower(email) = lower(?)")
    .bind(email.trim())
    .first<{ id: string }>();
  return row?.id ?? null;
}

export async function setCreditBalance(userId: string, balance: number): Promise<CreditWallet> {
  await ensureWallet(userId);
  const db = getDb();
  const now = Date.now();
  const safe = Math.max(0, Math.floor(balance));
  await db
    .prepare(
      `UPDATE subscriptions SET credits_balance = ?, updated_at = ? WHERE user_id = ?`
    )
    .bind(safe, now, userId)
    .run();
  const wallet = await getWallet(userId);
  if (!wallet) throw new Error("Portefeuille introuvable");
  return wallet;
}

export async function adjustCreditBalance(
  userId: string,
  delta: number
): Promise<CreditWallet> {
  await ensureWallet(userId);
  const wallet = await getWallet(userId);
  if (!wallet) throw new Error("Portefeuille introuvable");
  return setCreditBalance(userId, wallet.balance + delta);
}
