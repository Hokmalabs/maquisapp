-- Migration : super_admin peut voir toutes les commandes
-- Date : 20 mai 2026
-- Contexte : Le RLS de la table commandes filtrait par restaurant_id du profile
-- du user authentifié. Le super_admin ne voyait donc que les commandes de SON resto.

DROP POLICY IF EXISTS "Commandes visibles correctement" ON commandes;

CREATE POLICY "Commandes visibles correctement"
ON commandes
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
  OR restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  )
  OR (auth.uid() IS NULL AND table_id IS NOT NULL)
);