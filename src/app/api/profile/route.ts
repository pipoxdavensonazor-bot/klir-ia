import { getAuthUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { getUserProfile, needsOnboarding, upsertUserProfile } from "@/lib/user-profile";

export async function GET() {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  try {
    const profile = await getUserProfile(userId);
    const needOnboarding = await needsOnboarding(userId);
    return NextResponse.json({
      profile: profile
        ? {
            role: profile.role,
            goal: profile.goal,
            sector: profile.sector,
            locale: profile.locale,
            onboardingDone: profile.onboarding_done === 1,
          }
        : null,
      needsOnboarding: needOnboarding,
    });
  } catch {
    return NextResponse.json({ needsOnboarding: false, profile: null });
  }
}

export async function PATCH(req: Request) {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  let body: {
    role?: string;
    goal?: string;
    sector?: string;
    locale?: string;
    onboardingDone?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  try {
    const row = await upsertUserProfile(userId, {
      role: body.role?.slice(0, 40),
      goal: body.goal?.slice(0, 40),
      sector: body.sector?.slice(0, 120),
      locale: body.locale?.slice(0, 10),
      onboardingDone: body.onboardingDone,
    });
    return NextResponse.json({
      ok: true,
      profile: {
        role: row.role,
        goal: row.goal,
        sector: row.sector,
        locale: row.locale,
        onboardingDone: row.onboarding_done === 1,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur profil" },
      { status: 503 }
    );
  }
}
