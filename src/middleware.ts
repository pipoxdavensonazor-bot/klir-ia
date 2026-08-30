import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Auth gérée par cookie Klir + contrôles dans chaque route API. */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const match = host.match(/^([a-z0-9-]+)\.sites\.klirline\.io$/);
  if (match) {
    const slug = match[1];
    const url = req.nextUrl.clone();
    url.pathname = `/h/${slug}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|apk|mobileconfig)).*)",
    "/(api|trpc)(.*)",
  ],
};
