import type { D1Database } from "@cloudflare/workers-types";
import { getPassExpiry, hasActivePass } from "@/lib/billing/passes";
import { getDb } from "@/lib/d1";
import { getSubscription } from "@/lib/billing/subscriptions";

export type ApiKeyRow = {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
};

const PREFIX = "klir_sk_live_";

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "x")
    .replace(/\//g, "y")
    .replace(/=/g, "")
    .slice(0, 32);
}

export async function createApiKey(
  userId: string,
  name: string
): Promise<{ row: ApiKeyRow; secret: string }> {
  const passExpiry = await getPassExpiry(userId);
  if (!passExpiry) {
    throw new Error("Forfait actif requis pour créer une clé API (24h, 7j ou 30j).");
  }

  const secret = `${PREFIX}${randomSecret()}`;
  const keyHash = await sha256Hex(secret);
  const keyPrefix = secret.slice(0, 18) + "…";
  const row: ApiKeyRow = {
    id: id("key"),
    user_id: userId,
    name: name.slice(0, 80) || "Default",
    key_prefix: keyPrefix,
    key_hash: keyHash,
    created_at: Date.now(),
    last_used_at: null,
    revoked_at: null,
  };

  const db = getDb();
  await db
    .prepare(
      `INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash, created_at, last_used_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`
    )
    .bind(row.id, row.user_id, row.name, row.key_prefix, row.key_hash, row.created_at)
    .run();

  return { row, secret };
}

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  const db = getDb();
  const res = await db
    .prepare(
      `SELECT id, user_id, name, key_prefix, key_hash, created_at, last_used_at, revoked_at
       FROM api_keys WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC`
    )
    .bind(userId)
    .all<ApiKeyRow>();
  return res.results ?? [];
}

export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const db = getDb();
  const now = Date.now();
  const r = await db
    .prepare(
      `UPDATE api_keys SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL`
    )
    .bind(now, keyId, userId)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

export type ResolvedApiKey = {
  userId: string;
  keyId: string;
};

export async function resolveApiKey(bearer: string): Promise<ResolvedApiKey | null> {
  if (!bearer.startsWith(PREFIX)) return null;
  const keyHash = await sha256Hex(bearer);
  const db = getDb();
  const row = await db
    .prepare(
      `SELECT id, user_id FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL LIMIT 1`
    )
    .bind(keyHash)
    .first<{ id: string; user_id: string }>();
  if (!row) return null;

  const sub = await getSubscription(row.user_id);
  if (!hasActivePass(sub)) return null;

  await db
    .prepare(`UPDATE api_keys SET last_used_at = ? WHERE id = ?`)
    .bind(Date.now(), row.id)
    .run();

  return { userId: row.user_id, keyId: row.id };
}

export function extractBearer(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim();
}
