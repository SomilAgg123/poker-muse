<div align="center">

# ♠️ ♥️ FLUX POKER ♦️ ♣️

### *Twenty-five cards. Ten hands. Two swaps. One rival.*

![playable in browser](https://img.shields.io/badge/playable_in_browser-2ecc71)
![no build step](https://img.shields.io/badge/no_build_step-3498db)
![AI rival included](https://img.shields.io/badge/AI_rival-VEX-e67e22)
![original game](https://img.shields.io/badge/100%25_original_game-f1c40f)

<!-- <img src="assets/gameplay.jpg" width="850" alt="Flux Poker gameplay — placing cards on the grid while VEX builds in secret"> -->

**The poker you can learn in a minute and finish in five.**
No hands to fold. No chips to count mid-hand. Every single card matters.

</div>

---

## 🃏 The game in 30 seconds

1. **You're dealt cards one at a time** — click an empty cell to place each one on your 5×5 grid.
2. **VEX, your AI rival, builds in secret** on the grid beside you. You can't see its cards — only its bets.
3. **When the grid fills, all 5 rows + 5 columns score as poker hands.** Ten hands. Highest total takes the pot.
4. **One betting street** opens at the halfway mark. Read VEX's bets like a tell: check, bet, call, or fold.

## ⚡ The Flux twist

Twice per round, you may **swap any two cards already on your grid**.

Placed a king where an ace should be? Building a flush that's one card short? Flux it. Early mistakes are recoverable, late swaps complete monsters — and VEX gets two swaps too, played optimally. This is the heart of the game.

## 🎰 Scoring

Every row and every column is scored as a 5-card poker hand:

| Hand | Pts | Hand | Pts |
|---|---|---|---|
| Royal flush | 100 | Straight | 15 |
| Straight flush | 75 | Three of a kind | 10 |
| Four of a kind | 50 | Two pair | 5 |
| Full house | 25 | Pair | 2 |
| Flush | 20 | High card | 0 |

```
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ A ♠ │ │ K ♠ │ │ Q ♠ │ │ J ♠ │ │10 ♠ │
└─────┘ └─────┘ └─────┘ └─────┘ └─────┘
          ROYAL FLUSH — 100 PTS. Good luck.
```

Ties break on the best single hand, then the pot splits.

## 🤖 Meet VEX

- **Places greedily** — evaluates every empty cell by the potential of its row + column (pairs forming, flush draws, straight draws), with a little jitter so no two games feel the same.
- **Fluxes optimally** — hill-climbs every possible swap at round end. It averages ~+49 pts from swaps alone, which is why *your* two tokens matter so much.
- **Bets like it means it** — projects its hidden score, opens when strong, folds when weak… with the occasional bluff and hero call to keep you honest.

<div align="center">
<img src="assets/results.jpg" width="850" alt="Round results — every row and column scored, best hands highlighted">
<br>
<em>Round results: all ten hands scored, best hands highlighted, totals counted up.</em>
</div>

## 🎮 Play it

A match is 3 rounds, 100 chips each, 10-chip antes. Most chips at the end wins. Bust out and it's over early.

```bash
# any static server, e.g.
python3 -m http.server 8000
# then open http://localhost:8000/
```

Or just double-click `index.html` — it runs from `file://` too. Pure static site: drop the folder on GitHub Pages, Netlify, or Vercel and it's live. No build, no backend, no dependencies.

## 🛠️ Under the hood

| File | What it does |
|---|---|
| `index.html` | Page shell + modals (how-to, betting, scores, match end) |
| `css/style.css` | Casino-felt theme, cards, animations, responsive layout |
| `js/poker.js` | Pure poker engine: deck, 5-card evaluator, grid scoring |
| `js/ai.js` | VEX: greedy placement, flux hill-climbing, betting brain |
| `js/audio.js` | Tiny WebAudio synth — zero audio assets |
| `js/game.js` | Game state machine + DOM wiring |
| `test/` | `evaluator.test.js` (36 assertions, all passing) + `sim.js` (AI calibration) |
| `DESIGN.md` | Full design document — the why behind every rule |

```bash
node test/evaluator.test.js   # hand rankings, tiebreaks, grid scoring
node test/sim.js              # VEX vs random: 99.8% win rate, avg ~76 pts
```

<div align="center">

**Built as an original poker variation — no Texas Hold'em was harmed in the making of this game.** ♠️

</div>
