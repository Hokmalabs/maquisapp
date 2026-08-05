# Design System MaquisApp

Référence des choix visuels et UX.

---

## Identité

- **Ton** : chaleureux, ivoirien, professionnel mais pas corporate
- **Emoji ok** dans l'UI (culture mobile-first du marché)
- **Français** : tutoiement ou vouvoiement selon contexte
  (client final tutoyé, gérant vouvoyé)

---

## Palette

Couleurs définies dans chaque page sous un objet `C` (constant local).
Standardisation en cours dans les prochaines versions.

### Couleurs principales

| Nom | Hex | Usage |
|---|---|---|
| Bordeaux profond | `#3D0C11` | Background sombre, header dashboard, texte fort |
| Bordeaux principal | `#8B1A27` | Accents, boutons primaires, liens |
| Bordeaux clair | `#FFF0EB` | Fonds subtils, badges |
| Orange feu | `#E85520` | Accents secondaires, dégradés hero |
| Orange chaud | `#FF8C42` | Dégradés, éléments décoratifs |

### Neutres

| Nom | Hex | Usage |
|---|---|---|
| Fond app | `#F5F5F5` | Background principal |
| Blanc | `#FFFFFF` | Cards, modals |
| Texte foncé | `#3D0C11` | Titres, texte principal |
| Gris moyen | `#8A8A9A` | Texte secondaire |
| Gris clair | `#F0F0F5` | Séparateurs subtils |
| Bordure | `#E8E8F0` | Bordures cards, inputs |

### Sémantiques

| Nom | Hex | Usage |
|---|---|---|
| Succès | `#00C851` | Confirmations, actifs |
| Alerte | `#FFB800` | Warnings, stock faible |
| Erreur | `#FF3B30` | Erreurs, rupture stock |

---

## Typographie

### Fonts

- **UI principale** : DM Sans (Google Fonts)
  - Weights utilisés : 400, 500, 600, 700, 800
- **Titres landing** : Playfair Display (Google Fonts)
  - Weights utilisés : 700, 800, 900

### Échelle

| Usage | Taille | Weight |
|---|---|---|
| Hero landing | 42-80px (clamp) | 900 |
| H2 section | 32-52px | 800 |
| H3 card | 16-18px | 700-800 |
| Body | 13-14px | 400-600 |
| Small / caption | 10-12px | 500-700 |
| Numbers stats | 22-30px | 800 |

---

## Composants récurrents

### Boutons

- **Primary** : fond `#8B1A27` ou gradient `#8B1A27 → #E85520`, texte blanc,
  border-radius 12-14px, padding 12-16px vertical
- **Secondary** : fond `#F0F0F5` ou blanc + bordure `#E8E8F0`, texte foncé
- **Ghost** : transparent + bordure, hover accent
- **Icon-only** : cercle ou carré arrondi

### Cards

- `background: #fff`
- `border-radius: 14-18px`
- `box-shadow: 0 2px 10px rgba(0,0,0,0.07)` ou `0 4px 20px rgba(0,0,0,0.09)`
- Padding : 14-18px

### Badges / pills

- `border-radius: 20px`
- Padding : 3-6px vertical, 10-14px horizontal
- Fond léger (`bg` à 10-15% opacity de la couleur), texte pleine couleur

### Modals

- Overlay : `rgba(0,0,0,0.55-0.7)`
- Panel : blanc, border-radius top 20-22px (bottom sheet mobile)
  ou 20px full (centered)
- Animation : `slideUp .3s ease` ou `fadeIn .2s`
- Handle bar de 36×4px gris pour bottom sheets

### Inputs

- Border : `1.5px solid #E8E8F0`
- Border-radius : 12px
- Padding : 10-12px
- Focus : bordure `#8B1A27`
- PIN inputs : carrés 54×64px, texte 26px 800

---

## Layouts

### Mobile-first strict

L'application est **conçue pour mobile en premier**. Le dashboard gérant utilise
un `max-width: 480px` centré. Landing responsive avec breakpoints.

### Bottom navigation

Présente sur toutes les pages du dashboard gérant :
- Position `fixed bottom`
- 5 items : Accueil, Commandes, Menu, Tables/Stock, Réglages
- `padding-bottom: env(safe-area-inset-bottom)` pour iPhone

### Header sticky

- Fond `#3D0C11`
- `position: sticky top`
- `padding-top: 48px` pour zone safe iOS

---

## Animations

Définies dans chaque page en CSS-in-JS :

- `pulse` — respiration douce, éléments live
- `blink` — clignotement doux, indicateur temps réel
- `fadeIn` / `slideUp` — apparition modals
- `shake` — erreur PIN
- `float` — décoration hero

Durées typiques : 200-400ms.

---

## Iconographie

- **Emoji** utilisés majoritairement (économie de dépendances, universellement lisible)
- Emojis sémantiques cohérents :
  - 🍽️ MaquisApp / plat
  - 🥤 boisson / stock
  - 🪑 table
  - 📋 commande
  - 👨‍🍳 cuisine
  - ⚙️ paramètres
  - 🔒 verrouillé / 🔓 déverrouillé
  - ✅ validé / ⚠️ alerte / ⛔ bloqué

---

## Accessibilité

Points d'attention (backlog) :
- Contrastes texte/fond à valider (WCAG AA)
- Focus visible sur inputs et boutons clavier
- `aria-label` sur boutons icon-only
- Tailles de tap minimum 44×44px sur mobile

---

## Standardisation future

À faire :
- Extraire les couleurs dans un `src/theme.js` importé partout
- Créer un dossier `src/components/ui/` avec Button, Card, Modal, Badge
- Définir des tokens (espacements, radius, shadows) au lieu de valeurs magiques
