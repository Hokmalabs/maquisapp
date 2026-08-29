# MaquisApp — État courant du chantier
_Dernière mise à jour : 29 août 2026_

## Chantier en cours : Refonte desktop responsive (Volet A)

### Principe directeur (vaut sur tout le chantier)
- Bascule à **900px**. Mobile **strictement intact** (surcouche desktop additive, jamais de modif des valeurs mobiles).
- Desktop en CSS `@media (min-width: 900px)`.
- **Règle SSR** : toute date/valeur affichée dépendant de l'heure ou du navigateur est rendue vide au premier paint, puis peuplée en `useEffect` (flag `mounted`). Un `new Date()` au render diverge serveur/client → mismatch d'hydration.
- **Règle contexte** : une page dashboard ne rappelle JAMAIS `supabase.auth.getUser()`. Tout (resto, restaurantId, userId) vient de `useRestaurant()`. Deux `getUser()` en parallèle = conflit de verrou sur le token auth ("Lock ... was released because another request stole it").
- Discipline : une page = un prompt = un test (mobile d'abord, desktop ensuite) = un commit. Jamais de migration groupée.

### FAIT et commité (branche develop)
1. **RestaurantContext** dans `dashboard/layout.js` : charge le resto une fois, expose `restaurant`, `restaurantId`, `userId`, `loading`, `refresh()` via `useRestaurant()`. Sidebar + topbar desktop. Flag `mounted` anti-hydration.
2. **Accueil desktop** (`dashboard/page.js`) : sidebar, topbar, GrapheVentes 7j (Recharts, dynamic import ssr:false), CA du jour dérivé de commande_items (ADR 004). NB : l'accueil garde son propre chargement (charge bien plus que le resto) — non migré vers le contexte, redondance temporaire assumée.
3. **7 pages migrées** vers contexte + desktop responsive : parametres, stock, tables, historique, menu, commandes. Chacune : contexte, header mobile masqué desktop, contenu élargi, `@import` Google Fonts (bloqué CSP) supprimé.
4. **Bottom-nav centralisée** dans `layout.js` (mobile only, item actif déduit du pathname). Les 7 bottom-nav locales retirées.

### Spécificités par page (à connaître avant de retoucher)
- **stock** : mode admin PIN (verify-admin-pin) préservé. `userId` vient du contexte. ⚠️ verify-admin-pin fait confiance à un userId fourni par le client → risque sécurité connu (P2/P3), NON traité ici.
- **historique** : toute la dérivation commande_items / grouperSessions par cloture_id (ADR 004) intouchée. Deux colonnes desktop.
- **menu** : grille plats 2 colonnes desktop (pas 3 — les cards horizontales se tassaient à 3). Upload Storage intouché. Card verticale façon maquette = polish futur, pas fait.
- **commandes** : Realtime, clôture (cloturerTout + cloture_id), RPC statut table, ticket, bon cuisine — tout intouché. Grille 2 colonnes desktop (pas le kanban de la maquette = polish futur).

## Tickets ouverts

### P1 — Bug hydration au premier chargement post-login (À CORRIGER AVANT PROD)
Après connexion, le premier rendu du dashboard affiche un état hybride cassé : sidebar desktop OK mais contenu accueil en mode mobile (header sombre, colonne étroite). Un Ctrl+Shift+R corrige. C'est un mismatch d'hydration au premier paint post-redirection login→dashboard. **Contournement actuel = hard refresh, ce n'est PAS une correction.** Le client en prod le subira.
→ Piste : lire l'erreur console EXACTE sur l'écran cassé ("Text content does not match server-rendered HTML") AVANT tout fix. Ne pas fixer à l'aveugle.

### Auth desktop (Étape 3) — REPORTÉ, confusion à élucider d'abord
`auth/login/page.js` et `auth/register/page.js` sont de simples redirections vers `/auth?mode=login|register`. Le vrai écran est `auth/page.js`. MAIS : le contenu de `auth/page.js` (login/signup, phone/otp) ne correspond PAS aux maquettes montrant un stepper 4 étapes (Téléphone→SMS→Informations→PIN) + champ PIN + "PIN oublié ?".
→ Avant toute migration auth : lancer `grep -rl "Code PIN" src/app` pour identifier le VRAI fichier qui affiche le stepper+PIN. Ne pas régénérer auth/page.js (une tentative a déjà supprimé de la logique par erreur — annulée via git checkout).
→ Image de fond souhaitée sur le hero desktop (façon maquette) : nécessite un fichier réel dans /public (pas d'URL externe, CSP + egress).

### Dette non bloquante
- Règles CSS orphelines `.pg-bottomnav { display:none }` dans les 7 pages (plus matchées, inoffensives) — à balayer lors de la propagation theme.js.
- `theme.js` créé mais chaque page a encore son objet `C` local — propager (design system).
- Double chargement profil : layout + accueil chargent le resto séparément — dédupliquer l'accueil vers le contexte plus tard.
- `@import` Google Fonts encore présent sur les pages HORS dashboard (admin, abonnement, cuisine, menu public, legal, not-found).
- `git stash@{0}` (flèches volet A abandonnées) à drop après validation.
- Next 14.2.35 signalé outdated (upgrade 14→15 à planifier).

## Reste à faire sur Volet A avant merge main
1. **Validation preview complète** sur le vrai PC client (Vercel preview de develop) : parcourir les 7 pages en desktop, vérifier navigation sans retour au mode mobile.
2. **Corriger le bug P1** (hydration post-login) — bloquant pour la prod.
3. **Auth desktop** (après élucidation fichier).
4. **Merge develop → main** (fast-forward) — emporte aussi le chantier retours terrain précédent (rapport articles, historique fiabilisé, cloture_id) qui attend son merge.