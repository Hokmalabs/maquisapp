# MAQUISAPP — SPECS v4.0
# Lis ce fichier entièrement puis lis chaque fichier concerné avant de modifier

---

## CONSIGNES TECHNIQUES OBLIGATOIRES

- CSS inline style={{}} uniquement — JAMAIS de Tailwind
- Import supabase : adapter le chemin selon le niveau
- JAMAIS de createClient()
- Font : DM Sans, couleurs : #FF6B35 | #1A1A2E | #F5F5F5 | #00C851
- Mobile-first, maxWidth 480px dashboard

---

## BUG 1 — Double commande (src/app/menu/[slug]/[tableId]/page.js)

Le bug persiste malgré l'état `sending`. La cause réelle est que le channel
Realtime reçoit l'INSERT de la nouvelle commande et appelle loadCommandes()
ou met à jour le state d'une façon qui crée un doublon visuel ou en base.

Correction complète :

1. Dans envoyerCommande(), utiliser une ref EN PLUS du state pour bloquer :
```javascript
const sendingRef = useRef(false)
const [sending, setSending] = useState(false)

async function envoyerCommande() {
  if (sendingRef.current) return  // bloque même les appels asynchrones rapides
  sendingRef.current = true
  setSending(true)
  try {
    const { data: cmd, error } = await supabase
      .from('commandes')
      .insert({
        restaurant_id: restaurant.id,
        table_id: table.id,
        statut: 'en_attente',
        total: totalPanier,
        paye: false
      })
      .select().single()
    if (error || !cmd) return
    await supabase.from('commande_items').insert(
      panier.map(i => ({
        commande_id: cmd.id,
        plat_id: i.plat_id,
        nom_plat: i.nom,
        prix_unitaire: i.prix,
        quantite: i.quantite,
        note: i.note || ''
      }))
    )
    // Mettre à jour state local SANS recharger depuis la DB
    setPanier([])
    setShowPanierModal(false)
    setCommandes(prev => {
      // Vérifier que la commande n'existe pas déjà avant d'ajouter
      if (prev.find(c => c.id === cmd.id)) return prev
      return [...prev, cmd]
    })
    const { data: newItems } = await supabase
      .from('commande_items').select('*').eq('commande_id', cmd.id)
    setAllItems(prev => ({ ...prev, [cmd.id]: newItems || [] }))
  } finally {
    sendingRef.current = false
    setSending(false)
  }
}
```

2. Dans le handler Realtime commandes, ignorer les INSERTs de commandes
   déjà présentes dans le state :
```javascript
// Dans le handler postgres_changes pour commandes :
if (['en_attente','valide','en_preparation','presque_pret','servi'].includes(s)) {
  setCommandes(prev => {
    // Si la commande existe déjà dans le state, juste mettre à jour son statut
    const exists = prev.find(c => c.id === payload.new.id)
    if (exists) {
      return prev.map(c => c.id === payload.new.id ? { ...payload.new } : c)
    }
    // Sinon ajouter seulement si ce n'est pas une commande qu'on vient d'envoyer
    // (sendingRef.current = true signifie qu'on est en train d'envoyer)
    if (!sendingRef.current) {
      return [...prev, payload.new]
    }
    return prev
  })
}
```

---

## BUG 2 — Statut table reste "libre" (src/app/menu/[slug]/[tableId]/page.js)

Dans la fonction loadData() ou loadCommandes(), après avoir chargé les commandes :

```javascript
async function loadCommandes() {
  const { data: cmds } = await supabase
    .from('commandes')
    .select('*')
    .eq('table_id', tableId)
    .in('statut', ['en_attente', 'valide', 'en_preparation', 'presque_pret', 'servi'])
    .order('created_at', { ascending: true })

  const cmdList = cmds || []
  setCommandes(cmdList)

  // CORRECTION : mettre à jour le statut de la table
  if (cmdList.length > 0) {
    await supabase.from('tables')
      .update({ statut: 'occupee' })
      .eq('id', tableId)
  }

  // Charger les items en une seule fois
  if (cmdList.length) {
    const itemsMap = {}
    await Promise.all(cmdList.map(async (cmd) => {
      const { data } = await supabase
        .from('commande_items').select('*').eq('commande_id', cmd.id)
      itemsMap[cmd.id] = data || []
    }))
    setAllItems(itemsMap)
  } else {
    setAllItems({})
  }
}
```

Aussi : quand envoyerCommande() réussit, marquer immédiatement la table occupée :
```javascript
// Dans envoyerCommande(), après l'insert réussi :
await supabase.from('tables').update({ statut: 'occupee' }).eq('id', table.id)
```

---

## BUG 3 — Upload image plat ne fonctionne pas (src/app/dashboard/menu/page.js)

Le bucket Supabase Storage s'appelle 'images' mais il faut vérifier
que le upload fonctionne correctement depuis mobile (galerie photo).

Remplacer la fonction uploadImage par cette version robuste :

```javascript
async function uploadImage(e) {
  const file = e.target.files?.[0]
  if (!file) return

  // Vérifier le type
  if (!file.type.startsWith('image/')) {
    alert('Veuillez sélectionner une image')
    return
  }

  // Afficher preview immédiatement (avant upload)
  const reader = new FileReader()
  reader.onload = (ev) => {
    setPlatForm(prev => ({ ...prev, image_preview: ev.target.result }))
  }
  reader.readAsDataURL(file)

  // Upload vers Supabase Storage
  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `plat_${Date.now()}_${Math.random().toString(36).substr(2,6)}.${ext}`
  const path = `plats/${filename}`

  const { data, error } = await supabase.storage
    .from('images')
    .upload(path, file, {
      contentType: file.type,
      upsert: false
    })

  if (error) {
    console.error('Upload error:', error)
    // Si le bucket n'existe pas, essayer de le créer
    alert('Erreur upload : ' + error.message)
    return
  }

  const { data: { publicUrl } } = supabase.storage
    .from('images')
    .getPublicUrl(path)

  setPlatForm(prev => ({ ...prev, image_url: publicUrl }))
}
```

Dans le formulaire, afficher la preview de l'image sélectionnée :
```javascript
// Dans la zone d'upload image, afficher platForm.image_preview OU platForm.image_url
const imageToShow = platForm.image_preview || platForm.image_url

<div onClick={() => fileRef.current?.click()}
  style={{ width: '100%', height: 140, borderRadius: 14,
    border: `2px dashed ${C.border}`, cursor: 'pointer',
    overflow: 'hidden', background: C.grayLight,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center' }}>
  {imageToShow
    ? <img src={imageToShow} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    : <><div style={{ fontSize: 30 }}>📷</div>
       <div style={{ fontSize: 12, color: C.gray, marginTop: 6 }}>
         Appuyez pour ajouter une photo
       </div></>
  }
</div>
<input
  ref={fileRef}
  type="file"
  accept="image/*"
  capture="environment"
  onChange={uploadImage}
  style={{ display: 'none' }}
/>
```

Note : l'attribut `capture="environment"` permet d'ouvrir la caméra
ou la galerie sur mobile. Le supprimer si on veut galerie seulement.

IMPORTANT : s'assurer que dans openPlatModal, image_preview est réinitialisé :
```javascript
function openPlatModal(plat = null) {
  if (plat) {
    setEditingPlat(plat)
    setPlatForm({
      nom: plat.nom,
      description: plat.description || '',
      prix: plat.prix,
      image_url: plat.image_url || '',
      image_preview: '',  // reset preview
      disponible: plat.disponible,
      categorie_id: plat.categorie_id
    })
  } else {
    setEditingPlat(null)
    setPlatForm({
      nom: '', description: '', prix: '',
      image_url: '', image_preview: '',  // reset preview
      disponible: true, categorie_id: activeCat || ''
    })
  }
  setShowPlatModal(true)
}
```

Vérifier aussi que le bucket 'images' existe dans Supabase Storage
et qu'il est en mode PUBLIC. Si pas sûr, ajouter dans les instructions :
"Aller sur Supabase → Storage → créer bucket 'images' → cocher Public"

---

## FONCTIONNALITÉ 4 — Simplifier demande d'addition
## (src/app/menu/[slug]/[tableId]/page.js ET src/app/dashboard/commandes/page.js)

### Côté CLIENT (menu/[slug]/[tableId]/page.js)

SUPPRIMER le modal de sélection du mode de paiement côté client.
Remplacer par un simple bouton "Demander l'addition" qui envoie
une notification au gérant SANS choisir de mode de paiement.

Le mode de paiement sera choisi par le gérant au moment d'encaisser.

Nouveau comportement quand le client clique "Demander l'addition" :
```javascript
async function demanderAddition() {
  if (!commandes.length || demandeEnvoyee) return
  // Insérer dans appels_serveur avec un type spécial
  await supabase.from('appels_serveur').insert({
    restaurant_id: restaurant.id,
    table_id: table.id,
    traite: false,
    type: 'addition'  // nouveau champ pour différencier appel serveur / addition
  })
  setDemandeEnvoyee(true)
  setTimeout(() => setDemandeEnvoyee(false), 60000)
}
```

Remplacer le bouton "Demander l'addition" par :
```javascript
<button onClick={demanderAddition} disabled={demandeEnvoyee}
  style={{
    width: '100%',
    background: demandeEnvoyee ? C.green : C.primary,
    border: 'none', borderRadius: 12, padding: '12px',
    fontSize: 14, fontWeight: 700, color: '#fff',
    cursor: demandeEnvoyee ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', marginTop: 4
  }}>
  {demandeEnvoyee ? '✅ Addition demandée !' : '💳 Demander l\'addition'}
</button>
```

Ajouter l'état : const [demandeEnvoyee, setDemandeEnvoyee] = useState(false)
Supprimer : showPaiementModal, modePaiement, ModalPaiement, demanderPaiement

### Côté GÉRANT (dashboard/commandes/page.js)

Dans le Realtime, écouter appels_serveur pour détecter les additions :
```javascript
.on('postgres_changes', {
  event: 'INSERT', schema: 'public', table: 'appels_serveur',
  filter: `restaurant_id=eq.${restaurant.id}`
}, async (payload) => {
  const { data: tbl } = await supabase
    .from('tables').select('numero, zone').eq('id', payload.new.table_id).single()

  if (payload.new.type === 'addition') {
    // Popup addition
    setDemandesPaiement(prev => [...prev, {
      id: payload.new.id,
      tableNumero: tbl?.numero,
      tableZone: tbl?.zone || 'Salle',
      type: 'addition'
    }])
    jouerSon('addition')
  } else {
    // Popup appel serveur normal
    setAppelsServeur(prev => [...prev, {
      id: payload.new.id,
      tableNumero: tbl?.numero,
      tableZone: tbl?.zone || 'Salle'
    }])
    jouerSon('serveur')
  }
})
```

Popup addition (même style que popup appel serveur mais couleur verte) :
```
┌─────────────────────────────┐
│ 💳 Demande d'addition       │
│ Table 5 • Terrasse          │
│ Le client veut payer        │
│                    [Fermer] │
└─────────────────────────────┘
```
Style : fond #00C851 (vert), texte blanc, border-radius 14px.

Fermer le popup : marquer traite=true dans appels_serveur.

---

## VÉRIFICATION SUPABASE STORAGE

Ajouter une note dans le code (commentaire) :
Le bucket 'images' doit exister dans Supabase Storage et être PUBLIC.
Pour créer : Supabase Dashboard → Storage → New bucket → nom: "images" → Public: ON

---

## RÉCAPITULATIF

| # | Fichier | Type | Description |
|---|---------|------|-------------|
| 1 | menu/[slug]/[tableId] | BUG FIX | Double commande : ref + state + déduplication Realtime |
| 2 | menu/[slug]/[tableId] | BUG FIX | Table statut occupée après scan |
| 3 | dashboard/menu | BUG FIX | Upload image depuis galerie mobile |
| 4 | menu/[slug]/[tableId] | SIMPLIF | Supprimer modal paiement, remplacer par bouton simple |
| 5 | dashboard/commandes | SIMPLIF | Popup addition via appels_serveur type='addition' |

---

## FICHIERS À NE PAS TOUCHER

- src/app/page.js
- src/app/auth/login/page.js
- src/app/auth/register/page.js
- src/app/auth/callback/page.js
- src/app/dashboard/page.js
- src/app/dashboard/tables/page.js
- src/app/dashboard/historique/page.js
- src/app/dashboard/parametres/page.js
- src/app/abonnement/page.js
- src/app/admin/page.js
- src/app/cuisine/[restaurantId]/page.js

---