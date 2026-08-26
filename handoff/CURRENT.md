# État actuel — MaquisApp

**Dernière session :** Assainissement des fondations + fix expiration essai +
isolation du chantier multi-resto

---

## Contexte de la session

Reprise du projet après une période où le travail a avancé avec un autre outil
(chantier multi-resto entamé). Cette session a servi à assainir les fondations
et remettre le dépôt dans un état sain.

## Ce qui a été fait

### Fondations de versionnement (assainies pour la première fois)
- Baseline schéma versionnée : le schéma réel de la prod (8 tables, FK vérifiées,
  RLS + 21 policies, 4 fonctions, 3 triggers) était non tracé. Capturé dans
  `supabase/migrations/20260805_baseline_schema.sql`.
- Historique de migrations réconcilié : `20260520`, `20260805`, `20260805120000`
  marqués `applied` via `supabase migration repair`.
- Capture faite via requêtes SQL Studio (Docker indisponible, `db pull`/`db dump`
  écartés).

### Bug corrigé : expiration des essais (inscription téléphone)
- Cause : le flow `verify-otp` (CAS B) créait les restaurants sans `abonnement_fin`,
  contrairement au flow Google → essais éternels.
- Fix : `verify-otp` pose désormais email, ville, `abonnement_statut='essai'`,
  `abonnement_fin=+14j`, `abonnement_plan=null` (constante `TRIAL_DAYS=14`).
  Déployé en prod, validé sur compte test.
- Rattrapage : 8 comptes "essai éternel" régularisés via migration
  `20260805120000_rattrapage_essais_sans_fin.sql`.

### Nettoyage
- Compte fantôme "Restaurant de Ruyan" supprimé (ligne restaurants orpheline).
- Procédure de suppression de compte clarifiée : supprimer `restaurants` d'abord
  (cascade vers profil/données), puis `auth.users` dans Studio. Jamais l'inverse.
- Fichiers `_debug_*.txt` supprimés, `.gitignore` renforcé.

### Isolation du chantier multi-resto
- Le travail multi-resto (memberships, RLS, onboarding) avait été committé
  directement sur `main` en local, non pushé, hors workflow.
- Isolé sur la branche `feature/multi-resto` (6 commits). `main` et `develop`
  remis à l'état prod (`32f70f0`).
- Chantier GELÉ : à reprendre après les sprints actuels.

---

## État du dépôt

- `develop` = `main` = `origin/main` = `32f70f0` (état prod)
- `feature/multi-resto` = `a945b9d` (6 commits au-dessus, chantier gelé)
- Working tree clean

---

## Chantiers EN PAUSE

- **Refonte back-office admin** : maquette de structure validée (sidebar +
  sous-routes : Vue d'ensemble, Restaurants, Abonnements, Revenus, Utilisateurs,
  Support, Logs ; priorité au cycle de vie abonnement). À reprendre plus tard.
- **Multi-resto** : gelé sur `feature/multi-resto`.

---

## Prochain chantier : 2 retours terrain (resto "L'Assiette Savoureuse de PM")

### Retour 1 — Regroupement dans l'Historique
Les commandes multiples d'une même table sont regroupées dans l'écran "Commandes"
mais réapparaissent éclatées ligne par ligne dans "Historique" après encaissement.
Objectif : regrouper l'historique par table/session comme l'écran Commandes.
- Pas de `session_id` en base ; les commandes d'une table ne sont liées que par
  `table_id`. L'écran Commandes regroupe en mémoire (fonction `grouperParTable`).
  Appliquer la même logique à l'historique (grouper les clôturées par table + temps).

### Retour 2 — Rapport de ventes par article
Le resto veut les quantités vendues par article sur une période (ex : 15 Beaufort,
5 poulet), avec quantité + montant, et idéalement un graphique du top des ventes.
- Agrégation sur `commande_items` (SUM quantite, GROUP BY nom_plat, filtré période).
  Pur ajout, lecture seule, aucun risque.

### ⚠️ Cause commune (dette à corriger)
L'écran Historique (`src/app/dashboard/historique/page.js`) lit `commandes.total`
directement, au lieu de dériver depuis `commande_items` — interdit par CLAUDE.md.
L'écran Commandes recalcule bien depuis `commande_items` avant clôture (fonction
`ouvrirGroupe`), pas l'Historique. Les deux retours se traitent au même endroit.

Fichiers clés :
- `src/app/dashboard/historique/page.js` (413 l.) — requête L124-146, lit `commandes.total`
- `src/app/dashboard/commandes/page.js` — clôture : `changerStatut`, `cloturerTout`, `ouvrirGroupe`
- `src/app/dashboard/page.js` — commande manuelle : `envoyerCmdManuelle` L250-267, `grouperParTable`

Ordre proposé : Retour 2 d'abord (simple, sans risque), puis Retour 1.
