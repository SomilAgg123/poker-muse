/* node test/sim.js — simulate VEX (greedy) vs random placement to sanity-check
 * AI quality and calibrate betting thresholds. Run: node test/sim.js */
'use strict';
const P = require('../js/poker.js');
const AI = require('../js/ai.js');

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function playRound(rng, aiSwaps) {
  const deck = P.shuffle(P.makeDeck(), rng);
  const gAI = P.emptyGrid();
  const gRnd = P.emptyGrid();
  let projAt13 = 0;
  for (let turn = 0; turn < 25; turn++) {
    const cardAI = deck.pop();
    const cell = AI.aiChooseCell(gAI, cardAI, rng);
    gAI[cell.r][cell.c] = cardAI;
    const cardR = deck.pop();
    // random baseline
    const empt = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (!gRnd[r][c]) empt.push({ r, c });
    const rc = empt[Math.floor(rng() * empt.length)];
    gRnd[rc.r][rc.c] = cardR;
    if (turn === 12) projAt13 = AI.projectedScore(gAI);
  }
  const swaps = AI.aiFluxSwaps(gAI, aiSwaps ? 2 : 0);
  const sAI = P.scoreGrid(gAI).total;
  const sRnd = P.scoreGrid(gRnd).total;
  return { sAI, sRnd, projAt13, swapGain: swaps.reduce((t, s) => t + s.gain, 0) };
}

const N = 400;
let win = 0, tie = 0, sumAI = 0, sumRnd = 0, sumProj = 0, sumGain = 0;
let minAI = 1e9, maxAI = 0;
for (let i = 0; i < N; i++) {
  const rng = mulberry32(1234 + i);
  const { sAI, sRnd, projAt13, swapGain } = playRound(rng, true);
  if (sAI > sRnd) win++; else if (sAI === sRnd) tie++;
  sumAI += sAI; sumRnd += sRnd; sumProj += projAt13; sumGain += swapGain;
  minAI = Math.min(minAI, sAI); maxAI = Math.max(maxAI, sAI);
}
console.log(`rounds: ${N}`);
console.log(`VEX win rate vs random: ${(100 * win / N).toFixed(1)}% (ties ${(100 * tie / N).toFixed(1)}%)`);
console.log(`avg VEX total: ${(sumAI / N).toFixed(1)}  range [${minAI}, ${maxAI}]`);
console.log(`avg random total: ${(sumRnd / N).toFixed(1)}`);
console.log(`avg projectedScore at card 13: ${(sumProj / N).toFixed(1)}`);
console.log(`avg flux-swap gain: ${(sumGain / N).toFixed(1)} pts`);
