-- =====================================================================
-- Migration : rattrapage essais sans date d'expiration
-- Date        : 2026-08-05
--
-- Contexte : le flow d'inscription par téléphone (verify-otp) créait les
-- restaurants sans abonnement_fin (contrairement au flow Google). Ces
-- comptes restaient donc en "essai" éternel, sans jamais expirer.
-- Corrigé côté verify-otp/index.ts (ajout email, ville, abonnement_statut,
-- abonnement_fin, abonnement_plan à l'insert du restaurant).
--
-- Cette migration régularise les comptes déjà créés avant le fix.
-- Décision produit validée : essai plein de 14 jours à partir d'aujourd'hui.
-- =====================================================================

UPDATE restaurants
SET
  abonnement_statut = 'essai',
  abonnement_fin    = now() + interval '14 days',
  abonnement_plan   = null
WHERE abonnement_fin IS NULL;
