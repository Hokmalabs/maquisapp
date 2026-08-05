# Déploiement et opérations MaquisApp

Comment déployer, monitorer, et opérer la prod.

---

## Environnements

| Env | Branche | URL |
|---|---|---|
| Production | `main` | https://www.maquisapp.com |
| Preview | `develop` + PRs | URL générée par Vercel |
| Local | - | http://localhost:3000 |

---

## Déploiement

### Flow standard

```bash
# 1. Sur develop, coder + tester local
git checkout develop
npm run dev

# 2. Commit + push develop → preview Vercel automatique
git add .
git commit -m "feat: [description]"
git push origin develop

# 3. Tester sur URL preview Vercel

# 4. Si OK, merger sur main
git checkout main
git merge develop
git push origin main
# Vercel déploie automatiquement en prod (1-2 min)

# 5. Revenir sur develop
git checkout develop
```

### Déploiement Edge Function

```bash
# Depuis la racine du repo
supabase functions deploy <function-name>
```

Vérifier :
- Docker n'a pas besoin d'être running (Supabase CLI ne l'utilise pas ici)
- Les secrets nécessaires sont set dans Supabase Dashboard → Edge Functions

### Migration BDD

```bash
# Créer la migration
supabase migration new <nom_migration>

# Éditer le fichier SQL généré dans supabase/migrations/

# L'appliquer :
# Option A : Supabase Dashboard → SQL Editor → coller + Run
# Option B : supabase db push (si connecté au projet)
```

**Toujours créer un backup avant une grosse migration.**

---

## Monitoring

### Vercel Analytics
Dashboard Vercel → projet maquisapp → onglet Analytics
- Visiteurs uniques
- Pages vues
- Sources de trafic
- Top pages

### Vercel Speed Insights
Dashboard Vercel → Speed Insights
- Web Vitals (LCP, FID, CLS)
- Score par page

### Sentry
Dashboard sentry.io
- Org : hokma-labs
- Project : javascript-nextjs
- Erreurs client + serveur avec stack traces

### UptimeRobot
Monitors :
- https://www.maquisapp.com (uptime)
- https://www.maquisapp.com/dashboard (uptime après login)

### Supabase Dashboard
- Database → Query Performance
- Auth → Users (nouveaux inscrits, actifs)
- Edge Functions → Logs (erreurs, invocations)
- Reports → API usage

### Twilio
Dashboard Twilio
- Solde compte
- Historique SMS (nombre, coût, statuts)
- Erreurs de délivrance

---

## Vérifications hebdomadaires (lundi matin)

Checklist rapide (10 min) :

- [ ] Prod accessible : https://www.maquisapp.com
- [ ] Login fonctionne (test avec compte perso)
- [ ] Solde Twilio > seuil (min 5$)
- [ ] Sentry : aucune erreur critique dans les 7 derniers jours
- [ ] Vercel : aucun déploiement échoué
- [ ] UptimeRobot : uptime > 99% sur 7j
- [ ] Nouveaux inscrits : combien cette semaine ?
- [ ] Support : messages WhatsApp / emails clients ?

---

## Actions de maintenance courantes

### Prolonger un abonnement client

```sql
UPDATE restaurants 
SET abonnement_statut = 'actif',
    abonnement_plan = 'mensuel',  -- ou 'annuel'
    abonnement_fin = now() + interval '1 month'
WHERE id = '<restaurant_id>';
```

### Suspendre un compte
```sql
UPDATE restaurants 
SET abonnement_statut = 'suspendu'
WHERE id = '<restaurant_id>';
```

### Reset le PIN d'un utilisateur (support)
```sql
UPDATE profiles 
SET pin_hash = crypt('<nouveau_pin_temporaire>', gen_salt('bf'))
WHERE id = '<user_id>';
```
⚠️ Le pin_hash utilise bcrypt. `pgcrypto` doit être activé.
Communiquer le PIN temporaire au client par WhatsApp direct, jamais par email.

---

## En cas de panne

### Prod down
1. Vérifier statut Vercel : https://www.vercel-status.com
2. Vérifier statut Supabase : https://status.supabase.com
3. Vérifier logs Vercel dernier déploiement
4. Si récent déploiement fautif : `vercel rollback` ou redéployer une version antérieure

### SMS non envoyés
1. Vérifier solde Twilio
2. Vérifier logs Edge Function `send-otp` (Supabase Dashboard)
3. Vérifier console Twilio (statuts SMS)

### Base de données lente
1. Vérifier Supabase Dashboard → Database → Query Performance
2. Identifier requêtes lentes
3. Ajouter index si besoin (migration)

---

## Coûts prévisionnels

Ordre de grandeur mensuel (à ajuster) :
- Vercel Pro : ~20$/mois
- Supabase Pro : ~25$/mois
- Twilio : variable selon volume SMS (Verify ~0.05$/OTP)
- Sentry : gratuit sous quota, sinon 26$/mois
- Namecheap domaine : ~15$/an
- **Total base : ~50-70$/mois** hors Twilio variable
