-- Tableau de bord propriétaire : réglages, médias, paiements vendeur

CREATE TABLE IF NOT EXISTS site_settings (
  site_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  business_name TEXT,
  business_country TEXT DEFAULT 'HT',
  business_city TEXT,
  business_region TEXT,
  locale TEXT DEFAULT 'fr-CA',
  currency TEXT DEFAULT 'HTG',
  timezone TEXT DEFAULT 'America/Port-au-Prince',
  payment_methods_json TEXT NOT NULL DEFAULT '{}',
  geo_detected_json TEXT,
  assistant_notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (site_id) REFERENCES hosted_sites(id)
);

CREATE INDEX IF NOT EXISTS idx_site_settings_user ON site_settings(user_id);

CREATE TABLE IF NOT EXISTS site_media (
  id TEXT PRIMARY KEY NOT NULL,
  site_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (site_id) REFERENCES hosted_sites(id)
);

CREATE INDEX IF NOT EXISTS idx_site_media_site ON site_media(site_id);
CREATE INDEX IF NOT EXISTS idx_site_media_user ON site_media(user_id);
