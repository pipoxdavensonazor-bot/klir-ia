import type { D1Database } from "@cloudflare/workers-types";
import type { ChatTurn } from "@/lib/ai/types";

export type ConversationRow = {
  id: string;
  user_id: string;
  title: string;
  skill: string | null;
  created_at: number;
  updated_at: number;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: number;
};

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function listConversations(
  db: D1Database,
  userId: string,
  limit = 50
): Promise<ConversationRow[]> {
  const res = await db
    .prepare(
      `SELECT id, user_id, title, skill, created_at, updated_at
       FROM conversations
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .bind(userId, limit)
    .all<ConversationRow>();
  return res.results ?? [];
}

export async function createConversation(
  db: D1Database,
  options: { userId: string; title?: string; skill?: string | null }
): Promise<ConversationRow> {
  const now = Date.now();
  const row: ConversationRow = {
    id: id("conv"),
    user_id: options.userId,
    title: (options.title || "Nouvelle conversation").slice(0, 120),
    skill: options.skill ?? null,
    created_at: now,
    updated_at: now,
  };

  await db
    .prepare(
      `INSERT INTO conversations (id, user_id, title, skill, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(row.id, row.user_id, row.title, row.skill, row.created_at, row.updated_at)
    .run();

  return row;
}

export async function getConversation(
  db: D1Database,
  conversationId: string,
  userId: string
): Promise<ConversationRow | null> {
  const row = await db
    .prepare(
      `SELECT id, user_id, title, skill, created_at, updated_at
       FROM conversations
       WHERE id = ? AND user_id = ?`
    )
    .bind(conversationId, userId)
    .first<ConversationRow>();
  return row ?? null;
}

export async function listMessages(
  db: D1Database,
  conversationId: string
): Promise<MessageRow[]> {
  const res = await db
    .prepare(
      `SELECT id, conversation_id, role, content, created_at
       FROM messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC`
    )
    .bind(conversationId)
    .all<MessageRow>();
  return res.results ?? [];
}

export async function deleteConversation(
  db: D1Database,
  conversationId: string,
  userId: string
): Promise<boolean> {
  const owned = await getConversation(db, conversationId, userId);
  if (!owned) return false;

  await db.prepare(`DELETE FROM messages WHERE conversation_id = ?`).bind(conversationId).run();
  await db
    .prepare(`DELETE FROM conversations WHERE id = ? AND user_id = ?`)
    .bind(conversationId, userId)
    .run();
  return true;
}

export async function appendMessages(
  db: D1Database,
  options: {
    conversationId: string;
    userId: string;
    messages: ChatTurn[];
    skill?: string | null;
    titleFrom?: string;
  }
): Promise<boolean> {
  const owned = await getConversation(db, options.conversationId, options.userId);
  if (!owned) return false;

  const now = Date.now();
  const stmts = options.messages.map((m, i) =>
    db
      .prepare(
        `INSERT INTO messages (id, conversation_id, role, content, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id("msg"), options.conversationId, m.role, m.content, now + i)
  );

  let title = owned.title;
  if (
    (title === "Nouvelle conversation" || !title) &&
    options.titleFrom?.trim()
  ) {
    title = options.titleFrom.trim().slice(0, 80);
  }

  stmts.push(
    db
      .prepare(
        `UPDATE conversations
         SET updated_at = ?, skill = COALESCE(?, skill), title = ?
         WHERE id = ? AND user_id = ?`
      )
      .bind(now, options.skill ?? null, title, options.conversationId, options.userId)
  );

  await db.batch(stmts);
  return true;
}
