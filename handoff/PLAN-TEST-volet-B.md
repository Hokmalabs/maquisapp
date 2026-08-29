# Plan de test — Volet B (tarifs multiples par table)

Ordre : sauvegarde → migration → vérifs SQL → tests fonctionnels → rollback testé.
Cible : Studio (Docker indisponible). Ne rien exécuter en prod avant preview.

## 0. Avant migration
- [ ] Backup Supabase (Dashboard → Database → Backups → Create backup).
- [ ] Re-mesurer l'état d'O'Saveur 2 Tina : `SELECT COUNT(*) FROM plats WHERE restaurant_id = 'b22d3a13-5e63-4ab7-aa5a-e73d80153b76';` → attendu 17.
- [ ] Confirmer qu'aucune colonne `tarif_ordre` / `tarif_id` / table `plat_tarifs` n'existe déjà.

## 1. Migration (Studio SQL Editor)
- [ ] Exécuter `20260829_add_plat_tarifs.sql` d'un bloc. Doit finir sur COMMIT sans erreur.
- [ ] `supabase migration repair --status applied 20260829` pour réconcilier l'historique.

## 2. Vérifications structurelles (SQL)
- [ ] `plat_tarifs` existe, colonnes conformes, contraintes `plat_tarifs_plat_ordre_uniq`, checks présents.
- [ ] `tables.tarif_ordre` existe, NOT NULL, DEFAULT 1.
- [ ] `commande_items.tarif_id` existe, nullable, FK SET NULL.
- [ ] Les 3 requêtes de vérif en pied de migration renvoient toutes **0**.

## 3. Tests de données (backfill)
- [ ] Nombre de `plat_tarifs` ordre=1 == nombre de `plats` (global).
- [ ] Pour O'Saveur : 17 plats → 17 tarifs ordre=1, chaque `prix` == `plats.prix`.
- [ ] Toutes les tables existantes ont `tarif_ordre = 1`.

## 4. Tests fonctionnels — mono-prix (non-régression, prioritaire)
Sur un resto mono-prix (O'Saveur), AUCUN comportement ne doit changer tant que le
front n'est pas modifié. Le backfill seul ne doit rien casser.
- [ ] Menu (CRUD) : liste des plats identique, prix identiques.
- [ ] Commande manuelle : ajout d'un plat, total correct (dérivé commande_items, ADR 004).
- [ ] Clôture + historique : montants inchangés.
- [ ] Menu public QR : prix affichés inchangés.
- [ ] Stock boisson : décrément d'une boisson `stock_actif` fonctionne comme avant.

## 5. Tests fonctionnels — multi-prix (après implémentation front, itération suivante)
_À exécuter quand le CRUD menu et la commande manuelle consommeront plat_tarifs._
- [ ] Créer un 2e tarif (ordre=2, prix différent) sur un plat via le CRUD.
- [ ] Régler une table sur `tarif_ordre = 2`.
- [ ] Commande sur cette table : le plat multi-tarif prend le prix ordre=2 ; `commande_items.tarif_id` pointe le bon tarif ; `prix_unitaire` == prix ordre=2.
- [ ] Même commande, un plat mono-prix (ordre 1 seulement) : **repli sur ordre 1** appliqué, pas d'erreur, prix de base.
- [ ] Table `tarif_ordre = 1` : tous les plats au prix ordre 1.
- [ ] Total commande = somme prix_unitaire × quantité, cohérent avec les tarifs appliqués.

## 6. RLS
- [ ] Anonyme (client QR) : peut SELECT `plat_tarifs` (menu public lisible).
- [ ] Gérant resto A : peut créer/modifier/supprimer un tarif d'un plat de A.
- [ ] Gérant resto A : NE PEUT PAS écrire un tarif d'un plat du resto B (WITH CHECK bloque).

## 7. Suppression de tarif (intégrité historique)
- [ ] Créer une commande avec `tarif_id` = T.
- [ ] Supprimer le tarif T.
- [ ] `commande_items.tarif_id` passe à NULL ; `prix_unitaire` et `nom_plat` intacts ; total historique inchangé.

## 8. Rollback (à valider sur env non-prod)
La migration est additive. Rollback = drop des ajouts, sans perte de données legacy :
```sql
BEGIN;
ALTER TABLE public.commande_items DROP COLUMN IF EXISTS tarif_id;
ALTER TABLE public.tables DROP COLUMN IF EXISTS tarif_ordre;
DROP TABLE IF EXISTS public.plat_tarifs;
COMMIT;
```
- [ ] Après rollback : `plats`, `commande_items` (hors colonne ajoutée), `tables` (hors colonne ajoutée) intacts ; l'app mono-prix refonctionne comme avant Volet B.

## Hors périmètre (rappels)
- Fusion des doublons des AUTRES restos (Beaufort/Bock/Castel…) : procédure manuelle dédiée.
- Correction du double-décrément de stock (2 triggers sur `commandes`) : chantier distinct.
- Front CRUD multi-tarif + Volet C (card commande) : itérations suivantes, un prompt = un test = un commit.