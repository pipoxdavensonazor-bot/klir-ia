-- Cache snapshots marché (CoinGecko / Fear & Greed)
CREATE TABLE IF NOT EXISTS market_cache (
  cache_key TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_market_cache_expires ON market_cache (expires_at);
