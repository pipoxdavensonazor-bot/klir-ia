const BASE_HEAD = `<!DOCTYPE html>
<html lang="fr-CA">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{BRAND_NAME}}</title>
<meta name="description" content="{{TAGLINE}}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">`;

export const TEMPLATES: Record<string, string> = {
  "corporate-klir": `${BASE_HEAD}
<style>
:root{--p:{{PRIMARY}};--a:{{ACCENT}};--bg:#F7F5F0;--text:#1e293b;--muted:#64748b}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.6}
.wrap{max-width:1100px;margin:0 auto;padding:0 20px}
nav{display:flex;align-items:center;justify-content:space-between;padding:20px 0}
.logo{font-weight:700;font-size:1.25rem;color:var(--p)}
nav a.btn{background:var(--a);color:var(--p);padding:12px 22px;border-radius:999px;font-weight:600;font-size:.85rem;text-decoration:none}
.hero{display:grid;gap:32px;padding:48px 0 64px;align-items:center}
@media(min-width:768px){.hero{grid-template-columns:1fr 1fr}}
.hero h1{font-size:clamp(2rem,5vw,3rem);line-height:1.1;color:var(--p);margin-bottom:16px}
.hero p{color:var(--muted);font-size:1.05rem;margin-bottom:24px}
.hero img{border-radius:20px;width:100%;height:360px;object-fit:cover;box-shadow:0 24px 48px rgba(0,79,110,.15)}
.btn-main{display:inline-block;background:var(--p);color:#fff;padding:14px 28px;border-radius:12px;font-weight:600;text-decoration:none}
.section{padding:64px 0}.section h2{font-size:1.75rem;color:var(--p);margin-bottom:24px;text-align:center}
.grid3{display:grid;gap:20px}@media(min-width:768px){.grid3{grid-template-columns:repeat(3,1fr)}}
.gallery{display:grid;gap:16px;grid-template-columns:repeat(2,1fr)}@media(min-width:768px){.gallery{grid-template-columns:repeat(4,1fr)}}
.partners ul{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;padding:0}
.partners{background:#fff;padding:48px 0;border-top:1px solid rgba(0,0,0,.06)}
footer{background:var(--p);color:#fff;padding:40px 0;text-align:center}
footer p{opacity:.8;font-size:.85rem;margin-top:8px}
{{PRO_EXTRA_CSS}}
</style></head><body>
{{PRO_STATS}}
<!-- klir-section:hero -->
<header class="wrap"><nav><div class="logo">{{BRAND_NAME}}</div><a class="btn" href="{{CTA_URL}}">{{CTA_TEXT}}</a></nav></header>
<section class="wrap hero"><div><p style="color:{{ACCENT}};font-weight:600;font-size:.8rem;letter-spacing:.15em;text-transform:uppercase">{{SECTOR}}</p><h1>{{BRAND_NAME}}</h1><p>{{TAGLINE}}</p><a class="btn-main" href="{{CTA_URL}}">{{CTA_TEXT}}</a></div><img src="{{HERO_IMG}}" alt="{{HERO_ALT}}"></section>
<!-- /klir-section:hero -->
<!-- klir-section:benefits -->
<section class="section wrap"><h2>Pourquoi nous choisir</h2><div class="grid3">{{BENEFITS_HTML}}</div></section>
<!-- /klir-section:benefits -->
<!-- klir-section:gallery -->
<section class="section wrap"><h2>Galerie</h2><div class="gallery">{{GALLERY_HTML}}</div></section>
<!-- /klir-section:gallery -->
<!-- klir-section:partners -->
<section class="partners"><div class="wrap"><h2 style="text-align:center;margin-bottom:20px;color:{{PRIMARY}}">Nos partenaires</h2><ul>{{PARTNERS_HTML}}</ul></div></section>
<!-- /klir-section:partners -->
{{PRO_TESTIMONIALS}}
<!-- klir-inject:before-footer -->
<footer class="wrap"><strong>{{BRAND_NAME}}</strong><p>© {{YEAR}} — {{ATTRIBUTIONS}}</p></footer>
</body></html>`,

  "luxe-noir": `${BASE_HEAD}
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>
:root{--p:{{PRIMARY}};--a:{{ACCENT}};--bg:#050B0E;--surface:#0B161D;--text:#F4F6F7;--muted:#94A3B8}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:var(--bg);color:var(--text)}
.display{font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;letter-spacing:.08em;text-transform:uppercase}
.wrap{max-width:1140px;margin:0 auto;padding:0 24px}
nav{display:flex;justify-content:space-between;align-items:center;padding:28px 0;border-bottom:1px solid rgba(212,175,55,.15)}
.logo{font-family:'Cormorant Garamond',serif;font-size:1.5rem;letter-spacing:.2em;color:var(--a)}
nav a{border:1px solid var(--a);color:var(--a);padding:12px 24px;text-decoration:none;font-size:.75rem;letter-spacing:.15em;text-transform:uppercase}
.hero{min-height:70vh;display:grid;align-items:center;gap:40px;padding:64px 0;background:linear-gradient(135deg,rgba(0,79,110,.35),transparent),url('{{HERO_IMG}}') center/cover}
.hero-inner{max-width:640px;background:rgba(5,11,14,.72);padding:40px;border:1px solid rgba(212,175,55,.2)}
.hero h1{font-size:clamp(2.2rem,6vw,3.5rem);margin:12px 0 16px;color:#fff}
.hero p{color:var(--muted);margin-bottom:28px}
.btn-gold{display:inline-block;background:var(--a);color:#000;padding:16px 32px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;font-size:.8rem}
.section{padding:80px 0}.tag{color:var(--a);font-size:.7rem;letter-spacing:.25em;text-transform:uppercase;margin-bottom:12px;display:block}
.section h2{font-family:'Cormorant Garamond',serif;font-size:2rem;margin-bottom:32px;text-align:center}
.grid3{display:grid;gap:24px}@media(min-width:768px){.grid3{grid-template-columns:repeat(3,1fr)}}
.gallery{display:grid;gap:16px;grid-template-columns:repeat(2,1fr)}@media(min-width:900px){.gallery{grid-template-columns:repeat(4,1fr)}}
.partners{background:var(--surface);padding:64px 0}.partners ul{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;padding:0}
.testimonials{display:grid;gap:20px}@media(min-width:768px){.testimonials{grid-template-columns:1fr 1fr}}
footer{padding:48px 24px;text-align:center;border-top:1px solid rgba(255,255,255,.08);color:var(--muted);font-size:.8rem}
{{PRO_EXTRA_CSS}}
</style></head><body>
{{PRO_STATS}}
<!-- klir-section:hero -->
<header class="wrap"><nav><div class="logo">{{BRAND_NAME}}</div><a href="{{CTA_URL}}">{{CTA_TEXT}}</a></nav></header>
<section class="hero"><div class="wrap hero-inner"><span class="tag">{{SECTOR}}</span><h1 class="display">{{BRAND_NAME}}</h1><p>{{TAGLINE}}</p><a class="btn-gold" href="{{CTA_URL}}">{{CTA_TEXT}}</a></div></section>
<!-- /klir-section:hero -->
<!-- klir-section:benefits -->
<section class="section wrap"><span class="tag">Expertise</span><h2>Direction &amp; excellence</h2><div class="grid3">{{BENEFITS_HTML}}</div></section>
<!-- /klir-section:benefits -->
<!-- klir-section:gallery -->
<section class="section wrap"><span class="tag">Portfolio</span><h2>Visuels</h2><div class="gallery">{{GALLERY_HTML}}</div></section>
<!-- /klir-section:gallery -->
<!-- klir-section:partners -->
<section class="partners"><div class="wrap"><span class="tag" style="text-align:center">Réseau</span><h2>Ils nous font confiance</h2><ul>{{PARTNERS_HTML}}</ul></div></section>
<!-- /klir-section:partners -->
<!-- klir-section:testimonials -->
<section class="section wrap"><span class="tag">Témoignages</span><h2>Ce qu'ils disent</h2><div class="testimonials">{{TESTIMONIALS_HTML}}</div></section>
<!-- /klir-section:testimonials -->
<!-- klir-inject:before-footer -->
<footer><p><strong style="color:var(--a)">{{BRAND_NAME}}</strong> · © {{YEAR}}</p><p>{{ATTRIBUTIONS}}</p></footer>
</body></html>`,

  "warm-services": `${BASE_HEAD}
<style>
:root{--p:{{PRIMARY}};--a:{{ACCENT}};--bg:#FAF6F1;--text:#3D2C29;--muted:#7C6A65}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:var(--bg);color:var(--text)}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
header{padding:24px 0;display:flex;justify-content:space-between;align-items:center}
.logo{font-weight:700;color:var(--p);font-size:1.2rem}
.hero{border-radius:28px;overflow:hidden;margin:16px 0 48px;position:relative;min-height:420px}
.hero img{width:100%;height:420px;object-fit:cover}
.hero-cap{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.65));display:flex;align-items:flex-end;padding:40px}
.hero-cap h1{color:#fff;font-size:clamp(1.8rem,5vw,2.8rem);margin-bottom:8px}
.hero-cap p{color:rgba(255,255,255,.9);max-width:520px;margin-bottom:20px}
.btn{display:inline-block;background:var(--a);color:#fff;padding:14px 26px;border-radius:999px;text-decoration:none;font-weight:600}
.section{padding:56px 0}.section h2{text-align:center;color:var(--p);margin-bottom:28px}
.grid3{display:grid;gap:18px}@media(min-width:768px){.grid3{grid-template-columns:repeat(3,1fr)}}
.gallery{display:grid;gap:14px;grid-template-columns:1fr 1fr}@media(min-width:768px){.gallery{grid-template-columns:repeat(4,1fr)}}
.partners{background:#fff;border-radius:24px;padding:40px;margin:24px 0}.partners ul{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;padding:0}
footer{text-align:center;padding:40px 0;color:var(--muted);font-size:.85rem}
{{PRO_EXTRA_CSS}}
</style></head><body>
<div class="wrap">
<!-- klir-section:hero -->
<header><div class="logo">{{BRAND_NAME}}</div><a class="btn" href="{{CTA_URL}}">{{CTA_TEXT}}</a></header>
<section class="hero"><img src="{{HERO_IMG}}" alt="{{HERO_ALT}}"><div class="hero-cap"><div><p style="opacity:.9;font-size:.85rem;text-transform:uppercase;letter-spacing:.1em">{{SECTOR}}</p><h1>{{BRAND_NAME}}</h1><p>{{TAGLINE}}</p><a class="btn" href="{{CTA_URL}}">{{CTA_TEXT}}</a></div></div></section>
<!-- /klir-section:hero -->
<!-- klir-section:benefits -->
<section class="section"><h2>Nos atouts</h2><div class="grid3">{{BENEFITS_HTML}}</div></section>
<!-- /klir-section:benefits -->
<!-- klir-section:gallery -->
<section class="section"><h2>Galerie</h2><div class="gallery">{{GALLERY_HTML}}</div></section>
<!-- /klir-section:gallery -->
<!-- klir-section:partners -->
<div class="partners"><h2 style="text-align:center;margin-bottom:20px;color:var(--p)">Partenaires locaux</h2><ul>{{PARTNERS_HTML}}</ul></div>
<!-- /klir-section:partners -->
<!-- klir-inject:before-footer -->
<footer>© {{YEAR}} {{BRAND_NAME}} · {{ATTRIBUTIONS}}</footer></div>
</body></html>`,

  "minimal-portfolio": `${BASE_HEAD}
<style>
:root{--p:{{PRIMARY}};--a:{{ACCENT}}}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#fff;color:#111827}
.wrap{max-width:960px;margin:0 auto;padding:0 24px}
header{padding:32px 0;display:flex;justify-content:space-between;align-items:baseline}
header h1{font-size:1rem;font-weight:600;letter-spacing:.05em}
header a{color:var(--a);text-decoration:none;font-weight:600}
.hero{padding:48px 0 64px;border-bottom:1px solid #e5e7eb}
.hero h2{font-size:clamp(2rem,6vw,3.2rem);font-weight:700;line-height:1.1;margin-bottom:16px}
.hero p{font-size:1.1rem;color:#6b7280;max-width:540px;margin-bottom:28px}
.hero img{width:100%;margin-top:32px;border-radius:8px;max-height:480px;object-fit:cover}
.section{padding:64px 0}.section h3{font-size:.75rem;text-transform:uppercase;letter-spacing:.2em;color:#9ca3af;margin-bottom:20px}
.grid2{display:grid;gap:24px}@media(min-width:768px){.grid2{grid-template-columns:1fr 1fr}}
.gallery{display:grid;gap:12px;grid-template-columns:repeat(2,1fr)}
.partners{padding:48px 0;border-top:1px solid #e5e7eb}.partners ul{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;padding:0}
footer{padding:32px 0;color:#9ca3af;font-size:.8rem;text-align:center}
{{PRO_EXTRA_CSS}}
</style></head><body>
<div class="wrap">
<!-- klir-section:hero -->
<header><h1>{{BRAND_NAME}}</h1><a href="{{CTA_URL}}">{{CTA_TEXT}}</a></header>
<section class="hero"><p style="color:var(--a);font-weight:600;font-size:.8rem">{{SECTOR}}</p><h2>{{TAGLINE}}</h2><a href="{{CTA_URL}}" style="display:inline-block;border-bottom:2px solid var(--p);padding-bottom:4px;color:var(--p);text-decoration:none;font-weight:600">Travaillons ensemble →</a><img src="{{HERO_IMG}}" alt="{{HERO_ALT}}"></section>
<!-- /klir-section:hero -->
<!-- klir-section:benefits -->
<section class="section"><h3>Services</h3><div class="grid2">{{BENEFITS_HTML}}</div></section>
<!-- /klir-section:benefits -->
<!-- klir-section:gallery -->
<section class="section"><h3>Projets</h3><div class="gallery">{{GALLERY_HTML}}</div></section>
<!-- /klir-section:gallery -->
<!-- klir-section:partners -->
<section class="partners"><h3 style="text-align:center">Partenaires</h3><ul>{{PARTNERS_HTML}}</ul></section>
<!-- /klir-section:partners -->
{{PRO_TESTIMONIALS}}
<!-- klir-inject:before-footer -->
<footer>© {{YEAR}} {{BRAND_NAME}}</footer></div>
</body></html>`,

  "bold-startup": `${BASE_HEAD}
<style>
:root{--p:{{PRIMARY}};--a:{{ACCENT}};--bg:#F8FAFC}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:var(--bg);color:var(--p)}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
nav{display:flex;justify-content:space-between;align-items:center;padding:20px 0}
.badge{background:var(--a);color:var(--p);padding:6px 12px;border-radius:8px;font-size:.7rem;font-weight:700;text-transform:uppercase}
.hero{padding:40px 0 72px;display:grid;gap:32px;align-items:center}@media(min-width:768px){.hero{grid-template-columns:1.1fr .9fr}}
.hero h1{font-size:clamp(2.2rem,5vw,3.4rem);line-height:1.05;margin:16px 0}
.hero p{color:#475569;font-size:1.05rem;margin-bottom:24px}
.cta{display:inline-block;background:var(--p);color:#fff;padding:16px 28px;border-radius:14px;font-weight:700;text-decoration:none;box-shadow:0 12px 30px rgba(15,23,42,.2)}
.hero img{border-radius:24px;width:100%;height:340px;object-fit:cover}
.cards{display:grid;gap:16px;padding:48px 0}@media(min-width:768px){.cards{grid-template-columns:repeat(3,1fr)}}
.gallery{display:grid;gap:12px;grid-template-columns:repeat(2,1fr);padding-bottom:48px}@media(min-width:768px){.gallery{grid-template-columns:repeat(4,1fr)}}
.partners{background:var(--p);color:#fff;padding:56px 0;border-radius:32px;margin:24px 0}.partners h2{text-align:center;margin-bottom:24px}.partners ul{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;padding:0}
footer{text-align:center;padding:32px;color:#64748b;font-size:.85rem}
{{PRO_EXTRA_CSS}}
</style></head><body>
{{PRO_STATS}}
<div class="wrap">
<!-- klir-section:hero -->
<nav><strong>{{BRAND_NAME}}</strong><span class="badge">{{SECTOR}}</span></nav>
<section class="hero"><div><span class="badge">Nouveau</span><h1>{{TAGLINE}}</h1><p>Lancez plus vite avec une présence pro, crédible et convertissante.</p><a class="cta" href="{{CTA_URL}}">{{CTA_TEXT}}</a></div><img src="{{HERO_IMG}}" alt="{{HERO_ALT}}"></section>
<!-- /klir-section:hero -->
<!-- klir-section:benefits -->
<section class="cards">{{BENEFITS_HTML}}</section>
<!-- /klir-section:benefits -->
<!-- klir-section:gallery -->
<section><h2 style="text-align:center;margin-bottom:20px">En images</h2><div class="gallery">{{GALLERY_HTML}}</div></section>
<!-- /klir-section:gallery -->
<!-- klir-section:partners -->
<section class="partners wrap"><h2>Partenaires tech</h2><ul>{{PARTNERS_HTML}}</ul></section>
<!-- /klir-section:partners -->
<!-- klir-inject:before-footer -->
<footer>© {{YEAR}} {{BRAND_NAME}} · {{ATTRIBUTIONS}}</footer></div>
</body></html>`,

  "elegant-event": `${BASE_HEAD}
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{--p:{{PRIMARY}};--a:{{ACCENT}};--bg:#FFFBEB}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:var(--bg);color:#1f2937}
.wrap{max-width:920px;margin:0 auto;padding:0 20px}
header{text-align:center;padding:36px 0 24px}
header h1{font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--p)}
.hero img{width:100%;height:360px;object-fit:cover;border-radius:20px;margin:16px 0 32px}
.hero p{text-align:center;font-size:1.1rem;color:#4b5563;max-width:620px;margin:0 auto 24px}
.rsvp{display:block;width:fit-content;margin:0 auto;background:var(--a);color:#fff;padding:16px 36px;border-radius:999px;font-weight:700;text-decoration:none}
.section{padding:48px 0;text-align:center}.section h2{font-family:'Cormorant Garamond',serif;font-size:1.75rem;color:var(--p);margin-bottom:24px}
.grid3{display:grid;gap:16px;text-align:left}@media(min-width:768px){.grid3{grid-template-columns:repeat(3,1fr)}}
.gallery{display:grid;gap:12px;grid-template-columns:repeat(2,1fr)}@media(min-width:768px){.gallery{grid-template-columns:repeat(4,1fr)}}
.partners{padding:40px 0}.partners ul{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;padding:0}
footer{text-align:center;padding:32px;color:#6b7280;font-size:.85rem}
{{PRO_EXTRA_CSS}}
</style></head><body>
<div class="wrap">
<!-- klir-section:hero -->
<header><p style="letter-spacing:.2em;text-transform:uppercase;font-size:.75rem;color:var(--a)">{{SECTOR}}</p><h1>{{BRAND_NAME}}</h1></header>
<section class="hero"><img src="{{HERO_IMG}}" alt="{{HERO_ALT}}"><p>{{TAGLINE}}</p><a class="rsvp" href="{{CTA_URL}}">{{CTA_TEXT}}</a></section>
<!-- /klir-section:hero -->
<!-- klir-section:benefits -->
<section class="section"><h2>Programme</h2><div class="grid3">{{BENEFITS_HTML}}</div></section>
<!-- /klir-section:benefits -->
<!-- klir-section:gallery -->
<section class="section"><h2>Ambiance</h2><div class="gallery">{{GALLERY_HTML}}</div></section>
<!-- /klir-section:gallery -->
<!-- klir-section:partners -->
<section class="partners"><h2 style="font-family:'Cormorant Garamond',serif;color:var(--p);margin-bottom:20px">Partenaires</h2><ul>{{PARTNERS_HTML}}</ul></section>
<!-- /klir-section:partners -->
<!-- klir-inject:before-footer -->
<footer>© {{YEAR}} {{BRAND_NAME}} · {{ATTRIBUTIONS}}</footer></div>
</body></html>`,
};
