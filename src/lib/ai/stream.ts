import { readEnv } from "@/lib/env";
import {
  getProviderOrder,
  type AiProviderId,
} from "./providers";
import type { ChatTurn } from "./types";

export type StreamMeta = {
  type: "meta";
  provider: AiProviderId;
  model: string;
  skill?: string | null;
};

export type StreamDelta = {
  type: "delta";
  text: string;
};

export type StreamDone = {
  type: "done";
  content: string;
  provider: AiProviderId;
  model: string;
};

export type StreamError = {
  type: "error";
  error: string;
};

export type StreamEvent = StreamMeta | StreamDelta | StreamDone | StreamError;

function env(key: string) {
  return readEnv(key);
}

function genConfig() {
  return {
    temperature: Number(env("AI_TEMPERATURE") || 0.8),
    maxTokens: Number(env("AI_MAX_TOKENS") || 1800),
  };
}

async function* readSseDataLines(res: Response): AsyncGenerator<string> {
  if (!res.body) throw new Error("Pas de corps de réponse");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      yield payload;
    }
  }
}

async function* streamOpenAiCompatible(options: {
  endpoint: string;
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
  provider: AiProviderId;
  extraHeaders?: Record<string, string>;
}): AsyncGenerator<StreamEvent> {
  const { temperature, maxTokens } = genConfig();
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
      stream: true,
      messages: [
        { role: "system", content: options.system },
        ...options.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`${options.provider} ${res.status}: ${err.slice(0, 300)}`);
  }

  yield {
    type: "meta",
    provider: options.provider,
    model: options.model,
  };

  let full = "";
  let model = options.model;

  for await (const payload of readSseDataLines(res)) {
    let data: {
      model?: string;
      choices?: { delta?: { content?: string | null } }[];
    };
    try {
      data = JSON.parse(payload);
    } catch {
      continue;
    }
    if (data.model) model = data.model;
    const piece = data.choices?.[0]?.delta?.content;
    if (!piece) continue;
    full += piece;
    yield { type: "delta", text: piece };
  }

  if (!full.trim()) throw new Error(`${options.provider}: réponse vide`);
  yield { type: "done", content: full, provider: options.provider, model };
}

async function* streamGemini(options: {
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
}): AsyncGenerator<StreamEvent> {
  const { temperature, maxTokens } = genConfig();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    options.model
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(options.apiKey)}`;

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

  yield { type: "meta", provider: "gemini", model: options.model };

  let full = "";
  for await (const payload of readSseDataLines(res)) {
    let data: {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    try {
      data = JSON.parse(payload);
    } catch {
      continue;
    }
    const piece =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!piece) continue;
    full += piece;
    yield { type: "delta", text: piece };
  }

  if (!full.trim()) throw new Error("Gemini: réponse vide");
  yield { type: "done", content: full, provider: "gemini", model: options.model };
}

async function* streamAnthropic(options: {
  apiKey: string;
  model: string;
  system: string;
  messages: ChatTurn[];
}): AsyncGenerator<StreamEvent> {
  const { temperature, maxTokens } = genConfig();
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
      stream: true,
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

  yield { type: "meta", provider: "anthropic", model: options.model };

  let full = "";
  for await (const payload of readSseDataLines(res)) {
    let data: { type?: string; delta?: { type?: string; text?: string } };
    try {
      data = JSON.parse(payload);
    } catch {
      continue;
    }
    if (data.type === "content_block_delta" && data.delta?.type === "text_delta" && data.delta.text) {
      full += data.delta.text;
      yield { type: "delta", text: data.delta.text };
    }
  }

  if (!full.trim()) throw new Error("Anthropic: réponse vide");
  yield { type: "done", content: full, provider: "anthropic", model: options.model };
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

type StreamRunner = () => AsyncGenerator<StreamEvent>;

function buildStreamRunners(system: string, messages: ChatTurn[]): Partial<Record<AiProviderId, StreamRunner>> {
  const appUrl = env("NEXT_PUBLIC_APP_URL") || "https://klirline.io";
  const geminiKey =
    env("GEMINI_API_KEY") || env("GOOGLE_GENERATIVE_AI_API_KEY") || env("GOOGLE_API_KEY");

  return {
    openai: env("OPENAI_API_KEY")
      ? () =>
          streamOpenAiCompatible({
            endpoint: `${env("OPENAI_BASE_URL") || "https://api.openai.com/v1"}/chat/completions`,
            apiKey: env("OPENAI_API_KEY")!,
            model: env("OPENAI_MODEL") || "gpt-4o-mini",
            system,
            messages,
            provider: "openai",
          })
      : undefined,

    anthropic: env("ANTHROPIC_API_KEY")
      ? () =>
          streamAnthropic({
            apiKey: env("ANTHROPIC_API_KEY")!,
            model: env("ANTHROPIC_MODEL") || "claude-haiku-4-5",
            system,
            messages,
          })
      : undefined,

    gemini: geminiKey
      ? () =>
          streamGemini({
            apiKey: geminiKey,
            model: env("GEMINI_MODEL") || "gemini-3.6-flash",
            system,
            messages,
          })
      : undefined,

    openrouter: env("OPENROUTER_API_KEY")
      ? async function* () {
          const primary = env("OPENROUTER_MODEL") || "google/gemini-3.5-flash";
          const freeModel = env("OPENROUTER_FREE_MODEL");
          const models = [
            ...new Set([
              primary,
              ...(freeModel ? [freeModel] : []),
              "google/gemma-4-26b-a4b-it:free",
              "nvidia/nemotron-3-nano-9b-v2:free",
              "poolside/laguna-s-2.1:free",
            ]),
          ];
          let lastError: Error | undefined;
          for (const model of models) {
            try {
              yield* streamOpenAiCompatible({
                endpoint: "https://openrouter.ai/api/v1/chat/completions",
                apiKey: env("OPENROUTER_API_KEY")!,
                model,
                system,
                messages,
                provider: "openrouter",
                extraHeaders: {
                  "HTTP-Referer": appUrl,
                  "X-Title": "Klir IA",
                },
              });
              return;
            } catch (err) {
              lastError = err instanceof Error ? err : new Error(String(err));
              if (!isRetryableOpenRouterError(lastError.message)) throw lastError;
            }
          }
          throw lastError ?? new Error("OpenRouter indisponible");
        }
      : undefined,

    groq: env("GROQ_API_KEY")
      ? () =>
          streamOpenAiCompatible({
            endpoint: "https://api.groq.com/openai/v1/chat/completions",
            apiKey: env("GROQ_API_KEY")!,
            model: env("GROQ_MODEL") || "openai/gpt-oss-120b",
            system,
            messages,
            provider: "groq",
          })
      : undefined,

    mistral: env("MISTRAL_API_KEY")
      ? () =>
          streamOpenAiCompatible({
            endpoint: "https://api.mistral.ai/v1/chat/completions",
            apiKey: env("MISTRAL_API_KEY")!,
            model: env("MISTRAL_MODEL") || "mistral-small-latest",
            system,
            messages,
            provider: "mistral",
          })
      : undefined,
  };
}

/** Chaîne de providers en streaming — bascule avant le 1er token uniquement. */
export async function* streamWithProviderChain(options: {
  system: string;
  messages: ChatTurn[];
}): AsyncGenerator<StreamEvent> {
  const order = getProviderOrder();
  const runners = buildStreamRunners(options.system, options.messages);
  const errors: string[] = [];

  for (const id of order) {
    const run = runners[id];
    if (!run) continue;
    try {
      yield* run();
      return;
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
