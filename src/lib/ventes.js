// Fonctions pures de calcul sur les ventes (commandes / commande_items).
// Aucun appel réseau, aucun import Supabase, aucun JSX.
// Réutilisées par les rapports du dashboard (historique, articles, sessions).

// Dérive le total d'UNE commande à partir de ses items (jamais de commandes.total).
export function deriverTotalCommande(items) {
  if (!items) return 0;
  return items.reduce((sum, it) => {
    const prix = Number(it?.prix_unitaire) || 0;
    const qte = Number(it?.quantite) || 0;
    return sum + prix * qte;
  }, 0);
}

// Regroupe un tableau plat de commande_items (plusieurs commandes) par commande_id.
export function indexerItemsParCommande(items) {
  if (!items) return {};
  return items.reduce((acc, it) => {
    const cid = it.commande_id;
    if (!acc[cid]) acc[cid] = [];
    acc[cid].push(it);
    return acc;
  }, {});
}

// Agrège des items (toutes commandes confondues) par nom_plat.
// Retourne [{ nom, quantite, montant }] trié par montant puis quantite décroissants.
export function agregerParArticle(items) {
  if (!items || items.length === 0) return [];
  const parNom = {};
  for (const it of items) {
    const nom = it.nom_plat;
    const prix = Number(it?.prix_unitaire) || 0;
    const qte = Number(it?.quantite) || 0;
    if (!parNom[nom]) parNom[nom] = { nom, quantite: 0, montant: 0 };
    parNom[nom].quantite += qte;
    parNom[nom].montant += prix * qte;
  }
  return Object.values(parNom).sort((a, b) => {
    if (b.montant !== a.montant) return b.montant - a.montant;
    return b.quantite - a.quantite;
  });
}

// Regroupe les commandes en sessions (repas) par encaissement réel : les commandes
// partageant le même cloture_id (clôturées ensemble) forment une session ; une
// commande sans cloture_id (clôturée avant l'introduction de ce tampon, ou hors
// flux de clôture groupée) forme sa propre session solo.
export function grouperSessions(commandes, itemsParCmd) {
  if (!commandes || commandes.length === 0) return [];

  // Grouper par clé d'encaissement : cloture_id si présent, sinon clé solo par commande.
  const parCle = {};
  for (const c of commandes) {
    const cle = c.cloture_id != null ? c.cloture_id : `solo:${c.id}`;
    if (!parCle[cle]) parCle[cle] = [];
    parCle[cle].push(c);
  }

  return Object.values(parCle)
    .map((groupe) => {
      const cmds = [...groupe].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      const total = cmds.reduce(
        (sum, c) => sum + deriverTotalCommande(itemsParCmd[c.id]),
        0
      );
      const modes = [...new Set(cmds.map((c) => c.mode_paiement).filter(Boolean))];
      return {
        tableId: cmds[0].table_id,
        cmds,
        total,
        nbCommandes: cmds.length,
        debut: cmds[0].created_at,
        fin: cmds[cmds.length - 1].created_at,
        modes,
      };
    })
    .sort((a, b) => new Date(b.fin) - new Date(a.fin));
}
