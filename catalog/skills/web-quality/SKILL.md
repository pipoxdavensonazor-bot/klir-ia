---
name: web-quality
description: "Qualité web (Vercel) — accessibilité, performance, sémantique HTML, bonnes pratiques UI. Utiliser pour audit qualité code UI, perf landing, a11y."
---

# Web Quality — Klir IA

## HTML sémantique

`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`, `<article>` — pas de div soup.

## Performance landing

- CSS inline OK · pas d'images externes lourdes · fonts max 2
- Pas de JS obligatoire pour lire le CTA
- `meta viewport` + `lang="fr"`

## UX technique

- Liens CTA avec href valide
- Formulaire : types input corrects, autocomplete si pertinent
- États hover/focus/active sur interactifs
