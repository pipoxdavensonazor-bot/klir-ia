import { getHostedSiteHtml } from "@/lib/hosting/sites";

type Params = { params: Promise<{ slug: string }> };

const HOSTED_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:; base-uri 'none'; form-action 'none'";

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params;
  const host = new URL(req.url).hostname.toLowerCase();

  if (host === "klirline.io" || host === "www.klirline.io") {
    return Response.redirect(`https://${slug}.sites.klirline.io`, 302);
  }

  const html = await getHostedSiteHtml(slug);
  if (!html) {
    return new Response("Site introuvable ou expiré.", { status: 404 });
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Content-Security-Policy": HOSTED_CSP,
      "X-Frame-Options": "DENY",
    },
  });
}
