# FLUX POKER — Design Document

**Tagline:** *Twenty-five cards. Ten hands. Two swaps. One rival.*

An original poker variation. No shared community cards, no traditional betting
rounds around a table — instead, grid-building strategy, hidden-information
rivalry, and a single high-tension betting street.

## Core loop

1. A shuffled 52-card deck is shared by you and your AI rival, **VEX**.
2. Cards are dealt one at a time, alternating: you place yours face-up on your
   5×5 grid; VEX places its own in secret.
3. Once all 25 cards are placed, every **row** and every **column** is scored
   as a 5-card poker hand — 10 hands total per grid.
4. Highest grid total wins the round's pot.

## The Flux twist (the game's signature)

- Each round you get **2 Flux tokens**.
- At any point during placement, you may spend a token to **swap any two cards
  already on your grid**.
- This turns early "mistake" placements into recoverable decisions and rewards
  planning: place speculative cards early, then flux them into shape late.
- VEX gets 2 flux swaps too, applied optimally at round end.

## The betting street (the poker soul)

- Both players ante 10 chips per round (pot starts at 20).
- After the **13th card** is placed (just past halfway), one betting street opens:
  - You act first: **Check** or **Bet 10**.
  - If you bet, VEX may **Call** or **Fold** (based on its hidden grid strength,
    with a little gamble in it).
  - If you check, VEX may **Bet 10** (if strong) or **Check**; you then respond
    **Call** or **Fold**.
  - No re-raises — one street, fast and readable.
- Folding forfeits the round; the pot goes to the opponent, no reveal.

## Scoring (per 5-card row/column)

| Hand              | Points |
|-------------------|--------|
| Royal flush       | 100    |
| Straight flush    | 75     |
| Four of a kind    | 50     |
| Full house        | 25     |
| Flush             | 20     |
| Straight          | 15     |
| Three of a kind   | 10     |
| Two pair          | 5      |
| Pair              | 2      |
| High card         | 0      |

Grid total = sum of all 10 hands. Tie-breakers: highest single-hand score,
then split pot.

## Match structure

- 3 rounds. You and VEX start with 100 chips each.
- Round winner takes the pot. After 3 rounds, most chips wins the match.
- Going bust (0 chips) ends the match early.

## VEX (rival AI)

- **Placement:** greedy. For each empty cell it evaluates a *potential*
  heuristic over the affected row + column (pairs/trips/quads patterns,
  flush-draw and straight-draw progress, high-card value) and picks the best
  cell, with tiny random jitter so no two games feel identical.
- **Flux:** at round end, hill-climbs: tries every cell pair, applies the swap
  with the biggest total-score gain, repeats up to 2 swaps.
- **Betting:** estimates its projected final score from partial-grid
  potentials; bets/calls when strong, folds when weak, with occasional bluffs
  and hero calls to stay human.

## Why this is fun (design bets)

1. **Every card matters immediately** — no folding 80% of hands; you're always
   building.
2. **Hidden information with a face** — VEX's grid is secret, but its betting
   tells you something. Reading strength from bets is real poker.
3. **Comeback mechanic** — flux swaps mean a bad start isn't death.
4. **Short sessions** — a 3-round match takes ~5 minutes.
