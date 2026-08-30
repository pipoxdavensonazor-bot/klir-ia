---
name: trading-risk
description: "Gestion du risque trading — Riskfolio-Lib, critère de Kelly, position sizing, allocation portefeuille. Utiliser pour money management, kelly criterion, drawdown max, taille position, risk management."
---

# Trading Risk — Klir IA

## Stack

- **Riskfolio-Lib** (github.com/dcajasn/Riskfolio-Lib) — optimisation portefeuille, VaR, allocation risque
- **Kelly** — réf. gianlucamalato/machinelearning — fraction optimale théorique (souvent Kelly/2 ou Kelly/4 en pratique)

## Position sizing (règle simple)

```
risque_par_trade = capital × risk_pct   # ex. 1–2 % max
taille = risque_par_trade / |entry - stop_loss|
```

## Kelly (concept)

`f* = (p × b - q) / b` où p = win rate, b = ratio gain/perte, q = 1-p  
**Attention** : Kelly plein est agressif → utiliser fraction Kelly (¼–½).

## Riskfolio (portefeuille)

- Mean-Variance, CVaR, risk parity selon profil.
- Diversification corrélation (Or vs USD vs indices).

## Processus

1. Définir capital, risk % max par trade, drawdown max acceptable.
2. Calculer taille position AVANT le signal.
3. Refuser stratégie si RR < 1:1 sans edge statistique prouvé (backtest).
4. Journal trades : expectancy, max losing streak.

## Disclaimer

Optimisation mathématique ≠ profit garanti. Ruine possible.
