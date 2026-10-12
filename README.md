# ♠ FLUX POKER

**Twenty-five cards. Ten hands. Two swaps. One rival.**

An original poker variation built as a self-contained browser game — no build
step, no dependencies, no backend. Open `index.html` (or serve the folder
statically) and play.

## How it plays

1. A shuffled 52-card deck is shared by you and your AI rival, **VEX**.
2. Cards are dealt **one at a time**. Click an empty cell to place each card on
   your 5×5 grid; VEX places its own cards in secret.
3. When all 25 cards are placed, every **row and column scores as a 5-card
   poker hand** — 10 hands per grid. Highest grid total wins the round's pot.
4. **⚡ Flux (the twist):** twice per round, swap any two cards already on your
   grid. Early mistakes are recoverable; late swaps complete monsters.
5. **Betting street (the poker soul):** after your 13th card, one betting round
   opens. VEX's grid is hidden — read its bets like a tell. Check / Bet 10,
   then Call / Fold. No re-raises; fast and readable.
6. **Match:** 3 rounds, 100 chips each, 10-chip antes. Most chips wins.

### Scoring (per row / column)

| Hand | Pts | | Hand | Pts |
|---|---|---|---|---|
| Royal flush | 100 | | Straight | 15 |
| Straight flush | 75 | | Three of a kind | 10 |
| Four of a kind | 50 | | Two pair | 5 |
| Full house | 25 | | Pair | 2 |
| Flush | 20 | | High card | 0 |

Ties break on best single hand, then split pot.

## Run it

```bash
# any static server, e.g.
python3 -m http.server 8000
# then open http://localhost:8000/
```

Or just double-click `index.html` — everything runs from `file://` too.

## Project layout

```
index.html        page shell + modals (how-to, betting, scores, match end)
css/style.css     casino-felt theme, cards, animations, responsive layout
js/poker.js       pure poker engine: deck, 5-card evaluator, grid scoring
js/ai.js          VEX rival AI: greedy placement, flux hill-climbing, betting
js/audio.js       tiny WebAudio synth (no audio assets)
js/game.js        game state machine + DOM wiring
test/             node tests: evaluator.test.js, sim.js (AI calibration)
DESIGN.md         full design document
```

## Tests

```bash
node test/evaluator.test.js   # 36 assertions over hand rankings, tiebreaks, scoring
node test/sim.js              # AI-vs-random simulation used to calibrate VEX
```

## VEX (rival AI) — how it thinks

- **Placement:** greedy — for each empty cell it scores a *potential* heuristic
  over the affected row + column (made pairs/trips, flush-draw and
  straight-draw progress, high-card value) and takes the best cell, with a
  little jitter so games don't feel identical. Beats random placement 99.8% of
  the time (avg grid ~76 pts vs ~15).
- **Flux:** at round end it hill-climbs — tries every cell pair, keeps the best
  improving swap, up to 2 swaps (avg gain ~+49 pts, which is why *your* flux
  tokens matter so much).
- **Betting:** projects its final score from partial-grid potentials; opens
  when strong, calls/folds against your bets, with occasional bluffs and hero
  calls to stay human.

## Design bets

- **Every card matters immediately** — no folding 80% of hands; you're always building.
- **Hidden information with a face** — VEX's grid is secret, but its betting tells you something.
- **Comeback mechanic** — flux swaps mean a bad start isn't death.
- **Short sessions** — a 3-round match takes ~5 minutes.

## Deployment

Static site — copy the folder to any host (GitHub Pages, Netlify, Vercel, S3…).
No server code, no environment variables.
