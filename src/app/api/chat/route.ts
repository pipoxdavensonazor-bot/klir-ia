import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import {
  type ApprovalPayload,
  type PendingAction,
  approvalSystemNote,
  detectRiskyAction,
  formatApprovalGate,
  isTextualConfirmation,
} from "@/lib/ai/approval";
import { buildSystemPrompt, detectSkill, listSkills } from "@/lib/ai/catalog";
import { chat, chatStream } from "@/lib/ai/chat-provider";
import type { ChatTurn } from "@/lib/ai/types";
import { formatAttachmentsForPrompt, getAttachmentsByIds } from "@/lib/attachments";
import { appendMessages, listConversations } from "@/lib/conversations";
import { deductCredits, ensureWallet, getWallet } from "@/lib/billing/credits";
import { checkChatAccess } from "@/lib/billing/passes";
import { getCreditPublicConfig } from "@/lib/billing/credit-config";
import { computeChatCreditCost } from "@/lib/billing/credit-pricing";
import { formatRefillCountdown } from "@/lib/billing/credit-refill";
import { getDb } from "@/lib/d1";
import { fetchAssetSnapshots, formatSnapshotForPrompt } from "@/lib/market/fetch";
import { extractAssetsFromText } from "@/lib/market/symbols";
import { isTradingIntent } from "@/lib/market/analyze";
import { isEvalAutomationRequest } from "@/lib/eval-auth";
import { GUEST_SEARCH_LIMIT } from "@/lib/guest-limit";
import { getClientIp } from "@/lib/client-ip";
import {
  appendGuestCookie,
  checkGuestAllowedStrict,
  incrementGuestSearchSafe,
} from "@/lib/guest-server";
import { checkRateLimit } from "@/lib/rate-limit";

function sseEncode(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function lastUserContent(messages: ChatTurn[]): string {
  return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
}

function resolveApprovalGate(options: {
  messages: ChatTurn[];
  approval?: ApprovalPayload;
  pendingFromClient?: PendingAction | null;
}): {
  gate: PendingAction | null;
  step: 1 | 2;
  proceed: boolean;
  systemExtra?: string;
} {
  const lastUser = lastUserContent(options.messages);
  const pending = options.pendingFromClient ?? detectRiskyAction(lastUser);

  if (options.approval?.confirmed && options.pendingFromClient) {
    const action = options.pendingFromClient;
    if (action.requiresDoubleConfirm && !options.approval.doubleConfirmed) {
      return { gate: action, step: 2, proceed: false };
    }
    return {
      gate: null,
      step: 1,
      proceed: true,
      systemExtra: approvalSystemNote(action, Boolean(options.approval.doubleConfirmed)),
    };
  }

  if (options.pendingFromClient && isTextualConfirmation(lastUser, options.pendingFromClient)) {
    const action = options.pendingFromClient;
    if (action.requiresDoubleConfirm && !options.approval?.doubleConfirmed) {
      return { gate: action, step: 2, proceed: false };
    }
    return {
      gate: null,
      step: 1,
      proceed: true,
      systemExtra: approvalSystemNote(action, true),
    };
  }

  if (pending) {
    return { gate: pending, step: 1, proceed: false };
  }

  return { gate: null, step: 1, proceed: true };
}

async function buildMemoryNote(userId: string): Promise<string | undefined> {
  try {
    const db = getDb();
    const rows = await listConversations(db, userId, 8);
    if (!rows.length) return undefined;
    const lines = rows.map(
      (r, i) => `${i + 1}. « ${r.title} »${r.skill ? ` (skill ${r.skill})` : ""}`
    );
    return `Rappelle-toi les idées et recherches récentes de cet utilisateur (titres) :\n${lines.join("\n")}\nRéutilise ce contexte quand c'est pertinent, sans inventer de détails absents.`;
  } catch {
    return undefined;
  }
}

async function persistTurn(options: {
  userId: string | null | undefined;
  conversationId: string | null | undefined;
  messages: ChatTurn[];
  assistantContent: string;
  skill?: string | null;
}) {
  if (!options.assistantContent.trim()) return;
  if (!options.userId || !options.conversationId) return;
  const lastUser = [...options.messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return;

  try {
    const db = getDb();
    await appendMessages(db, {
      conversationId: options.conversationId,
      userId: options.userId,
      messages: [
        { role: "user", content: lastUser.content },
        { role: "assistant", content: options.assistantContent },
      ],
      skill: options.skill,
      titleFrom: lastUser.content,
    });
  } catch {
    // Ne pas faire échouer le chat si D1 est indisponible
  }
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const evalAutomation = isEvalAutomationRequest(req);

  let limit = { ok: true, remaining: 999, resetAt: Date.now() + 3_600_000 };
  if (!evalAutomation) {
    limit = await checkRateLimit(ip);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Réessayez plus tard." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(limit.resetAt),
          },
        }
      );
    }
  }

  let body: {
    messages?: ChatTurn[];
    skill?: string;
    stream?: boolean;
    conversationId?: string | null;
    approval?: ApprovalPayload;
    pendingAction?: PendingAction | null;
    guestSearchCount?: number;
    attachmentIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  let userId: string | null = null;
  try {
    const session = await getAuthUser();
    userId = session.userId;
  } catch {
    userId = null;
  }
  const conversationId = body.conversationId ?? null;

  let guestMeta: { guestId: string; setCookie: boolean } | null = null;
  let guestCountAfter: number | undefined;
  let creditsBalance: number | undefined;
  let creditsCharged: number | undefined;

  if (!userId && !evalAutomation) {
    const guest = await checkGuestAllowedStrict(req);
    guestMeta = { guestId: guest.guestId, setCookie: guest.setCookie };
    if (!guest.allowed) {
      const res = NextResponse.json(
        {
          error: guest.dbError
            ? "Service temporairement indisponible. Réessayez dans un instant."
            : "Créez un compte pour continuer (3 recherches invitées utilisées). L’historique et la mémoire sont réservés aux comptes.",
          code: guest.dbError ? "SERVICE_UNAVAILABLE" : "SIGNUP_REQUIRED",
          guestLimit: GUEST_SEARCH_LIMIT,
          guestCount: guest.count,
        },
        { status: guest.dbError ? 503 : 403 }
      );
      return appendGuestCookie(res, guest.guestId, guest.setCookie);
    }
    guestCountAfter = (await incrementGuestSearchSafe(guest.guestId, req)) ?? guest.count + 1;
  }

  const withGuest = (res: Response) => {
    let out = guestMeta ? appendGuestCookie(res, guestMeta.guestId, guestMeta.setCookie) : res;
    if (guestCountAfter !== undefined) {
      out.headers.set("X-Guest-Count", String(guestCountAfter));
    }
    if (creditsBalance !== undefined) {
      out.headers.set("X-Credits-Balance", String(creditsBalance));
    }
    if (creditsCharged !== undefined) {
      out.headers.set("X-Credits-Charged", String(creditsCharged));
    }
    return out;
  };

  if (userId) {
    try {
      const lastUser = lastUserContent(messages);
      let attachmentTypes: string[] = [];
      const ids = body.attachmentIds ?? [];
      if (ids.length) {
        try {
          const db = getDb();
          const rows = await getAttachmentsByIds(db, userId, ids);
          attachmentTypes = rows.map((r) => r.content_type);
        } catch {
          attachmentTypes = [];
        }
      }

      const creditCost = computeChatCreditCost({
        message: lastUser,
        attachmentContentTypes: attachmentTypes,
      });

      const wallet = await ensureWallet(userId);
      const access = await checkChatAccess(userId, wallet.balance, creditCost);
      if (!access.allowed) {
        const countdown = formatRefillCountdown(wallet.nextRefillAt);
        return NextResponse.json(
          {
            error: access.reason,
            code: "PAYWALL",
            passExpiresAt: access.passExpiresAt,
            credits: access.credits,
            nextRefillAt: wallet.nextRefillAt,
            refillIn: countdown,
            pricingUrl: "/pricing",
            creditCost,
          },
          { status: 402 }
        );
      }

      if (!access.passActive) {
        const charged = await deductCredits(userId, creditCost);
        if (!charged) {
          const updated = await getWallet(userId);
          const creditCfg = getCreditPublicConfig();
          const countdown = formatRefillCountdown(updated?.nextRefillAt ?? null);
          return NextResponse.json(
            {
              error: countdown
                ? `Crédits insuffisants (${creditCost} requis). Prochaine recharge (${creditCfg.freeCredits} cr.) dans ${countdown}.`
                : `Crédits insuffisants (${creditCost} requis). ${creditCfg.refillLabel}.`,
              code: "PAYWALL",
              credits: updated?.balance ?? 0,
              nextRefillAt: updated?.nextRefillAt ?? null,
              refillIn: countdown,
              pricingUrl: "/pricing",
              creditCost,
            },
            { status: 402 }
          );
        }
        const updated = await getWallet(userId);
        creditsBalance = updated?.balance;
        creditsCharged = creditCost;
      } else {
        creditsBalance = wallet.balance;
        creditsCharged = 0;
      }
    } catch {
      return NextResponse.json(
        { error: "Service temporairement indisponible. Réessayez dans un instant." },
        { status: 503 }
      );
    }
  }

  const skills = listSkills();
  const lastUser = lastUserContent(messages);
  const skillName =
    body.skill && skills.some((s) => s.name === body.skill)
      ? body.skill
      : detectSkill(lastUser, skills) ?? undefined;

  const hitl = resolveApprovalGate({
    messages,
    approval: body.approval,
    pendingFromClient: body.pendingAction ?? null,
  });

  if (!hitl.proceed && hitl.gate) {
    const content = formatApprovalGate(hitl.gate, hitl.step);
    await persistTurn({
      userId,
      conversationId,
      messages,
      assistantContent: content,
      skill: "approval-gates",
    });

    const wantStream =
      body.stream === true ||
      (req.headers.get("accept") ?? "").includes("text/event-stream");

    if (wantStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const send = (payload: unknown) => {
            controller.enqueue(encoder.encode(sseEncode(payload)));
          };
          send({
            type: "approval",
            skill: "approval-gates",
            step: hitl.step,
            action: hitl.gate,
          });
          send({ type: "delta", text: content });
          send({
            type: "done",
            content,
            provider: "hitl",
            model: "approval-gates",
            approvalRequired: true,
            skill: "approval-gates",
            action: hitl.gate,
            step: hitl.step,
          });
          controller.close();
        },
      });

      return withGuest(
        new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
            "X-RateLimit-Remaining": String(limit.remaining),
            "X-AI-Provider": "hitl",
          },
        })
      );
    }

    return withGuest(
      NextResponse.json(
      {
        content,
        provider: "hitl",
        model: "approval-gates",
        skill: "approval-gates",
        approvalRequired: true,
        step: hitl.step,
        action: hitl.gate,
        humanized: true,
      },
      {
        headers: {
          "X-RateLimit-Remaining": String(limit.remaining),
          "X-AI-Provider": "hitl",
        },
      }
      )
    );
  }

  let memoryNote: string | undefined;
  let attachmentsNote: string | undefined;
  let marketNote: string | undefined;
  if (userId) {
    memoryNote = await buildMemoryNote(userId);
    const ids = body.attachmentIds ?? [];
    if (ids.length) {
      try {
        const db = getDb();
        const rows = await getAttachmentsByIds(db, userId, ids);
        attachmentsNote = formatAttachmentsForPrompt(rows) || undefined;
      } catch {
        attachmentsNote = undefined;
      }
    }
  }

  const TRADING_SKILL_NAMES = new Set([
    "market-analysis",
    "trading-summary",
    "trading-analysis-studio",
    "trading-technical",
    "trading-smart-money",
    "trading-backtest",
    "trading-fundamental",
    "trading-risk",
    "trading-mt5",
    "trading-binary-options",
  ]);

  if (
    (skillName && TRADING_SKILL_NAMES.has(skillName)) ||
    isTradingIntent(lastUser)
  ) {
    const refs = extractAssetsFromText(lastUser);
    if (refs.length) {
      try {
        const snapshots = await fetchAssetSnapshots(refs);
        if (snapshots.length) {
          marketNote = snapshots.map((s) => formatSnapshotForPrompt(s)).join("\n\n");
        }
      } catch {
        marketNote = undefined;
      }
    }
  }

  let system = buildSystemPrompt(skillName, { memoryNote, attachmentsNote, marketNote });
  if (hitl.systemExtra) {
    system = `${system}\n\n${hitl.systemExtra}`;
  }

  const wantStream =
    body.stream === true ||
    (req.headers.get("accept") ?? "").includes("text/event-stream");

  if (wantStream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(sseEncode(payload)));
        };

        let finalContent = "";
        try {
          send({ type: "meta", skill: skillName ?? null });
          for await (const event of chatStream({ system, messages })) {
            if (event.type === "meta") {
              send({ ...event, skill: skillName ?? null });
            } else {
              send(event);
            }
            if (event.type === "done") finalContent = event.content;
            if (event.type === "error") break;
          }
          await persistTurn({
            userId,
            conversationId,
            messages,
            assistantContent: finalContent,
            skill: skillName ?? null,
          });
        } catch (err) {
          send({
            type: "error",
            error: err instanceof Error ? err.message : "Erreur IA",
          });
        } finally {
          controller.close();
        }
      },
    });

    return withGuest(
      new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
          "X-RateLimit-Remaining": String(limit.remaining),
        },
      })
    );
  }

  try {
    const result = await chat({ system, messages });
    await persistTurn({
      userId,
      conversationId,
      messages,
      assistantContent: result.content,
      skill: skillName ?? null,
    });
    return withGuest(
      NextResponse.json(
        {
          ...result,
          skill: skillName ?? null,
        },
        {
          headers: {
            "X-RateLimit-Remaining": String(limit.remaining),
            "X-AI-Provider": result.provider,
          },
        }
      )
    );
  } catch (err) {
    return withGuest(
      NextResponse.json(
        { error: err instanceof Error ? err.message : "Erreur IA" },
        { status: 503 }
      )
    );
  }
}
