# 004 — Totaux commande depuis commande_items

**Date :** 2026-05
**Statut :** Accepted

## Contexte

La table `commandes` a une colonne `total` calculée côté client au moment
de la création de la commande. Cette valeur s'est révélée peu fiable :
- Bugs de multiplication de quantité (realtime channel qui fire plusieurs
  fois côté client)
- Décalage possible entre `total` et la somme réelle des items
- Calculs incohérents entre pages qui affichent la même commande

## Options envisagées

### Option A — Fixer les bugs qui altèrent commandes.total
- Avantages : garder une colonne cache pour la performance
- Inconvénients : bugs récurrents, source de vérité peu claire

### Option B — Ignorer commandes.total, dériver systématiquement de commande_items
- Avantages : source de vérité unique, jamais faux
- Inconvénients : SUM à chaque affichage, coût BDD léger

### Option C — Trigger Postgres qui recalcule commandes.total à chaque write
- Avantages : cache toujours à jour
- Inconvénients : complexité, trigger à maintenir, silent bugs si trigger casse

## Décision

**Option B.** Règle : **toujours calculer le total depuis `commande_items`,
jamais depuis `commandes.total`.**

En pratique côté client :
```javascript
const total = commande.commande_items.reduce(
  (sum, item) => sum + (item.prix_unitaire * item.quantite), 0
)
```

Le champ `commandes.total` reste rempli pour compatibilité mais **ne doit
plus être lu** par le code.

## Conséquences

### Positives
- Source de vérité unique et fiable
- Élimine toute une catégorie de bugs "j'ai payé X mais l'app dit Y"

### Négatives
- Requiert de charger `commande_items` chaque fois qu'on veut le total
  (déjà fait dans la plupart des queries)
- SUM côté client (négligeable pour < 20 items par commande)

### Ce qu'on surveille
- À terme, supprimer complètement `commandes.total` ou le convertir en colonne
  calculée (GENERATED ALWAYS AS ... STORED)
- Vérifier que tous les endroits du code respectent la règle (audit du repo
  au prochain refactor commandes)
