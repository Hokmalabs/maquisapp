# État actuel — MaquisApp

**Session en cours :** Reprise après ~3 mois de pause + documentation complète

---

## Contexte de la session

Joel Yemian reprend MaquisApp après une longue pause. Cette session a servi à :

1. Vérifier l'accès au compte super_admin
2. **Découvrir et remédier un incident de sécurité** : la mémoire de l'agent
   contenait des secrets (PIN, userId, project ref, numéros perso) qui ont été
   restitués en clair dans le chat. Décision de nettoyer la mémoire et de
   changer le PIN.
3. Créer une documentation complète du projet (ce dossier + `docs/`)
4. Préparer un handoff propre pour les prochaines sessions

---

## Où en est le produit ?

- **Prod live** : https://www.maquisapp.com
- **Dernière session code** : mai 2026
- **Nombre de clients** : à vérifier au démarrage de session
- **Bugs récents connus** : voir NEXT.md (cluster tickets/tables, bouton
  "changer PIN" non fonctionnel)

---

## Chantiers immédiats

### 1. Bug urgent en cours

Un bug urgent a été mentionné juste avant la fin de session mais **n'a pas
été précisé**. À expliciter dès le début de la prochaine conversation.

### 2. Refonte du portail admin (chantier principal)

Objectif : transformer `src/app/admin/page.js` (simple liste) en un vrai
dashboard super_admin avec sidebar, menus (Restaurants, Utilisateurs, Revenus,
Abonnements, Support, Logs), et métriques clés (MRR, restos actifs, alertes).

Détails et décisions à prendre : voir NEXT.md.

---

## Actions de sécurité effectuées

- Ajout de 3 règles persistantes dans la mémoire user Claude :
  1. Ne jamais afficher de secret en clair dans le chat
  2. Exclure définitivement PIN, userId, project ref, numéros perso
  3. Pour retrouver des accès, rediriger vers Supabase Studio directement
- Documentation `SECURITY.md` créée
- Documentation `SECRETS.md` créée (indique OÙ sont les secrets, jamais QUOI)

## Actions de sécurité à effectuer par Joel (checklist)

- [ ] Vérifier que `_secrets/` est bien dans `.gitignore`
- [ ] Changer le PIN via Supabase SQL Editor ou via l'app
- [ ] Supprimer la conversation Claude qui contenait les secrets en clair
- [ ] Ouvrir une nouvelle conversation avec le prompt de continuation
  (voir plus bas)

---

## Prompt de continuation pour la prochaine conversation

Copier-coller au démarrage de la nouvelle conversation Claude :

```
Salut Claude, je suis Joel Yemian, fondateur de Hokma Labs et de MaquisApp
(SaaS de gestion de restaurant pour le marché ivoirien).

Je reprends après une pause. Pour te mettre en contexte rapidement :

1. Lis dans l'ordre :
   - CLAUDE.md (racine) — règles absolues
   - handoff/CURRENT.md — état de session actuel
   - handoff/NEXT.md — backlog priorisé
   - docs/README.md — index de la doc

2. Après lecture, résume-moi en 5 lignes max :
   - Ce qui a été fait à la dernière session
   - Ce qui doit être attaqué en priorité
   - Les règles de collaboration que tu vas respecter

3. J'ai un bug urgent que je vais te décrire. On le traite AVANT tout autre
   chantier.

4. Une fois le bug fixé, on attaque la refonte du portail admin
   (voir section "Chantier en cours" dans NEXT.md).

Règles absolues à respecter (rappelées dans CLAUDE.md) :
- Jamais de secret en clair dans le chat
- Toujours travailler sur branche `develop`, jamais `main` direct
- Pour du code > 50 lignes, livrer le fichier complet
- Être direct, tranché, proactif

Confirme-moi que tu as bien lu les fichiers, puis on démarre par le bug urgent.
```

---

## Notes de session

- Documentation créée : 4 fichiers `docs/*.md` (README, ARCHITECTURE, DESIGN_SYSTEM,
  DATABASE, SECURITY, DEPLOYMENT, ONBOARDING) + 5 ADR
- Handoff créés : 4 fichiers `handoff/*.md` (CURRENT, NEXT, CHANGELOG, SECRETS)
- Fichiers racine créés : `CLAUDE.md`, `AGENT.md`
- Update `.gitignore` : ajout `_secrets/` si absent

---

## Statut Git au moment du handoff

- Branche : `develop` (à vérifier avec `git status`)
- Fichiers créés à commiter :
  - `CLAUDE.md`
  - `AGENT.md`
  - `docs/` (tous les fichiers)
  - `handoff/` (tous les fichiers)
  - `.gitignore` (si modifié)

Commit suggéré :
```
docs: bootstrap documentation projet (CLAUDE.md, AGENT.md, docs/, handoff/)
```
