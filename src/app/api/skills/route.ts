import { NextResponse } from "next/server";
import { getSkill, listSkills } from "@/lib/ai/catalog";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (name) {
    const skill = getSkill(name);
    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }
    return NextResponse.json(skill);
  }

  const skills = listSkills();
  return NextResponse.json({ skills, count: skills.length });
}
