/** Composition HTML selon les sections choisies dans le wizard + contact / WhatsApp. */

import type { SiteWizardAnswers } from "@/lib/studio/site-wizard";
import type { SiteTemplateMeta } from "@/lib/studio/templates/catalog";
import type { TemplateRenderContext } from "@/lib/studio/templates/render";

const ALL_SECTION_IDS = [
  "hero",
  "benefits",
  "partners",
  "testimonials",
  "pricing",
  "faq",
  "about",
  "contact",
  "gallery",
  "stats",
  "process",
] as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

/** Retire les blocs marqués <!-- klir-section:id --> … <!-- /klir-section:id --> */
export function stripUnselectedSections(html: string, selected: string[]): string {
  let out = html;
  for (const id of ALL_SECTION_IDS) {
    if (selected.includes(id)) continue;
    const re = new RegExp(
      `<!-- klir-section:${id} -->[\\s\\S]*?<!-- /klir-section:${id} -->\\s*`,
      "g"
    );
    out = out.replace(re, "");
  }
  return out;
}

function whatsappUrl(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}`;
}

function buildPricingSection(ctx: TemplateRenderContext): string {
  return `<!-- klir-section:pricing -->
<section id="tarifs" class="section wrap" data-klir-section="pricing" style="padding:64px 0">
<h2 style="text-align:center;color:${ctx.primaryColor};margin-bottom:28px;font-size:1.75rem">Nos forfaits</h2>
<div style="display:grid;gap:20px;max-width:900px;margin:0 auto" class="grid3">
<article style="padding:28px;border-radius:16px;border:2px solid ${ctx.primaryColor};background:#fff;text-align:center">
<p style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:${ctx.accentColor};font-weight:700">Essentiel</p>
<p style="font-size:2rem;font-weight:700;color:${ctx.primaryColor};margin:12px 0">Sur mesure</p>
<p style="color:#64748b;font-size:.9rem;margin-bottom:20px">Idéal pour démarrer — contactez-nous pour un devis adapté.</p>
<a href="${escapeAttr(ctx.ctaUrl)}" style="display:inline-block;background:${ctx.primaryColor};color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">${escapeHtml(ctx.ctaText)}</a>
</article>
<article style="padding:28px;border-radius:16px;border:1px solid rgba(0,0,0,.08);background:#f8fafc;text-align:center">
<p style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:#64748b;font-weight:700">Pro</p>
<p style="font-size:2rem;font-weight:700;color:${ctx.primaryColor};margin:12px 0">Premium</p>
<p style="color:#64748b;font-size:.9rem;margin-bottom:20px">Accompagnement complet et options avancées.</p>
<a href="${escapeAttr(ctx.ctaUrl)}" style="display:inline-block;border:2px solid ${ctx.primaryColor};color:${ctx.primaryColor};padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">En savoir plus</a>
</article>
</div>
</section>
<!-- /klir-section:pricing -->`;
}

function buildFaqSection(ctx: TemplateRenderContext, sector: string): string {
  const faqs = [
    {
      q: `Comment fonctionne ${ctx.brandName} ?`,
      a: `Nous accompagnons nos clients en ${sector} avec un processus clair, de la prise de contact à la livraison.`,
    },
    {
      q: "Quels sont vos délais ?",
      a: "Les délais varient selon le projet — contactez-nous pour une estimation personnalisée.",
    },
    {
      q: "Comment vous joindre ?",
      a: "Utilisez le formulaire ci-dessous, WhatsApp ou le bouton d'action principal.",
    },
  ];
  const items = faqs
    .map(
      (f) =>
        `<details style="padding:16px 20px;border-radius:12px;background:#fff;border:1px solid rgba(0,0,0,.06);margin-bottom:10px"><summary style="font-weight:600;color:${ctx.primaryColor};cursor:pointer">${escapeHtml(f.q)}</summary><p style="margin:12px 0 0;color:#64748b;line-height:1.6">${escapeHtml(f.a)}</p></details>`
    )
    .join("");
  return `<!-- klir-section:faq -->
<section id="faq" class="section wrap" data-klir-section="faq" style="padding:64px 0;max-width:720px;margin:0 auto">
<h2 style="text-align:center;color:${ctx.primaryColor};margin-bottom:24px">Questions fréquentes</h2>
${items}
</section>
<!-- /klir-section:faq -->`;
}

function buildAboutSection(ctx: TemplateRenderContext, answers: SiteWizardAnswers): string {
  const city = answers.businessCity.trim();
  const loc = city ? ` basée à ${city}` : "";
  return `<!-- klir-section:about -->
<section id="apropos" class="section wrap" data-klir-section="about" style="padding:64px 0">
<div style="max-width:720px;margin:0 auto;text-align:center">
<h2 style="color:${ctx.primaryColor};margin-bottom:16px;font-size:1.75rem">À propos de ${escapeHtml(ctx.brandName)}</h2>
<p style="color:#64748b;line-height:1.8;font-size:1.05rem">${escapeHtml(ctx.tagline)}</p>
<p style="color:#64748b;line-height:1.8;margin-top:16px">Entreprise${loc} spécialisée en ${escapeHtml(ctx.sector)} — engagement qualité, transparence et service client.</p>
</div>
</section>
<!-- /klir-section:about -->`;
}

function buildProcessSection(ctx: TemplateRenderContext): string {
  const steps = [
    { n: "1", title: "Contact", text: "Décrivez votre besoin via le formulaire ou WhatsApp." },
    { n: "2", title: "Proposition", text: "Nous vous répondons avec une offre claire et adaptée." },
    { n: "3", title: "Livraison", text: "Exécution soignée et suivi jusqu'au résultat." },
  ];
  const cards = steps
    .map(
      (s) =>
        `<article style="text-align:center;padding:24px"><span style="display:inline-flex;width:40px;height:40px;border-radius:50%;background:${ctx.accentColor};color:${ctx.primaryColor};font-weight:700;align-items:center;justify-content:center;margin-bottom:12px">${s.n}</span><h3 style="color:${ctx.primaryColor};margin-bottom:8px">${escapeHtml(s.title)}</h3><p style="color:#64748b;font-size:.9rem">${escapeHtml(s.text)}</p></article>`
    )
    .join("");
  return `<!-- klir-section:process -->
<section id="processus" class="section wrap" data-klir-section="process" style="padding:64px 0">
<h2 style="text-align:center;color:${ctx.primaryColor};margin-bottom:28px">Comment ça marche</h2>
<div style="display:grid;gap:16px" class="grid3">${cards}</div>
</section>
<!-- /klir-section:process -->`;
}

function buildStatsSection(ctx: TemplateRenderContext): string {
  return `<!-- klir-section:stats -->
<div data-klir-section="stats" style="background:linear-gradient(90deg,${ctx.primaryColor},${ctx.accentColor});color:#fff;padding:24px 0">
<div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;text-align:center;padding:0 20px;font-size:.85rem">
<div><strong style="font-size:1.5rem;display:block">100+</strong>Clients satisfaits</div>
<div><strong style="font-size:1.5rem;display:block">5★</strong>Note moyenne</div>
<div><strong style="font-size:1.5rem;display:block">24h</strong>Réponse rapide</div>
</div>
</div>
<!-- /klir-section:stats -->`;
}

export function buildContactSection(
  ctx: TemplateRenderContext,
  answers: SiteWizardAnswers
): string {
  const email = answers.contactEmail.trim();
  const phone = answers.contactPhone.trim();
  const wa = whatsappUrl(answers.whatsapp);
  const city = answers.businessCity.trim();

  const contacts: string[] = [];
  if (email) {
    contacts.push(
      `<a href="mailto:${escapeAttr(email)}" style="color:${ctx.primaryColor};font-weight:600">${escapeHtml(email)}</a>`
    );
  }
  if (phone) {
    contacts.push(
      `<a href="tel:${escapeAttr(phone.replace(/\s/g, ""))}" style="color:${ctx.primaryColor};font-weight:600">${escapeHtml(phone)}</a>`
    );
  }
  if (wa) {
    contacts.push(
      `<a href="${escapeAttr(wa)}" target="_blank" rel="noopener" style="color:#25D366;font-weight:600">WhatsApp</a>`
    );
  }

  const mailtoAction = email
    ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Contact — ${ctx.brandName}`)}`
    : "#contact";

  return `<!-- klir-section:contact -->
<section id="contact" class="section wrap" data-klir-section="contact" style="padding:64px 0;background:#f8fafc">
<div style="max-width:640px;margin:0 auto">
<h2 style="text-align:center;color:${ctx.primaryColor};margin-bottom:8px;font-size:1.75rem">Contactez-nous</h2>
${city ? `<p style="text-align:center;color:#64748b;margin-bottom:24px">${escapeHtml(city)}</p>` : ""}
${contacts.length ? `<p style="text-align:center;margin-bottom:24px;display:flex;flex-wrap:wrap;gap:12px;justify-content:center">${contacts.join('<span style="color:#cbd5e1">·</span>')}</p>` : ""}
<form action="${escapeAttr(mailtoAction)}" method="GET" style="display:grid;gap:12px;background:#fff;padding:28px;border-radius:16px;border:1px solid rgba(0,0,0,.06)" onsubmit="if(this.action==='#contact'){alert('Ajoutez votre email dans le wizard ou écrivez-nous via WhatsApp.');return false}">
<label style="display:block"><span style="font-size:.75rem;color:#64748b">Nom</span><input name="name" required placeholder="Votre nom" style="width:100%;margin-top:4px;padding:12px;border-radius:10px;border:1px solid #e2e8f0;font:inherit"/></label>
<label style="display:block"><span style="font-size:.75rem;color:#64748b">Email</span><input type="email" required placeholder="vous@exemple.com" style="width:100%;margin-top:4px;padding:12px;border-radius:10px;border:1px solid #e2e8f0;font:inherit"/></label>
<label style="display:block"><span style="font-size:.75rem;color:#64748b">Message</span><textarea name="body" required rows="4" placeholder="Comment pouvons-nous vous aider ?" style="width:100%;margin-top:4px;padding:12px;border-radius:10px;border:1px solid #e2e8f0;font:inherit;resize:vertical"></textarea></label>
<button type="submit" style="background:${ctx.primaryColor};color:#fff;border:none;padding:14px;border-radius:12px;font-weight:600;cursor:pointer;font-size:1rem">Envoyer</button>
</form>
</div>
</section>
<!-- /klir-section:contact -->`;
}

function injectBeforeFooter(html: string, block: string): string {
  if (html.includes("<!-- klir-inject:before-footer -->")) {
    return html.replace(
      "<!-- klir-inject:before-footer -->",
      `${block}\n<!-- klir-inject:before-footer -->`
    );
  }
  return html.replace(/<footer/i, `${block}\n<footer`);
}

function injectExtraSections(
  html: string,
  answers: SiteWizardAnswers,
  ctx: TemplateRenderContext,
  meta: SiteTemplateMeta | null
): string {
  let out = html;
  const sel = answers.sections;

  if (sel.includes("pricing") && !out.includes("klir-section:pricing")) {
    out = injectBeforeFooter(out, buildPricingSection(ctx));
  }
  if (sel.includes("faq") && !out.includes("klir-section:faq")) {
    out = injectBeforeFooter(out, buildFaqSection(ctx, ctx.sector));
  }
  if (sel.includes("about") && !out.includes("klir-section:about")) {
    out = injectBeforeFooter(out, buildAboutSection(ctx, answers));
  }
  if (sel.includes("process") && !out.includes("klir-section:process")) {
    out = injectBeforeFooter(out, buildProcessSection(ctx));
  }
  if (sel.includes("stats") && meta?.tier !== "pro" && !out.includes("klir-section:stats")) {
    out = out.replace(/<body[^>]*>/i, (m) => `${m}\n${buildStatsSection(ctx)}`);
  }
  if (sel.includes("contact") && !out.includes("klir-section:contact")) {
    out = injectBeforeFooter(out, buildContactSection(ctx, answers));
  }

  return out;
}

export function injectWhatsAppFloat(html: string, answers: SiteWizardAnswers): string {
  const wa = whatsappUrl(answers.whatsapp);
  if (!wa || html.includes('id="klir-wa-float"')) return html;

  const text = encodeURIComponent(
    `Bonjour ${answers.brandName || ""}, je vous contacte depuis votre site.`
  );
  const float = `
<a id="klir-wa-float" href="${escapeAttr(wa)}?text=${text}" target="_blank" rel="noopener" aria-label="WhatsApp" style="position:fixed;bottom:72px;right:16px;z-index:9998;width:52px;height:52px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.2);text-decoration:none;font-size:26px">💬</a>`;

  return html.replace(/<\/body>/i, `${float}\n</body>`);
}

export function applyWizardSections(
  html: string,
  answers: SiteWizardAnswers,
  ctx: TemplateRenderContext,
  meta: SiteTemplateMeta | null
): string {
  let out = injectExtraSections(html, answers, ctx, meta);
  out = stripUnselectedSections(out, answers.sections);
  if (answers.sections.includes("contact") && out.includes("klir-section:contact")) {
    out = out.replace(
      /<!-- klir-section:contact -->[\s\S]*?<!-- \/klir-section:contact -->/,
      buildContactSection(ctx, answers)
    );
  }
  out = injectWhatsAppFloat(out, answers);
  return out;
}

export function applySiteLanguage(html: string, lang: string): string {
  return html.replace(/<html lang="[^"]*"/i, `<html lang="${escapeAttr(lang)}"`);
}
