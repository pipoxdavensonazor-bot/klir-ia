import type { NextResponse } from "next/server";
import { getDb } from "@/lib/d1";
import { GUEST_SEARCH_LIMIT } from "@/lib/guest-limit";
import { getClientIp } from "@/lib/client-ip";
import { hashIp } from "@/lib/security-hash";

export const GUEST_COOKIE = "klir_guest_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=") || null;
  }
  return null;
}

export function readGuestId(req: Request): string | null {
  const raw = parseCookie(req.headers.get("cookie"), GUEST_COOKIE);
  if (!raw || raw.length < 8 || raw.length > 64) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(raw)) return null;
  return raw;
}

export function newGuestId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `g_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function guestSetCookieHeader(guestId: string): string {
  return `${GUEST_COOKIE}=${guestId}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; HttpOnly; Secure`;
}

export async function getGuestSearchCount(guestId: string): Promise<number> {
  const db = getDb();
  const row = await db
    .prepare("SELECT search_count FROM guest_usage WHERE guest_id = ?")
    .bind(guestId)
    .first<{ search_count: number }>();
  return row?.search_count ?? 0;
}

async function getGuestIpSearchCount(ipHash: string): Promise<number> {
  const db = getDb();
  const row = await db
    .prepare("SELECT search_count FROM guest_ip_usage WHERE ip_hash = ?")
    .bind(ipHash)
    .first<{ search_count: number }>();
  return row?.search_count ?? 0;
}

export async function incrementGuestSearch(guestId: string, ipHash: string): Promise<number> {
  const db = getDb();
  const now = Date.now();

  await db.batch([
    db
      .prepare(
        `INSERT INTO guest_usage (guest_id, search_count, created_at, updated_at)
         VALUES (?, 1, ?, ?)
         ON CONFLICT(guest_id) DO UPDATE SET
           search_count = search_count + 1,
           updated_at = excluded.updated_at`
      )
      .bind(guestId, now, now),
    db
      .prepare(
        `INSERT INTO guest_ip_usage (ip_hash, search_count, created_at, updated_at)
         VALUES (?, 1, ?, ?)
         ON CONFLICT(ip_hash) DO UPDATE SET
           search_count = search_count + 1,
           updated_at = excluded.updated_at`
      )
      .bind(ipHash, now, now),
  ]);

  const guestCount = await getGuestSearchCount(guestId);
  const ipCount = await getGuestIpSearchCount(ipHash);
  return Math.max(guestCount, ipCount);
}

export async function checkGuestAllowed(req: Request): Promise<{
  allowed: boolean;
  guestId: string;
  count: number;
  setCookie: boolean;
}> {
  let guestId = readGuestId(req);
  let setCookie = false;
  if (!guestId) {
    guestId = newGuestId();
    setCookie = true;
  }

  const ipHash = await hashIp(getClientIp(req));
  const guestCount = await getGuestSearchCount(guestId);
  const ipCount = await getGuestIpSearchCount(ipHash);
  const count = Math.max(guestCount, ipCount);

  return {
    allowed: count < GUEST_SEARCH_LIMIT,
    guestId,
    count,
    setCookie,
  };
}

export function appendGuestCookie(res: Response, guestId: string, setCookie: boolean): Response {
  if (setCookie) {
    res.headers.append("Set-Cookie", guestSetCookieHeader(guestId));
  }
  return res;
}

/** Variante fail-closed pour checkGuestAllowed quand D1 est requis. */
export async function checkGuestAllowedStrict(req: Request): Promise<{
  allowed: boolean;
  guestId: string;
  count: number;
  setCookie: boolean;
  dbError?: boolean;
}> {
  try {
    return await checkGuestAllowed(req);
  } catch {
    const guestId = readGuestId(req) ?? newGuestId();
    return {
      allowed: false,
      guestId,
      count: GUEST_SEARCH_LIMIT,
      setCookie: !readGuestId(req),
      dbError: true,
    };
  }
}

export async function incrementGuestSearchSafe(
  guestId: string,
  req: Request
): Promise<number | null> {
  try {
    const ipHash = await hashIp(getClientIp(req));
    return incrementGuestSearch(guestId, ipHash);
  } catch {
    return null;
  }
}
