import type { D1Database } from "@cloudflare/workers-types";

export type AttachmentRow = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  filename: string;
  content_type: string;
  size_bytes: number;
  r2_key: string;
  excerpt: string | null;
  payload: string | null;
  created_at: number;
};

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function insertAttachment(
  db: D1Database,
  row: Omit<AttachmentRow, "id" | "created_at"> & { id?: string }
): Promise<AttachmentRow> {
  const full: AttachmentRow = {
    id: row.id ?? id("att"),
    user_id: row.user_id,
    conversation_id: row.conversation_id,
    filename: row.filename,
    content_type: row.content_type,
    size_bytes: row.size_bytes,
    r2_key: row.r2_key,
    excerpt: row.excerpt,
    payload: row.payload,
    created_at: Date.now(),
  };

  await db
    .prepare(
      `INSERT INTO attachments
       (id, user_id, conversation_id, filename, content_type, size_bytes, r2_key, excerpt, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      full.id,
      full.user_id,
      full.conversation_id,
      full.filename,
      full.content_type,
      full.size_bytes,
      full.r2_key,
      full.excerpt,
      full.payload,
      full.created_at
    )
    .run();

  return full;
}

export async function getAttachmentsByIds(
  db: D1Database,
  userId: string,
  ids: string[]
): Promise<AttachmentRow[]> {
  if (!ids.length) return [];
  const unique = [...new Set(ids)].slice(0, 8);
  const placeholders = unique.map(() => "?").join(",");
  const res = await db
    .prepare(
      `SELECT id, user_id, conversation_id, filename, content_type, size_bytes, r2_key, excerpt, payload, created_at
       FROM attachments
       WHERE user_id = ? AND id IN (${placeholders})`
    )
    .bind(userId, ...unique)
    .all<AttachmentRow>();
  return res.results ?? [];
}

export function formatAttachmentsForPrompt(rows: AttachmentRow[]): string {
  if (!rows.length) return "";
  const blocks = rows.map((r) => {
    const excerpt = r.excerpt?.trim()
      ? r.excerpt.slice(0, 4000)
      : "(aucun extrait texte — fichier binaire ou image)";
    return `- ${r.filename} (${r.content_type}, ${r.size_bytes} o)\n  Extrait:\n${excerpt}`;
  });
  return `\n## Fichiers joints par l'utilisateur\n${blocks.join("\n")}\n`;
}
