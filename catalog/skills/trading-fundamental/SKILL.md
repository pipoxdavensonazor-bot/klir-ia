---
name: trading-fundamental
description: "Analyse fondamentale & macro — yfinance (Or, Forex, actions), calendrier Forex Factory (NFP, Fed). Utiliser pour macro, NFP, calendrier économique, fondamental, XAUUSD news, taux Fed."
---

# Trading Fundamental — Klir IA

## Stack

- **yfinance** (github.com/ranaroussi/yfinance) — OHLCV multi-actifs
  - Or : `GC=F` · EUR/USD : `EURUSD=X` · Actions : `AAPL`, `TSLA`
- **forexfactory-api** (github.com/Jme812/forexfactory-api) — événements macro à fort impact

## Workflow données

```python
import yfinance as yf

gold = yf.download("GC=F", period="1mo", interval="1d")
eurusd = yf.download("EURUSD=X", period="3mo", interval="1h")
```

## Calendrier macro

Avant trades sur **XAU/USD** ou **majors** :
1. Vérifier NFP, CPI, FOMC, taux BCE/Fed dans les 24–48h.
2. Réduire taille ou pause autour des annonces (volatilité extrême).
3. forexfactory-api pour automatiser le filtre dans un bot.

## Processus analyse fondamentale

1. Contexte macro (taux, USD, géopolitique) en 3–5 bullets factuels.
2. Lien **conditionnel** avec l'actif (ex. Or souvent sensible taux réels).
3. Séparer faits vérifiés vs spéculation.
4. Croiser avec analyse technique si demandé (skill trading-technical).

## Disclaimer

Actualités interprétées à titre informatif. Pas recommandation de trade.
