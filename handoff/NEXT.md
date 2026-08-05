# Roadmap et backlog — MaquisApp

Ce qu'il faut attaquer, dans quel ordre, avec quelles décisions à prendre.

---

## 🎯 Chantier en cours : Refonte du portail admin

**Objectif** : transformer `src/app/admin/page.js` en un vrai dashboard
super_admin professionnel.

### Périmètre proposé (à valider en début de session)

**Layout**
- Sidebar gauche (nav principale)
- Top bar (utilisateur connecté, notifications, recherche globale)
- Zone principale avec breadcrumb

**Menus**
1. **Vue d'ensemble** (home dashboard) — métriques clés
2. **Restaurants** — liste, filtres, actions
3. **Utilisateurs** — comptes gérants + super_admins
4. **Commandes globales** — toutes les commandes cross-restos
5. **Revenus** — CA agrégé, MRR, tendances
6. **Abonnements** — gestion des plans
7. **Support** — messages clients, tickets
8. **Logs / Audit** — activité sensible tracée
9. **Paramètres plateforme**

**Métriques clés (page d'accueil)**
- Total restos actifs / essai / suspendus
- MRR (Monthly Recurring Revenue) estimé
- Nouvelles inscriptions cette semaine
- Commandes traitées cette semaine (agrégé)
- Taux d'usage moyen par resto (commandes/jour)
- Alertes système (Sentry, Twilio solde, UptimeRobot)

**Vue détaillée par restaurant**
- Infos + historique
- CA du mois / de la période
- Activité récente
- Actions : activer / suspendre / prolonger abonnement, contacter, voir logs

### Décisions techniques à prendre

- **UI framework** : rester sur styles inline (comme le reste) OU migrer vers
  Tailwind OU shadcn ?
  - **Reco** : commencer avec styles inline pour cohérence, envisager
    Tailwind au refactor global plus tard
- **Charts** : Recharts OU Chart.js ?
  - **Reco** : Recharts (déjà pensé pour React, léger)
- **Organisation du code** : garder `src/app/admin/page.js` monolithique OU
  séparer en `src/app/admin/[section]/page.js` avec un layout partagé ?
  - **Reco** : layout + sous-routes. Extensible, tests plus faciles.
- **Auth** : réutiliser le check `ADMIN_EMAIL` actuel OU vérifier `role = 'super_admin'` ?
  - **Reco** : vérifier `role`, plus propre et permet plusieurs super_admins

### Estimation
- MVP layout + 3 pages (Restaurants, Vue d'ensemble, Abonnements) : ~1-2 jours
- Feature complète (8 sections + métriques riches) : ~1 semaine

---

## 📋 Backlog priorisé

### Priorité 1 — Bugs bloquants

- [ ] **Bug urgent** mentionné en fin de session mai — à préciser au démarrage
- [ ] **Bouton "Changer mot de passe"** dans page profil : non fonctionnel.
      Wire vers Edge Function `set-pin` avec flow ancien PIN + nouveau PIN.
      SMS OTP reset réservé aux PIN oubliés uniquement.

### Priorité 2 — Fiabilité commandes / tables

- [ ] Cluster de bugs ticket/table (voir ADR 004) :
  - Ticket total mal calculé quand basé sur `commandes.total`
  - Realtime channel fire multiple → quantités multipliées côté client
  - Table status "libre" non mis à jour côté client → utiliser RPC
    `update_table_statut` avec SECURITY DEFINER
  - Paiement `especes` : `cloturerTout()` bug de condition
- [ ] Client receipt simplifié : "Merci + total réglé" (pas d'itemisation),
      `sessionStorage` pour bloquer re-order après clôture

### Priorité 3 — Sécurité

- [ ] Traiter les 5 warnings restants du Supabase Advisor (identifier
      intentionnel vs à corriger)
- [ ] Renforcer CSP (retirer `unsafe-inline`)
- [ ] SRI sur scripts externes
- [ ] HSTS preload
- [ ] Upgrade Next.js 14 → 15 (déjà reporté)

### Priorité 4 — Monitoring / routine

- [ ] Configuration alerts Vercel (échec déploiement)
- [ ] Alertes Supabase Edge Functions en erreur
- [ ] Alerte solde bas Twilio
- [ ] Checklist hebdomadaire du lundi matin (rappel automatisé ?)

### Priorité 5 — Refonte design system

- [ ] Extraire les couleurs dans un `src/theme.js` importé partout
- [ ] Créer `src/components/ui/` avec Button, Card, Modal, Badge
- [ ] Tokens (espacements, radius, shadows)

### Priorité 6 — Acquisition et croissance

- [ ] Reprendre contact avec les clients Google OAuth existants
- [ ] Vidéos TikTok pour acquisition (backlog déjà planifié)
- [ ] Améliorer landing page (conversion)

### Priorité 7 — Fonctionnel produit

- [ ] Multi-comptes par restaurant (proprio + gérant + serveur séparés) :
      chantier lourd, reporté à quand 100+ clients justifieront
- [ ] Audit log des actions sensibles (réappro, modif prix, etc.)

---

## 🚫 Refusé / reporté

- **Pixel Facebook** : pas maintenant. Pas d'audience Facebook ni de budget
  pub actif. À reconsidérer quand 100+ clients payants.
- **Multi-agents IA dev** : pas mature en 2026 pour un projet en prod.
  Workflow humain + Claude Code + Claude chat suffit.
- **Migration vers d'autres BaaS** : Supabase couvre 100% des besoins actuels.

---

## Comment ce fichier évolue

- À chaque début de session : lire ce fichier
- À chaque fin de session : mettre à jour l'ordre de priorités si besoin
- Après un chantier fini : archiver dans CHANGELOG.md, retirer d'ici
