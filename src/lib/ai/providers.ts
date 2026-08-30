import { readEnv } from "@/lib/env";
import type { ChatTurn } from "./types";

export type AiProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "groq"
  | "mistral"
  | "mock";

export type ProviderResult = {
  content: string;
  model: string;
  provider: AiProviderId;
};

type GenConfig = {
  temperature: number;
  maxTokens: number;
};

function env(key: string) {
  return readEnv(key);
}

const OPENROUTER_FREE_FALLBACKS = [
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-nano-9b-v2:free",
  "poolside/laguna-s-2.1:free",
];

function genConfig(overrides?: { maxTokens?: number }): GenConfig {
  return {
    temperature: Number(env("AI_TEMPERATURE") || 0.8),
    maxTokens: overrides?.maxTokens ?? Number(env("AI_MAX_TOKENS") || 1024),
  };
}

function isRetryableOpenRouterError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("402") ||
    m.includes("404") ||
    m.includes("credits") ||
    m.includes("no endpoints found")
  );
}

async function chatOpenRouter(options: {
  apiKey: string;
  system: string;
  messages: ChatTurn[];
  appUrl: string;
  maxTokens?: number;
}): Promise<ProviderResult> {
  const primary = env("OPENROUTER_MODEL") || "google/gemini-3.5-flash";
  const freeModel = env("OPENROUTER_FREE_MODEL");
  const models = [...new Set([primary, ...(freeModel ? [freeModel] : []), ...OPENROUTER_FREE_FALLBACKS])];

  let lastError: Error | undefined;
  for (const model of models) {
    try {
      return await chatOpenAi({
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: options.apiKey,
        model,
        system: options.system,
        messages: options.messages,
        provider: "openrouter",
        maxTokens: options.maxTokens,
        extraHeaders: {
          "HTTP-Referer": options.appUrl,
          "X-Title": "Klir IA",
        },
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (!isRetryableOpenRouterError(lastError.message)) throw lastError;
    }
  }
  throw lastError ?? new Error("OpenRouter indisponible");
}

async function parseOpenAiCompatible(res: Response, fallbackModel: string): Promise<ProviderResult> {
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${err.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    model?: string;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Réponse vide");
  return { content, model: data.model ?? fallbackModel, provider: "openai" };
}

export function getProviderOrder(): AiProviderId[] {
  const raw = env("AI_PROVIDER_ORDER");
  const defaultOrder: AiProviderId[] = [
    "openai",
    "anthropic",
    "gemini",
    "openrouter",
    "groq",
    "mistral",
  ];
  if (!raw) return defaultOrder;
  const allowed = new Set(defaultOrder);
  return raw
    .split(",")
    .map((p) => p.trim().toLowerCase() as AiProviderId)
    .filter((p) => allowed.has(p));
}

export function listConfiguredProviders(): AiProviderId[] {
  return getProviderKeyStatus()
    .filter((p) => p.configured)
    .map((p) => p.id);
}

/** Détecte quelles clés ont une valeur non vide (sans exposer la clé). */
export function getProviderKeyStatus(): { id: AiProviderId; configured: boolean; envKeys: string[] }[] {
  const checks: { id: AiProviderId; envKeys: string[] }[] = [
    { id: "openai", envKeys: ["OPENAI_API_KEY"] },
    { id: "anthropic", envKeys: ["ANTHROPIC_API_KEY"] },
    {
      id: "gemini",
      envKeys: ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_API_KEY"],
    },
    { id: "openrouter", envKeys: ["OPENROUTER_API_KEY"] },
    { id: "groq", envKeys: ["GROQ_API_KEY"] },
    { id: "mistral", envKeys: ["MISTRAL_API_KEY"] },
  ];

  return checks.map(({ id, envKeys }) => ({
    id,
    envKeys,
    configured: envKeys.some((k) => Boolean(env(k))),
  }));
}

async function chatOpenAi(options: {
  endpoint: string;
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
  provider: AiProviderId;
  extraHeaders?: Record<string, string>;
  maxTokens?: number;
}): Promise<ProviderResult> {
  const { temperature, maxTokens } = genConfig(
    options.maxTokens != null ? { maxTokens: options.maxTokens } : undefined
  );
  const res = await fetch(options.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      ...(options.extraHeaders ?? {}),
    },
    body: JSON.stringify({
      model: options.model,
      temperature,
      top_p: 0.95,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: options.system },
        ...options.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });
  const result = await parseOpenAiCompatible(res, options.model);
  return { ...result, provider: options.provider };
}

async function chatAnthropic(options: {
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
}): Promise<ProviderResult> {
  const { temperature, maxTokens } = genConfig(
    options.maxTokens != null ? { maxTokens: options.maxTokens } : undefined
  );
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": options.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: maxTokens,
      temperature,
      system: options.system,
      messages: options.messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    model?: string;
  };
  const content = data.content
    ?.filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
  if (!content) throw new Error("Anthropic: réponse vide");
  return { content, model: data.model ?? options.model, provider: "anthropic" };
}

async function chatGemini(options: {
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
}): Promise<ProviderResult> {
  const { temperature, maxTokens } = genConfig(
    options.maxTokens != null ? { maxTokens: options.maxTokens } : undefined
  );
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    options.model
  )}:generateContent?key=${encodeURIComponent(options.apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.system }] },
      contents: options.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: { temperature, topP: 0.95, maxOutputTokens: maxTokens },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const content = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!content) throw new Error("Gemini: réponse vide");
  return { content, model: options.model, provider: "gemini" };
}

function buildRunners(
  system: string,
  messages: ChatTurn[],
  maxTokens?: number
): Partial<Record<AiProviderId, () => Promise<ProviderResult>>> {
  const appUrl = env("NEXT_PUBLIC_APP_URL") || "https://klirline.io";
  const geminiKey =
    env("GEMINI_API_KEY") || env("GOOGLE_GENERATIVE_AI_API_KEY") || env("GOOGLE_API_KEY");

  return {
    openai: env("OPENAI_API_KEY")
      ? () =>
          chatOpenAi({
            endpoint: `${env("OPENAI_BASE_URL") || "https://api.openai.com/v1"}/chat/completions`,
            apiKey: env("OPENAI_API_KEY"),
            model: env("OPENAI_MODEL") || "gpt-4o-mini",
            system,
            messages,
            provider: "openai",
            maxTokens,
          })
      : undefined,

    anthropic: env("ANTHROPIC_API_KEY")
      ? () =>
          chatAnthropic({
            apiKey: env("ANTHROPIC_API_KEY"),
            model: env("ANTHROPIC_MODEL") || "claude-haiku-4-5",
            system,
            messages,
            maxTokens,
          })
      : undefined,

    gemini: geminiKey
      ? () =>
          chatGemini({
            apiKey: geminiKey,
            model: env("GEMINI_MODEL") || "gemini-3.6-flash",
            system,
            messages,
            maxTokens,
          })
      : undefined,

    openrouter: env("OPENROUTER_API_KEY")
      ? () =>
          chatOpenRouter({
            apiKey: env("OPENROUTER_API_KEY"),
            system,
            messages,
            appUrl,
            maxTokens,
          })
      : undefined,

    groq: env("GROQ_API_KEY")
      ? () =>
          chatOpenAi({
            endpoint: "https://api.groq.com/openai/v1/chat/completions",
            apiKey: env("GROQ_API_KEY"),
            model: env("GROQ_MODEL") || "openai/gpt-oss-120b",
            system,
            messages,
            provider: "groq",
            maxTokens,
          })
      : undefined,

    mistral: env("MISTRAL_API_KEY")
      ? () =>
          chatOpenAi({
            endpoint: "https://api.mistral.ai/v1/chat/completions",
            apiKey: env("MISTRAL_API_KEY"),
            model: env("MISTRAL_MODEL") || "mistral-small-latest",
            system,
            messages,
            provider: "mistral",
            maxTokens,
          })
      : undefined,
  };
}

export async function chatWithProviderChain(options: {
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
}): Promise<ProviderResult & { fallbacks?: string[] }> {
  const order = getProviderOrder();
  const runners = buildRunners(options.system, options.messages, options.maxTokens);
  const errors: string[] = [];

  for (const id of order) {
    const run = runners[id];
    if (!run) continue;
    try {
      const result = await run();
      return { ...result, fallbacks: errors.length ? errors : undefined };
    } catch (err) {
      errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(
    errors.length
      ? `Tous les providers ont échoué — ${errors.join(" | ")}`
      : "Aucun provider IA configuré. Ajoutez au moins une clé API."
  );
}
