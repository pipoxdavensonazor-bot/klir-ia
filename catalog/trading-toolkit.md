# Trading Toolkit — Références open-source (Klir IA)

Document source pour les skills d'analyse trading. **Informatif uniquement — pas conseil en investissement.**

## 1. Analyse technique & Smart Money

| Outil | Dépôt | Usage |
|-------|-------|-------|
| **pandas-ta** | github.com/twopirllc/pandas-ta | RSI, MACD, Bollinger, SuperTrend sur OHLCV pandas |
| **SMC / ICT** | github.com/mementum/smc | Market Structure, Order Blocks, FVG, BOS, CHoCH |
| **TA-Lib** | github.com/ta-lib/ta-lib | 60+ patterns chandelles (Doji, Engulfing, Hammer) |

## 2. Backtesting & quant

| Outil | Dépôt | Usage |
|-------|-------|-------|
| **backtrader** | github.com/mementum/backtrader | Backtest avancé, ordres, spreads |
| **backtesting.py** | github.com/kernc/backtesting.py | Backtest léger + charts interactifs |
| **quantstats** | github.com/ranaroussi/quantstats | Tear sheet : Sharpe, Sortino, max drawdown, alpha/beta |

## 3. Fondamental & macro

| Outil | Dépôt | Usage |
|-------|-------|-------|
| **forexfactory-api** | github.com/Jme812/forexfactory-api | Calendrier économique (NFP, Fed, CPI) |
| **yfinance** | github.com/ranaroussi/yfinance | OHLCV Or (GC=F), Forex (EURUSD=X), actions |

## 4. Gestion du risque

| Outil | Dépôt | Usage |
|-------|-------|-------|
| **Riskfolio-Lib** | github.com/dcajasn/Riskfolio-Lib | Allocation, optimisation risque, portefeuille |
| **Kelly / sizing** | github.com/gianlucamalato/machinelearning | Critère de Kelly, money management |

## 5. MT5 & options binaires

| Outil | Dépôt | Usage |
|-------|-------|-------|
| **MT5 Python** | MetaQuotes / MT5-Python-Integration | Terminal MT5 live (Forex, Or) |
| **BinaryOptionsTools** | github.com/theshadow76/BinaryOptionsTools | Clôture bougie, brokers options binaires |

## Stack Python recommandée (scripts Cursor)

```
pandas · numpy · pandas-ta · yfinance · quantstats · backtesting.py
# Optionnel : ta-lib (binaire C), backtrader (stratégies complexes), smc, MetaTrader5
```

## Garde-fous Klir IA

- Ne jamais garantir un rendement.
- Backtest ≠ performance future.
- Options binaires : risque élevé, régulation variable.
- Toujours disclaimer en fin d'analyse.
