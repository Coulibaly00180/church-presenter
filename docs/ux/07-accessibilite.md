# Church Presenter — Accessibilité

> Document UX — Conformité WCAG, Navigation clavier, ARIA, Gestion du focus
> Version 1.0 — Février 2026

---

## 1. Objectifs et niveau de conformité

Church Presenter vise une conformité **WCAG 2.1 niveau AA** pour l'ensemble de l'interface de contrôle (MainPage). L'écran de projection (ProjectionPage) est exclu des critères d'accessibilité standard car il est destiné à l'affichage public, non à l'interaction.

### Priorités

1. **Navigation clavier complète** — Critère critique : Marc (Persona 1) doit pouvoir opérer entièrement au clavier en mode Direct.
2. **Contraste suffisant** — Ratio 4.5:1 minimum pour le texte normal, 3:1 pour les grands éléments et les icônes.
3. **Cibles tactiles adéquates** — Minimum 44×44 px pour tout élément interactif (P7 du design system).
4. **États visibles** — Focus, hover, active, disabled explicitement distincts visuellement.
5. **Textes alternatifs** — Toutes les icônes fonctionnelles ont un `aria-label` ou un `<span className="sr-only">`.

---

## 2. Navigation clavier — Carte complète

### 2.1 Touches de navigation globale (Tabindex)

```
Tab         → Élément focusable suivant (ordre DOM)
Shift+Tab   → Élément focusable précédent
Enter       → Activer le bouton / lien focalisé
Espace      → Activer le bouton focalisé (ou slide suivant en mode Direct)
Escape      → Fermer dialog / menu ouvert / quitter mode Direct
```

### 2.2 Raccourcis en mode Direct

> Ces raccourcis sont globaux (fonctionnent sans focus particulier).

```
← / Q       → Élément précédent
→ / Espace / D → Élément suivant
1 / 2 / 3   → Sélectionner écran A / B / C
B           → Écran noir
W           → Écran blanc
R           → Reprendre
Ctrl+P      → Basculer projection
?           → Afficher / masquer cheatsheet raccourcis
```

### 2.3 Navigation dans les listes

```
↑ / ↓       → Se déplacer dans les listes déroulantes, menus, grilles de chapitres
Home        → Premier élément de la liste
End         → Dernier élément de la liste
PageUp      → Remonter d'une page (listes longues)
PageDown    → Descendre d'une page
```

### 2.4 Navigation dans l'éditeur de chant

```
Tab         → Passer au bloc suivant
Shift+Tab   → Passer au bloc précédent
Ctrl+Enter  → Sauvegarder (depuis n'importe quel champ)
Ctrl+Z      → Annuler la dernière modification
Escape      → Annuler et fermer l'éditeur
```

### 2.5 Navigation dans les dialogs

```
Tab / Shift+Tab → Cycle dans les éléments du dialog (focus trap)
Escape          → Fermer le dialog (sauf confirmation de suppression)
Enter           → Confirmer l'action principale (bouton primaire)
```

### 2.6 Drag & Drop (plan)

> Alternative clavier obligatoire pour les utilisateurs ne pouvant pas utiliser la souris.

```
Espace / Enter  → Commencer le déplacement sur un PlanItemCard
↑ / ↓           → Déplacer l'élément vers le haut / bas
Espace / Enter  → Déposer à la nouvelle position
Escape          → Annuler le déplacement
```

Indication visuelle pendant le déplacement clavier :
- Bordure tiretée `2px dashed --primary` autour de l'élément en déplacement
- Les positions possibles affichent un placeholder bleu `2px solid --primary`

---

## 3. Ordre de focus (Tab order)

### Mode Préparation — Ordre attendu

```
1. TopBar : Logo/nom → Sélecteur de plan → Bouton "Nouveau plan" → Bouton "▶ Direct" → Menu paramètres
2. SourcePanel : Onglets (Chants / Bible / Annonces / Médias / Minuterie) → Contenu de l'onglet actif
3. PlanEditor : PlanItemCards (dans l'ordre) → Boutons d'action de chaque carte
4. [Footer si présent]
```

### Mode Direct — Ordre attendu

```
1. TopBar : Indicateur live → Écran sélectionné (A/B/C) → Bouton "◼ Quitter"
2. Zone aperçu : Bouton ◀ Précédent → Slide courant (non focusable) → Bouton ▶ Suivant
3. Zone plan : Items du plan (liste)
4. Boutons Noir / Blanc / Reprendre
```

### Dialog / Modal — Focus trap

Quand un dialog est ouvert, le focus doit rester enfermé dans le dialog :
- Premier focus : le premier élément interactif du dialog (généralement le bouton d'annulation)
- Cycle Tab : ne sort pas du dialog
- Fermeture : le focus retourne à l'élément qui a ouvert le dialog (`returnFocus`)

---

## 4. Indicateurs de focus

### Règles

- **Outline** : `2px solid var(--primary)` + `outline-offset: 2px`
- **Jamais** de `outline: none` sans alternative (`:focus-visible` uniquement)
- En mode Direct (fond sombre) : outline `var(--primary)` #4F46E5 reste visible sur fond `--bg-base` #0A0A0F (ratio >7:1 ✓)

### Implémentation Tailwind CSS 4

```css
/* globals.css — règle de base */
*:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Boutons et éléments avec border-radius propre */
.btn:focus-visible {
  outline-offset: 3px;
}
```

### Cas particuliers

| Composant | Style de focus |
|---|---|
| PlanItemCard | Outline 2px primary + shadow-md |
| VerseItem | Outline 2px primary |
| Button | Outline 2px primary + offset 3px |
| Input | Border 2px primary (remplace border normale) |
| SlidePreview (liste) | Outline 2px primary + scale 1.02 |
| TabsTrigger | Underline 2px primary (pas d'outline) |

---

## 5. Spécifications ARIA

### 5.1 Composants Radix UI — ARIA géré automatiquement

Les composants suivants ont l'ARIA géré par Radix UI — ne pas surcharger :

- `Dialog` → `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`
- `Tabs` → `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`
- `DropdownMenu` → `role="menu"`, `role="menuitem"`, `aria-expanded`, `aria-haspopup`
- `Select` → `role="combobox"`, `role="listbox"`, `role="option"`, `aria-selected`
- `Tooltip` → `role="tooltip"`, `aria-describedby`

### 5.2 Composants custom — ARIA à implémenter manuellement

#### PlanItemCard

```tsx
<div
  role="listitem"
  aria-label={`${kind} : ${title}`}
  aria-describedby={`item-${id}-meta`}
>
  <button
    aria-label={`Faire glisser ${title}`}
    tabIndex={0}
    // drag handle
  />
  <span id={`item-${id}-meta`} className="sr-only">
    {blocks.join(', ')} — {kind}
  </span>
  <button aria-label={`Modifier ${title}`}>✎</button>
  <button aria-label={`Supprimer ${title}`}>✕</button>
</div>
```

#### SlidePreview (liste en mode Direct)

```tsx
<div role="list" aria-label="Éléments du plan">
  <div
    role="listitem"
    aria-label={`${index + 1} sur ${total} : ${title}`}
    aria-current={isCurrent ? "true" : undefined}
    tabIndex={0}
  />
</div>
```

#### ScreenSelector

```tsx
<div role="group" aria-label="Sélection de l'écran de projection">
  <button
    aria-pressed={activeScreen === 'A'}
    aria-label="Écran A"
  >A</button>
  <button
    aria-pressed={activeScreen === 'B'}
    aria-label="Écran B"
  >B</button>
  <button
    aria-pressed={activeScreen === 'C'}
    aria-label="Écran C"
  >C</button>
</div>
```

#### LiveStatusIndicator

```tsx
<div
  role="status"
  aria-live="polite"
  aria-label={isLive ? "Mode direct actif" : "Veille"}
>
  <span aria-hidden="true">●</span>
  <span>{isLive ? "EN DIRECT" : "Veille"}</span>
</div>
```

#### ChapterGrid

```tsx
<div
  role="grid"
  aria-label={`Chapitres de ${bookName}`}
  aria-rowcount={Math.ceil(totalChapters / 7)}
>
  {chapters.map(ch => (
    <button
      key={ch}
      role="gridcell"
      aria-label={`Chapitre ${ch}`}
      aria-pressed={ch === currentChapter}
    >
      {ch}
    </button>
  ))}
</div>
```

#### Toast / Notification

```tsx
<div
  role="alert"
  aria-live="assertive"  // pour erreurs critiques
  // ou aria-live="polite" pour succès/info
  aria-atomic="true"
>
  {message}
</div>
```

#### Mode Direct — Navigation slides

```tsx
<div role="navigation" aria-label="Navigation dans le plan">
  <button
    aria-label="Élément précédent"
    aria-disabled={isFirst}
    disabled={isFirst}
  >
    ◀ Précédent
  </button>
  <div
    role="status"
    aria-live="polite"
    aria-label={`Élément ${currentIndex + 1} sur ${total} : ${currentTitle}`}
  />
  <button
    aria-label="Élément suivant"
    aria-disabled={isLast}
    disabled={isLast}
  >
    Suivant ▶
  </button>
</div>
```

### 5.3 Textes cachés visuellement (sr-only)

Toutes les icônes fonctionnelles doivent avoir un texte accessible :

```tsx
// Icône seule dans un bouton
<button aria-label="Fermer">
  <X aria-hidden="true" />
</button>

// Bouton avec texte + icône
<button>
  <Music aria-hidden="true" />
  <span>Nouveau chant</span>
</button>

// Statut uniquement coloré
<span className="sr-only">Erreur :</span>
<span aria-hidden="true" className="text-destructive">⚠</span>
```

---

## 6. Contraste des couleurs

### Mode Préparation (fond clair)

| Élément | Couleur texte | Fond | Ratio | WCAG AA |
|---|---|---|---|---|
| Texte principal | `#09090B` | `#FAFAF9` | 19.7:1 | ✓ AAA |
| Texte secondaire | `#52525B` | `#FAFAF9` | 7.3:1 | ✓ AAA |
| Texte muted | `#A1A1AA` | `#FAFAF9` | 2.9:1 | ✗ (non-interactif uniquement) |
| Bouton primary | `#FFFFFF` | `#4F46E5` | 5.8:1 | ✓ AA |
| Bouton danger | `#FFFFFF` | `#EF4444` | 4.7:1 | ✓ AA |
| Badge kind-song | `#FFFFFF` | `#8B5CF6` | 4.6:1 | ✓ AA |
| Badge kind-bible | `#FFFFFF` | `#0EA5E9` | 3.2:1 | ✓ (grands éléments) |
| Lien focus | `#4F46E5` | `#FAFAF9` | 4.8:1 | ✓ AA |

### Mode Direct (fond sombre)

| Élément | Couleur texte | Fond | Ratio | WCAG AA |
|---|---|---|---|---|
| Texte principal | `#FAFAFA` | `#0A0A0F` | 20.1:1 | ✓ AAA |
| Texte secondaire | `#A1A1AA` | `#0A0A0F` | 5.1:1 | ✓ AA |
| Indicateur live | `#22C55E` | `#0A0A0F` | 8.3:1 | ✓ AAA |
| Slide courant | `#FAFAFA` | `#1E1B4B` | 12.4:1 | ✓ AAA |
| Outline focus | `#4F46E5` | `#0A0A0F` | 7.2:1 | ✓ AAA |

> **Note** : `--text-muted` (#A1A1AA sur fond clair) n'atteint pas AA (2.9:1). Il ne doit être utilisé que pour les métadonnées non critiques et jamais pour des informations essentielles.

---

## 7. Tailles des cibles interactives

| Composant | Taille minimale | Taille recommandée |
|---|---|---|
| Bouton primary / secondary | 44×32px | 44×40px |
| Bouton ghost / icon | 32×32px | 40×40px |
| Bouton de navigation live | 48×48px | 48×56px |
| Onglet source panel | 44×36px | 44×44px |
| PlanItemCard (zone clic) | 44×56px | 100%×56px |
| ChapterGrid bouton | 24×24px | 28×28px (*) |
| Drag handle | 24×44px | 32×44px |
| Checkbox / Toggle | 44×44px | 44×44px |

> (*) Exception : la grille de chapitres est dense. Compenser avec espacement tactile et tooltip.

---

## 8. Animations et préférences de mouvement

### Respect de `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Animations exclues de cette règle

- L'indicateur pulse du mode live (● EN DIRECT) : garder même avec `reduce` car c'est une information critique d'état.
- Remplacer le pulse par un changement de couleur statique si la préférence est activée.

```tsx
// LiveStatusIndicator
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

<span
  className={cn(
    "w-2 h-2 rounded-full",
    isLive
      ? prefersReducedMotion
        ? "bg-green-500"  // statique si préférence
        : "bg-green-500 animate-pulse"  // pulse sinon
      : "bg-muted"
  )}
/>
```

---

## 9. Gestion des messages d'état

### Régions live ARIA

```tsx
// Pour les toasts (succès, info) — non-urgent
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {currentToastMessage}
</div>

// Pour les erreurs critiques — urgent
<div aria-live="assertive" aria-atomic="true" className="sr-only">
  {currentErrorMessage}
</div>
```

### Annonces dynamiques en mode Direct

Quand l'opérateur change de slide, annoncer le nouveau contenu :

```tsx
// Invisible visuellement, lu par le lecteur d'écran
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {`Projeté : ${currentItem.title} — ${currentItem.kind}`}
</div>
```

---

## 10. Tests d'accessibilité

### Tests automatiques (CI)

```bash
# Ajouter axe-core via vitest-axe
npm install -D @axe-core/react vitest-axe

# Exemple de test
import { axe } from 'vitest-axe';
it('PlanItemCard has no accessibility violations', async () => {
  const { container } = render(<PlanItemCard ... />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Tests manuels recommandés

| Test | Outil | Fréquence |
|---|---|---|
| Navigation Tab complète | Clavier seul | Chaque release |
| Contraste couleurs | WebAIM Contrast Checker | Chaque changement de palette |
| Lecteur d'écran (annonces) | NVDA (Windows) | Mensuel |
| Zoom 200% | Navigateur | Chaque release |
| `prefers-reduced-motion` | DevTools → Emulation | Chaque release |

### Checklist pré-release accessibilité

- [ ] Tous les éléments interactifs sont atteignables au Tab
- [ ] L'ordre de focus est logique (haut→bas, gauche→droite)
- [ ] Chaque dialog a un focus trap et un `returnFocus`
- [ ] Toutes les icônes fonctionnelles ont `aria-label` ou `sr-only`
- [ ] Les messages d'erreur sont liés à leur champ via `aria-describedby`
- [ ] Les listes de slides ont `aria-current` sur l'élément actif
- [ ] Les boutons toggle ont `aria-pressed`
- [ ] Pas de `outline: none` sans alternative `:focus-visible`
- [ ] Contraste vérifié pour toutes les nouvelles couleurs
- [ ] Animation testée avec `prefers-reduced-motion`

---

## 11. Cas particuliers et exceptions documentées

| Cas | Décision | Justification |
|---|---|---|
| `--text-muted` en fond clair | Ratio 2.9:1 (< 4.5:1) | Utilisé uniquement pour métadonnées non-critiques (timestamps, références). Jamais pour des actions ou informations importantes. |
| ChapterGrid boutons 24×24px | Inférieur à 44×44px recommandé | Contexte de grille dense. Compensé par tooltip au hover et espacement tactile 2px entre cases. Exception documentée WCAG 2.5.5 (non-obligatoire AA). |
| Drag & drop | Alternative clavier fournie | API dnd-kit supporte la navigation clavier. Tester avec NVDA activé. |
| ProjectionPage | Non soumis WCAG | Écran d'affichage public non interactif. Le contenu projeté (taille texte, contraste) est configurable par l'opérateur dans Apparence. |
| Raccourcis single-key (B, W, R…) | Conflits potentiels avec AT | Les raccourcis globaux sont désactivables dans Paramètres. En mode Direct uniquement. |

---

*Document d'accessibilité — à auditer à chaque nouvelle fonctionnalité. Référence : WCAG 2.1 — https://www.w3.org/TR/WCAG21/*
