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
