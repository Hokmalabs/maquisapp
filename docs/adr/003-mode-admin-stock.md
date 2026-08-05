# 003 — Mode admin PIN pour réappro stock

**Date :** 2026-05
**Statut :** Accepted

## Contexte

Un propriétaire client a signalé que dans son modèle d'usage, proprio et
gérant partagent le même compte MaquisApp. Le gérant peut alors faire des
réapprovisionnements de stock boissons et fausser les comptes.

Besoin : empêcher le gérant de faire les réappros sans embarrasser
l'expérience si le proprio veut lui-même faire des réappros multiples.

## Options envisagées

### Option A — Système multi-comptes (proprio + gérant + serveur)
- Avantages : propre, séparation des rôles réelle
- Inconvénients : gros chantier (2-3 jours), système d'invitation, permissions
  par page, pas prêt pour V1

### Option B — PIN par action (chaque bouton Réappro demande PIN)
- Avantages : granulaire
- Inconvénients : friction énorme si beaucoup de réappros à faire

### Option C — Bouton unique "Mode admin" qui déverrouille tous les réappros
- Avantages : friction minimale, réutilise le PIN existant
- Inconvénients : ne couvre que la réappro (autres actions sensibles non protégées)

## Décision

**Option C** pour la V1.

Implémentation :
- Nouvelle Edge Function `verify-admin-pin` (bcrypt contre `profiles.pin_hash`)
- Bouton "🔒 Mode admin verrouillé" en haut de la page stock
- Modal PIN 4 chiffres au clic
- Une fois vérifié : boutons "📦 Réappro." cliquables
- Verrouillage automatique à la sortie de page (state React local)

L'Option A reste sur la roadmap pour plus tard (quand 100+ clients justifieront
le chantier).

## Conséquences

### Positives
- Répond au feedback client réel
- Implémentation rapide (~1h30)
- Pas de friction pour le proprio (1 PIN à taper puis tout est débloqué)

### Négatives
- Ne couvre pas les autres actions sensibles (menu, prix, tables)
- Un gérant curieux peut essayer de brute-forcer le PIN
  (mais sans lockout, échoue silencieusement)

### Ce qu'on surveille
- Feedback usage : est-ce que les proprios activent réellement le mode admin ?
- Nombre d'échecs PIN admin par jour (à venir : audit log)
