---
name: Sanctuary Design System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fd'
  on-secondary-container: '#57657b'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#0b1c30'
  on-tertiary-container: '#75859d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-xl:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  lyrics-view:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '500'
    lineHeight: '1.7'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-margin: 20px
  gutter: 16px
---

## Brand & Style

The design system is rooted in the concepts of **reverence, clarity, and focus**. It facilitates a seamless transition between administrative preparation and the spiritual atmosphere of worship. 

The aesthetic identity is **Modern Minimalism with a Tonal Layering approach**. By prioritizing generous whitespace and a restricted color palette, the interface recedes to let the lyrics and song metadata take center stage. The style avoids unnecessary ornamentation, opting instead for precision, high legibility, and a rhythmic layout that feels stable and dependable. The emotional response should be one of "digital quiet"—reducing cognitive load for worship leaders and musicians.

## Colors

The palette is anchored in **Deep Ocean Blues** and **Atmospheric Grays**. 
- **Primary (#0F172A):** A deep, near-black blue used for high-importance text and headers to provide a grounded, professional feel.
- **Surface & Neutral:** Uses a range of cool whites and soft slates to create "breathable" areas. 
- **Spiritual Subtlety:** We avoid harsh blacks. Instead, we use "Slate" scales to maintain a soft, ink-like quality that is easier on the eyes during long rehearsals.
- **Functional Accents:** A singular, clear blue is reserved for primary actions (e.g., "Add Song", "Go Live"), ensuring the user's path is always illuminated without being loud.

## Typography

This design system utilizes **Manrope** for its exceptional balance between geometric modernism and humanistic warmth. 

- **Lyrics First:** For the song display, we use a specific `lyrics-view` token. It features increased line height and size to ensure readability from a distance (e.g., a tablet on a music stand).
- **Interface Clarity:** Headlines use a tighter letter-spacing and heavier weights to provide clear structure. 
- **Labels:** Small, all-caps labels are used for metadata like "Key," "BPM," and "Tempo" to differentiate administrative data from the song content itself.

## Layout & Spacing

The system employs a **Fluid-Responsive Grid** centered on an 8px rhythmic scale.

- **Mobile-First:** Navigation is primarily handled via a bottom bar or a clean top-right menu. Lists use the full width of the viewport with `md` padding.
- **Desktop Scaling:** On larger screens, the content centers within a max-width container (1200px), moving from a single-column list to a multi-column card grid or a split-screen view (Song List on left, Lyrics Detail on right).
- **Safe Zones:** Generous `xl` vertical spacing between sections prevents the interface from feeling cluttered, reinforcing the "calm" design pillar.

## Elevation & Depth

We utilize **Tonal Layers and Soft Ghost Borders** instead of heavy shadows. Depth is communicated through subtle shifts in background color rather than physical height.

- **Level 0 (Background):** Pure White (#FFFFFF) for the main canvas.
- **Level 1 (Cards/Sidebar):** Light Slate (#F8FAFC) with a 1px border (#E2E8F0).
- **Interactive States:** On hover or focus, elements should gain a very soft, diffused ambient shadow (10% opacity, 12px blur, 4px offset) to suggest clickability without breaking the flat, modern aesthetic.
- **Modals:** Use a heavy backdrop blur (12px) to focus the user entirely on the task at hand, effectively "muting" the rest of the application.

## Shapes

The shape language is **Soft and Disciplined**. 
- **Standard Radius:** We use a `0.25rem` (4px) radius for most small components (buttons, inputs) to maintain a professional, slightly architectural edge.
- **Containers:** Larger cards and modals use `rounded-lg` (8px) to soften the overall appearance of the screen.
- **Full Rounding:** Only used for search bars and status badges (e.g., "Active," "New") to create a clear visual distinction from functional buttons.

## Components

### Buttons & Inputs
Following the shadcn/ui philosophy, buttons are primarily solid or outlined. Primary buttons use the deep blue background with white text. Secondary buttons use a transparent background with a subtle border. Inputs are clean, using a 1px border that becomes blue only upon focus.

### Song Cards
Cards are the primary vehicle for song management. They feature:
- Top-aligned Title (Headline-md).
- Sub-labels for "Key" and "BPM" in the bottom-left.
- A "Quick Play" or "View" icon button in the bottom-right.
- Subtle border that darkens on hover.

### Navigation
- **Mobile:** Bottom navigation bar with clear, thin-stroke linear icons and 12px labels.
- **Desktop:** A refined sidebar with plenty of top padding and "Ghost" style active states (no background, just a weight change or a small left-side accent line).

### Setlist Organizer
A drag-and-drop list component with "grab" handles. Each item in the setlist should use a "Surface" color background to distinguish it from the "Song Library" view.

### Worship Mode Toggle
A distinctive, high-contrast toggle that shifts the UI into a high-legibility "Presentation Mode" (often switching to a dark-mode palette for low-light environments).