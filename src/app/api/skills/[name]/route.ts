import { NextResponse } from "next/server";
import { getSkill } from "@/lib/ai/catalog";

type RouteParams = { params: Promise<{ name: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { name } = await params;
  const skill = getSkill(name);
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }
  return NextResponse.json(skill);
}
