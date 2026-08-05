# Architecture MaquisApp

Document technique de référence. Complète `CLAUDE.md` (règles) et `DATABASE.md`
(schéma détaillé).

---

## Stack

### Frontend
- **Framework** : Next.js 14 (App Router)
- **Hébergement** : Vercel Pro
- **Langue de l'UI** : Français
- **Styles** : styles inline JavaScript (pas de framework CSS)
- **PWA** : manifest + service worker minimal
- **Analytics** : Vercel Analytics, Vercel Speed Insights
- **Error tracking** : Sentry (@sentry/nextjs)

### Backend
- **BaaS** : Supabase Pro
  - Postgres (BDD principale)
  - Auth (téléphone + PIN custom, Google OAuth)
  - Storage (logos restos, photos plats)
  - Edge Functions Deno (serverless TypeScript)
  - Realtime (subscriptions Postgres)
- **SMS** : Twilio Verify (OTP 4-6 chiffres)

### Infrastructure
- **Domaine** : maquisapp.com (Namecheap)
- **Uptime** : UptimeRobot (production + /dashboard)
- **Monitoring** : Sentry, Vercel Analytics

---

## Structure du code

```
src/app/
├── layout.js               Layout root + PWA install listener
├── page.js                 Landing publique
├── globals.css             Reset + fonts
│
├── auth/
│   └── page.js             Login / register / reset (3 modes, ~1000 lignes)
│
├── dashboard/              Interface gérant (1 resto)
│   ├── page.js             Home dashboard
│   ├── commandes/          Suivi temps réel commandes
│   ├── menu/               CRUD plats et catégories
│   ├── tables/             CRUD tables + QR codes
│   ├── stock/              Stock boissons + mode admin PIN
│   ├── historique/         CA et rapports
│   ├── parametres/         Profil resto + compte
│   └── stats/              Statistiques agrégées
│
├── admin/                  Portail super_admin (multi-restos)
│   └── page.js             Liste restos + actions
│
├── cuisine/[restaurantId]/ Écran cuisine dédié (à afficher en cuisine)
│   └── page.js
│
├── menu/[slug]/[tableId]/  Menu public scanné par le client
│   └── page.js
│
├── abonnement/             Paywall
│   └── page.js
│
└── legal/                  Mentions légales
    ├── conditions/
    └── confidentialite/
```

---

## Edge Functions

Toutes les Edge Functions sont dans `supabase/functions/`.
Chacune a son `index.ts` et son `deno.json`.

| Function | Rôle | Body | Réponse |
|---|---|---|---|
| `send-otp` | Envoie OTP SMS via Twilio Verify | `{ phone, indicatif }` | `{ success }` |
| `verify-otp` | Vérifie OTP, crée compte si register | `{ phone, code, nom, restaurant_nom, ... }` | `{ success, session }` |
| `set-pin` | Définit ou change le PIN | `{ userId, pin, oldPin? }` | `{ success }` |
| `login-with-pin` | Connexion téléphone + PIN | `{ phone, pin }` | `{ success, session }` |
| `unlock-pin-with-otp` | Reset PIN via OTP SMS | `{ phone, code, newPin }` | `{ success }` |
| `verify-admin-pin` | Vérifie PIN pour mode admin | `{ userId, pin }` | `{ success }` |

Les secrets nécessaires (SUPABASE_URL, SERVICE_ROLE_KEY, TWILIO_*) sont
configurés dans Supabase Dashboard → Edge Functions → Secrets.

---

## Modules métier

### Authentification

Deux chemins possibles :
1. **Téléphone + PIN 4 chiffres** (principal)
   - OTP SMS Twilio pour signup et reset
   - PIN hashé bcrypt dans `profiles.pin_hash`
   - Lockout 5 min après 5 échecs
2. **Google OAuth** (secondaire, minoritaire)

### Commandes

Cycle de vie d'une commande :
1. `en_attente` — créée (client ou manuelle)
2. `valide` — validée par le gérant
3. `en_preparation` — envoyée en cuisine
4. `presque_pret` — signal envoyé au serveur
5. `servi` — servie au client
6. `cloture` — payée et fermée
7. `annule` — annulée

Le total d'une commande **DOIT** être calculé depuis `commande_items`
au moment de l'affichage. La colonne `commandes.total` est un cache
côté client peu fiable.

### Realtime

Les composants dashboard, cuisine et menu client utilisent
Supabase Realtime sur la table `commandes`. Filtre systématique
sur `restaurant_id` pour éviter les fuites cross-resto.

### Stock boissons

- Chaque plat marqué `est_boisson: true` peut avoir un suivi de stock
- Toggle `stock_actif` active/désactive le suivi par boisson
- `stock_actuel` décrémente automatiquement à chaque commande
- Réapprovisionnement **verrouillé derrière un PIN admin**
  (voir ADR 003)

---

## Progressive Web App (PWA)

- Manifest : `public/manifest.json`
- Service worker : `public/sw.js` (minimal, pas de stratégie de cache avancée)
- Install prompt :
  - Chrome/Edge/Android : capture `beforeinstallprompt` dans `layout.js`
    et expose sur `window.__installPrompt`
  - iOS Safari : détection via userAgent + modal instructions manuelles
    ("Ajouter à l'écran d'accueil")

---

## Sécurité de base

- CORS géré dans chaque Edge Function
- CSP configurée dans les headers Vercel
- Rate limiting Vercel Firewall sur `/auth/login`
- Row Level Security activée sur toutes les tables métier
- Aucun `SERVICE_ROLE_KEY` côté client (Edge Functions uniquement)

Détails dans `SECURITY.md`.

---

## Points d'attention connus

- Ticket total mal calculé si dépendance à `commandes.total`
- Realtime channel peut firer plusieurs fois : dédupliquer côté client
- Statut table `libre/occupee` : passer par la RPC `update_table_statut`
  (SECURITY DEFINER) pour contourner RLS
- Format téléphone ivoirien : **garder le 0 initial** dans E.164

---

## Roadmap technique

Voir `handoff/NEXT.md`.

Backlog tech dette (à intégrer) :
- Upgrade Next.js 14 → 15
- Renforcer CSP (retirer unsafe-inline)
- SRI sur scripts externes
- HSTS preload
- Tests automatisés (aucun pour l'instant)
