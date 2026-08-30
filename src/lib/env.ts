import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Lit une variable d'env (process.env + bindings Cloudflare en secours). */
export function readEnv(key: string): string {
  const direct = process.env[key]?.trim();
  if (direct) return direct;

  try {
    const ctx = getCloudflareContext({ async: false });
    const bound = ctx.env[key as keyof typeof ctx.env];
    if (typeof bound === "string") return bound.trim();
  } catch {
    // Hors Worker Cloudflare (build, tests)
  }

  return "";
}
