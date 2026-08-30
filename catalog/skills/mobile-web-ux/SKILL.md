---
name: mobile-web-ux
description: "Mobile web UX — touch targets 44px, safe areas, typographie fluide, pas hover-only. Utiliser pour mobile first, responsive, site mobile, PWA landing."
---

# Mobile Web UX — Klir IA

## Règles mobile-first

- Base styles = mobile ; `@media (min-width: 768px)` desktop
- Touch targets min **44×44px** (boutons, liens nav)
- Font-size body ≥ 16px (évite zoom iOS)
- Padding horizontal 16–20px
- Sticky CTA optionnel en bas mobile (conversion)

## Interdit

- Hover-only pour info critique
- Texte < 14px pour body
- Grilles multi-colonnes sans stack mobile

## Safe area

`padding: env(safe-area-inset-*)` si fixed header/footer
