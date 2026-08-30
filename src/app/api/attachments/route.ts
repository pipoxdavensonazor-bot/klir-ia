import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { insertAttachment } from "@/lib/attachments";
import { getDb } from "@/lib/d1";
import { getR2 } from "@/lib/r2";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_D1_FALLBACK = 900_000;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function toBase64(buf: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function POST(req: Request) {
  let userId: string | null = null;
  try {
    const session = await getAuthUser();
    userId = session.userId;
  } catch {
    userId = null;
  }
  if (!userId) {
    return NextResponse.json(
      { error: "Connectez-vous pour joindre des photos ou documents.", code: "SIGNUP_REQUIRED" },
      { status: 401 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData invalide" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  const contentType = file.type || "application/octet-stream";
  if (!ALLOWED.has(contentType)) {
    return NextResponse.json(
      { error: "Type non supporté. Images, PDF, TXT, MD, CSV, DOCX." },
      { status: 415 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 8 Mo)." }, { status: 413 });
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  const attachmentId = `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const r2Key = `users/${userId}/${attachmentId}/${safeName}`;

  const r2 = getR2();
  let payload: string | null = null;

  if (r2) {
    await r2.put(r2Key, buf, {
      httpMetadata: { contentType },
      customMetadata: { userId, filename: file.name },
    });
  } else {
    if (file.size > MAX_D1_FALLBACK) {
      return NextResponse.json(
        {
          error:
            "R2 non activé : fichiers limités à ~900 Ko. Activez R2 (klir-ia-attachments) pour les gros fichiers.",
        },
        { status: 413 }
      );
    }
    payload = toBase64(buf);
  }

  let excerpt: string | null = null;
  if (contentType.startsWith("text/") || contentType === "text/csv") {
    excerpt = new TextDecoder().decode(buf).slice(0, 8000);
  } else if (contentType.startsWith("image/")) {
    excerpt = `[Image jointe : ${file.name}]`;
  } else if (contentType === "application/pdf") {
    excerpt = `[PDF joint : ${file.name} — décrivez le contenu clé dans le chat si besoin]`;
  } else {
    excerpt = `[Document joint : ${file.name}]`;
  }

  try {
    const db = getDb();
    const row = await insertAttachment(db, {
      id: attachmentId,
      user_id: userId,
      conversation_id: null,
      filename: file.name.slice(0, 200),
      content_type: contentType,
      size_bytes: file.size,
      r2_key: r2 ? r2Key : `d1:${attachmentId}`,
      excerpt,
      payload,
    });
    const { payload: _omit, ...safe } = row;
    return NextResponse.json({ attachment: safe, storage: r2 ? "r2" : "d1" }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur D1" },
      { status: 503 }
    );
  }
}
