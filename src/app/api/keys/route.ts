import { getAuthUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { createApiKey, listApiKeys } from "@/lib/api-keys";
import { getPassExpiry } from "@/lib/billing/passes";

export async function GET() {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const keys = await listApiKeys(userId);
  const passExpiresAt = await getPassExpiry(userId);

  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.key_prefix,
      createdAt: k.created_at,
      lastUsedAt: k.last_used_at,
    })),
    passExpiresAt,
    canCreateKey: Boolean(passExpiresAt),
  });
}

export async function POST(req: Request) {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const { row, secret } = await createApiKey(userId, body.name || "Intégration");
    return NextResponse.json(
      {
        key: {
          id: row.id,
          name: row.name,
          prefix: row.key_prefix,
          secret,
        },
        warning: "Copiez la clé maintenant — elle ne sera plus affichée.",
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 403 }
    );
  }
}
