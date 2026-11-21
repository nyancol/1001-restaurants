---
name: Botanical Butter & Earth
colors:
  surface: '#fff8f0'
  surface-dim: '#f0d990'
  surface-bright: '#fff8f0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff3d6'
  surface-container: '#ffedba'
  surface-container-high: '#ffe79d'
  surface-container-highest: '#f9e198'
  on-surface: '#231b00'
  on-surface-variant: '#414940'
  inverse-surface: '#3b2f00'
  inverse-on-surface: '#fff0c8'
  outline: '#71796f'
  outline-variant: '#c0c9bd'
  surface-tint: '#2e6a3d'
  primary: '#225f33'
  on-primary: '#ffffff'
  primary-container: '#3c7849'
  on-primary-container: '#bcfec3'
  inverse-primary: '#96d59e'
  secondary: '#2f6a39'
  on-secondary: '#ffffff'
  secondary-container: '#aeefb2'
  on-secondary-container: '#336f3d'
  tertiary: '#714d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#8f640e'
  on-tertiary-container: '#ffecd4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b1f2b8'
  primary-fixed-dim: '#96d59e'
  on-primary-fixed: '#00210a'
  on-primary-fixed-variant: '#125227'
  secondary-fixed: '#b1f2b4'
  secondary-fixed-dim: '#96d69a'
  on-secondary-fixed: '#002108'
  on-secondary-fixed-variant: '#145224'
  tertiary-fixed: '#ffdeae'
  tertiary-fixed-dim: '#f4bd63'
  on-tertiary-fixed: '#281900'
  on-tertiary-fixed-variant: '#604100'
  background: '#fff8f0'
  on-background: '#231b00'
  surface-variant: '#f9e198'
typography:
  display-lg:
    fontFamily: Literata
    fontSize: 52px
    fontWeight: '600'
    lineHeight: 64px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Literata
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Literata
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
  body-lg:
    fontFamily: Nunito Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  label-lg:
    fontFamily: Nunito Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 2rem
  margin: 1.25rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system expresses an unhurried, grounded culinary-botanical warmth. It targets lifestyle, organic culinary, artisanal home goods, and mindful living audiences who value comfort, tactility, and natural authenticity. 

The aesthetic is a warm, tactile minimalism built upon a rich culinary butter canvas (`#F9E198`), contrasted with deep forest botanical greens and muted sage foliage accents. By moving away from sterile whites and clinical modernism, the UI establishes an inviting, domestic, and handcrafted atmosphere without losing clarity or modern usability.

## Colors
The palette centers around a soft culinary butter tone (`#F9E198`) that serves as the default atmospheric canvas.

- **Primary (`#3C7849`):** Deep forest foliage green for primary interactive triggers, focused states, and key navigational landmarks. Provides strong accessible contrast against warm yellow backdrops.
- **Secondary (`#66A36C`):** Muted botanical sage, used for supportive iconography, subtle badges, and secondary container fills.
- **Tertiary (`#BD8C37`):** Warm amber spice, reserved for editorial highlights, subtle tags, and warm contextual markers.
- **Neutral (`#F9E198`):** Rich, creamy butter yellow. Surfaces stack upward to lighter cream tiers for elevated cards, and drop down for recessed wells, sidebars, and input tracks.
- **Borders & Dividers:** Always tinted with the base undertone, preventing cold, desaturated grays from severing the warm atmosphere.

## Typography
The pairing combines the editorial grace of `Literata` with the gentle, organic curves of `Nunito Sans`. 

- Use `Literata` for titles, headers, and pull quotes to establish human craftsmanship and narrative depth.
- Use `Nunito Sans` for all interface chrome, body copy, and form elements.
- Maintain comfortable, unhurried line-heights (1.6+ for body copy) to preserve breathable visual rhythm and relaxed readability.

## Layout & Spacing
A fluid 12-column responsive grid anchored with generous outer margins. 

- **Breakpoints:** Mobile (<768px), Tablet (768px–1024px), Desktop (>1024px).
- Internal element padding favors open spatial staging: sections breathe with `space-xl` separation, while structural cards utilize a steady `space-lg` (24px) baseline.
- Mobile views drop outer canvas margins to `1.25rem` while preserving internal component padding to maintain comfortable tap areas and an uncrowded feeling.

## Elevation & Depth
Depth is communicated through tonal layering and buttery surfaces rather than standard dark dropshadows.

- **Stacking Architecture:** The baseline canvas is warm butter (`#F9E198`). Raised panels, modal sheets, and cards sit on a lighter cream tier. Recessed surfaces and form inputs rest on a deeper golden-sand layer.
- **Shadow Quality:** Shadows must be ultra-diffused, tinted with warm botanical umber rather than cold neutral gray: `0 8px 24px -4px rgba(62, 53, 38, 0.07), 0 2px 6px -1px rgba(62, 53, 38, 0.04)`.
- **Borders:** Thin (1px), subtle warm outlines define structural boundaries without severing the soft continuity of the butter surface.

## Shapes
A roundedness factor of 2 establishes a soft, friendly 12px (`0.75rem` / `rounded-lg`) corner radius across primary UI containers, cards, dialogs, and interactive buttons. 

Small tags, chips, and utility pills may scale to fully circular pill contours where distinct item encapsulation is required, but structural boxes strictly preserve the cohesive 12px curvature.

## Components

- **Buttons:**
  - *Primary:* Solid deep forest green (`#3C7849`) background, white text (`#FFFFFF`), 12px radius, minimum 48px height, padded with `1rem 1.5rem`. Subtle lift on hover with softened green shadow.
  - *Secondary:* Light cream surface with a 1px warm border and forest green text (`#3C7849`).
  - *Tertiary / Ghost:* Transparent butter background, forest green text, soft sage highlight on press/hover.

- **Cards & Containers:**
  - Raised warm cream surface, framed with a 1px warm border, 12px border radius, and internal padding of `1.5rem` (24px). Free of harsh contrasts.

- **Input Fields:**
  - Built on a slightly recessed container tone to provide natural visual indentation against the butter canvas. Text in `#2D2926`. Active focus state reveals a 2px stroke in forest green (`#3C7849`) accompanied by a gentle sage halo.

- **Chips & Tags:**
  - Muted sage tinted surface with deep sage copy, or warm amber background for highlighting special attributes. Rounded 12px or soft pill contours.

- **Checkboxes & Radios:**
  - 12px softly rounded checkboxes and circular radios resting in a 1.5px border of `#66A36C`. Active selection fills with `#3C7849` containing crisp cream iconography.