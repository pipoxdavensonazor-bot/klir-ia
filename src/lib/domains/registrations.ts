import { getDb } from "@/lib/d1";
import { registerDomainWithRegistrar } from "@/lib/domains/registrar";

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function registerDomainOrder(input: {
  userId: string;
  domain: string;
  paymentOrderId: string;
  amountCents: number;
  currency: string;
}): Promise<{ status: string; registrarRef: string | null; message?: string }> {
  const db = getDb();
  const now = Date.now();
  const tld = input.domain.split(".").pop() ?? "";
  const expiresAt = now + 365 * 24 * 60 * 60 * 1000;

  const reg = await registerDomainWithRegistrar({
    domain: input.domain,
    userId: input.userId,
    paymentOrderId: input.paymentOrderId,
  });

  const status =
    reg.status === "registered" ? "active" : reg.status === "pending_manual" ? "pending" : "failed";

  await db
    .prepare(
      `INSERT INTO domain_registrations
       (id, user_id, domain, tld, status, amount_cents, currency, payment_order_id, registrar_ref, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(domain) DO UPDATE SET
         status = excluded.status,
         payment_order_id = excluded.payment_order_id,
         amount_cents = excluded.amount_cents,
         currency = excluded.currency,
         registrar_ref = excluded.registrar_ref,
         updated_at = excluded.updated_at`
    )
    .bind(
      id("dom"),
      input.userId,
      input.domain,
      tld,
      status,
      input.amountCents,
      input.currency,
      input.paymentOrderId,
      reg.registrarRef ?? null,
      expiresAt,
      now,
      now
    )
    .run();

  return { status, registrarRef: reg.registrarRef ?? null, message: reg.message };
}

export async function listUserDomains(userId: string) {
  const db = getDb();
  const res = await db
    .prepare(
      `SELECT id, domain, tld, status, expires_at, created_at
       FROM domain_registrations WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`
    )
    .bind(userId)
    .all<{
      id: string;
      domain: string;
      tld: string;
      status: string;
      expires_at: number | null;
      created_at: number;
    }>();
  return res.results ?? [];
}
