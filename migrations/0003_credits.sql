-- Klir IA — solde crédits par utilisateur
ALTER TABLE subscriptions ADD COLUMN credits_balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN free_grant_claimed INTEGER NOT NULL DEFAULT 0;
