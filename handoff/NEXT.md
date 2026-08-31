# Roadmap et backlog — MaquisApp

Ce qu'il faut attaquer, dans quel ordre, avec quelles décisions à prendre.

---

## 🎯 Prochains chantiers (dans l'ordre proposé)

### 1. Bug P1 — hydration post-login (BLOQUANT PROD)
Voir `handoff/CURRENT.md`. Après login, premier rendu du dashboard cassé
(sidebar desktop + contenu mobile), corrigé par hard refresh. Le client en prod
le subit. **Lire l'erreur console EXACTE avant tout fix, ne pas fixer à l'aveugle.**
Bloquant pour le merge main.

### 2. Volet C — card-plat commande manuelle desktop
Layout maquette : grille de cards cliquables + panier latéral persistant à droite
(cf. maquette "Nouvelle commande"). S'appuie sur le schéma multi-tarif du Volet B
(déjà en place). Le prix étant imposé par la table, la card n'a plus besoin de
"Personnaliser" pour le prix — juste − / + pour ajouter au panier. Desktop only,
mobile préservé.

### 3. Refonte desktop du menu public QR
`menu/[slug]/[tableId]/page.js` : surcouche desktop @900px + maquette (grille
cards + panier latéral). Purement visuel, le multi-tarif est déjà branché.
Priorité modérée (scanné au téléphone à ~99 %).

---

## 📋 Backlog priorisé

### Priorité 1 — Fiabilité / dette schéma
- [ ] **Double-décrément stock** : 2 triggers sur `commandes`
      (`decrementer_stock_insert` INSERT + `decrementer_stock_boisson` sur
      transition statut). Le second retape sur valide→servi. À corriger (garde
      sur la transition, ou unifier en un seul mécanisme). Indépendant du Volet B.
- [ ] **Fusion des doublons multi-prix legacy** : les restos autres qu'O'Saveur
      ont encore des articles dupliqués par prix (Beaufort/Bock/Castel…). Les
      fusionner au cas par cas en 1 article + N tarifs (ADR 006) : choisir la
      ligne gagnante, réconcilier stock, créer les tarifs, re-router plat_id.
      Procédure manuelle, prudente, un resto à la fois.

### Priorité 2 — Sécurité (audit à mener)
- [ ] `verify-admin-pin` fait encore confiance à un userId fourni par le client
      → durcir (JWT, comme set-pin).
- [ ] Policies RLS `{public}` généralisées (inclut anon) — revue de menace.
      Plusieurs SELECT en `USING (true)`. En partie voulu (menu QR) mais à
      modéliser. NB : `plat_tarifs` hérite de ce pattern, à durcir en même temps.
- [ ] Traiter les warnings Supabase Advisor restants.
- [ ] Renforcer CSP (retirer unsafe-inline), SRI, HSTS preload.
- [ ] Upgrade Next.js 14 → 15 (reporté).

### Priorité 3 — Design system
- [ ] Extraire les couleurs dans `src/theme.js` importé partout (chaque page a
      encore son objet `C` local).
- [ ] `src/components/ui/` : Button, Card, Modal, Badge.
- [ ] Tokens (espacements, radius, shadows).

### Priorité 4 — FINOPS (selon volume)
- [ ] Compression images côté client avant upload (~4 Mo → ~150 Ko).
- [ ] Déport egress vers Cloudflare R2 quand l'egress chauffe.

### Priorité 5 — Multi-resto (memberships)
Chantier gelé sur `feature/multi-resto`. Voir ADR 005 + MULTI-RESTAURANT-ROADMAP.
À reprendre bien plus tard. Point de vigilance : commit `48ce068` modifie une
migration déjà en prod (`20260520`).

---

## ✅ Terminé récemment (archive)
- **Volet B — tarifs multiples par table (ADR 006)** : schéma + CRUD menu +
  réglage table + commande manuelle + menu public QR. Voir CHANGELOG.
- **Volet A — desktop responsive** : 7 pages dashboard, RestaurantContext,
  @900px. (bug P1 hydration reste ouvert)
- **Retours terrain** : rapport ventes par article, historique fiabilisé,
  regroupement par cloture_id.

---

## Corrections de doc à faire (dette documentaire)
- `DEPLOYMENT.md` affirme à tort que Docker n'est pas requis pour `db pull`/`db dump`.
- `ARCHITECTURE.md` mentionne une route `/dashboard/stats` inexistante.
- Format d'id baseline `20260805` (8 chiffres) vs standard Supabase 14 chiffres.

---

## Comment ce fichier évolue
- Début de session : lire ce fichier + CURRENT.md.
- Fin de session : mettre à jour l'ordre, archiver le fini.