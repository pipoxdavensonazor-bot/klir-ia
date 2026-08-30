/**
 * Checks déterministes pour le golden set Klir IA.
 * @param {string} text
 * @param {string | null | undefined} skill
 * @param {object} check
 * @returns {{ ok: boolean, detail: string }}
 */
export function runCheck(text, skill, check) {
  const content = text ?? "";
  const lower = content.toLowerCase();

  switch (check.type) {
    case "skill": {
      const ok = skill === check.equals;
      return {
        ok,
        detail: ok
          ? `skill=${skill}`
          : `skill attendu « ${check.equals} », reçu « ${skill ?? "null"} »`,
      };
    }
    case "skill_any": {
      const ok = (check.values ?? []).includes(skill);
      return {
        ok,
        detail: ok
          ? `skill=${skill}`
          : `skill dans [${(check.values ?? []).join(", ")}], reçu « ${skill ?? "null"} »`,
      };
    }
    case "includes_any": {
      const hit = (check.values ?? []).find((v) => content.includes(v) || lower.includes(String(v).toLowerCase()));
      return {
        ok: Boolean(hit),
        detail: hit ? `trouvé « ${hit} »` : `aucun de : ${(check.values ?? []).join(" | ")}`,
      };
    }
    case "includes_all": {
      const missing = (check.values ?? []).filter(
        (v) => !content.includes(v) && !lower.includes(String(v).toLowerCase())
      );
      return {
        ok: missing.length === 0,
        detail: missing.length ? `manque : ${missing.join(", ")}` : "tous présents",
      };
    }
    case "excludes": {
      const hit = (check.values ?? []).find((v) => content.includes(v) || lower.includes(String(v).toLowerCase()));
      return {
        ok: !hit,
        detail: hit ? `interdit trouvé « ${hit} »` : "aucun interdit",
      };
    }
    case "max_exclamations": {
      const n = (content.match(/!/g) || []).length;
      const ok = n <= (check.max ?? 0);
      return { ok, detail: `${n} « ! » (max ${check.max})` };
    }
    case "max_chars": {
      const ok = content.length <= (check.max ?? Infinity);
      return { ok, detail: `${content.length} chars (max ${check.max})` };
    }
    default:
      return { ok: false, detail: `type inconnu : ${check.type}` };
  }
}

/**
 * @param {object} caze
 * @param {{ content: string, skill?: string | null }} result
 */
export function scoreCase(caze, result) {
  const checkResults = (caze.checks ?? []).map((check) => {
    const r = runCheck(result.content, result.skill, check);
    return { ...check, ...r };
  });
  const failed = checkResults.filter((c) => !c.ok);
  return {
    id: caze.id,
    severity: caze.severity || "soft",
    tags: caze.tags || [],
    pass: failed.length === 0,
    failed,
    checks: checkResults,
    skill: result.skill ?? null,
    provider: result.provider,
    model: result.model,
    preview: (result.content || "").slice(0, 160).replace(/\s+/g, " "),
  };
}
