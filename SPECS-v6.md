# MAQUISAPP — SPECS v6.0
# Lis ce fichier entièrement puis lis chaque fichier concerné avant de modifier

---

## CONSIGNES TECHNIQUES OBLIGATOIRES

- CSS inline style={{}} uniquement — JAMAIS de Tailwind
- Import supabase : adapter le chemin selon le niveau du fichier
- JAMAIS de createClient()
- Font : DM Sans, couleurs : #FF6B35 | #1A1A2E | #F5F5F5 | #00C851
- Mobile-first, maxWidth 480px dashboard

---

## BUG 1 — Reçu client avec montants aléatoires
## Fichier : src/app/menu/[slug]/[tableId]/page.js

### Cause identifiée
La fonction afficherRecu() est parfois appelée plusieurs fois à cause
du channel Realtime qui déclenche plusieurs events 'cloture' successifs.
Même avec recuEnCours.current, les items sont chargés plusieurs fois
et s'accumulent dans allItemsRecu.

### Correction complète de afficherRecu()

```javascript
async function afficherRecu() {
  // Protection absolue contre les appels multiples
  if (recuEnCours.current) return;
  recuEnCours.current = true;

  try {
    // Récupérer TOUTES les commandes clôturées de cette table
    const { data: cmdsCloturees } = await supabase
      .from('commandes')
      .select('*')
      .eq('table_id', tableId)
      .eq('statut', 'cloture')
      .order('created_at', { ascending: true });

    if (!cmdsCloturees?.length) return;

    const cmdIds = cmdsCloturees.map(c => c.id);

    // UNE SEULE requête pour tous les items — pas de boucle
    const { data: tousLesItems } = await supabase
      .from('commande_items')
      .select('*')
      .in('commande_id', cmdIds);

    // Calculer le total depuis les items (source de vérité)
    // PAS depuis commandes.total qui peut être incorrect
    const items = tousLesItems || [];
    const totalGeneral = items.reduce((s, item) => s + (item.prix_unitaire * item.quantite), 0);

    const modePaie = cmdsCloturees[cmdsCloturees.length - 1]?.mode_paiement || '';
    const { data: tblFresh } = await supabase
      .from('tables').select('*').eq('id', tableId).single();

    setRecuData({
      restaurant,
      table: tblFresh,
      commandes: cmdsCloturees,
      items,           // liste brute des items
      total: totalGeneral,  // calculé depuis les items
      modePaiement: modePaie,
      date: new Date(),
    });

    setCommandes([]);
    setAllItems({});
    setTableCloturee(true);
    setShowRecu(true);
  } catch (err) {
    console.error('afficherRecu error:', err);
    recuEnCours.current = false; // reset seulement en cas d'erreur
  }
}
```

### Correction de RecuNumerique — grouper sans multiplier

Dans la fonction RecuNumerique, le groupement des items doit
utiliser l'ID de la commande comme partie de la clé pour éviter
les doublons entre commandes différentes :

```javascript
function RecuNumerique({ data, onClose, tableCloturee }) {
  const { restaurant, table, items, total, modePaiement, date, commandes } = data;

  // Grouper les items par nom+prix — sommer les quantités
  // Ne PAS utiliser commande_id dans la clé pour consolider
  const itemsGroupes = {};
  for (const item of items) {
    const key = `${item.nom_plat}__${item.prix_unitaire}`;
    if (itemsGroupes[key]) {
      itemsGroupes[key].quantite += item.quantite;
      itemsGroupes[key].total += item.prix_unitaire * item.quantite;
    } else {
      itemsGroupes[key] = {
        nom: item.nom_plat,
        quantite: item.quantite,
        prix: item.prix_unitaire,
        total: item.prix_unitaire * item.quantite,
      };
    }
  }
  const lignes = Object.values(itemsGroupes);

  // Vérification : le total affiché = somme des lignes
  const totalVerifie = lignes.reduce((s, l) => s + l.total, 0);
  // Utiliser totalVerifie (calculé depuis items) plutôt que total (passé en prop)
  // pour éviter toute incohérence

  // ... reste du composant identique mais utiliser totalVerifie
}
```

### Vérifier aussi dans le channel Realtime

Le handler 'cloture' doit avoir une double protection :

```javascript
} else if (s === 'cloture') {
  // Double protection
  if (recuEnCours.current) return;

  // Vérifier qu'il ne reste AUCUNE commande active
  const { data: remaining } = await supabase
    .from('commandes')
    .select('id')
    .eq('table_id', tableId)
    .in('statut', ['en_attente','valide','en_preparation','presque_pret','servi']);

  if (!remaining?.length) {
    // Petit délai pour s'assurer que tous les events sont reçus
    // avant de charger le reçu
    setTimeout(async () => {
      if (!recuEnCours.current) {
        await afficherRecu();
      }
    }, 800);
  } else {
    setCommandes(prev => prev.filter(c => c.id !== payload.new.id));
    setAllItems(prev => {
      const next = { ...prev };
      delete next[payload.new.id];
      return next;
    });
  }
}
```

---

## BUG 2 — Statut table reste "libre"
## Fichier : src/app/menu/[slug]/[tableId]/page.js

Ce bug persiste. La cause probable : les RLS (Row Level Security)
de Supabase bloquent la mise à jour de la table par un utilisateur
non authentifié (le client n'est pas connecté).

### Solution : utiliser une fonction RPC Supabase sans auth

Remplacer les appels directs :
```javascript
await supabase.from('tables').update({ statut: 'occupee' }).eq('id', tableId)
```

Par une approche qui contourne les RLS côté client.

OPTION A — Vérifier si les RLS bloquent en loggant l'erreur :
```javascript
async function marquerTableOccupee(tid) {
  const { error } = await supabase
    .from('tables')
    .update({ statut: 'occupee' })
    .eq('id', tid);
  if (error) {
    console.error('Erreur update table statut:', error.message, error.code);
  }
}
```

Appeler cette fonction dans loadCommandes() et envoyerCommande()
et vérifier dans la console du navigateur si une erreur RLS apparaît.

OPTION B — Si RLS bloque, créer une fonction SQL dans Supabase :
Ajouter dans le SQL Editor de Supabase :
```sql
CREATE OR REPLACE FUNCTION update_table_statut(table_id uuid, nouveau_statut text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tables SET statut = nouveau_statut WHERE id = table_id;
END;
$$;
```

Puis l'appeler depuis Next.js :
```javascript
await supabase.rpc('update_table_statut', {
  table_id: tableId,
  nouveau_statut: 'occupee'
});
```

Pour l'instant, implémenter l'OPTION A avec le logging d'erreur
pour diagnostiquer. Si error.code = '42501' (RLS violation),
implémenter l'OPTION B.

---

## FONCTIONNALITÉ — Lien écran cuisine dans Paramètres
## Fichier : src/app/dashboard/parametres/page.js

Lire le fichier existant. Ajouter une section "Écran Cuisine" visible
dans la page paramètres.

Ajouter après la section des informations du restaurant (ou à la fin
avant le bouton de déconnexion) une nouvelle carte :

```javascript
// Section Écran Cuisine
const cuisineUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://maquisapp-xi.vercel.app'}/cuisine/${restaurant?.id}`;

// Afficher cette card :
<div style={{
  background: C.dark, borderRadius: 16, padding: '18px',
  margin: '0 16px 12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
}}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
    <div style={{
      width: 40, height: 40, borderRadius: 12,
      background: '#FF6B35', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: 20
    }}>👨‍🍳</div>
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Écran Cuisine</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
        Affichez les commandes en cuisine
      </div>
    </div>
  </div>

  <div style={{
    background: 'rgba(255,255,255,.08)', borderRadius: 10,
    padding: '10px 12px', marginBottom: 12,
    fontSize: 11, color: 'rgba(255,255,255,.7)',
    wordBreak: 'break-all', fontFamily: 'monospace'
  }}>
    {cuisineUrl}
  </div>

  <div style={{ display: 'flex', gap: 8 }}>
    <button
      onClick={() => {
        navigator.clipboard.writeText(cuisineUrl);
        // Afficher feedback "Copié !"
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        flex: 1, background: '#FF6B35', border: 'none',
        borderRadius: 10, padding: '10px', fontSize: 12,
        fontWeight: 700, color: '#fff', cursor: 'pointer',
        fontFamily: 'inherit'
      }}>
      {copied ? '✅ Copié !' : '📋 Copier le lien'}
    </button>
    <button
      onClick={() => window.open(cuisineUrl, '_blank')}
      style={{
        flex: 1, background: 'rgba(255,255,255,.1)', border: 'none',
        borderRadius: 10, padding: '10px', fontSize: 12,
        fontWeight: 700, color: '#fff', cursor: 'pointer',
        fontFamily: 'inherit'
      }}>
      🔗 Ouvrir
    </button>
  </div>

  <div style={{
    marginTop: 10, fontSize: 11,
    color: 'rgba(255,255,255,.4)', textAlign: 'center'
  }}>
    Ouvrez ce lien sur la tablette ou l'écran de votre cuisine
  </div>
</div>
```

Ajouter l'état : const [copied, setCopied] = useState(false)

---

## RÉCAPITULATIF

| # | Fichier | Type | Description |
|---|---------|------|-------------|
| 1 | menu/[slug]/[tableId]/page.js | BUG FIX | Reçu client : montants corrects, groupement sans doublons |
| 2 | menu/[slug]/[tableId]/page.js | BUG FIX | Statut table occupée avec diagnostic RLS |
| 3 | dashboard/parametres/page.js | FEATURE | Section écran cuisine avec lien + bouton copier |

---

## FICHIERS À NE PAS TOUCHER

Tous les autres fichiers.

---
