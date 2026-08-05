# AGENT.md — Guide pour agents IA

Ce fichier s'adresse à tout agent IA (Claude Code, Cursor, Windsurf, etc.)
travaillant sur MaquisApp.

Pour le contexte projet complet, lire d'abord `CLAUDE.md` à la racine.

---

## Priorités de lecture au démarrage

1. `CLAUDE.md` — règles absolues et contexte
2. `handoff/CURRENT.md` — état actuel
3. `handoff/NEXT.md` — priorités
4. `docs/README.md` — index de la documentation

---

## Ce que tu peux faire sans confirmation

- Lire n'importe quel fichier du repo
- Proposer des refactors avec exemples
- Créer une branche de travail depuis `develop`
- Écrire des tests locaux
- Suggérer des migrations SQL (sans les appliquer)

---

## Ce qui EXIGE confirmation humaine

- Modifier un fichier existant en production
- Créer / supprimer une Edge Function
- Appliquer une migration SQL Supabase
- Modifier une RLS policy
- Merge sur `main`
- Push en prod
- Toute rotation de clé ou token

---

## Ce que tu ne dois JAMAIS faire

- Coller un secret en clair dans le chat, le code, ou une réponse
- Committer un fichier dans `_secrets/`
- Committer directement sur `main`
- Appeler l'API Twilio avec un vrai numéro sans autorisation explicite
- Supprimer des données en BDD sans backup préalable
- Modifier le fichier `CLAUDE.md` sans discussion

---

## Comment poser une question ambiguë

Structure recommandée :
1. Ce que je veux faire
2. 2-3 options envisagées
3. Ma recommandation (avec justification courte)
4. Ce qui me manque pour trancher

Attendre la réponse humaine avant d'exécuter.

---

## Format de sortie préféré

- **Code long (>50 lignes)** : fichier complet en un seul bloc
- **Code court** : snippet inline avec le chemin du fichier au-dessus
- **Explications** : puces courtes, pas de blocs de prose épais
- **Décisions** : reco tranchée en 1 ligne, puis alternatives

---

## Débogage

Ordre standard :
1. Lire les logs Vercel (pour le frontend Next.js)
2. Lire les logs Supabase Edge Functions
3. Lire Sentry (erreurs client + server)
4. Query directe Supabase pour vérifier l'état BDD
5. Reproduire localement avec `npm run dev`

---

## Limites de session

Si tu approches d'une limite de tokens / quota :
1. **Ne pas mentir** sur ce qui est fini vs pas fini
2. Écrire un **résumé de session** dans `handoff/CURRENT.md`
3. Mettre à jour `handoff/NEXT.md` avec ce qui reste
4. Committer avec un message clair `wip: [description]`
5. Ne PAS push si le code est cassé
