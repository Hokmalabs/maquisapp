# Onboarding — Reprendre après une pause

Guide pour reprendre le projet après plusieurs semaines ou mois d'interruption.

---

## Étape 1 — Vérifier l'état de l'infra (10 min)

- [ ] Prod accessible : https://www.maquisapp.com
- [ ] Login testé (avec compte perso)
- [ ] Solde Twilio suffisant (Dashboard Twilio)
- [ ] Abonnement Supabase Pro actif (Dashboard Supabase → Billing)
- [ ] Abonnement Vercel Pro actif (Dashboard Vercel → Settings → Billing)
- [ ] Domaine maquisapp.com renouvelé (Namecheap)
- [ ] Sentry actif, pas d'erreurs critiques récentes

---

## Étape 2 — Se remettre en contexte (15 min)

Lire dans l'ordre :

1. `CLAUDE.md` (racine) — règles absolues
2. `handoff/CURRENT.md` — état de la dernière session
3. `handoff/NEXT.md` — backlog priorisé
4. Les 3-5 dernières entrées de `handoff/CHANGELOG.md`
5. Si travail sur une zone spécifique, lire le doc correspondant :
   - Auth / users → `docs/DATABASE.md` (section profiles)
   - UI → `docs/DESIGN_SYSTEM.md`
   - Sécurité → `docs/SECURITY.md`

---

## Étape 3 — Vérifier les clients actifs (10 min)

Query Supabase SQL Editor :
```sql
SELECT 
  r.nom, r.ville, r.abonnement_statut, r.abonnement_fin,
  COUNT(c.id) FILTER (WHERE c.created_at >= now() - interval '7 days') as cmds_7j,
  COUNT(c.id) FILTER (WHERE c.created_at >= now() - interval '30 days') as cmds_30j
FROM restaurants r
LEFT JOIN commandes c ON c.restaurant_id = r.id
GROUP BY r.id, r.nom, r.ville, r.abonnement_statut, r.abonnement_fin
ORDER BY cmds_7j DESC;
```

Cela permet de savoir :
- Qui est encore actif
- Quels comptes ont besoin de relance (abonnement bientôt fini, aucune commande)

---

## Étape 4 — Environnement local (5 min)

```powershell
cd D:\JPC\HOKMA\MAQUISAPP\maquisapp
git checkout develop
git pull origin develop
npm install       # au cas où package.json a changé
npm run dev       # démarrer le serveur local sur localhost:3000
```

Vérifier que `.env.local` est présent avec les bonnes variables :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Sinon les recopier depuis Vercel Dashboard → Settings → Environment Variables.

---

## Étape 5 — Session Claude Code

Ouvrir Claude Code et lancer :
- La commande donnée dans le prompt de continuation (voir `handoff/CURRENT.md`)
- OU commencer par : "Salut, je reprends MaquisApp. Lis CLAUDE.md et handoff/CURRENT.md
  puis résume-moi où on en est."

---

## Étape 6 — Identifier le premier chantier

Selon `handoff/NEXT.md` :
- Bug urgent → à traiter d'abord
- Feature en cours → reprendre là où on s'était arrêté
- Nouveau chantier → cadrer avec Claude

---

## Étape 7 — Communication clients

Après une longue pause :
- Envoyer un message aux clients actifs pour dire qu'on est de retour
- Répondre aux éventuels messages WhatsApp / emails en attente
- Vérifier les commentaires / retours reçus pendant l'absence

---

## Pièges classiques après une pause

- **PowerShell variables** : `$ANON_KEY` et autres se vident entre sessions.
  Les redéfinir depuis `_secrets/` au besoin.
- **Supabase CLI** : nouvelle version dispo, mettre à jour si besoin.
- **npm packages** : possibles vulnérabilités entre-temps, lancer `npm audit`.
- **Certifs SSL** : renouvellement automatique via Vercel, mais à vérifier
  si erreur HTTPS.
- **Google OAuth** : ID/secret peut avoir été invalidé, vérifier dans Google Cloud Console.
