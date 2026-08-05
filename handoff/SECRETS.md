# Où trouver les secrets

Ce fichier ne contient **aucun** secret. Il indique juste OÙ ils sont stockés.

---

## Fichier local (jamais commit)

**Emplacement** : `_secrets/` à la racine du repo

Doit être dans `.gitignore`. Vérifier :
```powershell
Get-Content .gitignore | Select-String "_secrets"
```

Contient typiquement :
- `twilio.txt` : Twilio Account SID, Auth Token, Verify Service SID
- `supabase.txt` : SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY, project ref
- `admin.txt` : identifiants comptes tests (jamais de PIN en clair)
- `contacts.txt` : WhatsApp business, emails clients tests

---

## Variables Vercel

Dashboard Vercel → projet maquisapp → Settings → Environment Variables :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `SENTRY_DSN`
- Autres selon besoin

---

## Variables Supabase Edge Functions

Dashboard Supabase → Edge Functions → Secrets :
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Comptes tests

Identifiants dans `_secrets/admin.txt`. Ne jamais écrire en clair
dans le chat, le code committé, ou la documentation.

Pour retrouver un compte, opérer directement dans Supabase Studio
(Dashboard → Authentication ou SQL Editor).

---

## Variables PowerShell locales

Se vident entre sessions PowerShell. Redéfinir au besoin depuis `_secrets/`.

Exemple :
```powershell
$ANON_KEY = "<valeur depuis _secrets/supabase.txt>"
```

---

## En cas de compromission suspectée

1. **Rotate immédiatement** :
   - PIN de tous les comptes admin
   - Twilio Auth Token
   - Supabase `SERVICE_ROLE_KEY`
   - Supabase `ANON_KEY` si besoin
   - Sentry DSN si exposé publiquement
2. **Vérifier** :
   - Logs Supabase (queries suspectes)
   - Logs Sentry (erreurs anormales)
   - Logs Twilio (envois SMS non prévus)
3. **Documenter** dans `handoff/CHANGELOG.md`

Voir `docs/SECURITY.md` pour la checklist complète.
