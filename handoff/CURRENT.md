# MaquisApp — État courant du chantier
_Dernière mise à jour : 29 août 2026_

## Dernier chantier terminé : Volet B — tarifs multiples par table (ADR 006)

Terminé et committé sur `develop` (5 commits front + 1 commit db/docs). **Non
mergé sur `main`.** Détail complet dans `handoff/CHANGELOG.md`.

Principe : un article = 1 stock unique + 1..N tarifs ordonnés (Prix 1, 2…). Le
prix appliqué est déterminé par `tables.tarif_ordre` (repli sur Prix 1). Le prix
n'est jamais saisi à la commande. `commande_items.prix_unitaire` reste la source
de vérité (ADR 004). Cohérent de bout en bout : CRUD menu, réglage table,
commande manuelle, menu public QR.

### FAIT et committé (branche develop)
- Migration `20260829_add_plat_tarifs.sql` (additive, appliquée via Studio) :
  `plat_tarifs`, `tables.tarif_ordre`, `commande_items.tarif_id`. Backfill vérifié
  (373 plats → 373 tarifs ordre 1, 0 écart).
- ADR `docs/adr/006-tarifs-multiples-par-table.md` (Accepted).
- `dashboard/menu/page.js` : CRUD multi-tarif (bouton +prix, upsert par ordre).
- `dashboard/tables/page.js` : sélecteur niveau de prix (conditionnel multi-tarif).
- `dashboard/page.js` : commande manuelle, prix résolu par table + tarif_id.
- `menu/[slug]/[tableId]/page.js` : prix par table côté client + calculerVraiTotal
  corrigé (dérive de commande_items.prix_unitaire, plus de plats(prix)).

### Effet de bord positif
Le stock redevient unique par article → le bug de stock boisson dupliqué
disparaît par construction (article multi-prix = 1 ligne plats + N tarifs).

## Chantier précédent (déjà fait, rappel) : Volet A — desktop responsive
7 pages dashboard migrées vers RestaurantContext + surcouche desktop @900px,
bottom-nav centralisée. Voir CHANGELOG. **Bug P1 hydration post-login toujours
ouvert** (voir Tickets ci-dessous).

## Tickets ouverts

### P1 — Bug hydration au premier chargement post-login (BLOQUANT PROD)
Après connexion, premier rendu du dashboard en état hybride cassé (sidebar
desktop OK mais contenu accueil en mode mobile). Un Ctrl+Shift+R corrige.
Contournement = hard refresh, PAS une correction. Le client en prod le subira.
→ Piste : lire l'erreur console EXACTE sur l'écran cassé ("Text content does not
match server-rendered HTML") AVANT tout fix. Ne pas fixer à l'aveugle.

### Refonte desktop du menu public QR — À FAIRE
`menu/[slug]/[tableId]/page.js` n'a jamais eu sa refonte desktop responsive.
Reste en `maxWidth: 430` mobile. Le multi-tarif y est branché (logique OK), mais
le layout desktop de la maquette (grille cards + panier latéral) reste à faire.
Priorité modérée : le menu public est scanné au téléphone à ~99 %.

### Auth desktop (Étape 3 Volet A) — REPORTÉ
Voir historique CURRENT précédent. `auth/page.js` porte le vrai stepper login/PIN ;
ne pas régénérer à l'aveugle (grep "Code PIN" pour trouver le bon fichier).

### Dette non bloquante
- Doublons multi-prix des AUTRES restos (Beaufort/Bock/Castel de l'échantillon) :
  à fusionner au cas par cas. Procédure manuelle, hors Volet B.
- Double-décrément stock : 2 triggers sur `commandes` (`decrementer_stock_insert`
  + `decrementer_stock_boisson`). Le second retape sur transition valide→servi.
  Non corrigé, indépendant du multi-tarif.
- `theme.js` créé mais chaque page a encore son objet `C` local — à propager.
- `@import` Google Fonts encore présent sur pages hors dashboard (dont menu public).
- Next 14.2.35 outdated (upgrade 14→15 à planifier).

## Reste à faire avant merge main
1. **Corriger le bug P1** (hydration post-login) — bloquant prod.
2. Validation preview complète sur le vrai PC client (Vercel preview de develop) :
   parcourir dashboard desktop + tester multi-tarif bout en bout.
3. **Merge develop → main** (fast-forward). ⚠️ Le merge emporte un GROS lot :
   Volet A (desktop responsive), chantier retours terrain, ET Volet B. Tester
   la preview en entier avant le fast-forward. Ne pas merger à l'aveugle.