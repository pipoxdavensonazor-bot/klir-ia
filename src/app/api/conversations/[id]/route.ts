import { getAuthUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import {
  deleteConversation,
  getConversation,
  listMessages,
} from "@/lib/conversations";
import { getDb } from "@/lib/d1";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const db = getDb();
    const conversation = await getConversation(db, id, userId);
    if (!conversation) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    const messages = await listMessages(db, id);
    return NextResponse.json({
      conversation,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur D1" },
      { status: 503 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const db = getDb();
    const ok = await deleteConversation(db, id, userId);
    if (!ok) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur D1" },
      { status: 503 }
    );
  }
}
