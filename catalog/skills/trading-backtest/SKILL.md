---
name: trading-backtest
description: "Backtesting Python — backtrader, backtesting.py, quantstats (Sharpe, Sortino, drawdown). Utiliser pour backtest, tester stratégie, sharpe ratio, drawdown, tear sheet, performance stratégie."
---

# Trading Backtest — Klir IA

## Stack

| Lib | Dépôt | Quand l'utiliser |
|-----|-------|------------------|
| **backtesting.py** | kernc/backtesting.py | Prototypage rapide, graphiques interactifs |
| **backtrader** | mementum/backtrader | Stratégies multi-actifs, ordres complexes |
| **quantstats** | ranaroussi/quantstats | Rapport pro après backtest |

## Workflow backtesting.py + quantstats

```python
from backtesting import Backtest, Strategy
from backtesting.lib import crossover
import yfinance as yf
import quantstats as qs

class SmaCross(Strategy):
    n1, n2 = 10, 30
    def init(self):
        close = pd.Series(self.data.Close)
        self.s1 = self.I(lambda: close.rolling(self.n1).mean())
        self.s2 = self.I(lambda: close.rolling(self.n2).mean())
    def next(self):
        if crossover(self.s1, self.s2): self.buy()
        elif crossover(self.s2, self.s1): self.position.close()

data = yf.download("EURUSD=X", period="2y")  # adapter colonnes
bt = Backtest(data, SmaCross, cash=10_000, commission=.0002)
stats = bt.run()
qs.reports.html(stats._equity_curve, output="report.html")
```

## Métriques clés (quantstats)

- **Sharpe** — rendement ajusté volatilité
- **Sortino** — pénalise surtout la volatilité baissière
- **Max Drawdown** — pire creux depuis un pic
- **Alpha / Beta** — vs benchmark (SPY, BTC…)

## Garde-fous

- Inclure frais, slippage, spread réalistes.
- Walk-forward ou split train/test si possible.
- Backtest overfitté ≠ edge réel.

## Disclaimer

Performance passée ne garantit pas résultats futurs.
