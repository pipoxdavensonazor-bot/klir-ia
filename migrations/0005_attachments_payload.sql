-- Fallback stockage pièces jointes sans R2 (payload base64, fichiers ≤ ~1 Mo)
ALTER TABLE attachments ADD COLUMN payload TEXT;
