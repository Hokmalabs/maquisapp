# Base de données MaquisApp

Schéma Postgres géré via Supabase, avec Row Level Security activée sur les
tables métier.

---

## Tables principales

### `profiles`
Table liée 1-1 à `auth.users`. Contient les infos user + relation resto.

Colonnes clés :
- `id` (uuid, FK auth.users)
- `restaurant_id` (uuid, FK restaurants)
- `role` : `'super_admin' | 'gerant' | 'serveur'`
- `prenom`, `nom`, `ville`
- `phone` (E.164 avec 0 initial pour la CI)
- `pin_hash` (bcrypt)

### `restaurants`
Un restaurant = un compte client.

Colonnes clés :
- `id` (uuid)
- `nom`, `slug` (utilisé dans URL menu)
- `ville`, `logo_url`
- `abonnement_statut` : `'essai' | 'actif' | 'suspendu' | 'expire'`
- `abonnement_plan` : `'mensuel' | 'annuel'`
- `abonnement_fin` (timestamptz)

### `categories`
Catégories du menu par resto.

- `id`, `restaurant_id`, `nom`, `ordre`

### `plats`
Plats et boissons du menu.

Colonnes clés :
- `id`, `restaurant_id`, `categorie_id`
- `nom`, `prix`, `image_url`
- `disponible` (boolean)
- `est_boisson` (boolean)
- `stock_actif`, `stock_actuel`, `stock_alerte` (pour boissons suivies)

### `tables`
Tables physiques du restaurant.

- `id`, `restaurant_id`
- `numero`, `zone` (ex: Salle / Terrasse)
- `statut` : `'libre' | 'occupee'`
- `actif` (boolean)
- QR code généré à partir de `slug` + `id`

### `commandes`
Commandes clients.

Colonnes clés :
- `id`, `restaurant_id`, `table_id`
- `statut` : voir cycle de vie dans ARCHITECTURE.md
- `total` (⚠️ **cache client peu fiable, dériver de commande_items**)
- `mode_paiement` : `'especes' | 'wave' | 'orange_money' | 'mtn_money' | 'moov'`
- `paye` (boolean)
- `created_at`

### `commande_items`
Lignes de commande (source de vérité pour les totaux).

- `id`, `commande_id`, `plat_id`
- `nom_plat`, `prix_unitaire`, `quantite`
- `note` (texte libre pour instructions cuisine)

---

## Row Level Security (RLS)

RLS activée sur : `restaurants`, `profiles`, `plats`, `categories`, `tables`,
`commandes`, `commande_items`.

### Pattern général
- `SELECT` filtré par `restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())`
- `INSERT` / `UPDATE` / `DELETE` restreint au propriétaire du resto
- Exception `super_admin` : voit tout (voir ADR 002)

### Policy `commandes` SELECT (actuelle)
Trois cas :
1. `super_admin` voit tout
2. Owner du resto voit ses commandes
3. Anonyme (client scanne QR) voit les commandes de sa table

Voir migration `supabase/migrations/20260520_admin_can_see_all_orders.sql`.

---

## RPCs (fonctions Postgres)

### `update_table_statut(table_id uuid, nouveau_statut text)`
SECURITY DEFINER. Utilisée pour contourner RLS quand un client anonyme
change le statut de sa table à la clôture.

À utiliser systématiquement au lieu d'un `UPDATE tables` direct.

---

## Migrations

Convention : `supabase/migrations/YYYYMMDD_description.sql`

Migrations passées :
- `20260520_admin_can_see_all_orders.sql` — policy SELECT super_admin sur commandes

Pour créer une nouvelle migration :
```bash
supabase migration new nom_de_la_migration
```

---

## Backups

- Supabase Pro backups automatiques : voir dashboard Supabase
- Backup manuel avant grosse migration :
  Dashboard → Database → Backups → Create backup

---

## Extensions Postgres activées

- `pgcrypto` (pour `crypt()` et `gen_salt()` sur les PINs)
- `uuid-ossp` (génération UUID)

---

## Requêtes diagnostiques utiles

Voir `handoff/SECRETS.md` pour les identifiants à utiliser.
Les requêtes concrètes utiles au débogage sont documentées cas par cas
dans le CHANGELOG.
