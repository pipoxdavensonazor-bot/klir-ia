import { NextResponse } from "next/server";
import { listSiteTemplates } from "@/lib/studio/templates/catalog";

/** Liste des templates site (gratuits + pro) mappés aux skills design Klir IA. */
export async function GET() {
  const templates = listSiteTemplates();
  return NextResponse.json({
    templates,
    freeCount: templates.filter((t) => t.tier === "free").length,
    proCount: templates.filter((t) => t.tier === "pro").length,
  });
}
