import { getDb } from "@/lib/d1";

export type UserProfileRow = {
  user_id: string;
  role: string | null;
  goal: string | null;
  sector: string | null;
  locale: string;
  onboarding_done: number;
  created_at: number;
  updated_at: number;
};

export type UserProfileInput = {
  role?: string;
  goal?: string;
  sector?: string;
  locale?: string;
  onboardingDone?: boolean;
};

export async function getUserProfile(userId: string): Promise<UserProfileRow | null> {
  const db = getDb();
  return db
    .prepare("SELECT * FROM user_profiles WHERE user_id = ?")
    .bind(userId)
    .first<UserProfileRow>();
}

export async function needsOnboarding(userId: string): Promise<boolean> {
  try {
    const row = await getUserProfile(userId);
    return !row || row.onboarding_done !== 1;
  } catch {
    return false;
  }
}

export async function upsertUserProfile(userId: string, input: UserProfileInput): Promise<UserProfileRow> {
  const db = getDb();
  const now = Date.now();
  const existing = await getUserProfile(userId);

  const row: UserProfileRow = {
    user_id: userId,
    role: input.role ?? existing?.role ?? null,
    goal: input.goal ?? existing?.goal ?? null,
    sector: input.sector ?? existing?.sector ?? null,
    locale: input.locale ?? existing?.locale ?? "fr-CA",
    onboarding_done:
      input.onboardingDone !== undefined
        ? input.onboardingDone
          ? 1
          : 0
        : (existing?.onboarding_done ?? 0),
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  await db
    .prepare(
      `INSERT INTO user_profiles (user_id, role, goal, sector, locale, onboarding_done, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         role = excluded.role,
         goal = excluded.goal,
         sector = excluded.sector,
         locale = excluded.locale,
         onboarding_done = excluded.onboarding_done,
         updated_at = excluded.updated_at`
    )
    .bind(
      row.user_id,
      row.role,
      row.goal,
      row.sector,
      row.locale,
      row.onboarding_done,
      row.created_at,
      row.updated_at
    )
    .run();

  return row;
}
