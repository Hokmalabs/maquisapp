# 001 — Auth téléphone + PIN 4 chiffres

**Date :** 2026-05
**Statut :** Accepted

## Contexte

MaquisApp cible des restaurateurs ivoiriens. Beaucoup n'ont pas d'email
professionnel régulier mais ont tous un numéro de téléphone. Les mots de passe
longs sont un frein UX sur mobile.

## Options envisagées

### Option A — Email + mot de passe classique
- Avantages : standard, Supabase le gère nativement
- Inconvénients : friction inscription, oubli fréquent

### Option B — Google OAuth seulement
- Avantages : zéro friction pour ceux qui ont Google
- Inconvénients : dépendance Google, minorité en CI n'a pas de compte pro

### Option C — Téléphone + PIN 4 chiffres (via OTP SMS)
- Avantages : UX familière (comme Mobile Money), rapide sur mobile
- Inconvénients : coût SMS Twilio, sécurité PIN 4 chiffres à muscler

## Décision

**Option C principale + Option B en secondaire.**

Le flow principal est téléphone + PIN. Google OAuth reste dispo pour ceux
qui préfèrent (représente une petite minorité des inscriptions).

Sécurité PIN musclée par :
- Bcrypt côté serveur (jamais en clair)
- Lockout 5 min après 5 échecs
- OTP SMS pour reset (jamais par email)

## Conséquences

### Positives
- Inscription en moins de 2 minutes sur mobile
- Reconnexion instantanée sur mobile (juste 4 chiffres à taper)
- Cohérent avec l'expérience Mobile Money du marché

### Négatives
- Coût SMS Twilio à chaque signup / reset (~0.05$/OTP)
- Complexité du flow (5 Edge Functions dédiées)
- PIN 4 chiffres = 10000 combinaisons, brute-force théorique possible

### Ce qu'on surveille
- Coût SMS mensuel (Twilio dashboard)
- Taux d'échec OTP (Edge Function logs)
- Taux d'abandon inscription
