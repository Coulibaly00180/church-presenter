# Church Presenter — Composants UI & Spécifications d'interaction

> Document UX — Bibliothèque de composants exhaustive
> Chaque composant est décrit : anatomie · états · comportements · mesures · accessibilité

---

## Conventions de notation

```
[STATE: hover]    → État de survol souris
[STATE: focus]    → État de focus clavier (outline visible)
[STATE: active]   → Pendant le clic (mousedown)
[STATE: disabled] → Désactivé, non interactif
[ARIA: ...]       → Attribut d'accessibilité requis
[KEY: ...]        → Comportement clavier attendu
```

---

## 1. AppShell — Structure globale

### Anatomie

```
┌──────────────── TOPBAR (hauteur: 48px) ────────────────────┐
│  Logo  |  Plan selector  |  Actions  |  Live button        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │  SOURCE PANEL   │  │                                  │  │
│  │  (280px, fixe)  │  │    ZONE PRINCIPALE               │  │
│  │                 │  │    (flex-1)                      │  │
│  │  collapsible    │  │                                  │  │
│  └─────────────────┘  └──────────────────────────────────┘  │
│                                                              │
├──────────────── LIVEBAR (hauteur: 40px) ─────────────────────┤
│  Live status  |  Current item  |  Screen controls           │
└──────────────────────────────────────────────────────────────┘
```

### Comportement de redimensionnement

| Largeur fenêtre | Source Panel | Zone principale |
|---|---|---|
| < 800px | Masqué (toggle via bouton) | 100% |
| 800–1100px | 240px | flex-1 |
| > 1100px | 280px | flex-1 |
| Mode Direct | 0 ou slide-over | 100% |

### Règle critique
En mode Direct, **aucun élément du mode Préparation ne doit être visible** (sauf TopBar adaptée).
La transition entre les deux modes doit être : `background: --bg-base → --bg-dark`, durée 300ms, easing ease-in-out.

---

## 2. TopBar

### Anatomie
```
┌─────────────────────────────────────────────────────────────┐
│  [◉ CP]  [Culte 23 Fév ▼]  ···  [⚙ Paramètres] [? Aide]  [▶ DIRECT]  │
│   16px    auto                     32×32            48×32            │
└─────────────────────────────────────────────────────────────┘
  H: 48px  Padding H: 16px  Background: --bg-surface  Border-bottom: 1px --border
```

### Plan Selector (dropdown)

**Trigger :**
- Hauteur : 32px, padding H : 12px, border-radius : 6px
- Contenu : `[date courte] — [titre plan]` + chevron ▼
- Max-width : 240px, overflow ellipsis

**[STATE: hover]** : fond `--bg-elevated`
**[STATE: open]** : chevron rotation 180°, fond `--bg-elevated`, outline `--primary`

**Dropdown list :**
```
┌──────────────────────────────────────────────┐
│  ● Culte 23 Fév  [badge Aujourd'hui]         │  ← item actif, fond --primary/10
│    Culte 16 Fév 2026                         │
│    Culte 09 Fév 2026                         │
│    Culte 02 Fév 2026                         │
│  ────────────────────────────────────────    │
│  + Nouveau plan                              │
└──────────────────────────────────────────────┘
  Width: = trigger width (min 280px)
  Max-height: 320px, overflow-y: auto
  Item height: 40px, padding H: 12px
  Shadow: --shadow-lg
  Z-index: 1000
```

**[ARIA]** : `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, liste `role="listbox"`, items `role="option"`, actif `aria-selected="true"`
**[KEY: Espace/Entrée]** : ouvre/ferme · **[KEY: ↑↓]** : navigue dans la liste · **[KEY: Escape]** : ferme sans changer

---

## 3. Bouton — Spécifications complètes

### Variantes

| Variante | Usage | Fond | Texte | Bordure |
|---|---|---|---|---|
| `primary` | Action principale (Enregistrer, Projeter) | `--primary` | blanc | aucune |
| `secondary` | Action secondaire (Annuler, Retour) | `--bg-elevated` | `--text-primary` | `--border` |
| `ghost` | Actions tertiaires, icônes seules | transparent | `--text-secondary` | aucune |
| `danger` | Suppression, actions irréversibles | `--danger` | blanc | aucune |
| `live` | Bouton de démarrage du mode Direct | `--success` | blanc | aucune |

### Tailles

| Taille | Hauteur | Padding H | Font | Usage |
|---|---|---|---|---|
| `xs` | 24px | 8px | 11px | Actions dans les listes |
| `sm` | 32px | 12px | 13px | Actions dans les panels |
| `md` (défaut) | 40px | 16px | 14px | Actions générales |
| `lg` | 48px | 20px | 16px | Actions primaires en live |
| `xl` | 56px | 24px | 18px | Boutons ◀/▶ navigation live |

### États

```
Default   : voir tableau variantes
[hover]   : fond légèrement plus sombre (-10% lightness), curseur pointer
[focus]   : outline 2px --primary offset 2px (WCAG AA)
[active]  : transform scale(0.97), durée 80ms
[disabled]: opacity 40%, cursor not-allowed, pointer-events none
[loading] : texte masqué, spinner centré (12px pour sm, 16px pour md)
```

### Icône dans un bouton
- Icône seule (icon button) : taille = taille bouton (carré)
- Icône + texte : icône 16px, gap 8px, icône non-focusable

**[ARIA]** bouton icône seul : `aria-label="[description de l'action]"` obligatoire
**[KEY: Espace/Entrée]** : déclenche l'action

---

## 4. PlanItemCard

L'élément central de l'éditeur de plan. Représente une unité de contenu du service.

### Anatomie détaillée

```
┌──────────────────────────────────────────────────────────────┐
│ ⠿  🟣  CHANT  │  Blessed be Your Name                [✎][✕]│
│ ^   ^    ^         ^                                   ^   ^ │
│ (1) (2)  (3)       (4)                                (5) (6)│
│            Matt Redman · Couplet 1, Refrain, Pont            │
│            ^                                                  │
│            (7)                                                │
└──────────────────────────────────────────────────────────────┘

(1) Drag handle — GripVertical, 20×20px, couleur --text-muted, visible au hover
(2) Kind icon  — 16×16px, couleur --kind-*
(3) Kind badge — texte 10px uppercase, fond --kind-*/15, couleur --kind-*, pill
(4) Title      — 14px semibold, --text-primary, truncate
(5) Edit btn   — 28×28px ghost, icône Pencil 14px, visible au hover
(6) Delete btn — 28×28px ghost, icône X 14px, couleur --danger/60, visible au hover
(7) Subtitle   — 12px, --text-muted, italic, truncate (artiste, extrait paroles, réf. Bible)
```

### Mesures
- Hauteur : 56px (compact sans sous-titre) / 68px (avec sous-titre)
- Padding : 0 8px (pas de padding vertical — hauteur fixe, flex center)
- Border-left : 3px `--kind-*` (couleur par type)
- Border-radius : 6px
- Background : `--bg-surface`
- Border : 1px `--border`
- Gap horizontal entre éléments : 8px

### États

```
Default:
  bg: --bg-surface, border: --border, shadow: none

[hover]:
  bg: --bg-elevated
  drag handle: opacité 100% (sinon 0 au default)
  boutons edit/delete: visibles (opacity 1, pointer-events auto)
  cursor: default (sauf sur drag handle: grab)

[focus] (keyboard):
  outline: 2px solid --primary, offset 2px

[selected/active]:
  bg: --primary/8
  border-left: 3px --primary (override la couleur de kind)
  bg-left accent plus marqué

[dragging]:
  opacity: 0.85
  shadow: 0 8px 24px rgba(0,0,0,0.15)
  cursor: grabbing
  rotation: rotate(1.5deg)
  z-index: 999

[drag-target] (zone de dépôt):
  Ligne bleue 2px entre les items, animation pulse
  L'item source laisse une "ghost card" de même taille à sa place d'origine

[loading] (si contenu en cours de chargement):
  Skeleton animation sur le titre (shimmer)

[error] (média introuvable, contenu manquant):
  Border-left: 3px --danger
  Icône ⚠ à droite du titre, couleur --warning
  Tooltip au hover: description de l'erreur
```

### Interaction de drag & drop

1. **mousedown sur ⠿** → cursor: grabbing, prépare le drag
2. **mousemove 4px+** → drag commence : l'item se "lève" (shadow + rotation + scale 1.02)
3. **Pendant le drag** : un placeholder de même hauteur reste à la position d'origine
4. **Au survol d'une zone de drop** : une ligne de 2px `--primary` apparaît entre les items
5. **mouseup** : l'item se "pose" (animation de drop 150ms ease-out), ordre sauvegardé

### Accessibilité
```
[ARIA] role="listitem" sur chaque card
[ARIA] L'élément drag handle a aria-roledescription="Poignée de déplacement"
[ARIA] L'élément drag handle a aria-description="Utilisez Alt+Flèches pour déplacer"
[KEY: Alt+↑] déplace l'item vers le haut
[KEY: Alt+↓] déplace l'item vers le bas
[KEY: Delete] sur un item sélectionné → confirmation de suppression
[ARIA] aria-label complet: "[type] [titre], position [X] sur [N]"
```

---

## 5. SlidePreview

Aperçu visuel d'un slide tel qu'il apparaîtra sur l'écran de projection.
Utilisé dans : panneau Bible, éditeur de chant, mode Direct (courant/suivant).

### Variantes de taille

| Variante | Ratio | Usage | Taille typique |
|---|---|---|---|
| `thumbnail` | 16:9 | Liste du plan | 120×68px |
| `compact` | 16:9 | Zone "Suivant" en mode Direct | 280×158px |
| `full` | 16:9 | Zone "Courant" en mode Direct | 600×338px |
| `editor` | 16:9 | Éditeur de chant | 320×180px |

### Anatomie

```
┌──────────────────────────────────────┐
│  (fond : couleur/gradient/image)     │
│                                      │
│   Titre de la section                │  ← ligne titre (optionnelle)
│                                      │
│   Texte principal du slide           │
│   sur plusieurs lignes               │
│                                      │
│              Référence               │  ← bas droite (Bible) ou artiste
└──────────────────────────────────────┘
└── corner: --border-radius-md ──────────┘
│  overflow: hidden (le fond déborde pas)│
└────────────────────────────────────────┘
```

### Comportement du texte

- Le texte est mis à l'échelle (`font-size` proportionnel à la taille du preview)
- Si le texte dépasse la zone → indicateur de troncature `...` + tooltip "Contenu trop long"
- Les sauts de ligne du contenu sont respectés
- Alignement : vertical center, horizontal center (configurable dans Paramètres > Apparence)

### États

```
Default: rendu normal
[hover] (sur thumbnail/compact): légère élévation, outline 2px --border
[selected]: outline 2px --primary
[black-screen]: overlay noir 95% opacité, texte "NOIR" centré --text-muted
[white-screen]: overlay blanc 95%, texte "BLANC" centré gris
[loading]: skeleton shimmer sur toute la surface
[error]: fond --danger/10, icône ⚠ centrée
```

---

## 6. NavigationControls (Mode Direct)

Les boutons ◀ Précédent et Suivant ▶ sont les composants les plus critiques de l'application.

### Mesures
```
┌───────────────────┐   ┌───────────────────┐
│                   │   │                   │
│   ◀  PRÉCÉDENT    │   │   SUIVANT  ▶      │
│                   │   │                   │
└───────────────────┘   └───────────────────┘
  Width: ~45% de la zone    Width: ~45% de la zone
  Height: 56px              Height: 56px
  Border-radius: 8px
  Gap entre les deux: 16px
```

### États

```
Default:
  primary: bg transparent, border 1px --border, text --text-secondary

[hover]:
  bg: --bg-elevated
  border: --primary/50
  text: --text-primary
  transition: 100ms ease

[active] (pendant le clic):
  transform: scale(0.97)
  bg: --bg-elevated
  duration: 80ms

[disabled] (premier/dernier slide):
  opacity: 30%
  cursor: not-allowed
  pointer-events: none

[just-activated] (feedback immédiat post-navigation):
  Flash rapide: bg --primary/20, durée 150ms, puis retour
  Cela confirme que l'action a bien été reçue
```

### Zones de click élargies
Les boutons doivent couvrir **au minimum 45% de la largeur** de leur zone.
Sur mobile/tactile (si jamais utilisé) : zone de tap = bouton + 12px de padding transparent.

**[KEY: →/Espace/D]** → déclenche Suivant
**[KEY: ←/Q]** → déclenche Précédent
**[ARIA]** : `aria-label="Élément suivant"`, `aria-disabled` si dernier élément

---

## 7. ScreenSelector (A/B/C)

### Anatomie

```
  ÉCRANS
  ┌──────┐  ┌──────┐  ┌──────┐
  │ ● A  │  │ ○ B  │  │ ○ C  │
  └──────┘  └──────┘  └──────┘
```

### Mesures
- Chaque pillule : 48×32px, border-radius 999px (full pill)
- Gap entre pillules : 6px
- Label "ÉCRANS" : 10px uppercase, --text-muted, margin-bottom 4px
- Font : 13px semibold

### États par pillule

```
inactive:
  bg: transparent, border: 1px --border
  text: --text-secondary

active:
  bg: --primary
  border: 1px --primary
  text: white

[hover inactive]:
  bg: --bg-elevated
  border: --border
  cursor: pointer

[locked]:
  Icône 🔒 à côté du label (10px)
  bg: --warning/10
  border: --warning/40
  text: --warning

[disconnected]:
  Icône ✕ rouge à côté du label
  bg: --danger/10
  border: --danger/40
  text: --danger
  tooltip: "Écran B déconnecté"

[default - no screen]:
  bg: --bg-elevated
  border: dashed 1px --border
  text: --text-muted
  tooltip: "Écran non configuré"
```

### Comportement
- Clic sur une pillule inactive → l'active (l'ancienne redevient inactive)
- Multi-sélection : **non supportée** pour éviter la confusion
- Raccourcis : 1, 2, 3 → active A, B, C
- L'écran actif reçoit toutes les commandes de navigation

**[ARIA]** : `role="radiogroup"` sur le groupe, `role="radio"` sur chaque pillule, `aria-checked`, `aria-label="Écran [A/B/C]"`

---

## 8. KindBadge (Badge de type d'élément)

### Spécification

| Kind | Label | Icône | Couleur |
|---|---|---|---|
| `SONG_BLOCK` | CHANT | Music | `#8B5CF6` (violet) |
| `BIBLE_VERSE` | VERSET | BookOpen | `#0EA5E9` (bleu) |
| `BIBLE_PASSAGE` | PASSAGE | BookOpen | `#0EA5E9` (bleu) |
| `VERSE_MANUAL` | VERSET | BookMarked | `#06B6D4` (cyan) |
| `ANNOUNCEMENT_TEXT` | ANNONCE | Megaphone | `#F59E0B` (ambre) |
| `ANNOUNCEMENT_IMAGE` | IMAGE | Image | `#EC4899` (rose) |
| `ANNOUNCEMENT_PDF` | PDF | FileText | `#F97316` (orange) |
| `TIMER` | MINUTERIE | Timer | `#EF4444` (rouge) |

### Mesures
- Hauteur : 18px
- Padding H : 6px
- Border-radius : 999px
- Font : 10px, uppercase, letter-spacing 0.05em
- Background : couleur/15 (15% opacité)
- Color : couleur (100%)

---

## 9. SearchInput

### Anatomie

```
┌──────────────────────────────────────┐
│ 🔍  Rechercher...                    │
└──────────────────────────────────────┘
  H: 36px  Padding-left: 36px  Border-radius: 6px
  Icône 🔍: absolute left 10px, 16×16px, --text-muted
```

### États

```
Default:
  bg: --bg-surface, border: 1px --border
  placeholder: --text-muted, italic

[focus]:
  border: 1px --primary
  outline: 2px --primary/30 (ring soft)
  bg: --bg-surface

[has-value]:
  Bouton ✕ apparaît à droite (28×28px ghost)
  Pour vider le champ d'un clic

[loading] (recherche en cours):
  Spinner Loader2 à droite du champ (16px, --text-muted)
  Animation rotate continue

[no-results]:
  Pas de changement visuel sur l'input lui-même
  Message dans la zone de résultats
```

### Comportement
- **Debounce** : 150ms pour la recherche locale, 350ms pour la recherche réseau
- **Clear on Escape** : si le champ a une valeur, Escape le vide ; si vide, ferme le panneau source
- **Auto-focus** : quand le panneau source est ouvert par clic sur son onglet
- **Shortcut** : `Ctrl+F` focus la barre de recherche active (sources ou bibliothèque)

**[ARIA]** : `role="searchbox"`, `aria-label="Rechercher [chants/versets/...]"`, `aria-controls` pointe vers la liste de résultats, `aria-activedescendant` suit l'item focused dans les résultats

---

## 10. ChapterGrid (Grille de chapitres Bible)

### Problème résolu
Les livres comme Psaumes (150 chapitres) faisaient déborder la zone, écrasant la liste de versets.
**Solution** : la grille a une hauteur maximale fixe avec scroll interne.

### Spécification

```
┌───────────────────────────────────────────────┐
│  [1][2][3][4][5][6][7]                        │  ← hauteur max: 80px
│  [8][9][10][11][12][13][14]                   │  ← scroll-y si plus de 3 rangées
│  [15][16][17][18][19][20][21]                 │
└───────────────────────────────────────────────┘
  grid-cols: 7   gap: 2px   max-height: 80px   overflow-y: auto
```

### Bouton de chapitre

```
Default:
  H: 24px  W: 100% (col-span 1)  border-radius: 4px
  bg: --bg-elevated  border: 1px --border
  font: 10px  color: --text-secondary

[hover]:
  bg: --bg-surface-hover  border: --border

[active/selected] (chapitre courant):
  bg: --primary  border: --primary  color: white
  font-weight: 600

[loading] (chargement en cours):
  Spinner Loader2 24×24px sur le bouton actif uniquement
```

### Accessibilité
**[ARIA]** : `role="grid"` sur le conteneur, `role="gridcell"` sur chaque bouton
**[KEY: ←→↑↓]** navigation dans la grille, **[KEY: Entrée]** sélectionne le chapitre
**[ARIA]** sur chaque bouton : `aria-label="Chapitre [N]"`, `aria-pressed="true/false"`

---

## 11. VerseItem (Verset sélectionnable)

### Anatomie

```
┌──────────────────────────────────────────────────────────┐
│  ■  3  Car Dieu a tant aimé le monde qu'il a donné son  │
│       Fils unique, afin que quiconque croit en lui...   │
└──────────────────────────────────────────────────────────┘
  ■ = indicateur de sélection (checkbox visuelle)
  3 = numéro de verset (font-mono 10px, min-w 20px)
  texte = 12px, line-height 1.5
  Padding: 6px 8px
  Border-radius: 4px
```

### États

```
Default (non sélectionné):
  bg: transparent  color: --text-primary
  indicateur: □ (border 1px --border)

[hover]:
  bg: --bg-elevated
  cursor: pointer

[selected]:
  bg: --primary/12
  color: --primary
  indicateur: ■ (bg --primary, icône check blanche)
  border-left: 2px --primary

[focus]:
  outline: 2px --primary, offset 1px
```

**[KEY: Espace]** toggle la sélection · **[KEY: Shift+Click]** sélectionne une plage
**[ARIA]** : `role="checkbox"`, `aria-checked`, `aria-label="Verset [N]: [texte]"`

---

## 12. LiveStatusIndicator

Indicateur de l'état de la projection, toujours visible en mode Direct.

### Variantes

```
● DIRECT         → vert pulsant (#22C55E)
  animation: pulse 1.5s infinite ease-in-out
  opacity: 1 → 0.4 → 1

○ VEILLE         → gris (#6B7280)
  pas d'animation

⬛ ÉCRAN NOIR    → fond noir, texte blanc, icône Square
⬜ ÉCRAN BLANC   → fond blanc, texte noir, icône Square (outline)
⚠  ERREUR        → orange pulsant, tooltip avec détail
```

### Mesures
- Dot : 8×8px, border-radius 50%
- Texte : 11px uppercase, letter-spacing 0.08em
- Gap dot/texte : 6px
- Hauteur conteneur : 24px

---

## 13. Toast / Notification

### Variantes

| Type | Couleur | Icône | Auto-dismiss |
|---|---|---|---|
| `success` | Vert | CheckCircle | 3s |
| `info` | Bleu | Info | 4s |
| `warning` | Ambre | AlertTriangle | 5s |
| `error` | Rouge | XCircle | Non (dismiss manuel) |

### Comportement

```
Apparition  : slide-in depuis le bas-droite, 200ms ease-out
Disparition : fade-out + slide-out, 150ms ease-in
Position    : bottom-right, 20px de marge
Stack       : max 3 toasts simultanés, le plus récent en haut
Z-index     : 9999 (au-dessus de tout)
```

### Anatomie

```
┌──────────────────────────────────────────────────────┐
│  ✓  Jean 3:16 ajouté au plan                    [✕]  │
└──────────────────────────────────────────────────────┘
  Width: 320px  H: 48px  Border-radius: 8px
  Shadow: --shadow-lg
  Bouton ✕: 28×28px, ghost, toujours visible (accessibility)
```

### Règle critique pour le mode Direct
En mode Direct, **aucun toast ne doit masquer la zone d'aperçu du slide courant**.
Les toasts sont positionnés dans le coin inférieur du panneau de plan (droite), pas au-dessus du slide.

**[ARIA]** : `role="alert"` (success/error), `role="status"` (info/warning), `aria-live="polite"` sauf erreur critique `aria-live="assertive"`

---

## 14. EmptyState

Chaque zone vide de l'application doit avoir un état vide explicite et actionnable.

### Structure standard

```
┌──────────────────────────────────────────┐
│                                          │
│              [Icône 48×48px]             │
│                                          │
│         Titre descriptif                 │
│     Sous-texte explicatif (optionnel)    │
│                                          │
│        [Bouton action principale]        │
│                                          │
└──────────────────────────────────────────┘
  Padding: 48px vertical  Texte: centré
  Icône: --text-muted  Titre: 16px semibold  Sous-texte: 14px --text-secondary
```

### Catalogue des états vides

| Contexte | Icône | Titre | Sous-texte | Action |
|---|---|---|---|---|
| Plan vide | ClipboardList | "Aucun élément dans le plan" | "Glissez du contenu depuis le panneau sources ou ajoutez manuellement." | + Ajouter un élément |
| Bibliothèque vide | Music | "Aucun chant" | "Importez vos chants Word ou créez-en un manuellement." | + Créer un chant |
| Recherche chants vide | SearchX | "Aucun résultat" | "Essayez d'autres mots-clés ou vérifiez l'orthographe." | Effacer la recherche |
| Bible sans sélection | BookOpen | "Choisissez un verset" | "Sélectionnez un livre, un chapitre et des versets." | — |
| Aucun plan | Calendar | "Aucun plan pour aujourd'hui" | "Créez le plan du service ou dupliquez un plan existant." | + Nouveau plan |
| Médias vide | Image | "Aucun fichier média" | "Ajoutez des images ou des PDF en les faisant glisser ici." | + Importer un média |

---

## 15. ConfirmationDialog (Suppressions)

Utilisé uniquement pour les actions **irréversibles en dehors du mode Direct**.
En mode Direct : pas de dialog, action directe + Ctrl+Z temporaire.

### Comportement

```
Déclencheur : clic sur ✕ supprimer un item, un chant, un plan
Animation   : fond overlay fade-in 200ms, dialog scale-in 0.95→1 200ms
Fermeture   : Escape ou clic overlay, animation inverse
```

### Anatomie

```
┌──────────────────────────────────────────────────────┐
│                                         [✕]          │
│  Supprimer ce chant ?                                │
│                                                      │
│  « Blessed be Your Name » sera définitivement        │
│  supprimé de la bibliothèque. Cette action est       │
│  irréversible.                                       │
│                                                      │
│  [Annuler]              [Supprimer définitivement]   │
│   secondary                     danger               │
└──────────────────────────────────────────────────────┘
  Width: 400px  Border-radius: 12px  Padding: 24px
  Overlay: rgba(0,0,0,0.5)  Z-index: 1100
```

### Règles
- Le bouton destructif est à droite et de couleur `--danger`
- Le bouton Annuler est à gauche (conventionnel, prévisible)
- Focus initial sur le bouton Annuler (évite les suppressions accidentelles par Enter)
- **[KEY: Escape]** → Annuler
- **[KEY: Entrée sur Annuler]** → Annuler
- **[ARIA]** : `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`

---

## 16. AddItemMenu (Ajouter un élément au plan)

### Déclencheur
Bouton « + Ajouter un élément » en bas du plan.

### Comportement
```
Ouverture   : popover centré-bas du bouton déclencheur, 200ms scale-in
Position    : au-dessus du bouton si pas assez d'espace en dessous
Fermeture   : clic hors du popover, Escape
```

### Anatomie

```
┌──────────────────────────────────────────────────────┐
│  Ajouter un élément                                  │
│  ────────────────────────────────────────────────    │
│                                                      │
│  🟣  Chant          Depuis la bibliothèque           │
│  🔵  Verset Bible   Sélecteur livre/chapitre         │
│  🔵  Passage Bible  Sélecteur avec plusieurs versets │
│  🔵  Verset manuel  Saisie libre                     │
│  🟡  Annonce texte  Titre + corps de texte           │
│  🩷  Image          Fichier .jpg .png .webp           │
│  🟠  PDF            Fichier .pdf                     │
│  🔴  Minuterie      Durée + titre                    │
│                                                      │
└──────────────────────────────────────────────────────┘
  Width: 320px  Border-radius: 10px  Shadow: --shadow-lg
  Item height: 48px  Padding: 12px 16px
  Icône: 16×16px  Titre: 14px semibold  Description: 12px --text-muted
```

### Comportement après sélection
- **Chant** : focus sur la barre de recherche du panneau Chants (si fermé, ouvre le panneau)
- **Verset/Passage Bible** : ouvre le panneau Bible si fermé
- **Verset manuel / Annonce texte** : ouvre un formulaire inline en bas du plan
- **Image/PDF** : ouvre le sélecteur de fichier système directement
- **Minuterie** : ouvre un formulaire inline avec durée et titre

**[ARIA]** : `role="menu"`, items `role="menuitem"`, `aria-label="Type d'élément à ajouter"`

---

## 17. SourcePanel — Comportements détaillés

### Collapse/Expand

```
Expanded (état default):
  Width: 280px (fixe)  transition: none (instantané, pas d'animation pour ne pas distraire)
  Border-right: 1px --border

Collapsed:
  Width: 48px (icônes seulement)
  Chaque onglet affiche son icône + tooltip au hover

Transition expanded↔collapsed:
  Duration: 200ms  Easing: ease-in-out
  Le panneau principal s'adapte (flex-1 reprend l'espace)
```

### Onglets sources

Les onglets (Chants, Bible, Annonces, Médias, Minuterie) sont dans la barre latérale du panneau.
Quand un onglet est actif, son contenu remplace le précédent (pas d'empilement).

```
Onglet inactif:
  bg: transparent  color: --text-muted  icône --text-muted

Onglet actif:
  bg: --primary/10  color: --primary  icône --primary
  border-right: 2px --primary (si collapsed: border-bottom)
  transition: 100ms

[hover inactif]:
  bg: --bg-elevated  color: --text-primary
```

### Chargement des données sources
- Les données (chants, traductions Bible) se chargent **une seule fois** au montage du panneau
- Un skeleton de 3-4 lignes s'affiche pendant le chargement (< 200ms en local)
- Si erreur de chargement : message inline avec bouton "Réessayer"

---

## 18. ProgressBar (progression du plan en direct)

### Usage
Affiche la progression dans le plan en mode Direct (élément courant / total).

### Spécification

```
┌────────────────────────────────────────────────────┐
│  Progression  3 / 8                                │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │
└────────────────────────────────────────────────────┘
  Barre:  H: 4px  Border-radius: 999px
  Fond:   --bg-elevated
  Fill:   --primary (width: [courant/total * 100%])
  Transition: 300ms ease (lors du changement d'item)
  Texte:  12px  --text-muted
```

### Comportement
- Se met à jour à chaque changement d'élément
- N'affiche PAS de pourcentage (trop anxiogène) — seulement X / N
- Si le plan a un seul élément : masqué

**[ARIA]** : `role="progressbar"`, `aria-valuenow`, `aria-valuemax`, `aria-label="Progression du plan"`

---

## 19. Timer — Affichage en mode Direct

### Panneau de contrôle (dans le mode Direct, panneau droit)

```
┌──────────────────────────────────────────┐
│  ⏱  MINUTERIE — Pause café               │
│                                          │
│     ┌────────────────────────────┐       │
│     │                            │       │
│     │        04 : 32             │       │  ← HH:MM ou MM:SS selon durée
│     │                            │       │     Font: 32px monospace
│     └────────────────────────────┘       │
│                                          │
│  [▶ Démarrer]  [⏸ Pause]  [⟳ Reset]     │
│                                          │
└──────────────────────────────────────────┘
```

### États du timer

```
En attente (pas encore démarré):
  Affichage: durée initiale (gris, statique)
  Bouton actif: ▶ Démarrer

En cours:
  Affichage: décompte vert (< 50% restant), ambre (< 20%), rouge (< 10%)
  Animation: légère pulsation du fond à < 10%
  Bouton actif: ⏸ Pause, ⟳ Reset

En pause:
  Affichage: valeur figée + indicateur "PAUSE" (clignotant lent)
  Bouton actif: ▶ Reprendre, ⟳ Reset

Terminé (0:00):
  Affichage: "00:00" en rouge, animation de flash 3×
  Bouton actif: ⟳ Reset
  Action auto: l'écran de projection passe en NOIR après 3s
```

---

*Ce document de composants est la référence pour l'implémentation front-end.*
*Toute déviation doit être documentée et justifiée.*
