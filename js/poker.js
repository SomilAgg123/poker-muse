/* FLUX POKER — poker engine (pure logic, no DOM)
 * Card: { rank: 2..14 (11=J,12=Q,13=K,14=A), suit: 'S'|'H'|'D'|'C', id: 'AS' }
 * Grid: 5x5 array of Card|null
 */
'use strict';

const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

const RANK_LABEL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_COLOR = { S: 'black', H: 'red', D: 'red', C: 'black' };

function rankLabel(r) { return RANK_LABEL[r] || String(r); }
function cardLabel(c) { return rankLabel(c.rank) + SUIT_SYMBOL[c.suit]; }

function makeDeck() {
  const deck = [];
  for (const s of SUITS)
    for (const r of RANKS)
      deck.push({ rank: r, suit: s, id: rankLabel(r) + s });
  return deck;
}

// Fisher–Yates; accepts optional rng for testability
function shuffle(deck, rng) {
  const rand = rng || Math.random;
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

const HAND_SCORES = {
  'royal-flush': 100,
  'straight-flush': 75,
  'four-of-a-kind': 50,
  'full-house': 25,
  'flush': 20,
  'straight': 15,
  'three-of-a-kind': 10,
  'two-pair': 5,
  'pair': 2,
  'high-card': 0,
};

const HAND_NAMES = {
  'royal-flush': 'Royal Flush',
  'straight-flush': 'Straight Flush',
  'four-of-a-kind': 'Four of a Kind',
  'full-house': 'Full House',
  'flush': 'Flush',
  'straight': 'Straight',
  'three-of-a-kind': 'Three of a Kind',
  'two-pair': 'Two Pair',
  'pair': 'Pair',
  'high-card': 'High Card',
};

/* Evaluate exactly 5 cards.
 * Returns { category, name, score, tiebreak } where tiebreak is an array of
 * ranks (descending significance) used to break ties between equal categories.
 */
function evaluate5(cards) {
  if (!cards || cards.length !== 5) throw new Error('evaluate5 needs 5 cards');

  const rankCount = new Array(15).fill(0);
  const suitSet = new Set();
  for (const c of cards) {
    rankCount[c.rank]++;
    suitSet.add(c.suit);
  }
  const isFlush = suitSet.size === 1;

  const uniq = [];
  for (let r = 14; r >= 2; r--) if (rankCount[r] > 0) uniq.push(r);

  let isStraight = false;
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) {
      isStraight = true;
      straightHigh = uniq[0];
    } else if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) {
      isStraight = true; // wheel: A-2-3-4-5
      straightHigh = 5;
    }
  }

  // groups sorted by count desc, then rank desc: e.g. [[3,13],[2,9]]
  const groups = [];
  for (let r = 14; r >= 2; r--) if (rankCount[r] > 0) groups.push([rankCount[r], r]);
  groups.sort((a, b) => b[0] - a[0] || b[1] - a[1]);

  const counts = groups.map(g => g[0]);
  const ranksByGroup = groups.map(g => g[1]);
  const desc = uniq.slice(); // ranks high -> low

  let category, tiebreak;
  if (isFlush && isStraight) {
    if (straightHigh === 14) { category = 'royal-flush'; }
    else { category = 'straight-flush'; }
    tiebreak = [straightHigh];
  } else if (counts[0] === 4) {
    category = 'four-of-a-kind';
    tiebreak = [ranksByGroup[0], ranksByGroup[1]];
  } else if (counts[0] === 3 && counts[1] === 2) {
    category = 'full-house';
    tiebreak = [ranksByGroup[0], ranksByGroup[1]];
  } else if (isFlush) {
    category = 'flush';
    tiebreak = desc;
  } else if (isStraight) {
    category = 'straight';
    tiebreak = [straightHigh];
  } else if (counts[0] === 3) {
    category = 'three-of-a-kind';
    tiebreak = [ranksByGroup[0], ...ranksByGroup.slice(1).sort((a, b) => b - a)];
  } else if (counts[0] === 2 && counts[1] === 2) {
    category = 'two-pair';
    const pairs = [ranksByGroup[0], ranksByGroup[1]].sort((a, b) => b - a);
    tiebreak = [...pairs, ranksByGroup[2]];
  } else if (counts[0] === 2) {
    category = 'pair';
    tiebreak = [ranksByGroup[0], ...ranksByGroup.slice(1).sort((a, b) => b - a)];
  } else {
    category = 'high-card';
    tiebreak = desc;
  }

  return {
    category,
    name: HAND_NAMES[category],
    score: HAND_SCORES[category],
    tiebreak,
  };
}

// Compare two evaluate5 results: >0 if a beats b, <0 if b beats a, 0 if tie.
function compareHands(a, b) {
  if (a.score !== b.score) return a.score - b.score;
  const n = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < n; i++) {
    const d = (a.tiebreak[i] || 0) - (b.tiebreak[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

/* Score a full 5x5 grid. Returns:
 * { total, hands: [{kind:'row'|'col', index, cards, result}], best }
 */
function scoreGrid(grid) {
  const hands = [];
  let total = 0;
  for (let i = 0; i < 5; i++) {
    const rowCards = grid[i].slice();
    const r = evaluate5(rowCards);
    hands.push({ kind: 'row', index: i, cards: rowCards, result: r });
    total += r.score;
  }
  for (let j = 0; j < 5; j++) {
    const colCards = [grid[0][j], grid[1][j], grid[2][j], grid[3][j], grid[4][j]];
    const r = evaluate5(colCards);
    hands.push({ kind: 'col', index: j, cards: colCards, result: r });
    total += r.score;
  }
  const best = hands.reduce((m, h) => (compareHands(h.result, m.result) > 0 ? h : m), hands[0]);
  return { total, hands, best };
}

// Compare two scored grids for round winner: 1/-1/0
function compareGrids(a, b) {
  if (a.total !== b.total) return a.total > b.total ? 1 : -1;
  // tie-break: sort hand scores desc, compare lexicographically
  const sa = a.hands.map(h => h.result.score).sort((x, y) => y - x);
  const sb = b.hands.map(h => h.result.score).sort((x, y) => y - x);
  for (let i = 0; i < sa.length; i++) {
    if (sa[i] !== sb[i]) return sa[i] > sb[i] ? 1 : -1;
  }
  return 0;
}

function emptyGrid() {
  return Array.from({ length: 5 }, () => Array(5).fill(null));
}

function gridFull(grid) {
  return grid.every(row => row.every(c => c !== null));
}

function countPlaced(grid) {
  let n = 0;
  for (const row of grid) for (const c of row) if (c) n++;
  return n;
}

// Node / browser compatibility
const FluxPokerExports = {
  SUITS, RANKS, RANK_LABEL, SUIT_SYMBOL, SUIT_COLOR,
  rankLabel, cardLabel, makeDeck, shuffle,
  HAND_SCORES, HAND_NAMES, evaluate5, compareHands,
  scoreGrid, compareGrids, emptyGrid, gridFull, countPlaced,
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FluxPokerExports;
}
if (typeof window !== 'undefined') {
  window.FluxPoker = FluxPokerExports;
}
