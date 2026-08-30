---
name: design-systems
description: "Design systems — tokens couleur, typo, spacing, composants boutons/formulaires/cartes. Utiliser pour design system, tokens CSS, composants UI cohérents."
---

# Design Systems — Klir IA

## Tokens minimum (sites HTML)

```css
:root {
  --color-primary; --color-accent; --color-bg; --color-surface; --color-text; --color-muted;
  --space-1: 4px; --space-2: 8px; ... --space-16: 64px;
  --radius-sm: 6px; --radius-md: 12px; --radius-lg: 20px;
  --shadow-sm; --shadow-md;
  --font-display; --font-body;
}
```

## Composants

- **Btn primary/secondary/ghost** — même height, padding, focus ring
- **Card** — surface + shadow-sm, hover lift optionnel
- **Section** — padding vertical cohérent (64–96px desktop)

## Règle

Un token = une décision. Pas de `#333` en dur si `--color-text` existe.
