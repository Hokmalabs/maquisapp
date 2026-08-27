-- Ajoute un identifiant d'encaissement commun aux commandes cloturees ensemble.
-- Permet a l'Historique de regrouper les commandes par encaissement reel plutot
-- que par proximite temporelle.
--
-- NULL = commande cloturee avant l'introduction de ce tampon (pas de backfill) :
-- elle reste isolee (session solo) dans l'Historique.
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS cloture_id uuid;

CREATE INDEX IF NOT EXISTS idx_commandes_cloture_id ON public.commandes (cloture_id);
