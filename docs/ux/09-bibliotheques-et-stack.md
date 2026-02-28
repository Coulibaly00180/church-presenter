# 09 — Bibliothèques et Stack Technique

## Stack principale

| Couche | Technologie | Version | Rôle |
|--------|-------------|---------|------|
| Runtime | Electron | ^34 | Fenêtres natives, multi-écrans, IPC |
| UI framework | React | ^19 | Rendu déclaratif, hooks, concurrent mode |
| Routing | React Router | ^7 | HashRouter (`/` préparation, `/projection` plein-écran) |
| Langage | TypeScript | ~5.8 | Mode strict, ES2022 target |
| Build | electron-vite | ^3 | Bundler Vite adapté Electron (main + preload + renderer) |
| CSS | Tailwind CSS | ^4 | Utilitaire, système de tokens via `@theme { }` |
| Base de données | Prisma + SQLite | ^6 / better-sqlite3 | Stockage local (Songs, ServicePlans) |

---

## Bibliothèques UI

### Radix UI — Primitives headless

**Package :** `radix-ui@^1.4.3` (package unifié, pas les packages individuels `@radix-ui/react-*`)

**Import pattern :**
```ts
import { Dialog, Tabs, Tooltip, DropdownMenu } from "radix-ui";
// Utilisation : Dialog.Root, Dialog.Content, Tabs.Root, etc.
```

**Composants utilisés :**
| Primitive Radix | Composant ui/ wrappé |
|-----------------|----------------------|
| `Dialog` | `dialog.tsx` (+ DialogHeader/Footer/Body/Title) |
| `Tabs` | `tabs.tsx` |
| `Tooltip` | `tooltip.tsx` (avec Provider global) |
| `ScrollArea` | `scroll-area.tsx` |
| `Select` | `select.tsx` |
| `DropdownMenu` | `dropdown-menu.tsx` |
| `Popover` | `popover.tsx` |
| `Dialog` (réutilisé) | `sheet.tsx` (variantes de côté via CVA) |
| `Slot` | utilisé dans `button.tsx` pour prop `asChild` |
| `Label` | `label.tsx` |
| `Separator` | `separator.tsx` |

### class-variance-authority (CVA)

**Package :** `class-variance-authority@^0.7.x`

Utilisé pour les variants de composants. Exemple avec Button :
```ts
const buttonVariants = cva(
  "inline-flex items-center ...",          // base
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        ghost: "hover:bg-bg-elevated",
        destructive: "bg-danger text-white",
        // …
      },
      size: {
        sm: "h-8 px-3 text-xs",
        xs: "h-6 px-2 text-xs",
        "icon-xs": "h-6 w-6",
        // …
      },
    },
    defaultVariants: { variant: "default", size: "sm" },
  }
);
```

**Composants avec CVA :** `button.tsx`, `badge.tsx`, `sheet.tsx`

### Sonner — Toasts

**Package :** `sonner@^2`

**Usage :**
```ts
import { toast } from "sonner";
toast.success("Chant créé");
toast.error("Erreur", { description: String(err) });
```

Le composant `<Toaster />` est monté une seule fois dans `AppShell.tsx`.

Le wrapper `components/ui/sonner.tsx` applique les classes design tokens (`bg-bg-surface`, `text-text-primary`, etc.) via les props `classNames` de Sonner.

### cmdk — Command palette

**Package :** `cmdk@^1`

**Import :** `import { Command, CommandInput, CommandList, CommandItem, ... } from "cmdk"`

Wrappé dans `components/ui/command.tsx`. Utilisé dans `Header.tsx` pour la recherche rapide et la navigation.

### @dnd-kit — Drag and drop

**Packages :** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

> Note : `@dnd-kit/modifiers` n'est **pas** installé. Le modificateur `restrictToVerticalAxis` est implémenté inline :
> ```ts
> const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });
> ```

**Usages :**
- `PlanEditor.tsx` — réordonnancement des items du plan
- `SongEditorDialog.tsx` — réordonnancement des blocs d'un chant

---

## Bibliothèques utilitaires

| Package | Usage |
|---------|-------|
| `clsx` | Conditionnement de classes CSS |
| `tailwind-merge` | Fusion intelligente (évite les conflits Tailwind) |
| `cn()` de `lib/utils.ts` | `twMerge(clsx(...inputs))` — utilisé partout |
| `lucide-react@^0.564` | Icônes SVG (tree-shakeable) |
| `@fontsource/space-grotesk` | Police principale, chargée dans `globals.css` |
| `next-themes` | Switcher thème clair/sombre (réservé, non encore activé) |

---

## Conventions de composants

### Structure d'un composant UI

```
components/ui/
├── button.tsx        # CVA variants + forwardRef + asChild (Slot)
├── input.tsx         # forwardRef + cn() pour classes custom
├── badge.tsx         # CVA variants + KindBadge spécialisé
├── dialog.tsx        # Radix Dialog wrappé + sous-composants nommés
└── …
```

### Pattern d'export

Tous les composants ui/ utilisent des **named exports** (pas de default export).

```ts
export { Button, buttonVariants };
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody };
```

### Composants avec `asChild`

Les composants supportant `asChild` utilisent `Slot.Root` de Radix :
```tsx
const Comp = asChild ? Slot.Root : "button";
return <Comp {...props} />;
```

### Accessibilité

- Focus visible : outline 2px `--primary` + offset 2px (défini dans `globals.css`)
- Tous les boutons icône ont `aria-label`
- Mode Direct : attributs `aria-pressed`, `aria-current`, `role="radio"` sur ScreenSelector
- Dialogs : `DialogTitle` obligatoire pour screen readers

---

## Tokens design (rappel)

Les classes Tailwind utilisent les tokens CSS définis dans `globals.css` via `@theme { }` :

| Token | Classe | Usage |
|-------|--------|-------|
| `--color-bg-base` | `bg-bg-base` | Fond principal (préparation) |
| `--color-bg-elevated` | `bg-bg-elevated` | Cartes, hover states |
| `--color-bg-surface` | `bg-bg-surface` | Surfaces secondaires |
| `--color-text-primary` | `text-text-primary` | Texte principal |
| `--color-text-muted` | `text-text-muted` | Texte secondaire/désactivé |
| `--color-border` | `border-border` | Bordures |
| `--color-primary` | `bg-primary`, `text-primary` | Accent principal |
| `--color-danger` | `text-danger`, `bg-danger` | Erreurs, suppressions |
| `--color-success` | `text-success` | Confirmations |
| `--color-live-indicator` | `text-live-indicator` | Point rouge mode Direct |

**Kind colors (bordures PlanItemCard) :**
| Kind | CSS var | Couleur |
|------|---------|---------|
| `SONG_BLOCK` | `--kind-song` | #8B5CF6 (violet) |
| `BIBLE_VERSE` | `--kind-bible` | #0EA5E9 (bleu) |
| `ANNOUNCEMENT_TEXT` | `--kind-announcement` | #F59E0B (ambre) |
| `ANNOUNCEMENT_IMAGE` / `PDF` | `--kind-media` | #EC4899 (rose) |
| `TIMER` | `--kind-timer` | #EF4444 (rouge) |

**Mode Direct :** la classe `.mode-live` est appliquée sur `document.body` par `LiveContext` quand `live.enabled === true`. Les tokens dark sont activés via `:root.mode-live` dans `globals.css`.

---

## Patterns à ne pas reproduire

- **Ne pas utiliser `@radix-ui/react-*` individuels** — utiliser uniquement `radix-ui` unifié.
- **Ne pas utiliser le CLI shadcn/ui** — il écraserait le `globals.css` custom avec des tokens incompatibles.
- **Ne pas utiliser `@dnd-kit/modifiers`** — le package n'est pas installé, implémenter les modifiers inline.
- **Ne pas mettre de hooks après un `return null` conditionnel** — respecter les rules-of-hooks en dérivant des booléens avant les hooks (`const isEnabled = live?.enabled ?? false`).
