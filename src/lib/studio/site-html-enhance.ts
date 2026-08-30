/** Enrichit le HTML publié : partage social, responsive, fluidité. */

export function enhancePublishedSiteHtml(
  html: string,
  opts: { brandName: string; shareUrl: string; heroImage?: string }
): string {
  let out = html;

  if (!out.includes('name="viewport"')) {
    out = out.replace(
      /<head>/i,
      '<head>\n<meta name="viewport" content="width=device-width,initial-scale=1">'
    );
  }

  const descMatch = out.match(/<meta name="description" content="([^"]*)"/i);
  const description = descMatch?.[1] ?? opts.brandName;
  const imgMatch = out.match(/<img[^>]+src="([^"]+)"/i);
  const ogImage = opts.heroImage ?? imgMatch?.[1] ?? "";

  const ogBlock = `
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeAttr(opts.brandName)}">
<meta property="og:description" content="${escapeAttr(description)}">
<meta property="og:url" content="${escapeAttr(opts.shareUrl)}">
${ogImage ? `<meta property="og:image" content="${escapeAttr(ogImage)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(opts.brandName)}">
<meta name="twitter:description" content="${escapeAttr(description)}">
<link rel="canonical" href="${escapeAttr(opts.shareUrl)}">`;

  if (!out.includes('property="og:title"')) {
    out = out.replace(/<\/head>/i, `${ogBlock}\n</head>`);
  }

  const shareBar = `
<div id="klir-share" style="position:fixed;bottom:16px;right:16px;z-index:9999;display:flex;gap:8px;flex-wrap:wrap;max-width:calc(100vw - 32px)">
  <button type="button" onclick="navigator.share?.({title:document.title,url:location.href}).catch(()=>{})||window.open('https://wa.me/?text='+encodeURIComponent(document.title+' '+location.href),'_blank')" style="background:#25D366;color:#fff;border:none;padding:10px 14px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.15)">Partager</button>
  <button type="button" onclick="navigator.clipboard?.writeText(location.href)" style="background:rgba(0,79,110,.9);color:#fff;border:none;padding:10px 14px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.15)">Copier lien</button>
</div>`;

  if (!out.includes('id="klir-share"')) {
    out = out.replace(/<\/body>/i, `${shareBar}\n</body>`);
  }

  const fluidCss = `<style id="klir-fluid">img,video{max-width:100%;height:auto}*{box-sizing:border-box}body{overflow-x:hidden}</style>`;
  if (!out.includes('id="klir-fluid"')) {
    out = out.replace(/<\/head>/i, `${fluidCss}\n</head>`);
  }

  return out;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export function injectHeroImage(html: string, oldSrc: string, newSrc: string): string {
  if (!oldSrc) {
    return html.replace(/(<img[^>]+src=")([^"]+)(")/i, `$1${newSrc}$3`);
  }
  return html.replaceAll(oldSrc, newSrc);
}
