-- =====================================================================
-- Migration BASELINE — MaquisApp
-- Date        : 2026-08-05
-- Objet       : Capture de l'état réel du schéma `public` en production.
--
-- Cette migration ne MODIFIE rien sur une base déjà en production : elle
-- documente/reconstruit l'existant. Elle est écrite de façon idempotente
-- (IF NOT EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS) pour pouvoir
-- être rejouée sans erreur, et pour reconstruire à l'identique une base
-- vierge (environnement de test, futur staging).
--
-- Source de vérité : introspection pg_catalog / information_schema du
-- projet de production, réalisée le 2026-08-05.
--
-- NOTE : les objets gérés par Supabase (schémas auth, storage, etc.) ne
-- sont pas inclus. Seul le schéma applicatif `public` est capturé.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensions (nécessaires : gen_random_uuid, bcrypt via pgcrypto)
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- restaurants : un restaurant = un compte client
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurants (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  nom               text        NOT NULL,
  slug              text        NOT NULL,
  description       text,
  logo_url          text,
  adresse           text,
  telephone         text,
  email             text,
  ville             text        DEFAULT 'Abidjan'::text,
  actif             boolean     DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  abonnement_statut text        DEFAULT 'essai'::text,
  abonnement_fin    timestamptz,
  abonnement_plan   text,
  CONSTRAINT restaurants_pkey PRIMARY KEY (id),
  CONSTRAINT restaurants_slug_key UNIQUE (slug)
);

-- ---------------------------------------------------------------------
-- profiles : lié 1-1 à auth.users, porte le rôle et le PIN
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id               uuid        NOT NULL,
  restaurant_id    uuid,
  nom              text        NOT NULL,
  prenom           text,
  role             text        DEFAULT 'gerant'::text,
  created_at       timestamptz DEFAULT now(),
  phone            text,
  email            text,
  ville            text,
  pin_hash         text,
  pin_attempts     integer     DEFAULT 0,
  pin_locked_until timestamptz,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- categories : catégories du menu par restaurant
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL,
  nom           text        NOT NULL,
  ordre         integer     DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- plats : plats et boissons du menu
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plats (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL,
  categorie_id  uuid,
  nom           text        NOT NULL,
  description   text,
  prix          numeric     NOT NULL,
  image_url     text,
  disponible    boolean     DEFAULT true,
  ordre         integer     DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  est_boisson   boolean     DEFAULT false,
  stock_actuel  integer     DEFAULT 0,
  stock_alerte  integer     DEFAULT 10,
  stock_actif   boolean     DEFAULT false,
  CONSTRAINT plats_pkey PRIMARY KEY (id),
  CONSTRAINT plats_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE,
  CONSTRAINT plats_categorie_id_fkey
    FOREIGN KEY (categorie_id) REFERENCES public.categories(id) ON DELETE SET NULL
);
-- NOTE FK (conforme prod, vérifié 2026-08-05) :
--   commandes.table_id      -> tables(id)     ON DELETE SET NULL
--   commandes.restaurant_id -> restaurants(id) ON DELETE CASCADE
--   commande_items.plat_id  -> plats(id)      ON DELETE SET NULL
--   commande_items.commande_id -> commandes(id) ON DELETE CASCADE
--   profiles.restaurant_id  -> restaurants(id) ON DELETE CASCADE

-- ---------------------------------------------------------------------
-- tables : tables physiques du restaurant
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tables (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL,
  numero        text        NOT NULL,
  capacite      integer     DEFAULT 4,
  zone          text        DEFAULT 'salle'::text,
  qr_code_url   text,
  actif         boolean     DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  statut        text        DEFAULT 'libre'::text,
  CONSTRAINT tables_pkey PRIMARY KEY (id),
  CONSTRAINT tables_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- commandes : commandes clients
-- ATTENTION : la colonne `total` est un cache peu fiable.
-- Règle projet : dériver les totaux depuis commande_items, jamais d'ici.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commandes (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL,
  table_id      uuid        NOT NULL,
  statut        text        DEFAULT 'en_attente'::text,
  mode_paiement text,
  paye          boolean     DEFAULT false,
  total         numeric     DEFAULT 0,
  note_client   text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  validated_at  timestamptz,
  served_at     timestamptz,
  CONSTRAINT commandes_pkey PRIMARY KEY (id),
  CONSTRAINT commandes_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE,
  CONSTRAINT commandes_table_id_fkey
    FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- commande_items : lignes de commande (SOURCE DE VÉRITÉ des totaux)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commande_items (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  commande_id   uuid        NOT NULL,
  plat_id       uuid        NOT NULL,
  nom_plat      text        NOT NULL,
  prix_unitaire numeric     NOT NULL,
  quantite      integer     DEFAULT 1,
  note          text,
  created_at    timestamptz DEFAULT now(),
  CONSTRAINT commande_items_pkey PRIMARY KEY (id),
  CONSTRAINT commande_items_commande_id_fkey
    FOREIGN KEY (commande_id) REFERENCES public.commandes(id) ON DELETE CASCADE,
  CONSTRAINT commande_items_plat_id_fkey
    FOREIGN KEY (plat_id) REFERENCES public.plats(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- appels_serveur : appels client -> serveur (bouton "appeler serveur")
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appels_serveur (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL,
  table_id      uuid        NOT NULL,
  traite        boolean     DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  type          text        DEFAULT 'serveur'::text,
  CONSTRAINT appels_serveur_pkey PRIMARY KEY (id),
  CONSTRAINT appels_serveur_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE,
  CONSTRAINT appels_serveur_table_id_fkey
    FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE CASCADE
);

-- =====================================================================
-- FONCTIONS & TRIGGERS
-- =====================================================================

-- ---------------------------------------------------------------------
-- update_updated_at : maintient commandes.updated_at à jour
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------
-- update_table_statut : SECURITY DEFINER pour contourner RLS quand un
-- client anonyme change le statut de sa table (libre/occupee).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_table_statut(table_id uuid, nouveau_statut text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE tables SET statut = nouveau_statut WHERE id = table_id;
END;
$function$;

-- ---------------------------------------------------------------------
-- decrementer_stock_insert : décrémente le stock boisson à l'INSERT
-- d'une commande déjà en statut valide/servi.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decrementer_stock_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.statut IN ('valide', 'servi') THEN
    UPDATE plats
    SET stock_actuel = GREATEST(0, stock_actuel - ci.quantite)
    FROM commande_items ci
    WHERE ci.commande_id = NEW.id
      AND ci.plat_id = plats.id
      AND plats.est_boisson = true
      AND plats.stock_actif = true;
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------
-- decrementer_stock_boisson : décrémente le stock boisson quand le
-- statut PASSE à valide/servi via UPDATE.
-- NOTE PROJET : coexistence avec decrementer_stock_insert -> risque de
-- double décrémentation à investiguer (voir handoff).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decrementer_stock_boisson()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF (NEW.statut IN ('valide', 'servi')) AND
     (OLD.statut IS NULL OR OLD.statut NOT IN ('valide', 'servi'))
  THEN
    UPDATE plats
    SET stock_actuel = GREATEST(0, stock_actuel - ci.quantite)
    FROM commande_items ci
    WHERE ci.commande_id = NEW.id
      AND ci.plat_id = plats.id
      AND plats.est_boisson = true
      AND plats.stock_actif = true;
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------
-- Triggers
-- (recréés de façon idempotente)
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_commandes_updated_at ON public.commandes;
CREATE TRIGGER trigger_commandes_updated_at
  BEFORE UPDATE ON public.commandes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_decrementer_stock_insert ON public.commandes;
CREATE TRIGGER trigger_decrementer_stock_insert
  AFTER INSERT ON public.commandes
  FOR EACH ROW EXECUTE FUNCTION public.decrementer_stock_insert();

DROP TRIGGER IF EXISTS trigger_decrementer_stock ON public.commandes;
CREATE TRIGGER trigger_decrementer_stock
  AFTER UPDATE ON public.commandes
  FOR EACH ROW EXECUTE FUNCTION public.decrementer_stock_boisson();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE public.restaurants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commandes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commande_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appels_serveur ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- restaurants
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Restaurants visibles correctement" ON public.restaurants;
CREATE POLICY "Restaurants visibles correctement" ON public.restaurants
  FOR SELECT TO public
  USING (
    (id IN (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()))
    OR (slug IS NOT NULL)
  );

DROP POLICY IF EXISTS "Permettre insertion restaurant" ON public.restaurants;
CREATE POLICY "Permettre insertion restaurant" ON public.restaurants
  FOR INSERT TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Restaurant visible par son gerant" ON public.restaurants;
CREATE POLICY "Restaurant visible par son gerant" ON public.restaurants
  FOR ALL TO public
  USING (id IN (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Modification restaurants avec admin" ON public.restaurants;
CREATE POLICY "Modification restaurants avec admin" ON public.restaurants
  FOR UPDATE TO public
  USING (
    (id IN (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()))
    OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'::text))
  );

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Profile visible par son proprietaire" ON public.profiles;
CREATE POLICY "Profile visible par son proprietaire" ON public.profiles
  FOR ALL TO public
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Insertion profil a linscription" ON public.profiles;
CREATE POLICY "Insertion profil a linscription" ON public.profiles
  FOR INSERT TO public
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Gerant voit son profil" ON public.profiles;
CREATE POLICY "Gerant voit son profil" ON public.profiles
  FOR SELECT TO public
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Gerant modifie son profil" ON public.profiles;
CREATE POLICY "Gerant modifie son profil" ON public.profiles
  FOR UPDATE TO public
  USING (id = auth.uid());

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Categories lisibles par tous" ON public.categories;
CREATE POLICY "Categories lisibles par tous" ON public.categories
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Categories modifiables par gerant" ON public.categories;
CREATE POLICY "Categories modifiables par gerant" ON public.categories
  FOR ALL TO public
  USING (restaurant_id IN (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()));

-- ---------------------------------------------------------------------
-- plats
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Plats lisibles par tous" ON public.plats;
CREATE POLICY "Plats lisibles par tous" ON public.plats
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Plats modifiables par gerant" ON public.plats;
CREATE POLICY "Plats modifiables par gerant" ON public.plats
  FOR ALL TO public
  USING (restaurant_id IN (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()));

-- ---------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Tables lisibles par tous" ON public.tables;
CREATE POLICY "Tables lisibles par tous" ON public.tables
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Tables modifiables par gerant" ON public.tables;
CREATE POLICY "Tables modifiables par gerant" ON public.tables
  FOR ALL TO public
  USING (restaurant_id IN (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()));

-- ---------------------------------------------------------------------
-- commandes
-- La policy SELECT inclut l'accès super_admin (voir tous les restos)
-- et l'accès anonyme (client QR, auth.uid() NULL + table_id non nul).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Commandes creables par tous" ON public.commandes;
CREATE POLICY "Commandes creables par tous" ON public.commandes
  FOR INSERT TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Commandes visibles correctement" ON public.commandes;
CREATE POLICY "Commandes visibles correctement" ON public.commandes
  FOR SELECT TO public
  USING (
    (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'::text))
    OR (restaurant_id IN (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()))
    OR ((auth.uid() IS NULL) AND (table_id IS NOT NULL))
  );

DROP POLICY IF EXISTS "Commandes modifiables par gerant" ON public.commandes;
CREATE POLICY "Commandes modifiables par gerant" ON public.commandes
  FOR UPDATE TO public
  USING (restaurant_id IN (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()));

-- ---------------------------------------------------------------------
-- commande_items
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Items creables par tous" ON public.commande_items;
CREATE POLICY "Items creables par tous" ON public.commande_items
  FOR INSERT TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Items visibles correctement" ON public.commande_items;
CREATE POLICY "Items visibles correctement" ON public.commande_items
  FOR SELECT TO public
  USING (
    (commande_id IN (
      SELECT commandes.id FROM commandes
      WHERE commandes.restaurant_id IN (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid())
    ))
    OR ((auth.uid() IS NULL) AND (commande_id IN (
      SELECT commandes.id FROM commandes WHERE commandes.table_id IS NOT NULL
    )))
  );

-- ---------------------------------------------------------------------
-- appels_serveur
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Appels creables par tous" ON public.appels_serveur;
CREATE POLICY "Appels creables par tous" ON public.appels_serveur
  FOR INSERT TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Appels lisibles correctement" ON public.appels_serveur;
CREATE POLICY "Appels lisibles correctement" ON public.appels_serveur
  FOR SELECT TO public
  USING (
    (restaurant_id IN (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()))
    OR (auth.uid() IS NULL)
  );

DROP POLICY IF EXISTS "Appels modifiables par gerant" ON public.appels_serveur;
CREATE POLICY "Appels modifiables par gerant" ON public.appels_serveur
  FOR UPDATE TO public
  USING (restaurant_id IN (SELECT profiles.restaurant_id FROM profiles WHERE profiles.id = auth.uid()));

-- =====================================================================
-- FIN DE LA BASELINE
-- =====================================================================