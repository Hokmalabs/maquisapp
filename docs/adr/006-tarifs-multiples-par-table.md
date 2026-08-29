# 006 — Tarifs multiples par article, appliqués via la table

**Date :** 2026-08-29
**Statut :** Accepted

## Contexte

Aujourd'hui un article (`plats`) porte un prix unique dans `plats.prix`. Les restaurants qui pratiquent deux tarifs pour un même article (par exemple un prix « intérieur » et un prix « extérieur/terrasse ») n'ont aucun moyen de le modéliser : ils **dupliquent la ligne `plats`**, une par prix, distinguées par `categorie_id`.

Cette duplication a deux conséquences néfastes, observées dans les données de production :

1. **Stock éclaté et faux.** Le champ `stock_actuel` vit sur `plats`. Un même article physique existant en deux lignes porte donc deux compteurs de stock indépendants. Une boisson vendue tantôt au prix 1, tantôt au prix 2, voit son inventaire réparti sur deux lignes : le stock réel devient impossible à lire. C'est la cause directe du « bug de stock boisson dupliqué ».
2. **Menu encombré.** Le même article apparaît plusieurs fois dans le CRUD menu et dans le menu public.

Un audit ciblé a mesuré le restaurant pilote O'Saveur 2 Tina (`b22d3a13-…`) : 17 plats, 17 noms distincts, **zéro doublon**. Ce restaurant est intégralement en mono-prix. Les doublons observés ailleurs (Beaufort, Bock, Castel à deux ou trois prix) appartiennent à d'autres restaurants et seront traités au cas par cas, hors de cette migration.

Par ailleurs, deux flux connaissent **toujours la table avant les prix** :

- **Commande manuelle** : le gérant sélectionne la table, puis compose la commande.
- **Menu public QR** : le client scanne le QR d'une table précise.

Cette propriété est le levier central de la décision : si le niveau de tarif est porté par la table, le prix cesse d'être un choix à la commande (donc non manipulable, non oubliable) et devient une conséquence déterministe de la table. Le même mécanisme résout d'un coup la présélection côté gérant et l'affichage du bon prix côté client QR.

## Décision

Introduire une table `plat_tarifs` de 1..N tarifs **ordonnés** par article, et porter le **niveau de tarif applicable sur la table** via `tables.tarif_ordre`. Le tarif appliqué à une ligne de commande est déterminé par la table, avec repli sur l'ordre 1.

Le prix n'est jamais saisi à la commande : il est sélectionné parmi des tarifs pré-enregistrés. `commande_items.prix_unitaire` reste la source de vérité pour les totaux (ADR 004) ; sa valeur est **dérivée** du tarif appliqué, jamais frappée à la main.

### Modèle cible

- **`plats`** — pivot inchangé. Conserve `stock_actuel`, `stock_actif`, `stock_alerte` : le stock redevient **unique par article physique**, ce qui résout par construction la duplication de stock. `plats.prix` est **conservé en champ legacy / fallback**, comme `commandes.total` (ADR 004) : on ne le supprime pas tant qu'un lecteur existe.

- **`plat_tarifs`** (nouvelle) :
  - `id uuid` PK
  - `plat_id uuid NOT NULL` FK `plats(id) ON DELETE CASCADE`
  - `prix numeric NOT NULL`
  - `ordre int NOT NULL` (1, 2, 3…)
  - `actif boolean NOT NULL DEFAULT true`
  - unicité `(plat_id, ordre)`

  Un article mono-prix a **une** ligne, `ordre = 1`. Le bouton « ajouter un prix » du CRUD menu insère `ordre = 2`, etc. **Aucun libellé n'est stocké** : le tarif est identifié par son ordre. L'UI affiche « Prix 1 », « Prix 2 » dérivés de `ordre`.

- **`tables`** — `+ tarif_ordre int NOT NULL DEFAULT 1`. Détermine quel `plat_tarifs.ordre` s'applique aux commandes de cette table. Fixé **manuellement** par le gérant à la création/édition de la table.

- **`commande_items`** — `+ tarif_id uuid NULL` FK `plat_tarifs(id) ON DELETE SET NULL`. Mémorise le tarif effectivement appliqué (après repli éventuel). `prix_unitaire` (existant) reste le snapshot, source de vérité ADR 004. `nom_plat` et `note` (existants) inchangés.

### Règle d'application du tarif

Pour une ligne de commande d'un plat P sur une table T :

1. Soit `n = T.tarif_ordre`.
2. Si un `plat_tarifs` actif existe pour P avec `ordre = n`, il est appliqué.
3. **Sinon, repli sur l'`ordre = 1`** (prix de base). Un article mono-prix coûte donc le même prix quelle que soit la table ; seuls les articles réellement multi-tarifs varient.

Cette règle est appliquée **côté application** (lecture du bon tarif au moment de composer la commande). `prix_unitaire` et `tarif_id` sont figés dans `commande_items` à l'insertion.

## Invariants

1. **L'ordre d'un tarif est stable et signifiant à l'échelle du restaurant.** Le tarif `ordre = 2` désigne le même niveau tarifaire sur tous les plats d'un même restaurant. Sans cet invariant, ni la présélection par table ni le menu public QR ne sont cohérents. C'est l'invariant central de cette ADR.
2. Le prix appliqué à une commande provient toujours d'un `plat_tarifs` pré-enregistré ou du fallback ordre 1 ; il n'est jamais saisi librement à la commande.
3. `commande_items.prix_unitaire` reste la source de vérité des totaux (ADR 004). `plats.prix`, `plat_tarifs.prix` et `commandes.total` ne le sont pas.
4. Le stock reste porté par `plats`, unique par article. Aucun tarif ne crée de compteur de stock distinct.
5. La migration est **strictement additive** : aucune colonne, ligne ou contrainte existante n'est supprimée ni rendue plus restrictive.
6. Supprimer un tarif (`plat_tarifs`) ne casse jamais l'historique : `commande_items.tarif_id` passe à `NULL` (`ON DELETE SET NULL`), `prix_unitaire` reste intact.

## Options rejetées

### Option A — Continuer à dupliquer les lignes `plats`
- Avantage : aucun changement de schéma.
- Rejet : c'est la cause du bug de stock éclaté et de l'encombrement du menu. Ne passe pas à l'échelle.

### Option B — Tarif choisi manuellement à chaque commande
- Avantage : flexibilité maximale, pas de lien table↔tarif.
- Rejet : le prix devient manipulable par le gérant à chaque commande et oubliable ; ne résout pas l'affichage du prix côté client QR (le client ne « choisit » pas). La table connaît déjà le contexte : autant s'en servir.

### Option C — Accompagnements structurés (table dédiée + snapshot)
- Avantage : liste cochable propre pour la cuisine, extensible au payant.
- Rejet : un accompagnement payant est en réalité un article du menu, ajouté au panier par le flux normal. Le besoin « préciser une cuisson / une variante gratuite » est déjà couvert par `commande_items.note` (existant). Table et colonne dédiées = dette anticipée pour un besoin inexistant. **Abandonné.**

### Option D — Libellés de tarifs libres (« Salle », « Terrasse »)
- Avantage : lisibilité à la saisie.
- Rejet : les restaurants nomment leurs emplacements différemment ; un libellé libre réintroduit de l'incohérence et complique le lien table↔tarif. L'ordinal (Prix 1/2/N) suffit et garantit l'invariant 1. Porte laissée ouverte : un `nom` **nullable** pourra être ajouté plus tard en migration additive si le besoin de lisibilité émerge, sans rien casser.

### Option E — Déduire le tarif de `tables.zone`
- Avantage : « automatique » en apparence.
- Rejet : `zone` est un texte libre. Le déduire obligerait à structurer les zones. `tarif_ordre` explicite et manuel est plus simple et plus robuste.

## Conséquences

### Positives
- Stock unique par article : le bug de stock dupliqué disparaît par construction.
- Le prix devient déterministe et non manipulable : conséquence de la table, pas choix à la commande.
- Le menu public QR est nativement compatible : il lira `tarif_ordre` de la table scannée. Aucun ajout de schéma futur nécessaire pour cette fonctionnalité.
- Historique immunisé contre les évolutions de menu (snapshots + FK nullable).
- Migration additive : rollback non destructif, cohabitation avec le code legacy.

### Négatives / à surveiller
- L'invariant « ordre stable par restaurant » n'est pas contraint par la base ; il repose sur la discipline de saisie et l'UI du CRUD menu. À encadrer côté application (le CRUD doit présenter les tarifs dans l'ordre et empêcher les trous d'ordre).
- Le repli sur l'ordre 1 est un choix produit : un plat sans tarif d'ordre `n` n'est pas « indisponible » sur cette table, il est vendu au prix de base. À documenter pour les gérants.
- Le double-décrément de stock (deux triggers sur `commandes`) **n'est pas corrigé par cette ADR**. Il est indépendant du multi-prix et sera traité séparément. Cette ADR ne modifie aucun trigger.
- Les restaurants à doublons existants (hors O'Saveur 2 Tina) devront être fusionnés manuellement (choisir la ligne gagnante, réconcilier le stock, créer un tarif par prix, re-router les `plat_id`). Hors périmètre de cette migration ; procédure dédiée au cas par cas.

## Portée de la migration associée

- Crée `plat_tarifs`.
- Ajoute `tables.tarif_ordre` (DEFAULT 1).
- Ajoute `commande_items.tarif_id` (nullable, SET NULL).
- **Backfill** : pour chaque `plats` existant, insère un `plat_tarifs` `ordre = 1`, `prix = plats.prix`, `actif = true`. Toutes les `tables` existantes gardent `tarif_ordre = 1` par le DEFAULT.
- Ne supprime rien. Ne modifie aucun trigger, aucune fonction, aucune policy existante.

RLS des nouvelles tables : à définir dans la migration en cohérence avec le pattern existant (lecture publique du menu, écritures restreintes au restaurant propriétaire). Voir en-tête de la migration.

## Critère d'acceptation

ADR acceptée le 2026-08-29 pour autoriser la migration additive `plat_tarifs` + `tables.tarif_ordre` + `commande_items.tarif_id` et son backfill. N'autorise pas la fusion des doublons des autres restaurants (procédure distincte), ni la correction des triggers de stock (chantier distinct).