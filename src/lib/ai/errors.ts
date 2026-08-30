/** Message lisible pour l'utilisateur (sans JSON brut). */
export function formatChatError(raw: string): string {
  const lower = raw.toLowerCase();

  if (lower.includes("402") || lower.includes("requires more credits")) {
    return (
      "Crédits OpenRouter insuffisants pour cette requête.\n\n" +
      "Solutions :\n" +
      "- Ajoutez des crédits : https://openrouter.ai/credits\n" +
      "- Ou activez Gemini / Groq (gratuits) avec :\n" +
      "  `npx wrangler secret put GEMINI_API_KEY`\n" +
      "  `npx wrangler secret put GROQ_API_KEY`"
    );
  }

  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("invalid api key")) {
    return "Clé API invalide ou expirée. Vérifiez la clé configurée sur Cloudflare.";
  }

  if (lower.includes("429") || lower.includes("rate limit")) {
    return "Quota ou limite de débit atteint. Réessayez dans une minute.";
  }

  if (lower.includes("aucun provider") || lower.includes("tous les providers")) {
    const onlyOpenRouter =
      raw.includes("openrouter:") && !raw.includes("gemini:") && !raw.includes("groq:");
    if (onlyOpenRouter) {
      return (
        "Seul OpenRouter est actif et la requête a échoué.\n\n" +
        "Activez Gemini ou Groq (gratuits) pour éviter les crédits OpenRouter :\n" +
        "- Gemini : https://aistudio.google.com/apikey\n" +
        "- Groq : https://console.groq.com/keys\n\n" +
        "Puis : `npx wrangler secret put GEMINI_API_KEY` et `GROQ_API_KEY`"
      );
    }
    return "Aucun service IA disponible. Ajoutez au moins une clé API valide.";
  }

  // Retire le JSON technique si présent
  const withoutJson = raw.replace(/\{[\s\S]*\}/, "").trim();
  if (withoutJson.length > 20 && withoutJson.length < raw.length) {
    return withoutJson.replace(/^[^:]+:\s*/, "").trim() || "Erreur IA. Réessayez.";
  }

  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}
