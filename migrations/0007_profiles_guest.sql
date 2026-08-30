-- Profils utilisateur (onboarding) + suivi invités côté serveur
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  role TEXT,
  goal TEXT,
  sector TEXT,
  locale TEXT NOT NULL DEFAULT 'fr-CA',
  onboarding_done INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS guest_usage (
  guest_id TEXT PRIMARY KEY NOT NULL,
  search_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
