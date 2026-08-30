-- Klir IA — abonnements + commandes paiement (Stripe / MonCash / USDT)
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'canceled', 'pending')),
  provider TEXT NOT NULL DEFAULT 'none'
    CHECK (provider IN ('none', 'stripe', 'moncash', 'usdt')),
  provider_ref TEXT,
  current_period_end INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan
  ON subscriptions (plan_id, status);

CREATE TABLE IF NOT EXISTS payment_orders (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'moncash', 'usdt')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  provider_ref TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user
  ON payment_orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_orders_provider_ref
  ON payment_orders (provider, provider_ref);
