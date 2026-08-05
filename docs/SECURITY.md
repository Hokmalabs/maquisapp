# Sécurité MaquisApp

Modèle de menace, gestion des secrets, checklist incidents.

---

## Principes

### Ce qui est un SECRET

- PIN utilisateur (4 chiffres)
- Mots de passe (aucun stocké en clair côté serveur)
- `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS, accès root)
- `SUPABASE_ANON_KEY` (moins critique mais à protéger)
- Tokens Twilio (`ACCOUNT_SID`, `AUTH_TOKEN`, `VERIFY_SERVICE_SID`)
- Sentry DSN (moins critique mais à ne pas exposer)
- Project ref Supabase (permet d'attaquer directement l'URL)

### Ce qui est SEMI-sensible

- userIds précis (peuvent servir dans des attaques ciblées)
- Numéros de téléphone d'utilisateurs
- Emails d'utilisateurs privés

### Ce qui est PUBLIC

- URL prod (maquisapp.com)
- Nom du projet, stack technique
- Documentation architecture (celle-ci)

---

## Règle absolue

**Aucun secret ne doit apparaître en clair dans :**
- Un fichier du repo Git
- Un message de commit
- Une conversation avec un agent IA
- La documentation
- Un ticket / issue publique

**Où les mettre :**
- Local dev : `_secrets/` (gitignored) OU `.env.local` (gitignored)
- Vercel : Dashboard → Settings → Environment Variables
- Supabase Edge Functions : Dashboard → Edge Functions → Secrets
- Twilio : Dashboard Twilio directement

---

## Modèle de menace

### Vecteurs d'attaque anticipés

| Vecteur | Impact | Mitigation |
|---|---|---|
| Vol du PIN d'un gérant | Accès à un resto | PIN 4 chiffres + lockout 5 min |
| Vol du PIN d'un super_admin | Accès à tous les restos | Formation admin, à considérer 2FA |
| Fuite de service_role_key | Accès root BDD | Rotation immédiate + audit logs Supabase |
| SQL injection | Compromission BDD | Utiliser client Supabase (paramétré), pas de SQL construit à la main |
| XSS | Session hijack | React échappe par défaut, pas de dangerouslySetInnerHTML sans validation |
| CSRF | Actions non désirées | SameSite cookies Supabase, pas de forms HTML natifs |
| Bruteforce PIN | Accès compte | Lockout 5 min après 5 échecs |
| Fraude interne (gérant) | Manipulation stock/CA | PIN admin sur réappro (ADR 003), audit log à venir |
| Spam SMS Twilio | Épuisement crédit | Rate limiting Vercel sur `/auth/login`, monitoring solde |

---

## Row Level Security

Toutes les tables métier ont RLS activée.
Cas d'exception documentés : ADR 002 (super_admin sur commandes).

### Test de RLS

Avant de créer une policy, tester avec un compte de rôle différent
via Supabase SQL Editor (`SET LOCAL role authenticated; SET LOCAL request.jwt.claim.sub = '<uuid>';`).

---

## Rate limiting

Configuré côté Vercel Firewall :
- `/auth/login` : 10 requêtes / 60s

À étendre pour :
- `/auth/register`
- Edge Functions Twilio (send-otp, verify-otp)

---

## En-têtes HTTP sécurité

Audits passés :
- Mozilla Observatory : B+ (80/100)
- SecurityHeaders.com : A

Points restants (backlog) :
- CSP : retirer `unsafe-inline` (Next.js scripts en ligne)
- SRI sur scripts externes
- HSTS preload

---

## Checklist incident

Si compromission suspectée :

1. **Contenir**
   - Rotate les secrets concernés immédiatement (Twilio, Supabase keys)
   - Suspendre le compte utilisateur suspect
   - Bloquer l'IP si identifiable (Vercel Firewall)
2. **Investiguer**
   - Logs Supabase (Auth + Database logs)
   - Logs Vercel (déploiements, requêtes)
   - Logs Sentry (erreurs anormales)
   - Logs Twilio (envois SMS non prévus, coûts anormaux)
3. **Corriger**
   - Fix la vulnérabilité
   - Push en prod
4. **Notifier**
   - Utilisateurs affectés si données perso concernées
5. **Documenter**
   - Entrée dans `handoff/CHANGELOG.md` avec date, cause, remédiation

---

## Audit récurrent (mensuel)

- [ ] Vérifier les dépendances npm (`npm audit`)
- [ ] Vérifier Snyk / Dependabot
- [ ] Vérifier Supabase Advisor
- [ ] Vérifier Sentry (erreurs anormales)
- [ ] Vérifier logs Twilio (coûts SMS)
- [ ] Vérifier accès admin (qui a accès à quoi)

---

## Contact incident

En cas d'incident sécurité :
- Documenter dans `handoff/CHANGELOG.md`
- Contacter Anthropic si compromission via un agent IA
- Contacter Supabase support pour compromission BDD
- Contacter Twilio support pour compromission SMS
