import { readEnv } from "@/lib/env";

/** Requête CI golden set — bypass limite invité si EVAL_API_KEY correspond. */
export function isEvalAutomationRequest(req: Request): boolean {
  const expected = readEnv("EVAL_API_KEY");
  if (!expected) return false;

  const header =
    req.headers.get("x-eval-key")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";

  return header.length > 0 && header === expected;
}
