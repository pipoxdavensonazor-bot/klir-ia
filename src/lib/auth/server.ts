import { getSessionUser } from "@/lib/auth/session";

export type KlirAuthUser = {
  id: string;
  email: string;
  name: string | null;
};

/** Remplace Clerk `auth()` — retourne userId ou null. */
export async function getAuthUser(): Promise<{ userId: string | null; user: KlirAuthUser | null }> {
  const user = await getSessionUser();
  return { userId: user?.id ?? null, user };
}
