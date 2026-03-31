# MAQUISAPP — Cahier des Charges v2.0
# Hokma Labs • 2026
# À lire par Claude Code avant toute modification

---

## STACK TECHNIQUE

- Framework : Next.js 14 (App Router)
- Base de données : Supabase (Auth + Database + Realtime)
- Déploiement : Vercel
- URL production : https://maquisapp-xi.vercel.app
- Repo : github.com/Hokmalabs/maquisapp

## CONSIGNES TECHNIQUES OBLIGATOIRES

- CSS inline style={{}} uniquement — JAMAIS de Tailwind dans les pages
- Import supabase : import { supabase } from '../../lib/supabase' (adapter le chemin selon le niveau)
- JAMAIS de createClient() — supabase est une instance déjà exportée dans lib/supabase.js
- Font : DM Sans (Google Fonts)
- Couleurs : primary #FF6B35 | dark #1A1A2E | bg #F5F5F5 | green #00C851 | gray #8A8A9A
- Mobile-first, maxWidth 480px pour les pages dashboard
- L'alias @/ ne fonctionne PAS — imports relatifs uniquement
- NEXT_PUBLIC_APP_URL = https://maquisapp-xi.vercel.app

## MODES DE PAIEMENT (IDs exacts à utiliser partout)

| ID            | Label          | Icône |
|---------------|----------------|-------|
| wave          | Wave           | 🌊    |
| orange_money  | Orange Money   | 🟠    |
| mtn_money     | MTN Money      | 💛    |
| cash          | Espèces        | 💵    |
| carte         | Carte bancaire | 💳    |

## BASE DE DONNÉES

Tables existantes :
- restaurants (id, nom, slug, email, telephone, ville, logo_url, actif)
- profiles (id, restaurant_id, nom, prenom, role)
- categories (id, restaurant_id, nom, ordre)
- plats (id, restaurant_id, categorie_id, nom, description, prix, image_url, disponible, ordre)
- tables (id, restaurant_id, numero, capacite, zone, qr_code_url, actif, statut[libre/occupee])
- commandes (id, restaurant_id, table_id, statut, mode_paiement, paye, total, validated_at, served_at)
- commande_items (id, commande_id, plat_id, nom_plat, prix_unitaire, quantite, note)
- appels_serveur (id, restaurant_id, table_id, traite)

Realtime activé sur : commandes, commande_items, appels_serveur
Statuts commande : en_attente → valide → en_preparation → presque_pret → servi → cloture → annule

Nouvelles colonnes à ajouter sur la table restaurants (via Supabase dashboard) :
- abonnement_statut : text — valeurs : 'essai' | 'actif' | 'expire' | 'suspendu'
- abonnement_fin : timestamptz
- abonnement_plan : text — valeurs : 'mensuel' | 'annuel'

---

## FICHIERS À NE PAS TOUCHER (fonctionnels)

- src/app/page.js (landing page)
- src/app/auth/login/page.js
- src/app/auth/register/page.js
- src/app/dashboard/page.js
- src/app/dashboard/menu/page.js
- src/app/dashboard/tables/page.js
- src/app/dashboard/historique/page.js
- src/app/dashboard/parametres/page.js

---

## FICHIERS À MODIFIER

### 1. src/app/auth/callback/page.js
**Bug à corriger : Google OAuth redirige vers / au lieu de /dashboard**

Symptôme : après connexion Google, l'utilisateur arrive sur la landing page.
Il doit cliquer une 2ème fois sur Connexion pour arriver au dashboard.

Cause : getSession() est appelé avant que Supabase ait parsé le hash OAuth
(#access_token=...) présent dans l'URL de retour.

Correction : utiliser onAuthStateChange et attendre l'événement SIGNED_IN.
Ajouter un await new Promise(resolve => setTimeout(resolve, 500)) avant le
premier appel pour laisser Supabase parser le hash de l'URL.

---

### 2. src/app/menu/[slug]/[tableId]/page.js
**Bug à corriger : double commande lors de l'envoi du panier**

Symptôme : quand le client appuie sur "Envoyer la commande", deux commandes
identiques sont créées en base de données.

Cause : absence de protection contre le double clic.

Correction : ajouter un état sending (boolean) initialisé à false.
Le mettre à true au début de envoyerCommande() et false à la fin.
Désactiver le bouton et bloquer la fonction si sending === true.

```javascript
const [sending, setSending] = useState(false)

async function envoyerCommande() {
  if (sending || !panier.length || !restaurant || !table) return
  setSending(true)
  try {
    // ... logique d'envoi existante ...
  } finally {
    setSending(false)
  }
}
```

**Vérifier aussi : parcours client après clôture**

Quand la table est clôturée par le gérant :
- Le client doit voir l'écran "Merci de votre visite"
- Puis son reçu numérique avec les bons montants (pas de doublon)
- Il ne peut plus commander sans rescanner
- La fonction afficherRecu() ne doit être appelée qu'une seule fois
  (utiliser un ref recuEnCours pour bloquer les appels multiples)

---

### 3. src/app/dashboard/commandes/page.js
**Nouvelles fonctionnalités à ajouter**

#### A. Alertes sonores

Ajouter une fonction jouerSon() utilisant Web Audio API (pas de fichier audio externe) :

```javascript
function jouerSon(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)

    if (type === 'serveur') {
      // Bip aigu court pour appel serveur
      osc.frequency.value = 880
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    } else if (type === 'addition') {
      // Double bip grave pour demande d'addition
      osc.frequency.value = 440
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
      setTimeout(() => {
        const ctx2 = new (window.AudioContext || window.webkitAudioContext)()
        const osc2 = ctx2.createOscillator()
        const gain2 = ctx2.createGain()
        osc2.connect(gain2)
        gain2.connect(ctx2.destination)
        gain2.gain.setValueAtTime(0.3, ctx2.currentTime)
        osc2.frequency.value = 440
        osc2.start()
        osc2.stop(ctx2.currentTime + 0.2)
      }, 300)
    }
  } catch (e) {
    console.log('Audio non supporté')
  }
}
```

Déclencher jouerSon('serveur') quand un nouvel appel_serveur arrive via Realtime.
Déclencher jouerSon('addition') quand mode_paiement est mis à jour sur une commande.

#### B. Bannière notification demande de paiement

Ajouter un état : const [demandesPaiement, setDemandesPaiement] = useState([])

Quand le Realtime détecte qu'une commande a reçu un mode_paiement non null,
ajouter une entrée dans demandesPaiement avec { tableNumero, modePaiement, cmdId }.

Afficher en haut de la page (sous le header, avant les filtres) :
- Une bannière orange pour chaque demande
- Contenu : "🔔 Table X demande l'addition — Mode : Wave"
- Bouton X pour fermer cette bannière
- Jouer jouerSon('addition') à l'apparition

#### C. Ticket cuisine imprimable

Quand le gérant clique sur le bouton "Préparer" (passage en en_preparation),
AVANT de changer le statut, ouvrir un modal avec le ticket cuisine :

Contenu du ticket cuisine (format 80mm, sans prix) :
```
╔══════════════════════╗
║   BON DE COMMANDE    ║
║   [NOM RESTAURANT]   ║
║   [DATE] [HEURE]     ║
║   Table [NUMERO]     ║
╠══════════════════════╣
║ 2x Poulet braisé     ║
║ 1x Coca Cola         ║
║ 3x Tilapia grillé    ║
╚══════════════════════╝
```

Le modal contient :
- Le ticket formaté visuellement
- Bouton "🖨️ Imprimer en cuisine" → window.print()
- Bouton "Ignorer et continuer" → ferme le modal et change le statut

CSS print : @media print — masquer tout sauf #ticket-cuisine-print

---

## FICHIERS À CRÉER

### 4. src/app/cuisine/[restaurantId]/page.js
**Écran cuisine — accessible sans connexion**

URL : https://maquisapp-xi.vercel.app/cuisine/[restaurantId]

Objectif : page affichée sur une tablette ou téléphone posé en cuisine.
Affiche en temps réel les commandes en_preparation et presque_pret.

Design :
- Fond sombre #1A1A2E
- Polices grandes (titre table : 32px, articles : 22px)
- Cards blanches larges, lisibles à distance
- Pas de connexion requise

Comportement :
- Charger le restaurant par ID depuis Supabase (pas de auth)
- Afficher toutes les commandes avec statut en_preparation ou presque_pret
- Rafraîchissement via Supabase Realtime
- Jouer un son quand une nouvelle commande arrive en préparation
- Chaque card affiche : "Table X", liste articles avec quantités, heure

```javascript
// Exemple de structure de la page
export default function CuisinePage({ params }) {
  const { restaurantId } = params
  // Pas de vérification d'auth
  // Charger commandes avec statut in ['en_preparation', 'presque_pret']
  // Realtime sur ces commandes
}
```

---

### 5. src/app/abonnement/page.js
**Page de paiement abonnement**

Affichée automatiquement quand abonnement_statut = 'expire' ou 'suspendu'.
À vérifier dans chaque page dashboard dans le useEffect de chargement.

Design : fond sombre #0D0D0D, style landing page, orange #FF6B35.

Contenu :
- Titre : "Votre essai gratuit est terminé"
- Sous-titre : "Choisissez votre plan pour continuer"
- Card Plan Mensuel : 15 000 FCFA / mois
- Card Plan Annuel : 10 000 FCFA / mois (facturé 120 000 FCFA/an — économisez 40 000 FCFA)
- Numéros de paiement :
  - Wave : [NUMERO_WAVE]
  - Orange Money : [NUMERO_ORANGE]
- Bouton "J'ai effectué mon paiement" → affiche message "Merci ! Votre activation
  sera confirmée sous 24h. Contactez-nous sur WhatsApp : [NUMERO]"

---

### 6. src/app/admin/page.js
**Panel admin Hokma Labs**

Accessible uniquement si l'email connecté est 'joelyemian5@gmail.com'.
Rediriger vers /dashboard si l'email ne correspond pas.

Contenu :
- Liste tous les restaurants avec : nom, email, statut abonnement, date fin, nb commandes
- Pour chaque restaurant :
  - Bouton "Activer mensuel" → abonnement_statut='actif', abonnement_fin=now+30j, abonnement_plan='mensuel'
  - Bouton "Activer annuel" → abonnement_statut='actif', abonnement_fin=now+365j, abonnement_plan='annuel'
  - Bouton "Suspendre" → abonnement_statut='suspendu'
- Design : même charte que le dashboard (fond #F5F5F5, header #1A1A2E)

---

## SYSTÈME D'ABONNEMENT — LOGIQUE COMPLÈTE

### Tarifs
- Essai gratuit : 14 jours, toutes fonctionnalités
- Plan mensuel : 15 000 FCFA / mois
- Plan annuel : 10 000 FCFA / mois (120 000 FCFA/an)

### À l'inscription (src/app/auth/callback/page.js et src/app/auth/register/page.js)
Quand un nouveau restaurant est créé, initialiser :
```javascript
abonnement_statut: 'essai',
abonnement_fin: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
abonnement_plan: null
```

### Vérification dans le dashboard (src/app/dashboard/page.js)
Dans le useEffect de chargement, après avoir récupéré le restaurant :
```javascript
const maintenant = new Date()
const fin = new Date(restaurant.abonnement_fin)
if (restaurant.abonnement_statut === 'expire' || 
    restaurant.abonnement_statut === 'suspendu' ||
    (restaurant.abonnement_statut === 'essai' && fin < maintenant)) {
  router.push('/abonnement')
  return
}
// Bannière J-3 avant expiration
const joursRestants = Math.ceil((fin - maintenant) / (1000 * 60 * 60 * 24))
if (joursRestants <= 3 && joursRestants > 0) {
  // Afficher bannière d'avertissement dans le dashboard
}
```

---

## PARCOURS COMPLET VALIDÉ

### Parcours Client
1. Scanne le QR code de sa table
2. Voit le menu (catégories + plats avec photos et prix)
3. Choisit ses plats et envoie sa commande
4. Voit le statut en temps réel (En attente → En préparation → Presque prêt → Servi)
5. Peut passer une nouvelle commande supplémentaire à tout moment
6. Peut appeler le serveur via le bouton Serveur
7. Quand il veut payer : clique "Demander l'addition" et choisit son mode de paiement
8. Le serveur vient encaisser
9. Le gérant clôture la table
10. Client voit écran "Merci de votre visite" + reçu numérique téléchargeable
11. Ne peut plus commander — doit rescanner pour une nouvelle session

### Parcours Gérant
1. Reçoit alerte visuelle + sonore pour nouvelle commande
2. Ouvre la commande, vérifie les articles
3. Supprime les articles non disponibles si besoin
4. Clique "Valider" → le client est notifié (statut change)
5. Clique "En préparation" → ticket cuisine s'imprime, la cuisine reçoit la commande
6. Clique "Presque prêt" → le client est notifié
7. Clique "Servi" → le plat est posé sur la table
8. Reçoit alerte sonore + bannière quand le client demande l'addition
9. Envoie le serveur encaisser avec le bon moyen de paiement
10. Clique "Encaisser et clôturer" → choisit mode paiement → confirme
11. Ticket de caisse affiché pour impression
12. Table libérée automatiquement
13. Client reçoit son reçu numérique

---

## COMMANDES GIT

```bash
git add .
git commit -m "description"
git push origin main
```
Vercel redéploie automatiquement après chaque push.