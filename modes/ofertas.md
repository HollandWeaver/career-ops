# Mode: ofertas — Multi-Offer Comparison

Scoring matrix across 10 weighted dimensions:

| Dimension | Weight | Criteria 1-5 |
|-----------|--------|--------------|
| Skills match | 30% | 5=96-100% match, 4=91-95%, 3=86-90%, 2=80-85%, 1=<80% |
| Growth trajectory | 15% | 5=clear path to next level, 1=dead end |
| Seniority level | 10% | 5=staff+, 4=senior, 3=mid-senior, 2=mid, 1=junior |
| Comp estimate | 10% | 5=top quartile for market, 1=below market |
| Remote quality | 10% | 5=full remote async, 1=on-site only |
| Company reputation | 10% | 5=top employer, 1=red flags |
| Tech stack modernity | 5% | 5=cutting edge AI/ML, 1=legacy |
| Speed to offer | 5% | 5=fast process, 1=6+ months |
| Cultural signals | 5% | 5=builder culture, 1=bureaucratic |

For each offer: score per dimension, weighted total score.
Final ranking + recommendation considering time-to-offer.

Ask the user for the offers if not already in context. Input can be text, URLs, or references to already-evaluated offers in the tracker.

**Note:** Skills match replaces "North Star alignment" — evaluation is archetype-agnostic and purely match-based.
