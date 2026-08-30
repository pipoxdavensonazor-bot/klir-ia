import { formatChatError } from "./errors";
import { HUMAN_VOICE_PROMPT, lightHumanize } from "./humanize";
import {
  chatWithProviderChain,
  getProviderKeyStatus,
  listConfiguredProviders,
  type AiProviderId,
  type ProviderResult,
} from "./providers";
import { streamWithProviderChain, type StreamEvent } from "./stream";
import type { ChatTurn } from "./types";

export type { AiProviderId };

export type ChatResult = ProviderResult & {
  humanized: boolean;
  providersAvailable: AiProviderId[];
};

function mockResponse(messages: ChatTurn[]): ChatResult {
  const last = messages.filter((m) => m.role === "user").pop()?.content ?? "";
  return {
    content: `Votre demande : « ${last.slice(0, 200)} »\n\n**Clés API requises** — ajoutez au moins une clé pour activer l'IA :\n- OpenAI, Anthropic (Claude), Gemini, OpenRouter, Groq ou Mistral\n\nCommande : \`npx wrangler secret put OPENAI_API_KEY\` (etc.)\n\nKlir IA basculera automatiquement entre les providers disponibles pour des réponses fluides et humanisées.`,
    model: "mock",
    provider: "mock",
    humanized: true,
    providersAvailable: [],
  };
}

export function enrichSystemPrompt(base: string): string {
  return `${base}\n\n${HUMAN_VOICE_PROMPT}`;
}

export async function chat(options: {
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
  skipHumanize?: boolean;
  skipEnrich?: boolean;
}): Promise<ChatResult> {
  const available = listConfiguredProviders();

  if (available.length === 0) {
    return mockResponse(options.messages);
  }

  const system = options.skipEnrich ? options.system : enrichSystemPrompt(options.system);

  try {
    const result = await chatWithProviderChain({
      system,
      messages: options.messages,
      maxTokens: options.maxTokens,
    });
    return {
      ...result,
      content: options.skipHumanize ? result.content : lightHumanize(result.content),
      humanized: !options.skipHumanize,
      providersAvailable: available,
    };
  } catch (err) {
    const sandbox = process.env.AI_SANDBOX === "true";
    if (sandbox) return mockResponse(options.messages);
    throw new Error(
      formatChatError(
        err instanceof Error ? err.message : "Service IA indisponible. Réessayez dans un moment."
      )
    );
  }
}

/** Streaming SSE-ready : meta → delta* → done (contenu humanisé). */
export async function* chatStream(options: {
  system: string;
  messages: ChatTurn[];
}): AsyncGenerator<StreamEvent> {
  const available = listConfiguredProviders();

  if (available.length === 0) {
    const mock = mockResponse(options.messages);
    yield { type: "meta", provider: "mock", model: "mock" };
    yield { type: "delta", text: mock.content };
    yield {
      type: "done",
      content: mock.content,
      provider: "mock",
      model: "mock",
    };
    return;
  }

  const system = enrichSystemPrompt(options.system);

  try {
    for await (const event of streamWithProviderChain({
      system,
      messages: options.messages,
    })) {
      if (event.type === "done") {
        yield {
          ...event,
          content: lightHumanize(event.content),
        };
      } else {
        yield event;
      }
    }
  } catch (err) {
    const sandbox = process.env.AI_SANDBOX === "true";
    if (sandbox) {
      const mock = mockResponse(options.messages);
      yield { type: "meta", provider: "mock", model: "mock" };
      yield { type: "delta", text: mock.content };
      yield {
        type: "done",
        content: mock.content,
        provider: "mock",
        model: "mock",
      };
      return;
    }
    yield {
      type: "error",
      error: formatChatError(
        err instanceof Error ? err.message : "Service IA indisponible. Réessayez dans un moment."
      ),
    };
  }
}

const PROVIDER_LABELS: Record<AiProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  gemini: "Google Gemini",
  openrouter: "OpenRouter (multi-modèles)",
  groq: "Groq",
  mistral: "Mistral AI",
  mock: "Mode démo",
};

/** Statut interne (ops / debug) — inclut noms de variables d'env. */
export function getProviderStatus() {
  const keyStatus = getProviderKeyStatus();
  const available = keyStatus.filter((p) => p.configured).map((p) => p.id);
  const order =
    process.env.AI_PROVIDER_ORDER?.split(",").map((s) => s.trim()) ?? [
      "gemini",
      "groq",
      "openrouter",
      "openai",
      "anthropic",
      "mistral",
    ];

  const skipped = order.filter(
    (id) => !available.includes(id as AiProviderId)
  );

  return {
    configured: available,
    order,
    keyStatus,
    skipped,
    hint:
      skipped.includes("gemini") || skipped.includes("groq")
        ? "Gemini/Groq absents : secret Cloudflare vide ou clé non collée. Re-saisir avec wrangler secret put."
        : undefined,
    sandbox: process.env.AI_SANDBOX === "true",
    temperature: Number(process.env.AI_TEMPERATURE ?? 0.8),
  };
}

/** Réponse publique minimale — sans noms de secrets ni consignes ops. */
export function getPublicProviderStatus() {
  const { configured, sandbox } = getProviderStatus();
  return {
    configured,
    labels: PROVIDER_LABELS,
    ready: configured.length > 0,
    sandbox,
  };
}
