## Session — Volet B : tarifs multiples par article, appliqués via la table (ADR 006)

Objectif : un article = un stock unique + 1..N tarifs ordonnés (Prix 1, 2…), le
prix appliqué étant déterminé par la table (`tables.tarif_ordre`), avec repli sur
Prix 1. Résout la duplication de lignes `plats` pour gérer plusieurs prix et le
stock éclaté qui en découlait.

### Décisions (ADR 006, Accepted 2026-08-29)
- Tarifs **ordinaux sans libellé** (Prix 1, 2…), ordre stable et signifiant par
  restaurant (invariant central : l'ordre N désigne le même niveau sur tous les
  plats d'un resto).
- Le prix n'est **jamais saisi à la commande** : il est sélectionné parmi des
  tarifs pré-enregistrés → non manipulable. `commande_items.prix_unitaire` reste
  la source de vérité (ADR 004), dérivée du tarif appliqué.
- **Repli** : si un plat n'a pas le tarif d'ordre demandé, il retombe sur Prix 1.
  Un plat mono-prix coûte donc pareil partout.
- **Accompagnements abandonnés** : besoin cuisine couvert par `commande_items.note`
  (existant). Un accompagnement payant = un article du menu normal.
- Lien table→tarif **manuel et non obligatoire** : `tarif_ordre` défaut 1, le
  sélecteur n'apparaît que si le resto a réellement plus d'un tarif.

### Migration (additive, appliquée via Studio — Docker indispo)
`supabase/migrations/20260829_add_plat_tarifs.sql` :
- Table `plat_tarifs` (id, plat_id FK CASCADE, prix, ordre, actif ;
  UNIQUE(plat_id, ordre)).
- `tables.tarif_ordre int NOT NULL DEFAULT 1`.
- `commande_items.tarif_id uuid NULL` FK `plat_tarifs` ON DELETE SET NULL
  (supprimer un tarif ne casse pas l'historique).
- Backfill : 1 tarif ordre=1 par plat depuis `plats.prix`. Vérifs post-migration :
  373 plats → 373 tarifs ordre=1, 0 écart de prix, 0 table < tarif_ordre 1.
- RLS `plat_tarifs` calquée sur le pattern réel de `plats` (SELECT public,
  écriture par restaurant proprio via plat_id→plats.restaurant_id).
- `plats.prix` conservé en legacy/fallback (comme `commandes.total`).

### Front (5 commits, un par fichier)
- **menu** (`dashboard/menu/page.js`) : CRUD multi-tarif. Champ « Prix 1 » +
  bouton « + Ajouter un prix », upsert `plat_tarifs` par (plat_id, ordre) —
  conserve les id des tarifs gardés (historique préservé), supprime les ordres
  retirés. Card : « À partir de {min} » + badge « N prix » si multi, prix sec
  sinon. Multi-tarif autorisé sur les boissons (stock unique).
- **tables** (`dashboard/tables/page.js`) : sélecteur « Niveau de prix » visible
  seulement si `maxTarif > 1` (mono-prix = modale inchangée). Badge « Prix N » sur
  la card si tarif_ordre > 1.
- **commande manuelle** (`dashboard/page.js`) : `resoudreTarif` selon la table
  choisie, prix résolu affiché (pas de sélecteur, pas de « à partir de »), écrit
  `tarif_id`. Total minimal inchangé (prix panier déjà résolus).
- **menu public QR** (`menu/[slug]/[tableId]/page.js`) : prix résolu selon
  `table.tarif_ordre` de la table scannée. Correction dette ADR 004 :
  `calculerVraiTotal` dérive désormais de `commande_items.prix_unitaire` (snapshot),
  plus de jointure `plats(prix)`. **Refonte desktop NON faite** (chantier à part).

### Effet de bord positif
Le stock redevient **unique par article** : le bug de stock boisson dupliqué
disparaît par construction dès qu'on modélise un article multi-prix comme une
seule ligne `plats` + N tarifs (au lieu de N lignes `plats`).

### Hors périmètre / à suivre
- **Refonte desktop menu public** (maquette grille cards + panier latéral) — à faire.
- **Volet C** : card-plat commande manuelle desktop, consomme le schéma en place.
- **Fusion des doublons multi-prix des AUTRES restos** (Beaufort/Bock/Castel de
  l'échantillon) : procédure manuelle au cas par cas, non traitée.
- **Double-décrément stock** (2 triggers sur `commandes`) : indépendant, non corrigé
  ici. Rappel : `decrementer_stock_boisson` retape sur transition valide→servi.

## Session du 29 août 2026 — Refonte desktop dashboard (Volet A, Étape 4)

- feat(dashboard): accueil desktop responsive (sidebar, topbar, graphe ventes 7j, CA dérivé commande_items) [22ea15e]
- feat(dashboard): RestaurantContext partagé dans le layout dashboard [0c7b7cb]
- feat(dashboard): parametres desktop responsive + conso RestaurantContext [ac2e952]
- feat(dashboard): stock desktop responsive + userId exposé via RestaurantContext [9821d8f]
- feat(dashboard): tables desktop responsive + conso RestaurantContext [85cecb1]
- feat(dashboard): historique desktop responsive + conso RestaurantContext [c3b87d2]
- feat(dashboard): menu desktop responsive (grille 2 col) + conso RestaurantContext
- feat(dashboard): commandes desktop responsive + conso RestaurantContext
- refactor(dashboard): bottom-nav mobile centralisée dans le layout, retrait des 7 nav locales

Enseignements :
- Conflit de verrou auth token si une page rappelle getUser() en plus du layout → tout passe par le contexte.
- Card menu horizontale se tasse à 3 colonnes desktop → 2 colonnes retenu.
- Bug hydration post-login (image hybride cassée) contourné par hard refresh, PAS corrigé — ticket P1.

# Changelog — MaquisApp

Historique des sessions, changements majeurs, incidents.
Format : entrées par date de fin de session, groupées par thème.

---

## Session — Chantier retours terrain (rapport articles, historique fiabilisé, cloture_id)

### Rapport de ventes par article (Retour 2)
- Nouveau `src/lib/ventes.js` : fonctions pures dérivant les totaux depuis
  `commande_items` (deriverTotalCommande, indexerItemsParCommande, agregerParArticle,
  grouperSessions). Source de vérité unique, conforme ADR 004.
- Nouvelle page `src/app/dashboard/historique/articles/page.js` : quantités et montants
  vendus par article sur une période, top ventes en barres horizontales maison. Lecture seule.

### Historique fiabilisé (Retour 1 + dette ADR 004)
- `historique/page.js` réécrit : tous les montants dérivés de `commande_items`, plus
  aucune lecture de `commandes.total` (cache client non fiable).
- Liste "Détail" regroupée par session au lieu d'être éclatée ligne par ligne.

### Regroupement déterministe par encaissement
- Migration `20260827140301_add_cloture_id.sql` : `commandes.cloture_id` (uuid nullable,
  index, pas de backfill). Appliquée manuellement dans Supabase Studio.
- `cloturerTout` pose un `cloture_id` commun sur toutes les commandes d'un même
  encaissement ; `grouperSessions` regroupe par ce tampon (solo si NULL). Fini le
  regroupement par seuil temporel, qui fusionnait à tort deux clients successifs d'une
  même table.
- Note migration : appliquée via Studio (Docker indisponible), fichier versionné dans le repo.

---

## Session — Assainissement fondations + fix expiration essai + isolation multi-resto

### Fondations de versionnement
- **Baseline schéma versionnée** : le schéma réel de la prod n'était pas tracé
  (une seule migration existait, `20260520`, appliquée à la main dans Studio
  sans passer par la CLI). Capture de l'état réel via requêtes SQL Studio
  (Docker indisponible → `db pull`/`db dump` écartés) dans
  `supabase/migrations/20260805_baseline_schema.sql` : 8 tables, FK vérifiées
  avec leurs `ON DELETE`, RLS + 21 policies, 4 fonctions, 3 triggers.
- **Historique migrations réconcilié** : `20260520`, `20260805`,
  `20260805120000` marqués `applied` via `supabase migration repair`.
- Note : la baseline utilise un format d'identifiant 8 chiffres (`20260805`)
  au lieu du standard Supabase 14 chiffres (`YYYYMMDDHHMMSS`) — cosmétique,
  perturbe l'affichage de `migration list` mais l'historique réel est correct.

### Bug corrigé en prod : expiration des essais (inscription téléphone)
- **Cause** : le flow `verify-otp` (CAS B, inscription) insérait le restaurant
  sans `abonnement_fin`, contrairement au flow Google (callback) qui posait
  bien l'essai. Résultat : les comptes créés par téléphone restaient en
  "essai" éternel et n'expiraient jamais.
- **Fix** : `verify-otp` pose désormais `email` (synthèse), `ville`,
  `abonnement_statut='essai'`, `abonnement_fin=+14j`, `abonnement_plan=null`,
  aligné sur le flow Google. Constante `TRIAL_DAYS=14`. Cohérence `ville` :
  `user_metadata` et profil utilisent `villeFinal`. Déployé en prod, validé
  sur un compte test.
- **Rattrapage** : 8 comptes "essai éternel" régularisés à +14j via migration
  `20260805120000_rattrapage_essais_sans_fin.sql` (appliquée dans Studio).

### Nettoyage
- Compte fantôme "Restaurant de Ruyan" supprimé : ligne `restaurants`
  orpheline restée après suppression du user (la cascade ne remonte pas de
  `auth.users` vers `restaurants`).
- **Procédure de suppression de compte clarifiée** : supprimer `restaurants`
  en premier (cascade vers profil, tables, plats, commandes…), puis
  `auth.users` dans Studio. Jamais l'inverse (laisse une ligne orpheline).
- Fichiers `_debug_*.txt` supprimés du dépôt, `.gitignore` renforcé
  (`_debug_*.txt`).

### Isolation du chantier multi-resto
- Le travail multi-resto (memberships, RLS, onboarding) avait été committé
  directement sur `main` en local (4 commits), non pushé, hors workflow
  `develop → main`. Plus 2 fichiers non trackés (migration RLS + test pgTAP)
  et une modif admin (garde par rôle `super_admin`).
- **Isolé sur la branche `feature/multi-resto`** (6 commits au total).
  `main` et `develop` remis à l'état prod (`32f70f0`).
- Chantier **gelé** : à reprendre après les sprints actuels.
- Point de vigilance pour la reprise : le commit `48ce068` modifie une
  migration déjà en prod (`20260520`) — à traiter avec soin lors de la reprise.

---

## Session — Reprise après pause (documentation projet)

### Documentation
- Création `CLAUDE.md` racine (règles pour Claude Code)
- Création `AGENT.md` racine (règles pour tout agent IA)
- Création `docs/README.md` + 6 fichiers de doc :
  ARCHITECTURE, DESIGN_SYSTEM, DATABASE, SECURITY, DEPLOYMENT, ONBOARDING
- Création `docs/adr/` avec 4 ADR :
  - 001 — Auth téléphone + PIN 4 chiffres
  - 002 — Policy RLS super_admin sur commandes
  - 003 — Mode admin PIN pour réappro stock
  - 004 — Totaux commande depuis commande_items
- Création `handoff/` avec 4 fichiers :
  CURRENT, NEXT, CHANGELOG, SECRETS

### Sécurité
- **Incident** : agent a restitué en clair dans un chat des secrets stockés
  en mémoire (PIN, userId, project ref Supabase, numéros perso)
- Remédiation immédiate :
  - Ajout de 3 règles persistantes dans la mémoire user Claude
  - Documentation `SECURITY.md` créée
  - Demande utilisateur : changer PIN + supprimer conversation

---

## Session — Mai 2026

### Bugs corrigés en prod

**Inscription bloquée si prénom vide ou ville non cliquée**
- Fichier : `supabase/functions/verify-otp/index.ts`
- Cause : validation backend exigeait tous les champs alors que UI marquait
  `prenom` optionnel et `ville` avec valeur par défaut
- Fix : rendu `prenom` optionnel côté backend, `ville` a un fallback "Abidjan"

**Commandes admin = 0 même avec commandes en BDD**
- Cause : RLS SELECT sur `commandes` filtrait par `restaurant_id` du profile
  → super_admin ne voyait que les commandes de son resto test
- Fix : nouvelle policy autorisant `super_admin` à voir toutes les commandes
- Migration : `supabase/migrations/20260520_admin_can_see_all_orders.sql`
- Voir ADR 002

**PWA installation au 1er clic ne fonctionnait pas**
- Fichiers : `src/app/dashboard/page.js`, `src/app/cuisine/[restaurantId]/page.js`
- Cause : timing rate entre event `beforeinstallprompt` et mount React
- Fix : capture globale dans `layout.js`, lecture au mount, fallback si null

**PWA installation invisible sur iPhone Safari**
- Cause : iOS ne supporte pas `beforeinstallprompt`
- Fix : détection userAgent iOS + Safari, modal instructions "Ajouter à
  l'écran d'accueil"

### Features livrées

**Système auth téléphone + PIN 4 chiffres**
- 5 Edge Functions : `send-otp`, `verify-otp`, `set-pin`,
  `login-with-pin`, `unlock-pin-with-otp`
- Frontend `src/app/auth/page.js` refondu (~1000 lignes, 3 modes)
- Lockout 5 min après 5 échecs
- Google OAuth conservé en alternative
- Voir ADR 001

**Mode admin PIN pour réapprovisionnement stock**
- Nouvelle Edge Function `verify-admin-pin` (bcrypt contre `profiles.pin_hash`)
- Frontend `src/app/dashboard/stock/page.js` refondu avec bouton
  "Mode admin verrouillé / actif" et modal PIN 4 chiffres
- Verrouillage automatique à la sortie de page
- Voir ADR 003

### Audits sécurité

- Mozilla Observatory : B+ (80/100)
- SecurityHeaders.com : A
- GitGuardian : 0 secrets leakés sur 6 repos Hokmalabs
- Snyk : 0 Critical, 3 High (Next.js DoS — upgrade reporté)
- Supabase Advisor : 5 warnings restants (backlog)

### Marketing

- Landing page prod déployée
- Design d'affiches type AppGen pour promo (Canva)
- Scénarios vidéo Kling AI planifiés

---

## Sessions antérieures

Les sessions antérieures à mai 2026 n'ont pas été archivées formellement.
Les transcripts complets restent accessibles côté agent si besoin de retrouver
un contexte précis.

# Changelog — MaquisApp

Historique des sessions, changements majeurs, incidents.
Format : entrées par date de fin de session, groupées par thème.

---

## Session — Reprise après pause (documentation projet)

### Documentation
- Création `CLAUDE.md` racine (règles pour Claude Code)
- Création `AGENT.md` racine (règles pour tout agent IA)
- Création `docs/README.md` + 6 fichiers de doc :
  ARCHITECTURE, DESIGN_SYSTEM, DATABASE, SECURITY, DEPLOYMENT, ONBOARDING
- Création `docs/adr/` avec 4 ADR :
  - 001 — Auth téléphone + PIN 4 chiffres
  - 002 — Policy RLS super_admin sur commandes
  - 003 — Mode admin PIN pour réappro stock
  - 004 — Totaux commande depuis commande_items
- Création `handoff/` avec 4 fichiers :
  CURRENT, NEXT, CHANGELOG, SECRETS

### Sécurité
- **Incident** : agent a restitué en clair dans un chat des secrets stockés
  en mémoire (PIN, userId, project ref Supabase, numéros perso)
- Remédiation immédiate :
  - Ajout de 3 règles persistantes dans la mémoire user Claude
  - Documentation `SECURITY.md` créée
  - Demande utilisateur : changer PIN + supprimer conversation

---

## Session — Mai 2026

### Bugs corrigés en prod

**Inscription bloquée si prénom vide ou ville non cliquée**
- Fichier : `supabase/functions/verify-otp/index.ts`
- Cause : validation backend exigeait tous les champs alors que UI marquait
  `prenom` optionnel et `ville` avec valeur par défaut
- Fix : rendu `prenom` optionnel côté backend, `ville` a un fallback "Abidjan"

**Commandes admin = 0 même avec commandes en BDD**
- Cause : RLS SELECT sur `commandes` filtrait par `restaurant_id` du profile
  → super_admin ne voyait que les commandes de son resto test
- Fix : nouvelle policy autorisant `super_admin` à voir toutes les commandes
- Migration : `supabase/migrations/20260520_admin_can_see_all_orders.sql`
- Voir ADR 002

**PWA installation au 1er clic ne fonctionnait pas**
- Fichiers : `src/app/dashboard/page.js`, `src/app/cuisine/[restaurantId]/page.js`
- Cause : timing rate entre event `beforeinstallprompt` et mount React
- Fix : capture globale dans `layout.js`, lecture au mount, fallback si null

**PWA installation invisible sur iPhone Safari**
- Cause : iOS ne supporte pas `beforeinstallprompt`
- Fix : détection userAgent iOS + Safari, modal instructions "Ajouter à
  l'écran d'accueil"

### Features livrées

**Système auth téléphone + PIN 4 chiffres**
- 5 Edge Functions : `send-otp`, `verify-otp`, `set-pin`,
  `login-with-pin`, `unlock-pin-with-otp`
- Frontend `src/app/auth/page.js` refondu (~1000 lignes, 3 modes)
- Lockout 5 min après 5 échecs
- Google OAuth conservé en alternative
- Voir ADR 001

**Mode admin PIN pour réapprovisionnement stock**
- Nouvelle Edge Function `verify-admin-pin` (bcrypt contre `profiles.pin_hash`)
- Frontend `src/app/dashboard/stock/page.js` refondu avec bouton
  "Mode admin verrouillé / actif" et modal PIN 4 chiffres
- Verrouillage automatique à la sortie de page
- Voir ADR 003

### Audits sécurité

- Mozilla Observatory : B+ (80/100)
- SecurityHeaders.com : A
- GitGuardian : 0 secrets leakés sur 6 repos Hokmalabs
- Snyk : 0 Critical, 3 High (Next.js DoS — upgrade reporté)
- Supabase Advisor : 5 warnings restants (backlog)

### Marketing

- Landing page prod déployée
- Design d'affiches type AppGen pour promo (Canva)
- Scénarios vidéo Kling AI planifiés

---

## Sessions antérieures

Les sessions antérieures à mai 2026 n'ont pas été archivées formellement.
Les transcripts complets restent accessibles côté agent si besoin de retrouver
un contexte précis.
