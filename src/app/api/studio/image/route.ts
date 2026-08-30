import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { generateStudioImage, type StudioImageKind } from "@/lib/studio/image";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = await checkRateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  let userId: string | null = null;
  try {
    userId = (await getAuthUser()).userId;
  } catch {
    userId = null;
  }
  if (!userId) {
    return NextResponse.json(
      { error: "Connectez-vous pour générer des flyers / mockups.", code: "SIGNUP_REQUIRED" },
      { status: 401 }
    );
  }

  let body: { prompt?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt requis" }, { status: 400 });
  }
  const kind: StudioImageKind = body.kind === "mockup" ? "mockup" : "flyer";

  try {
    const image = await generateStudioImage({ prompt, kind });
    return NextResponse.json({ image });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur génération" },
      { status: 503 }
    );
  }
}
