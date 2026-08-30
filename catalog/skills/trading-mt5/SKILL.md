---
name: trading-mt5
description: "MetaTrader 5 Python — connexion terminal MT5, données live Forex/Or, analyse temps réel. Utiliser pour MT5, MetaTrader, terminal trading, forex live, gold XAU MT5."
---

# Trading MT5 — Klir IA

## Stack

**MetaTrader5** (package Python officiel MetaQuotes) — liaison terminal MT5 Windows.

```python
import MetaTrader5 as mt5

if not mt5.initialize():
    raise RuntimeError(mt5.last_error())

rates = mt5.copy_rates_from_pos("XAUUSD", mt5.TIMEFRAME_H1, 0, 500)
# → numpy structured array → pandas DataFrame

mt5.shutdown()
```

## Prérequis

- Terminal MT5 installé et connecté au broker
- Symboles exacts broker (`XAUUSD` vs `GOLD` vs `XAUUSD.a`)
- Python 64-bit aligné avec MT5

## Workflow analyse live

1. `initialize()` → vérifier compte/symbole
2. Télécharger bougies (`copy_rates_*`)
3. Passer à pandas-ta / smc pour analyse (skills trading-technical, trading-smart-money)
4. **Ne pas** envoyer ordres sans confirmation explicite utilisateur (approval-gates)

## Limites

- MT5 = Windows (souvent) ; pas de cloud headless trivial
- Latence, requotes, spread variable — inclure dans backtest séparé

## Disclaimer

Exécution live = risque réel. Tests sur compte démo d'abord.
