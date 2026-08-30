-- Recharge crédits gratuits périodique (toutes les N heures)
ALTER TABLE subscriptions ADD COLUMN free_credits_refill_at INTEGER;
