---
name: interface-design
description: "Interface Design — cohérence design system entre composants et sessions. Tokens, directions Precision/Warmth. Utiliser pour design system, cohérence UI, composants."
---

# Interface Design — Klir IA

## Mission

Zéro dérive stylistique : mêmes boutons, espacements, radius, couleurs sur toute la page.

## Directions prédéfinies

- **Precision & Density** — SaaS, data, grilles serrées
- **Warmth & Approachability** — services, santé, humain

## Tokens obligatoires (CSS vars)

--space-xs à --space-2xl · --radius-sm/md/lg · --shadow-sm/md · --font-display · --font-body

## Processus

1. Déclarer direction + tokens en tête du `<style>`.
2. Chaque section réutilise les mêmes classes utilitaires.
3. Déclarer choix avant chaque bloc majeur.
