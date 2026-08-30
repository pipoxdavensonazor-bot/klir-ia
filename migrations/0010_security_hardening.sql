-- Sécurité P0 : limite invité par IP, rate limits D1, unicité tx USDT

CREATE TABLE IF NOT EXISTS guest_ip_usage (
  ip_hash TEXT PRIMARY KEY NOT NULL,
  search_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key TEXT PRIMARY KEY NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_usdt_tx
  ON payment_orders (provider_ref)
  WHERE provider = 'usdt' AND provider_ref IS NOT NULL;
