# 002 — Policy RLS super_admin sur commandes

**Date :** 2026-05-20
**Statut :** Accepted

## Contexte

La RLS par défaut sur `commandes` filtre par `restaurant_id` du profile
connecté. Le super_admin (Joel) ne voyait donc que les commandes de SON
restaurant test, pas celles des autres clients.

Bug détecté : le portail `/admin` affichait 0 commandes pour tous les
restaurants alors qu'il y en avait beaucoup en BDD.

## Options envisagées

### Option A — Bypass RLS côté serveur avec service_role_key
- Avantages : pas de policy à maintenir
- Inconvénients : nécessite d'appeler une Edge Function, service_role_key
  côté client jamais acceptable

### Option B — Nouvelle policy SELECT qui inclut super_admin
- Avantages : reste dans le modèle RLS Supabase, cohérent
- Inconvénients : chaque table qui doit être visible par super_admin
  demandera sa propre policy

### Option C — Fonction Postgres SECURITY DEFINER dédiée
- Avantages : contourne RLS élégamment
- Inconvénients : plus complexe, pas nécessaire pour un simple SELECT

## Décision

**Option B.** Nouvelle policy SELECT sur `commandes` :

```sql
CREATE POLICY "Commandes visibles correctement"
ON commandes FOR SELECT TO public
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  OR restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  OR (auth.uid() IS NULL AND table_id IS NOT NULL)
);
```

Migration : `supabase/migrations/20260520_admin_can_see_all_orders.sql`

## Conséquences

### Positives
- Super_admin voit tout depuis le portail admin
- Modèle RLS conservé
- Client anonyme (scan QR) continue de voir les commandes de sa table

### Négatives
- À reproduire sur toutes les autres tables où super_admin doit voir tout
  (restaurants, profiles, plats, etc. — à vérifier au cas par cas)

### Ce qu'on surveille
- Performances : chaque policy inclut un EXISTS sur profiles, peu coûteux
  mais à monitorer si beaucoup de restaurants
