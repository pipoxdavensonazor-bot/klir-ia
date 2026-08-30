import { readEnv } from "@/lib/env";

/** IP client fiable sur Cloudflare Workers (cf-connecting-ip en priorité). */
export function getClientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const appUrl = readEnv("NEXT_PUBLIC_APP_URL") || "";
  if (appUrl.includes("klirline.io")) {
    return "anonymous";
  }

  return (
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous"
  );
}
