import { readEnv } from "@/lib/env";

function sortTopLevel(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted;
}

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Vérifie la signature IPN NOWPayments (x-nowpayments-sig, HMAC-SHA512). */
export async function verifyNowPaymentsIpnSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  const secret = readEnv("NOWPAYMENTS_IPN_SECRET");
  if (!secret || !signatureHeader?.trim()) return false;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const sortedPayload = JSON.stringify(sortTopLevel(parsed));
  const expected = await hmacSha512Hex(secret, sortedPayload);
  return timingSafeEqual(expected.toLowerCase(), signatureHeader.trim().toLowerCase());
}

export function nowPaymentsIpnConfigured(): boolean {
  return Boolean(readEnv("NOWPAYMENTS_IPN_SECRET"));
}
