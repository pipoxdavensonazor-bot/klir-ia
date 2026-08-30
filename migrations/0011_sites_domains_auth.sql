-- Reset mot de passe, sites hébergés, commandes domaines

CREATE TABLE IF NOT EXISTS auth_password_resets (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES auth_users(id)
);

CREATE INDEX IF NOT EXISTS idx_auth_password_resets_user ON auth_password_resets(user_id);

CREATE TABLE IF NOT EXISTS site_drafts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_drafts_user ON site_drafts(user_id);

CREATE TABLE IF NOT EXISTS hosted_sites (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'suspended')),
  expires_at INTEGER NOT NULL,
  payment_order_id TEXT,
  custom_domain TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hosted_sites_user ON hosted_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_hosted_sites_slug ON hosted_sites(slug);

CREATE TABLE IF NOT EXISTS domain_registrations (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  tld TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'registered', 'failed', 'expired')),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  payment_order_id TEXT,
  registrar_ref TEXT,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_domain_registrations_user ON domain_registrations(user_id);
