"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Send,
  Loader2,
  ShieldAlert,
  Copy,
  Check,
  Paperclip,
  X,
  Download,
  ImageIcon,
  Globe,
} from "lucide-react";
import KlirLogo from "@/components/KlirLogo";
import SitePreview from "@/components/SitePreview";
import MarketTradingChart from "@/components/MarketTradingChart";
import { snapshotToTradingViewSymbol } from "@/lib/market/tradingview";
import type { MarketSnapshot } from "@/lib/market/types";
import type { PendingAction } from "@/lib/ai/approval";
import type { ChatTurn, ChatTurnMedia } from "@/lib/ai/types";
import { FEATURED_SKILLS, type ActiveSkillId } from "@/lib/featured-skills";
import {
  GUEST_SEARCH_LIMIT,
  clearGuestSearchCount,
  readGuestSearchCount,
  writeGuestSearchCount,
} from "@/lib/guest-limit";
import { lightHumanize } from "@/lib/ai/humanize";
import { renderMarkdown } from "@/lib/markdown";
import { useCreditConfig } from "@/hooks/useCreditConfig";
import { computeChatCreditCost } from "@/lib/billing/credit-pricing";

const STARTERS = [
  { label: "Génère un site", prompt: "Génère un site web HTML pro pour mon salon de coiffure à Port-au-Prince : hero avec vraie photo, services, tarifs, section partenaires avec logos, contact WhatsApp, couleurs #004F6E et #D4AF37." },
  { label: "Humanise ce texte", prompt: "Humanise ce texte marketing pour qu’il sonne naturel, pas IA :" },
  { label: "Analyse BTC", prompt: "Analyse le marché BTC : tendance, volume, sentiment Fear & Greed, scénarios haussier/neutre/baissier." },
  { label: "EUR/USD", prompt: "Analyse la paire EUR/USD : tendance, niveaux clés, scénarios haussier/neutre/baissier." },
  { label: "Post LinkedIn", prompt: "Écris un post LinkedIn professionnel sur le planning social pour créateurs." },
];

type PendingFile = { id: string; name: string };

type SendOptions = {
  approval?: {
    confirmed: boolean;
    actionId: string;
    kind: PendingAction["kind"];
    doubleConfirmed?: boolean;
  };
  pendingAction?: PendingAction | null;
  displayUser?: string;
};

type ChatPanelProps = {
  conversationId?: string | null;
  persistEnabled?: boolean;
  onConversationChange?: (id: string | null) => void;
  activeSkill?: ActiveSkillId;
  onActiveSkillChange?: (skill: ActiveSkillId) => void;
};

function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {
          // ignore
        }
      }}
      className="inline-flex items-center gap-1 text-[11px] text-klir-ink/45 hover:text-klir-primary transition"
      aria-label="Copier la réponse"
    >
      {ok ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {ok ? "Copié" : "Copier"}
    </button>
  );
}

const TRADING_SKILL_IDS = new Set([
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

function detectStudioIntent(
  text: string,
  activeSkill?: ActiveSkillId
): {
  flyer?: boolean;
  mockup?: boolean;
  site?: boolean;
  stock?: string | null;
  market?: string | null;
} {
  const lower = text.toLowerCase();
  const stock =
    lower.match(/(?:photo|image|visuel).{0,40}(?:gratuit|stock|unsplash|pexels)|banque.?d.?images?/)
      ? text.slice(0, 120)
      : null;
  const marketByText =
    /trading|trade\b|analyse.?march|btc|bitcoin|eth\b|ethereum|crypto|forex|eur\/usd|usd\/htg|aapl|tsla|action|bourse|pronostic|fear.?&.?greed|graph(?:e|ique)|chart|support|résistance|resistance|haussier|baissier|cours du|prix du|conseil.*(?:crypto|btc|forex|action|march)|investir.*(?:btc|crypto|forex)|xau|gold|\bor\b/.test(
      lower
    );
  const marketBySkill = activeSkill ? TRADING_SKILL_IDS.has(activeSkill) : false;
  const market = marketByText || marketBySkill ? text.slice(0, 160) : null;
  return {
    flyer: /flyer|affichette|affiche promo|visuel promo/.test(lower),
    mockup: /mockup|maquette produit|packshot|rendu produit/.test(lower),
    site: /site web|landing|mini.?site|génère.*site|generer.*site|crée.*site|cree.*site|page web|héberge(r|ment)|\.sites\.klirline/.test(
      lower
    ),
    stock,
    market,
  };
}

function inferAttachmentTypes(files: PendingFile[]): string[] {
  return files.map((f) => {
    const lower = f.name.toLowerCase();
    if (lower.endsWith(".pdf")) return "application/pdf";
    if (/\.(jpe?g|png|gif|webp|svg|bmp|heic)$/.test(lower)) return "image/jpeg";
    return "application/octet-stream";
  });
}

export default function ChatPanel({
  conversationId = null,
  persistEnabled = false,
  onConversationChange,
  activeSkill = null,
  onActiveSkillChange,
}: ChatPanelProps) {
  const credit = useCreditConfig();
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [conversationLoadError, setConversationLoadError] = useState<string | null>(null);
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [approvalStep, setApprovalStep] = useState<1 | 2>(1);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId);
  const [guestCount, setGuestCount] = useState(0);
  const [signupGate, setSignupGate] = useState(false);
  const [paywallGate, setPaywallGate] = useState<{ message: string; refillIn?: string | null } | null>(
    null
  );
  const [walletCredits, setWalletCredits] = useState<number | null>(null);
  const [passActive, setPassActive] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGuestCount(readGuestSearchCount());
  }, []);

  useEffect(() => {
    if (!persistEnabled) {
      setWalletCredits(null);
      setPaywallGate(null);
      setPassActive(false);
      return;
    }
    fetch("/api/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || typeof d.balance !== "number") return;
        setWalletCredits(d.balance);
        setPassActive(Boolean(d.passActive));
        if (d.passActive || d.balance > 0) setPaywallGate(null);
      })
      .catch(() => undefined);
  }, [persistEnabled]);

  function syncCreditsFromHeader(res: Response) {
    const raw = res.headers.get("X-Credits-Balance");
    if (!raw) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setWalletCredits(n);
    if (n > 0) setPaywallGate(null);
  }

  function openPaywall(data: Record<string, unknown>) {
    setPaywallGate({
      message:
        typeof data.error === "string"
          ? data.error
          : "Crédits épuisés. Passez à un forfait pour continuer.",
      refillIn: typeof data.refillIn === "string" ? data.refillIn : null,
    });
    if (typeof data.credits === "number") setWalletCredits(data.credits);
  }

  useEffect(() => {
    if (persistEnabled) {
      clearGuestSearchCount();
      setGuestCount(0);
      setSignupGate(false);
    }
  }, [persistEnabled]);

  useEffect(() => {
    setActiveConversationId(conversationId);
    if (!conversationId) {
      setMessages([]);
      setPendingAction(null);
      setConversationLoadError(null);
      setLoadingConversation(false);
      return;
    }

    let cancelled = false;
    setMessages([]);
    setConversationLoadError(null);
    setLoadingConversation(true);
    fetch(`/api/conversations/${conversationId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("load fail");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setMessages(data.messages ?? []);
        if (data.conversation?.skill) onActiveSkillChange?.(data.conversation.skill);
      })
      .catch(() => {
        if (!cancelled) {
          setMessages([]);
          setConversationLoadError("Impossible de charger cette conversation.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingConversation(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, onActiveSkillChange]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages, loading, loadingConversation, pendingAction, signupGate]);

  async function ensureConversation(): Promise<string | null> {
    if (!persistEnabled) return null;
    if (activeConversationId) return activeConversationId;

    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill: activeSkill }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const id = data.conversation?.id as string | undefined;
    if (!id) return null;
    setActiveConversationId(id);
    onConversationChange?.(id);
    return id;
  }

  async function enrichStudio(userText: string, baseContent: string): Promise<{
    content: string;
    media: ChatTurnMedia[];
  }> {
    const intent = detectStudioIntent(userText, activeSkill);
    const media: ChatTurnMedia[] = [];
    let content = baseContent;

    if (intent.flyer || intent.mockup) {
      try {
        const kind = intent.mockup && !intent.flyer ? "mockup" : "flyer";
        const res = await fetch("/api/studio/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: userText, kind }),
        });
        if (res.ok) {
          const data = await res.json();
          const img = data.image;
          if (img?.url) {
            media.push({
              kind: "image",
              url: img.url,
              caption: img.note || (kind === "mockup" ? "Mockup généré" : "Flyer généré"),
              downloadName: `${kind}-klir-ia.${img.mimeType?.includes("svg") ? "svg" : "png"}`,
            });
          }
        } else if (res.status === 401) {
          setSignupGate(true);
        }
      } catch {
        // ignore studio failure
      }
    }

    if (intent.site) {
      try {
        const res = await fetch("/api/studio/site", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brief: userText }),
        });
        if (res.ok) {
          const data = await res.json();
          const site = data.site;
          if (site?.html) {
            media.push({
              kind: "site",
              html: site.html,
              title: site.title,
              hostingSteps: site.hosting?.steps,
              hostingUrl: site.hosting?.dashboardUrl,
            });
            content += `\n\n## Site HTML pro\n${site.hosting?.summary || "Aperçu ci-dessous."}\n- Studio : [Publier sur Klirline](${site.hosting?.dashboardUrl || "https://klirline.io/studio/site"})\n- Option économique : 500 HTG / 30 j sur \`*.sites.klirline.io\`\n- Domaine .com optionnel : [Rechercher](/domains)`;
          }
        } else if (res.status === 401) {
          setSignupGate(true);
        } else if (res.status === 402) {
          const data = await res.json().catch(() => ({}));
          openPaywall(data);
          content += `\n\n**Site HTML pro** — crédits épuisés. [Choisir un forfait](/pricing).`;
        }
      } catch {
        // ignore
      }
    }

    if (intent.market) {
      const symbolGuess =
        userText.match(/\b(BTC|ETH|EUR\/USD|USD\/HTG|AAPL|TSLA|SOL|XRP)\b/i)?.[1] ?? "BTC";
      let analyzed = false;
      try {
        const res = await fetch("/api/market/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: symbolGuess, question: userText }),
        });
        if (res.ok) {
          const data = await res.json();
          const a = data.analysis;
          if (a?.summary) {
            analyzed = true;
            content += `\n\n## Analyse ${a.symbol ?? symbolGuess}\n${a.summary}`;
            if (a.scenarios?.bullish) content += `\n\n**Haussier** — ${a.scenarios.bullish.slice(0, 400)}`;
            if (a.snapshot) {
              media.push({
                kind: "market",
                title: `${a.snapshot.name ?? a.symbol} (${a.symbol})`,
                caption: a.summary.slice(0, 160),
                marketSnapshot: a.snapshot,
              });
            }
          }
        } else if (res.status === 401) {
          setSignupGate(true);
        } else if (res.status === 402) {
          const data = await res.json().catch(() => ({}));
          openPaywall(data);
          content += `\n\n_Analyse trading complète — crédits épuisés. [Forfaits](/pricing)._`;
        }
      } catch {
        // fallback snapshot
      }

      if (!analyzed) {
        try {
          const res = await fetch(`/api/market/snapshot?q=${encodeURIComponent(intent.market)}`);
          if (res.ok) {
            const data = await res.json();
            for (const snap of data.snapshots ?? []) {
              const ch = snap.change24hPct;
              const price = Number(snap.priceUsd).toLocaleString("en-US", {
                maximumFractionDigits: snap.assetClass === "forex" ? 4 : 2,
              });
              const unit = snap.currency === "USD" && snap.assetClass !== "forex" ? "$" : "";
              const suffix =
                snap.currency && snap.assetClass === "forex"
                  ? ` ${snap.currency}`
                  : snap.currency === "USD"
                    ? " USD"
                    : "";
              media.push({
                kind: "market",
                title: `${snap.name} (${snap.symbol})`,
                caption: `${unit}${price}${suffix} · 24h ${ch != null ? `${ch.toFixed(2)}%` : "n/d"}`,
                marketSnapshot: snap,
              });
            }
          }
        } catch {
          // ignore
        }
      }
    }

    if (intent.stock && persistEnabled) {
      try {
        const res = await fetch(`/api/studio/media?q=${encodeURIComponent(intent.stock)}`);
        if (res.ok) {
          const data = await res.json();
          for (const p of data.photos ?? []) {
            media.push({
              kind: "stock",
              url: p.url,
              caption: p.alt,
              attribution: p.attribution,
              attributionUrl: p.attributionUrl,
              downloadName: `stock-${p.id}.jpg`,
            });
          }
          if (!(data.photos ?? []).length && data.hint) {
            content += `\n\n_${data.hint}_`;
          }
        }
      } catch {
        // ignore
      }
    }

    return { content, media };
  }

  async function sendText(text: string, options: SendOptions = {}) {
    const trimmed = text.trim();
    if (!trimmed || loading || loadingConversation) return;

    if (!persistEnabled) {
      const current = readGuestSearchCount();
      if (current >= GUEST_SEARCH_LIMIT) {
        setSignupGate(true);
        return;
      }
    }

    if (persistEnabled && paywallGate) {
      return;
    }

    const sendCost = computeChatCreditCost(
      {
        message: trimmed,
        attachmentContentTypes: inferAttachmentTypes(pendingFiles),
      },
      credit.pricing
    );
    if (persistEnabled && !passActive && walletCredits !== null && walletCredits < sendCost) {
      setPaywallGate({
        message: `Crédits insuffisants (${sendCost} requis, ${walletCredits} disponibles).`,
        refillIn: null,
      });
      return;
    }

    const display = options.displayUser ?? trimmed;
    const names = pendingFiles.map((f) => f.name);
    const attachmentIds = pendingFiles.map((f) => f.id);
    const userMsg: ChatTurn = {
      role: "user",
      content: display,
      attachmentNames: names.length ? names : undefined,
    };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setPendingFiles([]);
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const convId = await ensureConversation();
      const guestSearchCount = persistEnabled ? 0 : readGuestSearchCount();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: trimmed }],
          skill: activeSkill,
          stream: true,
          conversationId: convId,
          approval: options.approval,
          pendingAction: options.pendingAction ?? pendingAction,
          guestSearchCount,
          attachmentIds: persistEnabled ? attachmentIds : [],
        }),
      });

      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.code === "SIGNUP_REQUIRED") {
          setSignupGate(true);
          if (typeof data.guestCount === "number") {
            setGuestCount(data.guestCount);
            writeGuestSearchCount(data.guestCount);
          }
          setMessages(next);
          return;
        }
      }

      if (res.status === 402) {
        const data = await res.json().catch(() => ({}));
        openPaywall(data);
        setMessages(next);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const friendly =
          data.error && typeof data.error === "string" ? data.error : "Erreur";
        throw new Error(friendly);
      }

      if (!persistEnabled) {
        const serverCount = res.headers.get("X-Guest-Count");
        const n = serverCount ? Number(serverCount) : readGuestSearchCount();
        if (Number.isFinite(n)) {
          setGuestCount(n);
          writeGuestSearchCount(n);
          if (n >= GUEST_SEARCH_LIMIT) setSignupGate(true);
        }
      } else {
        syncCreditsFromHeader(res);
      }

      const contentType = res.headers.get("content-type") || "";
      let assembled = "";

      if (!contentType.includes("text/event-stream") || !res.body) {
        const data = await res.json();
        assembled = data.content ?? "";
        const enriched = await enrichStudio(trimmed, assembled);
        setMessages([...next, { role: "assistant", content: enriched.content, media: enriched.media }]);
        if (data.skill && !activeSkill) onActiveSkillChange?.(data.skill);
        if (data.provider) setLastProvider(data.provider);
        if (data.approvalRequired && data.action) {
          setPendingAction(data.action);
          setApprovalStep(data.step === 2 ? 2 : 1);
        } else {
          setPendingAction(null);
        }
        if (convId) onConversationChange?.(convId);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let sawApproval = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const line = chunk
            .split("\n")
            .map((l) => l.trim())
            .find((l) => l.startsWith("data:"));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;

          let event: {
            type?: string;
            text?: string;
            content?: string;
            provider?: string;
            skill?: string | null;
            error?: string;
            action?: PendingAction;
            step?: 1 | 2;
            approvalRequired?: boolean;
          };
          try {
            event = JSON.parse(payload);
          } catch {
            continue;
          }

          if (event.type === "approval" && event.action) {
            sawApproval = true;
            setPendingAction(event.action);
            setApprovalStep(event.step === 2 ? 2 : 1);
            setLastProvider("hitl");
            if (!activeSkill) onActiveSkillChange?.("approval-gates");
          } else if (event.type === "delta" && event.text) {
            assembled += event.text;
            setMessages([
              ...next,
              { role: "assistant", content: lightHumanize(assembled) },
            ]);
          } else if (event.type === "done") {
            const finalText = lightHumanize(event.content ?? assembled);
            assembled = finalText;
            setMessages([...next, { role: "assistant", content: finalText }]);
            if (event.provider) setLastProvider(event.provider);
            if (event.approvalRequired && event.action) {
              sawApproval = true;
              setPendingAction(event.action);
              setApprovalStep(event.step === 2 ? 2 : 1);
            } else if (!sawApproval) {
              setPendingAction(null);
            }
          } else if (event.type === "meta") {
            if (event.skill && !activeSkill) onActiveSkillChange?.(event.skill);
            if (event.provider) setLastProvider(event.provider);
          } else if (event.type === "error") {
            throw new Error(event.error || "Erreur IA");
          }
        }
      }

      if (!assembled.trim()) {
        throw new Error("Réponse vide");
      }

      if (!sawApproval) {
        const enriched = await enrichStudio(trimmed, assembled);
        setMessages([...next, { role: "assistant", content: enriched.content, media: enriched.media }]);
      }

      if (convId) onConversationChange?.(convId);
    } catch (err) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: `**Erreur**\n\n${err instanceof Error ? err.message : "inconnue"}`,
        },
      ]);
      setPendingAction(null);
    } finally {
      setLoading(false);
    }
  }

  function confirmPending() {
    if (!pendingAction || loading) return;
    const needsSecond = pendingAction.requiresDoubleConfirm && approvalStep === 1;
    if (needsSecond) {
      void sendText(pendingAction.confirmPhrase, {
        displayUser: `Confirmation : ${pendingAction.confirmPhrase}`,
        approval: {
          confirmed: true,
          actionId: pendingAction.id,
          kind: pendingAction.kind,
          doubleConfirmed: false,
        },
        pendingAction,
      });
      return;
    }

    void sendText(pendingAction.originalMessage, {
      displayUser: `Confirmé — ${pendingAction.confirmPhrase}`,
      approval: {
        confirmed: true,
        actionId: pendingAction.id,
        kind: pendingAction.kind,
        doubleConfirmed: true,
      },
      pendingAction,
    });
  }

  function cancelPending() {
    if (loading) return;
    setPendingAction(null);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "Action annulée. Rien n'a été publié ni envoyé. On peut reprendre sur un brouillon quand vous voulez.",
      },
    ]);
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    if (!persistEnabled) {
      setSignupGate(true);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/attachments", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Upload échoué");
      }
      const id = data.attachment?.id as string | undefined;
      if (!id) throw new Error("Réponse upload invalide");
      setPendingFiles((prev) => [...prev, { id, name: file.name }].slice(0, 5));
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `**Pièce jointe**\n\n${err instanceof Error ? err.message : "Erreur"}`,
        },
      ]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function send() {
    void sendText(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  const guestRemaining = Math.max(0, GUEST_SEARCH_LIMIT - guestCount);
  const estimatedCost = computeChatCreditCost(
    {
      message: input,
      attachmentContentTypes: inferAttachmentTypes(pendingFiles),
    },
    credit.pricing
  );
  const insufficientCredits =
    persistEnabled &&
    !passActive &&
    walletCredits !== null &&
    walletCredits < estimatedCost &&
    !paywallGate;

  return (
    <div className="flex flex-col h-full min-h-0 overscroll-contain">
      <div className="shrink-0 flex items-center gap-2.5 px-3 sm:px-4 py-2.5 border-b border-klir-primary/10 bg-klir-primary/[0.03]">
        <KlirLogo size={28} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-klir-primary text-sm leading-tight">Klir IA</p>
          <p className="text-[11px] text-klir-ink/50 truncate">
            {activeSkill
              ? `Skill · ${FEATURED_SKILLS.find((s) => s.id === activeSkill)?.label ?? activeSkill}`
              : "Skill · Auto"}
            {!persistEnabled
              ? ` · ${guestRemaining} essai${guestRemaining > 1 ? "s" : ""} invité`
              : passActive
                ? " · illimité"
                : walletCredits !== null
                  ? ` · ${walletCredits} cr.${estimatedCost > 0 && !passActive ? ` (−${estimatedCost})` : ""}`
                  : ""}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain chat-scroll p-3 sm:p-4 space-y-3 min-h-0">
        {conversationLoadError && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {conversationLoadError}
          </p>
        )}
        {loadingConversation && (
          <div className="flex justify-center py-8 text-klir-ink/40">
            <Loader2 className="w-5 h-5 animate-spin" aria-label="Chargement…" />
          </div>
        )}
        {messages.length === 0 && !loading && !loadingConversation && (
          <div className="mt-4 sm:mt-6 space-y-4">
            <div className="text-center space-y-1.5 px-2">
              <p className="font-display text-lg sm:text-xl text-klir-primary font-semibold tracking-tight">
                Qu’est-ce qu’on travaille ?
              </p>
              <p className="text-xs sm:text-sm text-klir-ink/60 max-w-md mx-auto leading-relaxed">
                Dites-le comme à un collègue — ou choisissez un départ.
                {!persistEnabled && (
                  <>
                    {" "}
                    <span className="text-klir-primary/80">
                      Compte requis pour l’historique, les fichiers et après {GUEST_SEARCH_LIMIT} recherches.
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {STARTERS.map((s) => (
                <button
                  type="button"
                  key={s.label}
                  onClick={() => void sendText(s.prompt)}
                  disabled={loading}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-klir-primary/15 bg-white text-klir-primary hover:border-klir-accent/60 transition disabled:opacity-50"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <KlirLogo size={28} className="shrink-0 mt-0.5" />
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm prose-klir ${
                m.role === "user"
                  ? "bg-klir-primary text-white rounded-br-md"
                  : "bg-white/90 border border-klir-primary/10 shadow-sm rounded-bl-md"
              }`}
            >
              {m.role === "user" ? (
                <>
                  {m.content}
                  {m.attachmentNames?.length ? (
                    <p className="mt-2 text-[11px] opacity-80">
                      📎 {m.attachmentNames.join(", ")}
                    </p>
                  ) : null}
                </>
              ) : m.content ? (
                <>
                  {renderMarkdown(m.content)}
                  {m.media?.map((media, mi) => (
                    <div key={mi} className="mt-3 space-y-1.5 border-t border-klir-primary/10 pt-3">
                      {(media.kind === "image" || media.kind === "stock") && media.url && (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={media.url}
                            alt={media.caption || "Visuel Klir IA"}
                            className="rounded-lg max-h-72 w-auto border border-klir-primary/10"
                          />
                          {media.caption && (
                            <p className="text-[11px] text-klir-ink/55">{media.caption}</p>
                          )}
                          {media.attribution && (
                            <a
                              href={media.attributionUrl || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-klir-primary underline"
                            >
                              {media.attribution}
                            </a>
                          )}
                          <a
                            href={media.url}
                            download={media.downloadName || "klir-ia-image"}
                            className="inline-flex items-center gap-1 text-[11px] text-klir-primary"
                          >
                            <Download className="w-3.5 h-3.5" /> Télécharger
                          </a>
                        </>
                      )}
                      {media.kind === "market" && media.marketSnapshot && (
                        <div className="space-y-3">
                          <MarketTradingChart
                            symbol={snapshotToTradingViewSymbol(media.marketSnapshot)}
                            snapshot={media.marketSnapshot as MarketSnapshot}
                            height={360}
                          />
                          <div className="rounded-lg border border-klir-primary/15 bg-klir-primary/5 p-3 text-xs space-y-1">
                            <p className="font-semibold text-klir-primary">{media.title}</p>
                            <p>{media.caption}</p>
                            {media.marketSnapshot.change7dPct != null && (
                              <p className="text-klir-ink/55">
                                7j : {media.marketSnapshot.change7dPct.toFixed(2)}%
                              </p>
                            )}
                            {media.marketSnapshot.fearGreed && (
                              <p className="text-klir-ink/55">
                                Fear & Greed : {media.marketSnapshot.fearGreed.value}/100 (
                                {media.marketSnapshot.fearGreed.label})
                              </p>
                            )}
                            <p className="text-[10px] text-klir-ink/40 pt-1">
                              Graphique TradingView · export PNG/JPEG · informatif, pas conseil financier
                            </p>
                            <a
                              href="/studio/svg"
                              className="inline-block text-[11px] text-klir-primary underline pt-1"
                            >
                              Personnaliser en SVG → SVG Visual Studio
                            </a>
                          </div>
                        </div>
                      )}
                      {media.kind === "site" && media.html && (
                        <>
                          <p className="text-xs font-medium text-klir-primary inline-flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5" /> {media.title || "Site HTML pro"}
                          </p>
                          <SitePreview
                            html={media.html}
                            title={media.title || "Aperçu site"}
                            height={520}
                            compact
                          />
                          {media.hostingUrl && (
                            <a
                              href={media.hostingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-[11px] text-klir-primary underline"
                            >
                              Publier sur Klirline (500 HTG / 30 j)
                            </a>
                          )}
                          <a
                            href="/domains"
                            className="block text-[11px] text-klir-primary underline"
                          >
                            Acheter un domaine personnalisé
                          </a>
                        </>
                      )}
                    </div>
                  ))}
                  <div className="mt-2 pt-1 border-t border-klir-primary/5">
                    <CopyButton text={m.content} />
                  </div>
                </>
              ) : loading && i === messages.length - 1 ? (
                <span className="inline-flex items-center gap-2 text-klir-ink/55">
                  <Loader2 className="w-4 h-4 animate-spin text-klir-primary" />
                  Klir IA rédige…
                </span>
              ) : null}
            </div>
          </div>
        ))}

        {pendingAction && !loading && (
          <div className="mx-auto w-full max-w-md border border-klir-accent/40 bg-klir-accent/10 px-4 py-3 rounded-xl">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-klir-primary shrink-0 mt-0.5" />
              <div className="min-w-0 space-y-2">
                <p className="font-display text-sm font-semibold text-klir-primary">
                  {approvalStep === 2 ? "Dernière confirmation" : "Gate d’approbation"}
                </p>
                <p className="text-xs text-klir-ink/70 leading-relaxed">
                  {pendingAction.label} · {pendingAction.target}
                  {pendingAction.irreversible ? " · irréversible" : ""}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={confirmPending}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-klir-primary text-white hover:bg-klir-dark transition"
                  >
                    {approvalStep === 2 ? "Confirmer définitivement" : "Confirmer"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelPending}
                    className="px-3 py-1.5 rounded-md text-xs font-medium border border-klir-primary/25 text-klir-primary bg-white hover:border-klir-primary/50 transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {signupGate && !persistEnabled && (
          <div className="mx-auto w-full max-w-md border border-klir-primary/25 bg-white px-4 py-4 rounded-xl shadow-sm">
            <p className="font-display text-sm font-semibold text-klir-primary">
              Créez un compte pour continuer
            </p>
            <p className="text-xs text-klir-ink/65 mt-1.5 leading-relaxed">
              Après {GUEST_SEARCH_LIMIT} recherches, l’historique, la mémoire, les fichiers et le studio
              (flyers, sites, images) sont réservés aux comptes — {credit.registrationLabel}.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <a
                href="/sign-up"
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-klir-primary text-white hover:bg-klir-dark transition"
              >
                Créer un compte
              </a>
              <a
                href="/sign-in"
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-klir-primary/25 text-klir-primary"
              >
                Connexion
              </a>
            </div>
          </div>
        )}

        {paywallGate && persistEnabled && (
          <div className="mx-auto w-full max-w-md border border-amber-300/60 bg-amber-50 px-4 py-4 rounded-xl shadow-sm">
            <p className="font-display text-sm font-semibold text-amber-950">
              Crédits épuisés
            </p>
            <p className="text-xs text-amber-900/80 mt-1.5 leading-relaxed">{paywallGate.message}</p>
            {paywallGate.refillIn ? (
              <p className="text-xs text-amber-900/70 mt-2">
                Recharge gratuite dans <strong>{paywallGate.refillIn}</strong> ({credit.refillLabel.toLowerCase()}
                ).
              </p>
            ) : null}
            <p className="text-xs text-amber-900/70 mt-2">
              Besoin immédiat ? Passez à un forfait illimité — chat, sites et trading sans limite.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <a
                href="/pricing"
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-klir-primary text-white hover:bg-klir-dark transition"
              >
                Voir les forfaits
              </a>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 p-3 sm:p-4 border-t border-klir-primary/10 bg-white">
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {pendingFiles.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-klir-primary/8 text-klir-primary"
              >
                {f.name}
                <button
                  type="button"
                  aria-label="Retirer"
                  onClick={() => setPendingFiles((prev) => prev.filter((x) => x.id !== f.id))}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.txt,.md,.csv,.doc,.docx"
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => {
              if (!persistEnabled) {
                setSignupGate(true);
                return;
              }
              fileRef.current?.click();
            }}
            disabled={loading || uploading}
            className="border border-klir-primary/20 text-klir-primary rounded-xl px-3 py-2.5 hover:bg-klir-primary/5 transition disabled:opacity-50 shrink-0"
            aria-label="Joindre un fichier"
            title={persistEnabled ? "Photo ou document" : "Compte requis pour joindre un fichier"}
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
          </button>
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize(e.target);
            }}
            onKeyDown={onKeyDown}
            placeholder="Décrivez votre besoin marketing…"
            className="flex-1 resize-none rounded-xl border border-klir-primary/20 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-klir-primary/25 max-h-36"
            disabled={
              loading ||
              (signupGate && !persistEnabled && guestCount >= GUEST_SEARCH_LIMIT) ||
              (persistEnabled && Boolean(paywallGate)) ||
              insufficientCredits
            }
          />
          <button
            type="button"
            onClick={send}
            disabled={
              loading ||
              !input.trim() ||
              (signupGate && !persistEnabled && guestCount >= GUEST_SEARCH_LIMIT) ||
              (persistEnabled && Boolean(paywallGate)) ||
              insufficientCredits
            }
            className="bg-klir-primary text-white rounded-xl px-4 py-2.5 hover:bg-klir-dark transition disabled:opacity-50 shrink-0"
            aria-label="Envoyer"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[11px] text-klir-ink/40 mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 items-center">
          <span>Entrée pour envoyer · Copier sur chaque réponse</span>
          {persistEnabled && !passActive ? (
            <span>
              Coût estimé : <strong>{estimatedCost} cr.</strong> ({credit.pricingLabel})
            </span>
          ) : null}
          {persistEnabled ? (
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> Studio flyer / site / stock
            </span>
          ) : null}
          {lastProvider && lastProvider !== "mock" ? ` · via ${lastProvider}` : ""}
        </p>
      </div>
    </div>
  );
}
