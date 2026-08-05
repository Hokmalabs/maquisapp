# CLAUDE.md — Contexte MaquisApp pour Claude Code

Ce fichier est lu automatiquement par Claude Code au démarrage d'une session.
Il donne le contexte minimal pour travailler efficacement sur MaquisApp.

Pour la doc détaillée, voir `docs/README.md`.

---

## Le projet en 3 lignes

MaquisApp est une SaaS de gestion de restaurant pensée pour la Côte d'Ivoire.
Prod live sur https://www.maquisapp.com. Owner : Joel Yemian (Hokma Labs, Abidjan).
Stack : Next.js 14 App Router + Supabase Pro + Vercel Pro + Twilio Verify.

---

## Règles absolues (jamais négociables)

### Sécurité
- **NE JAMAIS afficher de secret en clair** dans le chat, le code committé ou la doc :
  PIN, mots de passe, service_role_key, anon_key, tokens Twilio, userIds,
  project ref Supabase, numéros de téléphone perso.
- **Secrets locaux uniquement** dans `_secrets/` (gitignored).
- **Secrets Vercel** dans dashboard Vercel → Env Variables.
- **Secrets Supabase Edge Functions** dans Supabase Dashboard → Edge Functions → Secrets.

### Workflow Git
- **Toujours commencer sur `develop`**, jamais commit direct sur `main`.
- Flow : `develop` → tests preview Vercel → merge `main` → push prod.
- Après un push main, retourner sur `develop` : `git checkout develop`.

### Modifications de code
- Pour tout fichier > 50 lignes à modifier : **livrer le fichier complet**,
  pas de find-and-replace (source d'erreurs).
- Toujours proposer, jamais présumer : demander avant de refactorer largement.

### Comportement métier critique
- **Totaux commandes** : dériver de `commande_items`, JAMAIS de `commandes.total`
  (calculé côté client, peu fiable).
- **Statut table** : utiliser la RPC `update_table_statut` (SECURITY DEFINER),
  jamais un UPDATE direct sur `tables` (bloqué par RLS).
- **`mode_paiement`** valeurs valides : `especes`, `wave`, `orange_money`,
  `mtn_money`, `moov`. **PAS** `cash`.
- **Rôles** (`profiles.role`) : `super_admin`, `gerant`, `serveur`.
  **PAS** `admin`.
- **Téléphones ivoiriens** : format E.164 en gardant le 0 initial.
  Exemple : `0708091234` → `+2250708091234`.

---

## Structure du projet

```
maquisapp/
├── src/app/          Next.js App Router (pages + layouts)
│   ├── auth/         Login, register, reset (téléphone + PIN)
│   ├── dashboard/    Interface gérant (par resto)
│   ├── admin/        Portail super_admin (multi-restos)
│   ├── cuisine/      Écran cuisine par restaurant
│   ├── menu/         Client scan QR + commande
│   └── abonnement/   Paywall / souscription
├── src/lib/          Helpers Supabase client
├── supabase/
│   ├── functions/    Edge Functions Deno
│   └── migrations/   Migrations SQL versionnées
├── public/           Assets statiques (manifest PWA, icons, sw.js)
├── docs/             Documentation projet
├── handoff/          État de session, changelog, roadmap
└── _secrets/         Secrets locaux (GITIGNORED)
```

---

## Edge Functions déployées

- `send-otp` — envoie OTP SMS via Twilio Verify
- `verify-otp` — vérifie OTP + crée compte si register
- `set-pin` — définit ou change le PIN d'un compte
- `login-with-pin` — connexion par téléphone + PIN
- `unlock-pin-with-otp` — reset PIN après OTP SMS
- `verify-admin-pin` — vérifie PIN pour mode admin (réappro stock)

Détails dans `docs/ARCHITECTURE.md`.

---

## Comment reprendre après une pause

1. Lire `handoff/CURRENT.md` (état actuel)
2. Lire `handoff/NEXT.md` (backlog priorisé)
3. Lire les dernières entrées `handoff/CHANGELOG.md`
4. Vérifier la prod : https://www.maquisapp.com
5. Vérifier solde Twilio, statut Supabase Pro, Vercel Pro
6. Démarrer sur `develop`

---

## Style de collaboration attendu

- **Direct et tranché.** Pas de "peut-être", donner une reco claire.
- **Proactif.** Anticiper les étapes suivantes, ne pas attendre qu'on demande.
- **Efficace en tokens.** Livrer les blocs de code complets une fois, pas
  itérer message par message.
- **Sécurité par défaut.** Si une action peut leaker un secret, refuser.

---

## Contacts et urgences

- Support client : voir `_secrets/contacts.txt`
- Incident sécurité : rotate tokens immédiatement (Twilio, Supabase),
  documenter dans `handoff/CHANGELOG.md`
