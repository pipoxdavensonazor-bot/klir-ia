---
name: trading-technical
description: "Analyse technique Python — RSI, MACD, Bollinger, SuperTrend (pandas-ta), patterns chandelles (TA-Lib). Utiliser pour indicateurs, analyse technique, RSI, MACD, bougies japonaises, support résistance."
---

# Trading Technical — Klir IA

## Stack

- **pandas-ta** (github.com/twopirllc/pandas-ta) — centaines d'indicateurs sur DataFrame OHLCV
- **TA-Lib** (github.com/ta-lib/ta-lib) — reconnaissance patterns bougies (Doji, Engulfing, Hammer…)

## Workflow type

```python
import yfinance as yf
import pandas as pd
import pandas_ta as ta

df = yf.download("GC=F", period="6mo", interval="1h")
df.ta.rsi(length=14, append=True)
df.ta.macd(append=True)
df.ta.bbands(append=True)
# TA-Lib : talib.CDLENGULFING(open, high, low, close)
```

## Processus analyse

1. Charger OHLCV (yfinance ou CSV).
2. Calculer indicateurs pertinents au timeframe (pas 20 indicateurs redondants).
3. Décrire état : surachat/survente, tendance, volatilité (BB width).
4. Signaux **conditionnels** — jamais « achetez maintenant ».

## Options binaires

Timeframes courts : privilégier patterns TA-Lib + confirmation volume ; expiry alignée sur clôture bougie.

## Disclaimer

Analyse informative. Risque de perte totale.
