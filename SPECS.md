# MAQUISAPP — SPECS v3.0
# À lire ENTIÈREMENT avant toute modification
# Lis d'abord les fichiers existants concernés, puis applique les corrections

---

## CONSIGNES TECHNIQUES OBLIGATOIRES

- CSS inline style={{}} uniquement — JAMAIS de Tailwind
- Import supabase : adapter le chemin selon le niveau du fichier
  - dashboard/[page]/page.js → import { supabase } from '../../lib/supabase'
  - menu/[slug]/[tableId]/page.js → import { supabase } from '../../../lib/supabase'
  - cuisine/[restaurantId]/page.js → import { supabase } from '../../lib/supabase'
- JAMAIS de createClient() — supabase est déjà une instance exportée
- Font : DM Sans (Google Fonts)
- Couleurs : primary #FF6B35 | dark #1A1A2E | bg #F5F5F5 | green #00C851
- Mobile-first, maxWidth 480px pour les pages dashboard
- NEXT_PUBLIC_APP_URL = https://maquisapp-xi.vercel.app

---

## FICHIERS À MODIFIER

### 1. src/app/auth/login/page.js
**Connexion email OU téléphone dans le même champ**

Le champ de saisie accepte email ou numéro de téléphone.
Détecter automatiquement :
- Si la valeur contient "@" → c'est un email → utiliser signInWithPassword
- Sinon → c'est un téléphone → afficher message "Connexion par téléphone disponible prochainement, utilisez votre email"

Pour l'instant on garde email/password mais le champ placeholder dit
"Email ou numéro de téléphone" et le label dit "Identifiant".

Garder le bouton Google OAuth existant.
Garder le design sombre actuel (#0D0D0D).

---

### 2. src/app/menu/[slug]/[tableId]/page.js
**Bug critique : double commande**

Lire le fichier existant. Le bug vient de envoyerCommande().
Même si un état `sending` existe, il faut s'assurer qu'il est bien
utilisé partout. Vérifier que :

1. La fonction envoyerCommande() a cette structure EXACTE :
```javascript
const [sending, setSending] = useState(false)

async function envoyerCommande() {
  if (sending) return  // bloque immédiatement si déjà en cours
  if (!panier.length || !restaurant || !table) return
  setSending(true)
  try {
    const { data: cmd, error } = await supabase
      .from('commandes')
      .insert({ ... })
      .select().single()
    if (error || !cmd) return
    await supabase.from('commande_items').insert(...)
    setPanier([])
    setShowPanierModal(false)
    setCommandes(prev => [...prev, cmd])
    const { data: newItems } = await supabase
      .from('commande_items').select('*').eq('commande_id', cmd.id)
    setAllItems(prev => ({ ...prev, [cmd.id]: newItems || [] }))
  } finally {
    setSending(false)  // toujours libérer même en cas d'erreur
  }
}
```

2. Le bouton d'envoi dans ModalPanier doit avoir disabled={sending}
3. Ne PAS appeler loadCommandes() après envoi — mettre à jour le state local directement

**Bug : statut table reste "libre" après scan QR**

Quand un client charge la page menu et qu'il y a des commandes actives,
mettre à jour le statut de la table :
```javascript
// Dans loadData(), après avoir chargé les commandes actives :
if (cmds && cmds.length > 0) {
  await supabase.from('tables').update({ statut: 'occupee' }).eq('id', tableId)
}
```

---

### 3. src/app/dashboard/commandes/page.js
**Corrections et nouvelles fonctionnalités**

#### A. Appel serveur — popup flottant avec nom de table

Ajouter un état :
```javascript
const [appelsServeur, setAppelsServeur] = useState([])
// appelsServeur = [{ id, tableNumero, tableZone, createdAt }]
```

Dans le channel Realtime, écouter appels_serveur :
```javascript
.on('postgres_changes', {
  event: 'INSERT', schema: 'public', table: 'appels_serveur',
  filter: `restaurant_id=eq.${restaurant.id}`
}, async (payload) => {
  // Récupérer le numéro de table
  const { data: tbl } = await supabase
    .from('tables').select('numero, zone').eq('id', payload.new.table_id).single()
  setAppelsServeur(prev => [...prev, {
    id: payload.new.id,
    tableNumero: tbl?.numero,
    tableZone: tbl?.zone || 'Salle'
  }])
  jouerSon('serveur')
})
```

Afficher un popup flottant en haut à droite (position: fixed, top: 80px, right: 16px) :
```
┌─────────────────────────────┐
│ 🔔 Appel serveur            │
│ Table 5 • Terrasse          │
│                    [Fermer] │
└─────────────────────────────┘
```
Style : fond #1A1A2E, texte blanc, bordure gauche orange #FF6B35,
border-radius 14px, shadow, animation slideIn depuis la droite.
Bouton Fermer supprime l'appel de l'état ET marque traite=true dans Supabase.

#### B. Demande d'addition — corriger le déclenchement

PROBLÈME ACTUEL : la bannière addition s'affiche quand le gérant clôture,
pas quand le client demande l'addition.

CORRECTION : le client appelle demanderPaiement() qui met mode_paiement
sur les commandes. Le Realtime du gérant doit détecter ce changement.

Dans le channel Realtime commandes, ajouter la détection :
```javascript
// Dans le handler postgres_changes sur commandes :
if (payload.eventType === 'UPDATE' && 
    payload.new.mode_paiement && 
    !payload.old.mode_paiement &&
    !['cloture','annule'].includes(payload.new.statut)) {
  // Récupérer numéro de table
  const { data: tbl } = await supabase
    .from('tables').select('numero').eq('id', payload.new.table_id).single()
  const modeCfg = MODES_PAIEMENT.find(m => m.id === payload.new.mode_paiement)
  setDemandesPaiement(prev => [...prev, {
    id: payload.new.id,
    tableNumero: tbl?.numero,
    mode: modeCfg?.label || payload.new.mode_paiement,
    modeIcon: modeCfg?.icon || '💳'
  }])
  jouerSon('addition')
}
```

#### C. S'assurer que MODES_PAIEMENT est défini en haut du fichier
```javascript
const MODES_PAIEMENT = [
  { id: 'wave',         label: 'Wave',          icon: '🌊' },
  { id: 'orange_money', label: 'Orange Money',  icon: '🟠' },
  { id: 'mtn_money',   label: 'MTN Money',     icon: '💛' },
  { id: 'cash',        label: 'Espèces',       icon: '💵' },
  { id: 'carte',       label: 'Carte bancaire', icon: '💳' },
]
```

---

### 4. src/app/cuisine/[restaurantId]/page.js
**Bug : page ne charge pas avec l'ID dans l'URL**

Lire le fichier existant et vérifier :
1. Le composant reçoit bien params.restaurantId
2. La requête Supabase filtre bien par restaurant_id = restaurantId
3. Pas d'erreur de chemin d'import (doit être '../../lib/supabase')
4. Ajouter un console.log temporaire pour débugger si besoin

Structure attendue :
```javascript
export default function CuisinePage({ params }) {
  const { restaurantId } = params
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurantId) return
    loadCommandes()
    // Realtime
  }, [restaurantId])

  async function loadCommandes() {
    const { data, error } = await supabase
      .from('commandes')
      .select('*, tables(numero, zone), commande_items(*)')
      .eq('restaurant_id', restaurantId)
      .in('statut', ['en_preparation', 'presque_pret'])
      .order('created_at', { ascending: true })
    if (!error) setCommandes(data || [])
    setLoading(false)
  }
}
```

---

### 5. src/app/dashboard/page.js
**Ajouter compteur d'abonnement visible**

Dans le hero (bannière orange en haut du dashboard), après "Bonjour 👋",
afficher le nombre de jours restants d'abonnement :

```javascript
// Calculer les jours restants
const joursRestants = restaurant?.abonnement_fin
  ? Math.ceil((new Date(restaurant.abonnement_fin) - new Date()) / (1000 * 60 * 60 * 24))
  : 0

const statutAbo = restaurant?.abonnement_statut || 'essai'
```

Afficher dans le hero :
- Si statut = 'essai' et joursRestants > 3 :
  Petit badge vert : "✓ Essai gratuit — J-{joursRestants}"
- Si statut = 'essai' et joursRestants <= 3 :
  Badge rouge animé : "⚠️ Essai expire dans {joursRestants} jour(s) — Souscrire"
  → cliquable → router.push('/abonnement')
- Si statut = 'actif' :
  Badge vert : "✓ Abonnement actif — {joursRestants} jours restants"
- Si statut = 'expire' ou 'suspendu' :
  Déjà géré par la redirection vers /abonnement

---

### 6. src/app/admin/page.js
**Vérifier que la page fonctionne**

Lire le fichier existant. S'assurer que :
1. La vérification de l'email admin est correcte (joelyemian5@gmail.com)
2. La liste des restaurants s'affiche avec leurs statuts d'abonnement
3. Les boutons Activer/Suspendre fonctionnent

Pour accéder : aller sur https://maquisapp-xi.vercel.app/admin
quand connecté avec le compte joelyemian5@gmail.com

---

## NOUVEAU FICHIER À CRÉER

### 7. src/app/dashboard/page.js — REFONTE DESIGN (image de référence fournie)

ATTENTION : ne pas casser les fonctionnalités existantes.
Seulement améliorer le design en s'inspirant de l'app grocery verte de la référence.

Changements visuels demandés :
1. Header avec photo/image du restaurant en haut (comme le hero banner de l'app référence)
   → Utiliser restaurant.logo_url si disponible, sinon un gradient orange
   → Hauteur 180px, image en fond avec overlay sombre pour lisibilité
   → Nom du restaurant en blanc par dessus, grand et bold

2. Cards catégories dans la navigation → ajouter des icônes colorées dans des cercles
   (comme les catégories Drink/Fruits/Vegeta dans l'image)
   → Commandes : cercle orange 🍽️
   → Menu : cercle vert 🥘
   → Tables : cercle bleu 🪑
   → Historique : cercle violet 📊

3. Cards statistiques → plus de relief, légère ombre, valeurs plus grandes

4. Conserver TOUTES les fonctionnalités :
   - Commande manuelle
   - Liste commandes en cours
   - Navigation vers les pages
   - Compteur abonnement (ajouté dans cette spec)

---

## RÉCAPITULATIF DES BUGS ET FONCTIONNALITÉS

| # | Fichier | Type | Description |
|---|---------|------|-------------|
| 1 | auth/login | MODIFIER | Champ email OU téléphone (détection auto) |
| 2 | menu/[slug]/[tableId] | BUG FIX | Double commande (état sending strict) |
| 3 | menu/[slug]/[tableId] | BUG FIX | Statut table reste "libre" après scan |
| 4 | dashboard/commandes | BUG FIX | Appel serveur : popup flottant avec numéro table |
| 5 | dashboard/commandes | BUG FIX | Addition : bannière au bon moment (quand client demande, pas à la clôture) |
| 6 | cuisine/[restaurantId] | BUG FIX | Page ne charge pas avec l'ID |
| 7 | dashboard/page.js | FEATURE | Compteur jours abonnement dans le hero |
| 8 | admin/page.js | VÉRIFIER | Fonctionnement panel admin |
| 9 | dashboard/page.js | DESIGN | Refonte visuelle inspirée image référence |

---

## FICHIERS À NE PAS TOUCHER

- src/app/page.js (landing)
- src/app/auth/register/page.js
- src/app/auth/callback/page.js
- src/app/dashboard/menu/page.js
- src/app/dashboard/tables/page.js
- src/app/dashboard/historique/page.js
- src/app/dashboard/parametres/page.js
- src/app/abonnement/page.js

---

## APRÈS LES MODIFICATIONS

```bash
git add .
git commit -m "fix: double commande + appel serveur + addition + cuisine + design dashboard"
git push origin main
```