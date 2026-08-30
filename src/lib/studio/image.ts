import { readEnv } from "@/lib/env";

export type StudioImageKind = "flyer" | "mockup";

export type StudioImageResult = {
  kind: StudioImageKind;
  mimeType: string;
  /** data URL or https URL */
  url: string;
  prompt: string;
  provider: string;
  note?: string;
};

function geminiKey(): string {
  return (
    readEnv("GEMINI_API_KEY") ||
    readEnv("GOOGLE_GENERATIVE_AI_API_KEY") ||
    readEnv("GOOGLE_API_KEY")
  );
}

/** Génère une image via Gemini (image preview) ou SVG de secours. */
export async function generateStudioImage(options: {
  prompt: string;
  kind: StudioImageKind;
}): Promise<StudioImageResult> {
  const prompt = options.prompt.trim().slice(0, 2000);
  const kindLabel = options.kind === "flyer" ? "flyer marketing pro" : "mockup produit réaliste";
  const fullPrompt = `Create a high-quality ${kindLabel} visual. Brand-safe, clean, professional. ${prompt}`;

  const key = geminiKey();
  if (key) {
    const models = [
      readEnv("GEMINI_IMAGE_MODEL") || "gemini-2.0-flash-preview-image-generation",
      "gemini-2.0-flash-exp-image-generation",
    ];

    for (const model of models) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
            },
          }),
        });
        if (!res.ok) continue;
        const data = (await res.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }> };
          }>;
        };
        const parts = data.candidates?.[0]?.content?.parts ?? [];
        const inline = parts.find((p) => p.inlineData?.data);
        if (inline?.inlineData?.data) {
          const mime = inline.inlineData.mimeType || "image/png";
          return {
            kind: options.kind,
            mimeType: mime,
            url: `data:${mime};base64,${inline.inlineData.data}`,
            prompt,
            provider: `gemini:${model}`,
          };
        }
      } catch {
        // try next model
      }
    }
  }

  const svg = buildFallbackSvg(options.kind, prompt);
  const b64 = Buffer.from(svg).toString("base64");
  return {
    kind: options.kind,
    mimeType: "image/svg+xml",
    url: `data:image/svg+xml;base64,${b64}`,
    prompt,
    provider: "svg-fallback",
    note: "Image IA indisponible — flyer SVG de secours généré. Ajoutez GEMINI_API_KEY pour des visuels photo.",
  };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildFallbackSvg(kind: StudioImageKind, prompt: string): string {
  const title = kind === "flyer" ? "Flyer Klir IA" : "Mockup produit";
  const lines = prompt.slice(0, 180).split(/\s+/).reduce<string[]>((acc, w) => {
    const last = acc[acc.length - 1] ?? "";
    if ((last + " " + w).trim().length > 36) acc.push(w);
    else acc[acc.length - 1] = `${last} ${w}`.trim();
    return acc;
  }, [""]);
  const textRows = lines
    .slice(0, 5)
    .map(
      (line, i) =>
        `<text x="540" y="${520 + i * 36}" text-anchor="middle" fill="#F7F5F0" font-family="Georgia, serif" font-size="28">${escapeXml(line)}</text>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#004F6E"/>
      <stop offset="100%" stop-color="#003348"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1350" fill="url(#g)"/>
  <rect x="48" y="48" width="984" height="1254" rx="28" fill="none" stroke="#D4AF37" stroke-width="3"/>
  <text x="540" y="180" text-anchor="middle" fill="#D4AF37" font-family="Georgia, serif" font-size="42" font-weight="700">${escapeXml(title)}</text>
  ${textRows}
  <text x="540" y="1240" text-anchor="middle" fill="#F7F5F0" font-family="system-ui,sans-serif" font-size="22" opacity="0.7">klirline.io</text>
</svg>`;
}
