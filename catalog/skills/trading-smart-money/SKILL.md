---
name: trading-smart-money
description: "Smart Money Concepts (SMC/ICT) — Order Blocks, FVG, BOS, CHoCH, market structure. Dépôt mementum/smc. Utiliser pour smart money, order block, fair value gap, ICT, structure marché, liquidity."
---

# Trading Smart Money — Klir IA

## Stack

**mementum/smc** (github.com/mementum/smc) — détection automatique :
- Market Structure (HH/HL/LH/LL)
- Order Blocks (OB)
- Fair Value Gaps (FVG)
- Break of Structure (BOS) / Change of Character (CHoCH)

## Workflow type

```python
# Pattern conceptuel — adapter à la version smc installée
# pip install git+https://github.com/mementum/smc.git
import pandas as pd

# df : columns open, high, low, close, volume
# ob = detect_order_blocks(df)
# fvg = detect_fvg(df)
# structure = market_structure(df)
```

## Lecture SMC

| Concept | Interprétation |
|---------|----------------|
| **BOS** | Continuation tendance — cassure swing dans le sens de la tendance |
| **CHoCH** | Possible retournement — premier break contre la structure |
| **OB** | Zone où institutions ont laissé ordres — retest fréquent |
| **FVG** | Gap d'inefficience — souvent comblé partiellement |

## Processus

1. Identifier timeframe bias (H4/D1) puis entrées (M15/H1).
2. Marquer structure, OB valides, FVG non comblés.
3. Scénarios conditionnels (retest OB vs invalidation).
4. Ne pas sur-interpréter chaque FVG comme signal.

## Disclaimer

SMC est une lecture subjective. Pas conseil financier.
