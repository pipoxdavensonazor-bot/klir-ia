import { readEnv } from "@/lib/env";

function salt(): string {
  const value = readEnv("SECURITY_SALT");
  if (value) return value;

  const appUrl = readEnv("NEXT_PUBLIC_APP_URL") || "";
  if (appUrl.includes("klirline.io")) {
    console.error("[security] SECURITY_SALT manquant — définissez-le via wrangler secret put SECURITY_SALT");
  }
  return "klir-ia-security-v1";
}

export async function hashIp(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt()}:ip:${ip}`)
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashEmailBucket(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt()}:email:${normalized}`)
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
