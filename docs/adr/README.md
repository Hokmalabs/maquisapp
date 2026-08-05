# Architecture Decision Records (ADR)

Chaque décision d'architecture significative est documentée ici avec :
- Le contexte
- Les options envisagées
- La décision prise
- Les conséquences

Format inspiré de Michael Nygard.

---

## Index

- [001 — Auth téléphone + PIN 4 chiffres](001-auth-pin.md)
- [002 — Policy RLS super_admin sur commandes](002-rls-super-admin.md)
- [003 — Mode admin PIN pour réappro stock](003-mode-admin-stock.md)
- [004 — Totaux commande depuis commande_items](004-totals-from-items.md)

---

## Comment créer un nouveau ADR

1. Créer un fichier `NNN-titre-court.md` (numéro incrémenté)
2. Suivre le template ci-dessous
3. Ajouter au sommaire ci-dessus

### Template

```markdown
# NNN — Titre de la décision

**Date :** YYYY-MM-DD
**Statut :** Proposed / Accepted / Deprecated / Superseded by NNN

## Contexte

[Quel problème on cherche à résoudre ? Quelles contraintes ?]

## Options envisagées

### Option A — [nom]
- Avantages : ...
- Inconvénients : ...

### Option B — [nom]
- Avantages : ...
- Inconvénients : ...

## Décision

[Option retenue et pourquoi]

## Conséquences

- Positives : ...
- Négatives : ...
- Ce qu'on doit surveiller : ...
```
