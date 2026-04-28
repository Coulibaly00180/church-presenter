---
name: Vibrant Momentum
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#44e2cd'
  on-secondary: '#003731'
  secondary-container: '#03c6b2'
  on-secondary-container: '#004d44'
  tertiary: '#ffb2b9'
  on-tertiary: '#67001f'
  tertiary-container: '#ea6479'
  on-tertiary-container: '#5b001a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#62fae3'
  secondary-fixed-dim: '#3cddc7'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005047'
  tertiary-fixed: '#ffdadc'
  tertiary-fixed-dim: '#ffb2b9'
  on-tertiary-fixed: '#400010'
  on-tertiary-fixed-variant: '#891933'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-xl:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  container-max: 1280px
---

## Brand & Style

This design system is built to evoke a sense of kinetic energy, spiritual inspiration, and modern precision. The brand personality is "Exuberant yet Organized"—it balances the high-octane energy of a live event with the structured clarity required for workflow management.

The aesthetic leans heavily into **Glassmorphism** and **High-Contrast Modernism**. It utilizes deep, saturated backgrounds contrasted against luminous, neon-adjacent accents. Every interaction should feel "alive," achieved through subtle gradients that imply movement and semi-transparent layers that provide a sense of depth and physical presence. The interface avoids clinical coldness in favor of a warm, radiant glow that feels premium and welcoming.

## Colors

The palette is anchored by **Deep Indigo** and **Electric Violet**, serving as the foundation for the dark mode environment. To ensure the UI "pops," we employ high-saturation accents: **Teal** for success and primary actions, and **Coral** for energy and secondary highlights.

- **Primary (Electric Violet/Indigo):** Used for brand identity, active states, and focus rings.
- **Secondary (Teal):** Used for high-priority calls to action and "active" status indicators.
- **Tertiary (Coral):** Used for attention-grabbing elements, notifications, or "live" indicators.
- **Neutral:** A deep navy-slate base that prevents the black-hole effect of pure hex #000, maintaining a premium, "ink-like" quality.

Gradients should be used sparingly but impactfully on primary buttons and header surfaces to simulate light emission.

## Typography

The typography system utilizes **Manrope** exclusively to maintain a clean, geometric, and highly legible appearance. 

- **Weight Strategy:** Headlines use ExtraBold (800) and Bold (700) to create a strong visual anchor. Body text stays at Medium (500) or Regular (400) for effortless scanning.
- **Rhythm:** Generous line heights are applied to body copy to enhance the "airy" and "inspiring" feel of the layout.
- **Accents:** Small labels use uppercase with increased tracking (letter-spacing) to act as structural markers without cluttering the visual field.

## Layout & Spacing

This design system follows a **Fixed-Fluid Hybrid** grid. While the main content container caps at 1280px to maintain readability, internal components use a fluid 12-column system.

- **The 8px Square:** All spacing, margins, and paddings are derived from an 8px base unit.
- **Rhythm:** Use `48px (lg)` or `80px (xl)` for vertical section breathing room to maintain the "premium" high-quality feel. 
- **Internal Padding:** Components use a minimum of `16px` (2 units) of internal padding to ensure elements never feel cramped.

## Elevation & Depth

Depth is achieved through **Atmospheric Layering** rather than traditional drop shadows.

1.  **Level 0 (Base):** The Deep Indigo background gradient.
2.  **Level 1 (Surfaces):** Cards and containers use a semi-transparent fill (e.g., `rgba(255, 255, 255, 0.05)`) with a `20px` backdrop-blur (Glassmorphism).
3.  **Level 2 (Active Elements):** Use "Inner Glows"—subtle, high-color stroke outlines (1px) with 10-20% opacity of the Teal or Violet primary colors.
4.  **Level 3 (Floating/Popups):** Extra-diffused ambient shadows with a color tint matching the primary brand color (e.g., a violet-tinted shadow instead of pure black).

## Shapes

The shape language is defined by **Large, Soft Radii**. To match the "rounded-xl" requirement:

- **Primary Cards & Containers:** Use `24px (1.5rem)` corner radius.
- **Buttons & Inputs:** Use `12px (0.75rem)` to maintain a distinct but complementary feel.
- **Selection Indicators:** Use pill-shaped (fully rounded) indicators for chips and toggle switches.

Edges should always feel smooth and never aggressive, reinforcing the welcoming nature of the platform.

## Components

- **Buttons:** Primary buttons use a vibrant gradient from Electric Violet to Indigo. Hover states should "glow" using a subtle outer shadow of the same color. Text is always Bold Manrope.
- **Cards:** Glassmorphic backgrounds with a `1px` translucent border. This "ghost border" helps define the shape against the dark background without adding visual weight.
- **Inputs:** Darker than the surface level, with a 2px Teal border appearing only on focus. Labels sit just above the input in the `label-caps` style.
- **Chips/Badges:** High-saturation backgrounds (Teal or Coral) with white text for maximum "pop" against the dark UI.
- **Progress Bars:** Use a "Liquid" aesthetic—rounded caps and a subtle gradient fill that looks like it's glowing from within.
- **Navigation:** Sidebars should use the backdrop-blur effect to show a hint of the background colors moving behind the menu as the user scrolls.