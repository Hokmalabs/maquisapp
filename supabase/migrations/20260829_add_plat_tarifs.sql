-- Migration : Volet B — Tarifs multiples par article, appliqués via la table
-- ADR 006. STRICTEMENT ADDITIVE. Ne supprime ni ne restreint rien d'existant.
-- Ne modifie aucun trigger, fonction ou policy existante.
-- Docker indisponible côté dev : à appliquer via Supabase Studio → SQL Editor,
-- puis `supabase migration repair --status applied 20260829` pour réconcilier
-- l'historique (cf. baseline 20260805).
--
-- Contenu :
--   1. Table plat_tarifs (1..N tarifs ordonnés par plat)
--   2. Colonne tables.tarif_ordre (niveau de tarif appliqué aux commandes de la table)
--   3. Colonne commande_items.tarif_id (tarif effectivement appliqué, nullable)
--   4. Backfill : 1 tarif ordre=1 par plat existant depuis plats.prix
--   5. RLS calquée sur le pattern réel de `plats`

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Table plat_tarifs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plat_tarifs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plat_id    uuid        NOT NULL REFERENCES public.plats(id) ON DELETE CASCADE,
  prix       numeric     NOT NULL,
  ordre      int         NOT NULL,
  actif      boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plat_tarifs_ordre_positif CHECK (ordre >= 1),
  CONSTRAINT plat_tarifs_prix_positif  CHECK (prix >= 0),
  CONSTRAINT plat_tarifs_plat_ordre_uniq UNIQUE (plat_id, ordre)
);

CREATE INDEX IF NOT EXISTS idx_plat_tarifs_plat_id ON public.plat_tarifs(plat_id);

-- ---------------------------------------------------------------------------
-- 2. tables.tarif_ordre — niveau de tarif appliqué aux commandes de la table.
--    DEFAULT 1 : toutes les tables existantes restent au prix de base.
-- ---------------------------------------------------------------------------
ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS tarif_ordre int NOT NULL DEFAULT 1;

ALTER TABLE public.tables
  DROP CONSTRAINT IF EXISTS tables_tarif_ordre_positif;
ALTER TABLE public.tables
  ADD  CONSTRAINT tables_tarif_ordre_positif CHECK (tarif_ordre >= 1);

-- ---------------------------------------------------------------------------
-- 3. commande_items.tarif_id — tarif effectivement appliqué (après repli éventuel).
--    Nullable + ON DELETE SET NULL : supprimer un tarif ne casse pas l'historique.
--    prix_unitaire reste la source de vérité (ADR 004).
-- ---------------------------------------------------------------------------
ALTER TABLE public.commande_items
  ADD COLUMN IF NOT EXISTS tarif_id uuid
  REFERENCES public.plat_tarifs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commande_items_tarif_id ON public.commande_items(tarif_id);

-- ---------------------------------------------------------------------------
-- 4. Backfill : un tarif ordre=1 par plat existant, depuis plats.prix.
--    Idempotent : ne réinsère pas si un ordre=1 existe déjà pour le plat.
-- ---------------------------------------------------------------------------
INSERT INTO public.plat_tarifs (plat_id, prix, ordre, actif)
SELECT p.id, p.prix, 1, true
FROM public.plats p
WHERE NOT EXISTS (
  SELECT 1 FROM public.plat_tarifs t
  WHERE t.plat_id = p.id AND t.ordre = 1
);

-- ---------------------------------------------------------------------------
-- 5. RLS — calquée sur le pattern réel de `plats` :
--    - SELECT public (USING true), comme "Plats lisibles par tous"
--    - écriture ALL sur rôle public, condition par restaurant du profil,
--      transposée via plat_id -> plats.restaurant_id (plat_tarifs n'a pas
--      de restaurant_id direct). Pas de WITH CHECK explicite : comme sur
--      `plats`, le USING sert de check à l'écriture.
-- ---------------------------------------------------------------------------
ALTER TABLE public.plat_tarifs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tarifs lisibles par tous" ON public.plat_tarifs;
CREATE POLICY "Tarifs lisibles par tous"
  ON public.plat_tarifs
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Tarifs modifiables par gerant" ON public.plat_tarifs;
CREATE POLICY "Tarifs modifiables par gerant"
  ON public.plat_tarifs
  FOR ALL
  USING (
    plat_id IN (
      SELECT p.id
      FROM public.plats p
      WHERE p.restaurant_id IN (
        SELECT profiles.restaurant_id
        FROM public.profiles
        WHERE profiles.id = auth.uid()
      )
    )
  );

COMMIT;