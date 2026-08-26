# Roadmap et backlog — MaquisApp

Ce qu'il faut attaquer, dans quel ordre, avec quelles décisions à prendre.

---

## 🎯 Chantier actif : 2 retours terrain (resto "L'Assiette Savoureuse de PM")

Retours d'usage réel d'un resto client qui utilise uniquement la commande
manuelle. À traiter en priorité. Ordre proposé : Retour 2 d'abord (simple,
sans risque), puis Retour 1.

### Retour 1 — Regroupement dans l'Historique

Dans l'écran "Commandes", les commandes multiples d'une même table sont
regroupées (ex : Table 2 · 2 commandes · 10 000 F). Mais dans "Historique",
après encaissement, ces mêmes commandes réapparaissent éclatées ligne par
ligne. **Objectif** : regrouper l'historique par table/session comme le fait
l'écran Commandes.

- Pas de `session_id` en base : les commandes d'une table ne sont liées que
  par `table_id`. L'écran Commandes regroupe en mémoire côté client (fonction
  `grouperParTable`). Appliquer la même logique à l'historique : grouper les
  commandes clôturées par table + tranche de temps (une "session" = les
  commandes d'une table entre deux clôtures).

### Retour 2 — Rapport de ventes par article

Le resto veut connaître les quantités vendues par article sur une période
(ex : aujourd'hui 15 Beaufort, 5 poulet…), avec quantité + montant, et
idéalement un graphique du top des ventes par période.

- Agrégation sur `commande_items` (SUM `quantite`, GROUP BY `nom_plat`,
  filtré par période, montant = SUM `prix_unitaire * quantite`). Pur ajout,
  lecture seule, aucun risque sur l'existant.

### ⚠️ Cause commune (dette à corriger au passage)

L'écran Historique (`src/app/dashboard/historique/page.js`) lit
`commandes.total` directement pour le CA et les rapports, au lieu de dériver
depuis `commande_items` — **interdit par CLAUDE.md** (totaux TOUJOURS depuis
`commande_items`). L'écran Commandes fait bien les choses (fonction
`ouvrirGroupe` recalcule le vrai total depuis `commande_items` avant clôture),
mais l'Historique n'a pas cette protection. Les deux retours se traitent au
même endroit → occasion de corriger cette dette.

**Fichiers clés identifiés :**
- `src/app/dashboard/historique/page.js` (413 l.) — requête L124-146, lit `commandes.total`
- `src/app/dashboard/commandes/page.js` — clôture : `changerStatut`, `cloturerTout`, `ouvrirGroupe`
- `src/app/dashboard/page.js` — commande manuelle : `envoyerCmdManuelle` L250-267, `grouperParTable`

---

## ⏸️ En pause

### Refonte du portail admin (back-office)

Maquette de structure validée (sidebar + sous-routes : Vue d'ensemble,
Restaurants, Abonnements, Revenus, Utilisateurs, Support, Logs ; priorité au
cycle de vie abonnement essai→payant→relance ; paiements pointés à la main).
Décisions techniques prises : contrôle d'accès par `role='super_admin'` (au
lieu de l'email en dur), Recharts pour les graphes, layout + sous-routes,
bouton "Supprimer compte" via RPC `SECURITY DEFINER`. **À reprendre après les
retours terrain.**

### Multi-resto (memberships)

Chantier gelé sur la branche `feature/multi-resto` (6 commits). Fondation
posée (table `restaurant_memberships`, RLS durcies, onboarding modifié) mais
non pushée, non en prod. À reprendre après les sprints actuels. Point de
vigilance : le commit `48ce068` modifie une migration déjà en prod (`20260520`).

---

## 📋 Backlog priorisé

### Priorité 1 — Bugs / correctifs

- [ ] **Bouton "Changer mot de passe"** dans page profil : à vérifier /
      wire vers Edge Function de changement de PIN (ancien PIN + nouveau).
      SMS OTP reset réservé aux PIN oubliés uniquement.

### Priorité 2 — Fiabilité commandes / tables

- [ ] Cluster de bugs ticket/table (voir ADR 004) :
  - Ticket total mal calculé quand basé sur `commandes.total` (traité en
    partie par les retours terrain)
  - Realtime channel fire multiple → quantités multipliées côté client
  - Table status "libre" non mis à jour côté client → utiliser RPC
    `update_table_statut` avec SECURITY DEFINER
  - Paiement `especes` : `cloturerTout()` bug de condition
- [ ] **Risque de double décrémentation stock** : deux triggers
      (`decrementer_stock_insert` sur INSERT + `decrementer_stock_boisson` sur
      UPDATE) peuvent décrémenter deux fois si une commande est créée
      directement en `valide`/`servi`. À auditer avant d'étendre les flux.

### Priorité 3 — Sécurité (audit à mener)

- [ ] **Policies RLS trop permissives** : plusieurs SELECT en `USING (true)`
      (`plats`, `categories`, `tables` lisibles par tous) et `restaurants`
      lisible dès que `slug IS NOT NULL` → exposition de données entre restos.
      En partie voulu (menu QR public) mais à modéliser dans une revue de menace.
- [ ] Toutes les policies sont sur le rôle `{public}` (inclut anon) — à revoir.
- [ ] Traiter les 5 warnings restants du Supabase Advisor
- [ ] Renforcer CSP (retirer `unsafe-inline`), SRI, HSTS preload
- [ ] Upgrade Next.js 14 → 15 (reporté)

### Priorité 4 — FINOPS (à déclencher selon le volume)

- [ ] **Passage Supabase Pro** : dès le 1er resto payant (pas d'auto-pause,
      backups). Tient à ~25$/mois jusqu'à ~100 restos SI les images sont maîtrisées.
- [ ] **Compression images côté client** avant upload (le levier le plus
      rentable : ~4 Mo → ~150 Ko, divise l'egress par ~25).
- [ ] **Déport egress vers Cloudflare R2** quand l'egress commence à chauffer
      (zéro frais d'egress vs Supabase Storage).

### Priorité 5 — Refonte design system

- [ ] Extraire les couleurs dans un `src/theme.js` importé partout
- [ ] Créer `src/components/ui/` avec Button, Card, Modal, Badge
- [ ] Tokens (espacements, radius, shadows)

### Priorité 6 — Acquisition et croissance

- [ ] Reprendre contact avec les clients Google OAuth existants
- [ ] Vidéos TikTok pour acquisition
- [ ] Améliorer landing page (conversion)

---

## 🚫 Refusé / reporté

- **Pixel Facebook** : pas maintenant. À reconsidérer à 100+ clients payants.
- **Migration vers d'autres BaaS** : Supabase couvre 100% des besoins actuels.

---

## Corrections de doc à faire (dette documentaire)

- `DEPLOYMENT.md` affirme à tort que "Docker n'a pas besoin d'être running" —
  faux pour `db pull`/`db dump`. À corriger.
- `ARCHITECTURE.md` mentionne une route `/dashboard/stats` qui n'existe pas.
- Format d'identifiant de la baseline (`20260805`, 8 chiffres) à renommer un
  jour en `20260805000000` (14 chiffres) pour conformité Supabase.

---

## Comment ce fichier évolue

- À chaque début de session : lire ce fichier
- À chaque fin de session : mettre à jour l'ordre de priorités si besoin
- Après un chantier fini : archiver dans CHANGELOG.md, retirer d'ici