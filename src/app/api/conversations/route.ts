import { getAuthUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import {
  createConversation,
  listConversations,
} from "@/lib/conversations";
import { getDb } from "@/lib/d1";

export async function GET() {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const db = getDb();
    const conversations = await listConversations(db, userId);
    return NextResponse.json({ conversations });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur D1" },
      { status: 503 }
    );
  }
}

export async function POST(req: Request) {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: { title?: string; skill?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    // empty body ok
  }

  try {
    const db = getDb();
    const conversation = await createConversation(db, {
      userId,
      title: body.title,
      skill: body.skill,
    });
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur D1" },
      { status: 503 }
    );
  }
}
