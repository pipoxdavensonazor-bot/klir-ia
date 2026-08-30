import type { R2Bucket } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getR2(): R2Bucket | null {
  try {
    const ctx = getCloudflareContext({ async: false });
    const bucket = (ctx.env as { ATTACHMENTS?: R2Bucket }).ATTACHMENTS;
    return bucket ?? null;
  } catch {
    return null;
  }
}
