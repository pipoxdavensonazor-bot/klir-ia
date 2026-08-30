---
name: trading-binary-options
description: "Options binaires — patterns bougies, timing clôture, BinaryOptionsTools. Utiliser pour options binaires, binary options, expiry bougie, 60 secondes, OTC broker."
---

# Trading Binary Options — Klir IA

## Stack

- **TA-Lib / pandas-ta** — confirmation pattern bougie (trading-technical)
- **BinaryOptionsTools** (github.com/theshadow76/BinaryOptionsTools) — interaction brokers, timing clôture

## Spécificités

- Payout fixe, perte totale du premium si faux sens à l'expiry
- Timeframes 1m–5m : bruit élevé, spread OTC
- Aligner expiry sur **clôture** bougie signal (M1/M5)

## Workflow analyse (informatif)

1. Trend bias timeframe supérieur (M15/H1).
2. Pattern reversal ou continuation sur TF entrée.
3. Filtre : pas de trade 5 min avant news macro (trading-fundamental).
4. Journal win rate réel — ne pas extrapoler démo broker.

## Garde-fous Klir IA

- Rappeler risque réglementaire (interdit retail dans plusieurs juridictions dont UE/CA pour certains produits).
- Ne jamais promettre « stratégie gagnante ».
- Encourager limites journalières et stop après X pertes.

## Disclaimer

Options binaires = produit à haut risque. Contenu éducatif uniquement.
