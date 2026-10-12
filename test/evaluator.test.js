/* node test/evaluator.test.js — run: node test/evaluator.test.js */
'use strict';
const P = require('../js/poker.js');

const C = (rank, suit) => ({ rank, suit, id: rank + suit });
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}
function ev(cards) { return P.evaluate5(cards); }

// Royal flush
check('royal', ev([C(14,'S'),C(13,'S'),C(12,'S'),C(11,'S'),C(10,'S')]).category === 'royal-flush');
// Straight flush
check('sf', ev([C(9,'H'),C(8,'H'),C(7,'H'),C(6,'H'),C(5,'H')]).category === 'straight-flush');
// Wheel straight flush
check('wheel-sf', ev([C(14,'D'),C(2,'D'),C(3,'D'),C(4,'D'),C(5,'D')]).category === 'straight-flush');
// Four of a kind
check('quads', ev([C(9,'S'),C(9,'H'),C(9,'D'),C(9,'C'),C(2,'S')]).category === 'four-of-a-kind');
// Full house
check('boat', ev([C(13,'S'),C(13,'H'),C(13,'D'),C(4,'C'),C(4,'S')]).category === 'full-house');
// Flush (not straight)
check('flush', ev([C(14,'C'),C(11,'C'),C(9,'C'),C(6,'C'),C(3,'C')]).category === 'flush');
// Straight
check('straight', ev([C(9,'S'),C(8,'H'),C(7,'D'),C(6,'C'),C(5,'S')]).category === 'straight');
// Wheel straight
{
  const r = ev([C(14,'S'),C(2,'H'),C(3,'D'),C(4,'C'),C(5,'S')]);
  check('wheel', r.category === 'straight' && r.tiebreak[0] === 5);
}
// Trips
check('trips', ev([C(7,'S'),C(7,'H'),C(7,'D'),C(12,'C'),C(3,'S')]).category === 'three-of-a-kind');
// Two pair
check('twopair', ev([C(11,'S'),C(11,'H'),C(4,'D'),C(4,'C'),C(9,'S')]).category === 'two-pair');
// Pair
check('pair', ev([C(14,'S'),C(14,'H'),C(9,'D'),C(6,'C'),C(3,'S')]).category === 'pair');
// High card
check('high', ev([C(14,'S'),C(11,'H'),C(9,'D'),C(6,'C'),C(3,'S')]).category === 'high-card');
// Ace-high straight that is NOT royal (10-J-Q-K-A unsuited) = straight, not royal
check('broadway', ev([C(14,'S'),C(13,'H'),C(12,'D'),C(11,'C'),C(10,'S')]).category === 'straight');

// Scores match design table
check('score-royal', ev([C(14,'S'),C(13,'S'),C(12,'S'),C(11,'S'),C(10,'S')]).score === 100);
check('score-sf', ev([C(9,'H'),C(8,'H'),C(7,'H'),C(6,'H'),C(5,'H')]).score === 75);
check('score-quads', ev([C(9,'S'),C(9,'H'),C(9,'D'),C(9,'C'),C(2,'S')]).score === 50);
check('score-boat', ev([C(13,'S'),C(13,'H'),C(13,'D'),C(4,'C'),C(4,'S')]).score === 25);
check('score-flush', ev([C(14,'C'),C(11,'C'),C(9,'C'),C(6,'C'),C(3,'C')]).score === 20);
check('score-straight', ev([C(9,'S'),C(8,'H'),C(7,'D'),C(6,'C'),C(5,'S')]).score === 15);
check('score-trips', ev([C(7,'S'),C(7,'H'),C(7,'D'),C(12,'C'),C(3,'S')]).score === 10);
check('score-twopair', ev([C(11,'S'),C(11,'H'),C(4,'D'),C(4,'C'),C(9,'S')]).score === 5);
check('score-pair', ev([C(14,'S'),C(14,'H'),C(9,'D'),C(6,'C'),C(3,'S')]).score === 2);
check('score-high', ev([C(14,'S'),C(11,'H'),C(9,'D'),C(6,'C'),C(3,'S')]).score === 0);

// Tiebreaks: higher pair wins; kicker decides
{
  const a = ev([C(14,'S'),C(14,'H'),C(9,'D'),C(6,'C'),C(3,'S')]);
  const b = ev([C(13,'S'),C(13,'H'),C(9,'D'),C(6,'C'),C(3,'S')]);
  check('pair-tb', P.compareHands(a, b) > 0);
  const c = ev([C(14,'S'),C(14,'H'),C(8,'D'),C(6,'C'),C(3,'S')]);
  check('kicker-tb', P.compareHands(a, c) > 0);
}
// Flush tiebreak by high card
{
  const a = ev([C(14,'C'),C(11,'C'),C(9,'C'),C(6,'C'),C(3,'C')]);
  const b = ev([C(13,'C'),C(11,'C'),C(9,'C'),C(6,'C'),C(3,'C')]);
  check('flush-tb', P.compareHands(a, b) > 0);
}
// Straight: higher top wins; wheel loses to 6-high
{
  const wheel = ev([C(14,'S'),C(2,'H'),C(3,'D'),C(4,'C'),C(5,'S')]);
  const six = ev([C(6,'S'),C(5,'H'),C(4,'D'),C(3,'C'),C(2,'S')]);
  check('straight-tb', P.compareHands(six, wheel) > 0);
}

// scoreGrid: 10 hands, total = sum
{
  const g = P.emptyGrid();
  const royals = [C(14,'S'),C(13,'S'),C(12,'S'),C(11,'S'),C(10,'S')];
  for (let j = 0; j < 5; j++) g[0][j] = royals[j]; // row 0 = royal flush
  // fill rest with junk (unique cards)
  const junk = P.makeDeck().filter(c => !royals.some(r => r.id === c.id));
  let k = 0;
  for (let i = 1; i < 5; i++) for (let j = 0; j < 5; j++) g[i][j] = junk[k++];
  const s = P.scoreGrid(g);
  check('grid-10-hands', s.hands.length === 10);
  check('grid-total', s.total === s.hands.reduce((t, h) => t + h.result.score, 0));
  check('grid-best', s.best.result.category === 'royal-flush');
}

// compareGrids
{
  const ga = { total: 30, hands: [{ result: { score: 25 } }, { result: { score: 5 } }] };
  const gb = { total: 30, hands: [{ result: { score: 20 } }, { result: { score: 10 } }] };
  check('grid-tb', P.compareGrids(ga, gb) > 0); // 25+5 beats 20+10 on best hand
  check('grid-tie', P.compareGrids(ga, ga) === 0);
}

// Deck sanity
{
  const d = P.makeDeck();
  check('deck-52', d.length === 52);
  check('deck-unique', new Set(d.map(c => c.id)).size === 52);
  const ids = d.map(c => c.id).join(',');
  P.shuffle(d, () => 0.5);
  check('shuffle-changes', d.map(c => c.id).join(',') !== ids);
  check('shuffle-52', new Set(d.map(c => c.id)).size === 52);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
