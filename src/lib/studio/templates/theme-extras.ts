import type { SiteTemplateMeta } from "@/lib/studio/templates/catalog";
import type { TemplateRenderContext } from "@/lib/studio/templates/render";

/** Styles et blocs supplémentaires pour templates PRO (skills premium). */
export function applyTemplateTierExtras(
  html: string,
  templateId: string,
  meta: SiteTemplateMeta | null,
  ctx: TemplateRenderContext
): string {
  if (meta?.tier !== "pro") {
    return html
      .replaceAll("{{PRO_EXTRA_CSS}}", "")
      .replaceAll("{{PRO_STATS}}", "")
      .replaceAll("{{PRO_TESTIMONIALS}}", "");
  }

  const stats = `<!-- klir-section:stats -->
<div data-klir-section="stats" style="background:linear-gradient(90deg,${ctx.primaryColor},${ctx.accentColor});color:#fff;padding:20px 0"><div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;text-align:center;padding:0 20px;font-size:.85rem"><div><strong style="font-size:1.5rem;display:block">500+</strong>Clients</div><div><strong style="font-size:1.5rem;display:block">98%</strong>Satisfaction</div><div><strong style="font-size:1.5rem;display:block">10+</strong>Années</div></div></div>
<!-- /klir-section:stats -->`;

  const testimonials = `<!-- klir-section:testimonials -->
<section data-klir-section="testimonials" style="padding:64px 20px;background:#f8fafc"><div style="max-width:960px;margin:0 auto"><h2 style="text-align:center;margin-bottom:24px;color:${ctx.primaryColor}">Témoignages</h2><div style="display:grid;gap:20px">${ctx.testimonialsHtml}</div></div></section>
<!-- /klir-section:testimonials -->`;

  let extraCss = "";
  if (templateId === "glass-future") {
    extraCss =
      ".hero-inner,.grid3 article{backdrop-filter:blur(12px);background:rgba(255,255,255,.08)!important;border:1px solid rgba(255,255,255,.12)}";
  }
  if (templateId === "aurora-tech") {
    extraCss =
      "body{background:linear-gradient(135deg,#030712,#1e1b4b,#030712)}.hero img{box-shadow:0 0 60px rgba(124,58,237,.4)}";
  }
  if (templateId === "brutal-spot") {
    extraCss =
      "body{background:#FFFF00;color:#000}.btn,.cta,.btn-main{border:3px solid #000!important;box-shadow:4px 4px 0 #000;border-radius:0!important}";
  }
  if (templateId === "terminal-dev") {
    extraCss =
      "body{background:#0D1117;color:#C9D1D9;font-family:ui-monospace,monospace}.logo{color:#3FB950}";
  }
  if (templateId === "organic-wellness") {
    extraCss = "body{background:#F1FAF5}.hero,.hero-cap{border-radius:32px}";
  }

  return html
    .replaceAll("{{PRO_EXTRA_CSS}}", extraCss)
    .replaceAll("{{PRO_STATS}}", stats)
    .replaceAll("{{PRO_TESTIMONIALS}}", testimonials);
}

/** Ajuste couleurs par défaut selon le template si l'utilisateur n'a pas personnalisé. */
export function applyTemplateDefaults(
  answers: { primaryColor: string; accentColor: string; templateId: string },
  defaults: { primary: string; accent: string }
): { primaryColor: string; accentColor: string } {
  const isDefaultKlir =
    answers.primaryColor.toLowerCase() === "#004f6e" &&
    answers.accentColor.toLowerCase() === "#d4af37";
  if (!isDefaultKlir) {
    return { primaryColor: answers.primaryColor, accentColor: answers.accentColor };
  }
  return { primaryColor: defaults.primary, accentColor: defaults.accent };
}
