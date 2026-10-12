/* FLUX POKER — VEX rival AI (pure logic, no DOM) */
'use strict';

let P;
if (typeof module !== 'undefined' && module.exports) {
  P = require('./poker.js');
} else {
  P = window.FluxPoker;
}

/* Heuristic "potential" of a partial line (array of Card, no nulls).
 * Calibrated so a completed 5-card line scores roughly like its real value,
 * and partial lines reward draws (pairs forming, flush/straight draws).
 */
function potential(cards) {
  const n = cards.length;
  if (n === 0) return 0;

  const rankCount = new Array(15).fill(0);
  const suitCount = {};
  let maxRank = 0;
  const ranks = [];
  for (const c of cards) {
    rankCount[c.rank]++;
    suitCount[c.suit] = (suitCount[c.suit] || 0) + 1;
    if (c.rank > maxRank) maxRank = c.rank;
    ranks.push(c.rank);
  }

  let s = 0;

  // Made groups (pairs/trips/quads) — slightly above face value to encourage
  let distinctPairs = 0;
  for (let r = 2; r <= 14; r++) {
    const k = rankCount[r];
    if (k === 2) { s += 3; distinctPairs++; }
    else if (k === 3) { s += 13; }
    else if (k === 4) { s += 48; }
  }
  if (distinctPairs >= 2) s += 4; // two pair shaping up

  // Flush draw
  const maxSuit = Math.max(...Object.values(suitCount));
  if (maxSuit >= 3) s += (maxSuit - 2) * 8;

  // Straight draw: longest run where ranks fit in a 5-span (ace high or low)
  const uniq = [...new Set(ranks)].sort((a, b) => a - b);
  const ext = uniq.slice();
  if (uniq.includes(14)) ext.unshift(1); // wheel
  let run = 1, best = 1;
  for (let i = 1; i < ext.length; i++) {
    if (ext[i] === ext[i - 1] + 1) { run++; best = Math.max(best, run); }
    else if (ext[i] !== ext[i - 1]) { run = 1; }
  }
  if (best >= 3) s += (best - 2) * 6;

  // High-card anchor (aces want company)
  s += maxRank * 0.12;

  return s;
}

// Sum of potentials over all 10 lines of a (possibly partial) grid
function projectedScore(grid) {
  let s = 0;
  const lines = [];
  for (let i = 0; i < 5; i++) lines.push(grid[i].filter(Boolean));
  for (let j = 0; j < 5; j++) {
    const col = [];
    for (let i = 0; i < 5; i++) if (grid[i][j]) col.push(grid[i][j]);
    lines.push(col);
  }
  for (const l of lines) s += potential(l);
  return s;
}

/* Choose placement cell for `card` on VEX's grid.
 * Greedy: maximize potential(row+card) + potential(col+card), plus jitter.
 * Returns {r, c}.
 */
function aiChooseCell(grid, card, rng) {
  const rand = rng || Math.random;
  let best = null, bestVal = -Infinity;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c]) continue;
      const row = grid[r].filter(Boolean).concat([card]);
      const col = [];
      for (let i = 0; i < 5; i++) if (grid[i][c]) col.push(grid[i][c]);
      col.push(card);
      const val = potential(row) + potential(col) + rand() * 1.5;
      if (val > bestVal) { bestVal = val; best = { r, c }; }
    }
  }
  return best;
}

/* Apply up to `maxSwaps` hill-climbing swaps to maximize grid total.
 * Mutates grid. Returns array of applied swaps [{a:{r,c}, b:{r,c}, gain}].
 */
function aiFluxSwaps(grid, maxSwaps) {
  const swaps = [];
  const cells = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) cells.push({ r, c });
  for (let iter = 0; iter < (maxSwaps || 2); iter++) {
    const base = P.scoreGrid(grid).total;
    let bestGain = 0, bestPair = null;
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i], b = cells[j];
        const tmp = grid[a.r][a.c];
        grid[a.r][a.c] = grid[b.r][b.c];
        grid[b.r][b.c] = tmp;
        const total = P.scoreGrid(grid).total;
        const gain = total - base;
        // swap back
        const tmp2 = grid[a.r][a.c];
        grid[a.r][a.c] = grid[b.r][b.c];
        grid[b.r][b.c] = tmp2;
        if (gain > bestGain) { bestGain = gain; bestPair = [a, b]; }
      }
    }
    if (bestPair && bestGain > 0) {
      const [a, b] = bestPair;
      const tmp = grid[a.r][a.c];
      grid[a.r][a.c] = grid[b.r][b.c];
      grid[b.r][b.c] = tmp;
      swaps.push({ a, b, gain: bestGain });
    } else break;
  }
  return swaps;
}

// --- Betting personality (thresholds calibrated by simulation, see test/sim.js)
const AI_BET_THRESH = 46;   // projected score above which VEX opens the betting
const AI_CALL_THRESH = 40;  // projected score above which VEX calls a bet

// VEX acts after player checks: 'bet' | 'check'
function aiOpenAction(grid, rng) {
  const rand = rng || Math.random;
  const proj = projectedScore(grid);
  if (proj >= AI_BET_THRESH && rand() < 0.85) return 'bet';
  if (proj >= AI_BET_THRESH - 8 && rand() < 0.15) return 'bet'; // occasional bluff
  return 'check';
}

// VEX faces player's bet: 'call' | 'fold'
function aiFacingBet(grid, rng) {
  const rand = rng || Math.random;
  const proj = projectedScore(grid);
  if (proj >= AI_CALL_THRESH) {
    return rand() < 0.92 ? 'call' : 'fold'; // rare scared fold
  }
  return rand() < 0.12 ? 'call' : 'fold'; // occasional hero call
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    potential, projectedScore, aiChooseCell, aiFluxSwaps,
    aiOpenAction, aiFacingBet, AI_BET_THRESH, AI_CALL_THRESH,
  };
}
if (typeof window !== 'undefined') {
  window.FluxAI = {
    potential, projectedScore, aiChooseCell, aiFluxSwaps,
    aiOpenAction, aiFacingBet, AI_BET_THRESH, AI_CALL_THRESH,
  };
}
