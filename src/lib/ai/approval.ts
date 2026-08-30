export type RiskyActionKind =
  | "publish"
  | "send"
  | "delete"
  | "live"
  | "pricing"
  | "other";

export type PendingAction = {
  id: string;
  kind: RiskyActionKind;
  label: string;
  summary: string;
  target: string;
  irreversible: boolean;
  requiresDoubleConfirm: boolean;
  confirmPhrase: string;
  originalMessage: string;
};

export type ApprovalPayload = {
  confirmed: boolean;
  actionId: string;
  kind: RiskyActionKind;
  /** true = 2e confirmation pour delete / live */
  doubleConfirmed?: boolean;
};

const RISK_PATTERNS: {
  kind: RiskyActionKind;
  re: RegExp;
  irreversible: boolean;
  requiresDoubleConfirm: boolean;
  label: string;
}[] = [
  {
    kind: "delete",
    re: /\b(supprime[rz]?|delete|efface[rz]?|unpublish|archive[rz]?|retire[rz]?)\b/i,
    irreversible: true,
    requiresDoubleConfirm: true,
    label: "Suppression / unpublish",
  },
  {
    kind: "live",
    re: /\b(passe[rz]?\s+(en\s+)?live|go\s*live|test\s*→\s*live|bascule[rz]?\s+(en\s+)?prod|mettre?\s+en\s+production)\b/i,
    irreversible: true,
    requiresDoubleConfirm: true,
    label: "Passage TEST → LIVE",
  },
  {
    kind: "pricing",
    re: /\b(change[rz]?\s+(le\s+)?prix|modifie[rz]?\s+pricing|secret|clé\s+api|api\s+key)\b/i,
    irreversible: true,
    requiresDoubleConfirm: true,
    label: "Modification sensible (prix / secrets)",
  },
  {
    kind: "send",
    re: /\b(envoie[rz]?|envoi|send|mail[ez]?|sms|newsletter\s+(tout\s+de\s+suite|maintenant))\b/i,
    irreversible: true,
    requiresDoubleConfirm: false,
    label: "Envoi (email / SMS / message)",
  },
  {
    kind: "publish",
    re: /\b(publie[rz]?|publication|poste[rz]?|post\b|mettre?\s+en\s+ligne|diffuse[rz]?)\b/i,
    irreversible: true,
    requiresDoubleConfirm: false,
    label: "Publication",
  },
];

function guessTarget(text: string): string {
  const lower = text.toLowerCase();
  if (/instagram|ig\b/.test(lower)) return "Instagram";
  if (/linkedin/.test(lower)) return "LinkedIn";
  if (/tiktok/.test(lower)) return "TikTok";
  if (/twitter|x\.com|\bx\b/.test(lower)) return "X / Twitter";
  if (/facebook|meta/.test(lower)) return "Facebook";
  if (/email|mail|newsletter/.test(lower)) return "Email";
  if (/sms/.test(lower)) return "SMS";
  if (/blog/.test(lower)) return "Blog";
  if (/ads?|publicit/.test(lower)) return "Ads";
  return "canal non précisé";
}

function makeId(): string {
  return `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Détecte une intention d'action à risque (HITL). */
export function detectRiskyAction(message: string): PendingAction | null {
  const text = message.trim();
  if (!text) return null;

  // Brouillons / idées : pas de gate
  if (
    /\b(idée|draft|brouillon|propose|écris|rédige|humanise|améliore|sans\s+publier|ne\s+publie\s+pas)\b/i.test(
      text
    ) &&
    !/\b(publie[rz]?|envoie[rz]?|supprime[rz]?)\b.{0,40}\b(tout\s+de\s+suite|maintenant|immédiat|ne\s+me\s+(re)?demande)/i.test(
      text
    )
  ) {
    // Si purement rédactionnel sans ordre d'exécution urgent, skip
    if (!/\b(publie[rz]?|envoie[rz]?|supprime[rz]?|passe[rz]?\s+en\s+live)\b/i.test(text)) {
      return null;
    }
  }

  for (const rule of RISK_PATTERNS) {
    if (!rule.re.test(text)) continue;

    // « Écris un post » = rédaction, pas publish immédiat — sauf verbe d'exécution
    if (rule.kind === "publish" || rule.kind === "send") {
      const execIntent =
        /\b(publie[rz]?|envoie[rz]?|poste[rz]?|diffuse[rz]?)\b/i.test(text) ||
        /\b(tout\s+de\s+suite|maintenant|immédiat|ne\s+me\s+(re)?demande)\b/i.test(text);
      if (!execIntent && /\b(écris|rédige|propose|idée|draft|brouillon)\b/i.test(text)) {
        continue;
      }
      // « post LinkedIn » without publier → often drafting via social skill
      if (
        rule.kind === "publish" &&
        !/\b(publie[rz]?|envoie[rz]?|diffuse[rz]?|mettre?\s+en\s+ligne)\b/i.test(text) &&
        !/\b(tout\s+de\s+suite|maintenant|immédiat|ne\s+me\s+(re)?demande)\b/i.test(text)
      ) {
        continue;
      }
    }

    const target = guessTarget(text);
    const confirmPhrase =
      rule.kind === "delete"
        ? `oui, supprime sur ${target}`
        : rule.kind === "send"
          ? `oui, envoie vers ${target}`
          : rule.kind === "live"
            ? "oui, passe en LIVE"
            : `oui, publie sur ${target}`;

    return {
      id: makeId(),
      kind: rule.kind,
      label: rule.label,
      summary: text.slice(0, 280),
      target,
      irreversible: rule.irreversible,
      requiresDoubleConfirm: rule.requiresDoubleConfirm,
      confirmPhrase,
      originalMessage: text,
    };
  }

  return null;
}

export function formatApprovalGate(action: PendingAction, step: 1 | 2 = 1): string {
  if (step === 2) {
    return [
      "Dernière confirmation requise.",
      "",
      `Action : ${action.label}`,
      `Cible : ${action.target}`,
      "Irréversible : oui",
      "",
      `Confirmez une dernière fois par le bouton ou en écrivant : « ${action.confirmPhrase} »`,
    ].join("\n");
  }

  return [
    "Action à risque détectée — confirmation requise avant toute exécution.",
    "",
    `Action proposée : ${action.label}`,
    `Cible / environnement : ${action.target}`,
    `Irréversible : ${action.irreversible ? "oui" : "non"}`,
    `Impact : ${action.summary}`,
    "",
    action.requiresDoubleConfirm
      ? "Cette action exige une double confirmation."
      : `Confirmez par le bouton ou : « ${action.confirmPhrase} »`,
    "",
    "Klir IA n'exécute aucune publication / envoi réel sans votre accord explicite.",
  ].join("\n");
}

export function isTextualConfirmation(message: string, action: PendingAction): boolean {
  const t = message.trim().toLowerCase();
  if (!t) return false;
  if (/^(non|cancel|annule|stop|laisse)\b/.test(t)) return false;

  const phrase = action.confirmPhrase.toLowerCase();
  if (t.includes(phrase)) return true;

  // Explicite mais pas vague « ok »
  if (
    /^(oui,\s*)?(publie|envoie|supprime|passe\s+en\s+live)\b/.test(t) &&
    t.length > 8
  ) {
    return true;
  }

  return false;
}

/** Contexte système injecté après confirmation HITL. */
export function approvalSystemNote(action: PendingAction, doubleConfirmed: boolean): string {
  return [
    "## HITL — action confirmée par l'utilisateur",
    `Action : ${action.label} (${action.kind})`,
    `Cible : ${action.target}`,
    `Double confirmation : ${doubleConfirmed ? "oui" : "non requise / en cours"}`,
    "Demande d'origine :",
    action.originalMessage,
    "",
    "Contraintes dures :",
    "- Ne prétends PAS que l'action a été exécutée sur un réseau réel (pas d'API publish branchée ici).",
    "- Fournis le livrable prêt (texte, checklist, étapes) et indique clairement ce qui reste à faire manuellement ou via outil connecté.",
    "- Si l'utilisateur annule plus tard, arrête immédiatement.",
  ].join("\n");
}
