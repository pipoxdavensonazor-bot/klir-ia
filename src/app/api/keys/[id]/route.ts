import { getAuthUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { revokeApiKey } from "@/lib/api-keys";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const ok = await revokeApiKey(userId, id);
  if (!ok) {
    return NextResponse.json({ error: "Clé introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
