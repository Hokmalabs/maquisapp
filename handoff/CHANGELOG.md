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
