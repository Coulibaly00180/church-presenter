# Church Presenter — Design Tokens

> Document UX — Système de tokens, variables CSS, intégration Tailwind CSS 4
> Version 1.0 — Février 2026

---

## 1. Introduction

Les design tokens sont les atomes du système de design : les valeurs indivisibles qui définissent l'identité visuelle. Ils existent à trois niveaux :

```
Niveau 1 — Primitives   : #4F46E5, 16px, 300ms
Niveau 2 — Sémantiques  : --primary, --text-primary, --duration-slow
Niveau 3 — Composants   : --plan-item-height-compact, --source-panel-width
```

L'implémentation utilise des **CSS custom properties** (variables CSS) référencées dans le bloc `@theme {}` de Tailwind CSS 4, ce qui génère automatiquement toutes les classes utilitaires.

---

## 2. Couleurs — Mode Préparation (thème clair)

Fond de référence : `--bg-base` (#FAFAF9)

```css
:root {
  /* Surfaces */
  --bg-base:     #FAFAF9;   /* Fond principal de l'app */
  --bg-surface:  #FFFFFF;   /* Cards, panneaux, modals */
  --bg-elevated: #F4F4F5;   /* Hover, inputs, badges muted */
  --border:      #E4E4E7;   /* Bordures subtiles */

  /* Texte */
  --text-primary:   #09090B;  /* Corps de texte, titres — ratio 19.7:1 ✓ AAA */
  --text-secondary: #52525B;  /* Labels, descriptions — ratio 7.3:1 ✓ AAA */
  --text-muted:     #A1A1AA;  /* Placeholders, métadonnées — ratio 2.9:1 (non-interactif) */

  /* Actions */
  --primary:            #4F46E5;  /* Indigo — CTA, liens actifs */
  --primary-hover:      #4338CA;  /* Hover sur primary */
  --primary-foreground: #FFFFFF;  /* Texte sur fond primary — ratio 5.8:1 ✓ AA */

  /* Sémantiques */
  --accent:  #F59E0B;  /* Ambre — highlights, éléments live */
  --success: #10B981;  /* Vert — confirmation, état live actif */
  --danger:  #EF4444;  /* Rouge — suppression, erreurs critiques */
  --warning: #F59E0B;  /* Ambre — avertissements */
}
```

### Classes Tailwind générées (exemples)

| Token CSS | Classes utilitaires |
|---|---|
| `--color-bg-base` | `bg-bg-base`, `text-bg-base`, `border-bg-base` |
| `--color-primary` | `bg-primary`, `text-primary`, `border-primary` |
| `--color-text-primary` | `text-text-primary` |
| `--color-danger` | `bg-danger`, `text-danger`, `border-danger` |

---

## 3. Couleurs — Mode Direct (thème sombre)

Activé via la classe `.mode-live` sur `<body>`.
Fond de référence : `--bg-base` (#0A0A0F)

```css
.mode-live {
  /* Surfaces */
  --bg-base:     #0A0A0F;   /* Quasi-noir — immersion totale */
  --bg-surface:  #12121A;   /* Cards, panneaux */
  --bg-elevated: #1C1C28;   /* Hover, surélévation */
  --border:      #2A2A3A;   /* Bordures discrètes */

  /* Texte */
  --text-primary:   #FAFAFA;  /* Corps — ratio 20.1:1 ✓ AAA */
  --text-secondary: #A1A1AA;  /* Labels — ratio 5.1:1 ✓ AA */
  --text-muted:     #52525B;  /* Désactivé */

  /* Spécifiques au mode Direct */
  --live-indicator: #22C55E;  /* Point vert clignotant — ratio 8.3:1 ✓ AAA */
  --current-slide:  #1E1B4B;  /* Fond du slide courant (indigo très sombre) */
  --next-slide:     #1A1A25;  /* Fond du slide suivant */
}
```

---

## 4. Couleurs sémantiques — Types d'éléments

Ces tokens sont **partagés entre les deux modes** (préparation et direct).
Utilisés pour les bordures gauches, badges, et icônes des PlanItemCards.

```css
:root {
  --kind-song:         #8B5CF6;  /* Violet — chants */
  --kind-bible:        #0EA5E9;  /* Bleu ciel — Bible */
  --kind-announcement: #F59E0B;  /* Ambre — annonces */
  --kind-media:        #EC4899;  /* Rose — médias (image, PDF) */
  --kind-timer:        #EF4444;  /* Rouge — minuterie */
}
```

### Contrastes des badges (texte blanc sur fond kind)

| Token | Valeur | Ratio blanc/couleur | WCAG AA |
|---|---|---|---|
| `--kind-song` | `#8B5CF6` | 4.6:1 | ✓ AA |
| `--kind-bible` | `#0EA5E9` | 3.2:1 | ✓ (grands éléments) |
| `--kind-announcement` | `#F59E0B` | 2.9:1 | ⚠ utiliser texte sombre |
| `--kind-media` | `#EC4899` | 4.2:1 | ✓ AA |
| `--kind-timer` | `#EF4444` | 4.7:1 | ✓ AA |

> Pour `--kind-announcement`, utiliser `--text-primary` (#09090B) au lieu de blanc — ratio 9.8:1.

---

## 5. Typographie

```css
@theme {
  /* Familles */
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "Cascadia Code", monospace;
}
```

### Échelle de taille de texte

| Token | Taille | Poids | Rôle |
|---|---|---|---|
| `text-xs` | 10px | 400 | Métadonnées ultra-compactes (grid chapitres) |
| `text-2xs` | 11px | 400 | Références (versets, codes) — font-mono |
| `text-xs` | 12px | 400 | Métadonnées, badges, timestamps |
| `text-sm` | 13px | 400/500 | Labels, boutons |
| `text-base` | 14px | 400 | Corps de texte principal |
| `text-md` | 15px | 500 | Titres de sections |
| `text-lg` | 16px | 500/600 | Titres d'items |
| `text-xl` | 18px | 600 | Sous-titres d'écran |
| `text-2xl` | 20px | 600 | Titres d'écran |
| `text-3xl` | 24px | 700 | Titres principaux |

### Aperçu slide (projection)

| Rôle | Taille | Poids |
|---|---|---|
| Corps de texte projeté | 16–24px | 400 (configurable) |
| Titre/Refrain projeté | 20–28px | 600 (configurable) |
| Minuterie projetée | 48–96px | 700 |

---

## 6. Espacement (base 4px)

```css
/* Référence directe via var() */
--spacing-xs:  4px;    /* Gap interne bouton, padding icon */
--spacing-sm:  8px;    /* Gap icon + texte, padding compact */
--spacing-md:  12px;   /* Padding card compacte */
--spacing-lg:  16px;   /* Padding standard */
--spacing-xl:  24px;   /* Gap entre sections */
--spacing-2xl: 32px;   /* Padding page */
--spacing-3xl: 48px;   /* Espace entre groupes */
```

### Utilisation Tailwind (via classes standard)

```
p-1 = 4px    p-2 = 8px    p-3 = 12px   p-4 = 16px
p-6 = 24px   p-8 = 32px   p-12 = 48px
gap-1 / gap-2 / gap-3 / gap-4 / gap-6 / gap-8
```

---

## 7. Rayons de bordure

```css
@theme {
  --radius-sm:   4px;     /* Boutons, badges */
  --radius-md:   6px;     /* Inputs, cards compactes */
  --radius-lg:   8px;     /* Cards, panneaux */
  --radius-xl:   12px;    /* Dialogs, modals */
  --radius-2xl:  16px;    /* Grandes surfaces */
  --radius-full: 9999px;  /* Pillules (écrans A/B/C, tags) */
}
```

### Classes Tailwind

```
rounded-sm = 4px   rounded-md = 6px   rounded-lg = 8px
rounded-xl = 12px  rounded-2xl = 16px  rounded-full = 9999px
```

---

## 8. Ombres

```css
/* Mode clair */
:root {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}

/* Mode sombre */
.mode-live {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.6), 0 8px 10px -6px rgb(0 0 0 / 0.5);
}
```

### Usage

| Contexte | Ombre |
|---|---|
| PlanItemCard au repos | Aucune |
| PlanItemCard au hover | `shadow-sm` |
| PlanItemCard en drag | `shadow-lg` |
| Dialog / Modal | `shadow-xl` |
| Dropdown menu | `shadow-lg` |
| Tooltip | `shadow-md` |

---

## 9. Transitions et animations

```css
@theme {
  /* Durées */
  --duration-instant: 0ms;   /* Changements d'état immédiats */
  --duration-fast:    100ms; /* Hover subtil */
  --duration-normal:  150ms; /* Changement de slide, fade */
  --duration-slow:    200ms; /* Apparition toast, overlay */
  --duration-slower:  300ms; /* Transition mode Direct */
  --duration-page:    400ms; /* Transitions de page */

  /* Courbes d'accélération */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);   /* Standard */
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1); /* Rebond léger (ajout item) */
  --ease-out:     cubic-bezier(0, 0, 0.2, 1);     /* Entrée depuis hors-écran */
  --ease-in:      cubic-bezier(0.4, 0, 1, 1);     /* Sortie vers hors-écran */
}
```

### Tableau de référence des animations

| Interaction | Durée | Courbe | CSS |
|---|---|---|---|
| Ouverture Mode Direct | 300ms | ease-out | fade + scale(1→1.02) |
| Changement de slide | 150ms | ease-default | opacity fade |
| Ajout item au plan | 200ms | ease-spring | slide-in bas |
| Suppression item | 200ms | ease-in | fade-out + collapse |
| Toast apparition | 200ms | ease-out | slide-in droite |
| Toast disparition | 150ms | ease-in | fade-out |
| Écran noir/blanc | 200ms | ease-default | overlay opacity |
| Hover bouton | 100ms | ease-default | background-color |
| Clic bouton (active) | 80ms | ease-default | scale(0.97) |
| Focus visible | 100ms | ease-default | outline |

---

## 10. Z-index

```css
@theme {
  --z-dropdown: 100;  /* Menus déroulants */
  --z-sticky:   200;  /* Header collant */
  --z-overlay:  300;  /* Overlays de fond (backdrop) */
  --z-modal:    400;  /* Dialogs, modals */
  --z-toast:    500;  /* Toasts / notifications */
  --z-tooltip:  600;  /* Tooltips */
}
```

### Classes Tailwind

```
z-[100]  z-[200]  z-[300]  z-[400]  z-[500]  z-[600]
```

---

## 11. Tokens de composants

```css
@theme {
  /* PlanItemCard */
  --plan-item-height-compact:  56px;  /* Hauteur sans aperçu de blocs */
  --plan-item-height-expanded: 72px;  /* Hauteur avec aperçu */
  --plan-item-border-left:     3px;   /* Épaisseur bordure colorée gauche */

  /* Boutons */
  --btn-height-sm:  28px;  /* Très compact (grille chapitres) */
  --btn-height-md:  32px;  /* Standard interface */
  --btn-height-lg:  40px;  /* Principal, formulaires */
  --btn-height-xl:  48px;  /* Navigation live (◀/▶) */

  /* Layout */
  --source-panel-width: 280px;   /* Largeur panneau sources */
  --live-bar-height:    64px;    /* Hauteur barre mode direct */
  --header-height:      48px;    /* Hauteur header global */

  /* SlidePreview */
  --slide-aspect-ratio: 16 / 9;  /* Ratio aperçu */
}
```

---

## 12. Intégration Tailwind CSS 4

### Structure complète du fichier globals.css

```css
@import "tailwindcss";
@import "@fontsource-variable/inter";
@import "@fontsource/jetbrains-mono/400.css";

@theme {
  /* Référencer les CSS custom properties */
  --color-bg-base: var(--bg-base);
  --color-primary: var(--primary);
  /* ... tous les tokens ... */
}

:root {
  /* Valeurs concrètes Mode Préparation */
  --bg-base: #FAFAF9;
  --primary: #4F46E5;
  /* ... */
}

.mode-live {
  /* Override Mode Direct */
  --bg-base: #0A0A0F;
  /* ... */
}
```

### Utilisation dans les composants React

```tsx
// Tailwind utilities
<div className="bg-bg-base text-text-primary border border-border rounded-lg p-4">

// Référence directe pour les valeurs de composants
<div style={{ height: 'var(--plan-item-height-compact)' }}>

// Classes sémantiques pour les kinds
const kindClass = {
  SONG_BLOCK: 'border-kind-song text-kind-song',
  BIBLE_VERSE: 'border-kind-bible text-kind-bible',
  ANNOUNCEMENT_TEXT: 'border-kind-announcement',
  // ...
}
```

### Règles de nommage

| Pattern | Exemple | Usage |
|---|---|---|
| `bg-{token}` | `bg-bg-base` | Couleur de fond |
| `text-{token}` | `text-text-primary` | Couleur de texte |
| `border-{token}` | `border-border` | Couleur de bordure |
| `duration-{token}` | `duration-slow` | Durée de transition |

---

## 13. Bonnes pratiques

### ✅ À faire

```tsx
// Utiliser les tokens sémantiques
<div className="bg-bg-surface border border-border text-text-primary">
<button className="bg-primary text-primary-fg hover:bg-primary-hover">

// Utiliser les classes de durée pour les transitions cohérentes
<div className="transition-colors duration-normal">

// Référencer les kinds par token
<span style={{ borderColor: 'var(--kind-song)' }}>
```

### ❌ À éviter

```tsx
// Ne pas hardcoder des valeurs hex dans les composants
<div style={{ backgroundColor: '#4F46E5' }}>  // ❌ → bg-primary

// Ne pas utiliser des valeurs arbitraires Tailwind quand le token existe
<div className="bg-[#FAFAF9]">  // ❌ → bg-bg-base

// Ne pas créer de nouvelles ombres en dehors des tokens
<div style={{ boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>  // ❌ → shadow-md
```

---

*Document de référence — à synchroniser avec globals.css à chaque évolution du design system.*
