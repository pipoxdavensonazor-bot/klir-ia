import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export type CloudflareEnv = {
  DB: D1Database;
  ATTACHMENTS?: R2Bucket;
  [key: string]: unknown;
};

/** Accès D1 via le contexte OpenNext / Cloudflare Worker. */
export function getDb(): D1Database {
  try {
    const ctx = getCloudflareContext({ async: false });
    const db = (ctx.env as CloudflareEnv).DB;
    if (db) return db;
  } catch {
    // hors Worker
  }
  throw new Error("Base D1 indisponible (binding DB manquant).");
}
