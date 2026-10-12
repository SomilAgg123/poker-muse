/* FLUX POKER — game orchestration + UI (browser only) */
(function () {
'use strict';

const P = window.FluxPoker;
const AI = window.FluxAI;
const Sfx = window.FluxSfx;

const $ = (id) => document.getElementById(id);
const playerGridEl = $('playerGrid');
const vexGridEl = $('vexGrid');

const G = {
  round: 1,
  maxRounds: 3,
  chipsYou: 100,
  chipsVex: 100,
  pot: 0,
  deck: [],
  pg: null,          // player 5x5 grid
  vg: null,          // vex 5x5 grid
  vexRevealed: false,
  cur: null,         // card awaiting placement
  placed: 0,
  flux: 2,
  fluxMode: false,
  fluxPick: null,
  phase: 'howto',    // howto|place|ai|bet|reveal|roundover|gameover
  betDone: false,
  roundId: 0,        // guards stale timeouts
};

const ANTE = 10;
const BET = 10;

/* ---------------- rendering ---------------- */

function cardInner(card) {
  const red = (card.suit === 'H' || card.suit === 'D') ? ' red' : '';
  return `<div class="card${red}"><span class="r">${P.rankLabel(card.rank)}</span>` +
         `<span class="s">${P.SUIT_SYMBOL[card.suit]}</span></div>`;
}

function buildGrid(el, onClick) {
  el.innerHTML = '';
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const d = document.createElement('div');
      d.className = 'cell';
      d.dataset.r = r; d.dataset.c = c;
      d.addEventListener('click', () => onClick(r, c, d));
      el.appendChild(d);
    }
  }
}

function cellEl(gridEl, r, c) {
  return gridEl.children[r * 5 + c];
}

function renderPlayer(popAt) {
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const cell = cellEl(playerGridEl, r, c);
    const card = G.pg[r][c];
    cell.innerHTML = card ? cardInner(card) : '';
    cell.classList.remove('pop');
    if (popAt && popAt.r === r && popAt.c === c) {
      void cell.offsetWidth; // restart animation
      cell.classList.add('pop');
    }
  }
}

function renderVex(popAt, stagger) {
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const cell = cellEl(vexGridEl, r, c);
    const card = G.vg[r][c];
    if (!card) { cell.innerHTML = ''; continue; }
    if (G.vexRevealed) {
      const apply = () => { cell.innerHTML = cardInner(card); cell.classList.add('pop'); };
      if (stagger) setTimeout(apply, (r * 5 + c) * 45);
      else apply();
    } else {
      cell.innerHTML = '<div class="card back"></div>';
    }
    if (popAt && popAt.r === r && popAt.c === c && !G.vexRevealed) {
      cell.classList.remove('pop'); void cell.offsetWidth; cell.classList.add('pop');
    }
  }
}

function renderDealZone() {
  const slot = $('cardSlot');
  const hint = $('dealHint');
  if (G.phase === 'place' && G.cur) {
    slot.innerHTML = cardInner(G.cur).replace('class="card', 'class="card big-card');
    hint.innerHTML = G.fluxMode
      ? '<b>Flux mode:</b> click two of your cards to swap them. <i>Esc</i> cancels.'
      : 'Your card — <b>click an empty cell</b> to place it.';
  } else {
    slot.innerHTML = '<div class="card back big-card"></div>';
    hint.innerHTML = G.phase === 'ai' ? 'VEX is placing…' : '&nbsp;';
  }
}

function markPlacementCells() {
  const active = G.phase === 'place' && !G.fluxMode;
  const fluxActive = G.phase === 'place' && G.fluxMode;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const cell = cellEl(playerGridEl, r, c);
    cell.classList.toggle('placement', active && !G.pg[r][c]);
    cell.classList.toggle('flux-target', fluxActive && !!G.pg[r][c]);
    cell.classList.toggle('flux-picked', !!(
      G.fluxPick && G.fluxPick.r === r && G.fluxPick.c === c));
  }
}

function updateHud() {
  $('roundLabel').textContent = `Round ${Math.min(G.round, G.maxRounds)} / ${G.maxRounds}`;
  $('chipsYou').textContent = G.chipsYou;
  $('chipsVex').textContent = G.chipsVex;
  $('potLabel').textContent = G.pot;
  const btn = $('fluxBtn');
  btn.disabled = !(G.phase === 'place' && G.flux > 0);
  btn.classList.toggle('active', G.fluxMode);
  btn.innerHTML = `⚡ Flux <span class="tokens"><span class="tok">${'●'.repeat(G.flux)}${'○'.repeat(2 - G.flux)}</span></span>`;
  renderDealZone();
  markPlacementCells();
}

function log(msg) {
  $('log').innerHTML = msg;
}
function aiStatus(msg) {
  $('aiStatus').innerHTML = msg;
}

function refresh() {
  renderPlayer();
  renderVex();
  updateHud();
}

/* ---------------- match / round flow ---------------- */

function startMatch() {
  G.chipsYou = 100;
  G.chipsVex = 100;
  G.round = 1;
  hideOverlay('endOverlay');
  startRound();
}

function startRound() {
  G.roundId++;
  const id = G.roundId;
  G.pg = P.emptyGrid();
  G.vg = P.emptyGrid();
  G.vexRevealed = false;
  G.deck = P.shuffle(P.makeDeck());
  G.cur = null;
  G.placed = 0;
  G.flux = 2;
  G.fluxMode = false;
  G.fluxPick = null;
  G.betDone = false;

  const ante = Math.min(ANTE, G.chipsYou, G.chipsVex);
  G.chipsYou -= ante;
  G.chipsVex -= ante;
  G.pot = ante * 2;

  hideOverlay('scoreOverlay');
  hideOverlay('foldOverlay');
  aiStatus('VEX shuffles the deck…');
  log(`Round ${G.round} — antes in, <span class="gold">${G.pot} chips</span> in the pot.`);
  refresh();
  setTimeout(() => { if (id === G.roundId) playerDeal(); }, 600);
}

function playerDeal() {
  if (G.placed >= 25) { endRound(); return; }
  G.cur = G.deck.pop();
  G.phase = 'place';
  Sfx.deal();
  updateHud();
}

function onPlayerCell(r, c) {
  if (G.phase !== 'place') return;
  if (G.fluxMode) { fluxPick(r, c); return; }
  if (G.pg[r][c] || !G.cur) return;
  G.pg[r][c] = G.cur;
  G.cur = null;
  G.placed++;
  Sfx.place();
  renderPlayer({ r, c });
  G.phase = 'ai';
  updateHud();
  if (G.placed === 13 && !G.betDone && G.chipsYou >= BET && G.chipsVex >= BET) {
    setTimeout(() => bettingStreet(), 500);
  } else {
    aiMove();
  }
}

function aiMove() {
  const id = G.roundId;
  aiStatus('VEX is thinking…');
  updateHud();
  setTimeout(() => {
    if (id !== G.roundId) return;
    const card = G.deck.pop();
    const cell = AI.aiChooseCell(G.vg, card);
    G.vg[cell.r][cell.c] = card;
    Sfx.deal();
    renderVex(cell);
    aiStatus(`VEX placed a card. <b>${25 - G.placed}</b> to go.`);
    playerDeal();
  }, 550);
}

/* ---------------- flux ---------------- */

function toggleFlux() {
  if (G.phase !== 'place' || G.flux <= 0) return;
  G.fluxMode = !G.fluxMode;
  G.fluxPick = null;
  Sfx.click();
  updateHud();
}

function fluxPick(r, c) {
  if (!G.pg[r][c]) return;
  if (!G.fluxPick) {
    G.fluxPick = { r, c };
    Sfx.click();
    markPlacementCells();
    return;
  }
  if (G.fluxPick.r === r && G.fluxPick.c === c) {
    G.fluxPick = null;
    markPlacementCells();
    return;
  }
  const a = G.fluxPick;
  const tmp = G.pg[a.r][a.c];
  G.pg[a.r][a.c] = G.pg[r][c];
  G.pg[r][c] = tmp;
  G.flux--;
  G.fluxMode = false;
  G.fluxPick = null;
  Sfx.flux();
  renderPlayer();
  log(`⚡ Flux swap! <span class="gold">${G.flux}</span> token${G.flux === 1 ? '' : 's'} left.`);
  updateHud();
}

/* ---------------- betting street ---------------- */

function showBetModal(html, buttons) {
  $('betText').innerHTML = html;
  const bb = $('betButtons');
  bb.innerHTML = '';
  for (const b of buttons) {
    const el = document.createElement('button');
    el.className = 'btn' + (b.ghost ? ' ghost' : '') + (b.danger ? ' danger' : '');
    el.textContent = b.label;
    el.addEventListener('click', b.onClick);
    bb.appendChild(el);
  }
  showOverlay('betOverlay');
}

const VEX_TELLS = [
  'VEX\u2019s optical sensor dims for a moment…',
  'VEX taps the table with a metal finger.',
  'VEX is perfectly still. Suspiciously still.',
  'A faint whirring comes from VEX\u2019s chassis.',
];

function tell() {
  return VEX_TELLS[Math.floor(Math.random() * VEX_TELLS.length)];
}

function bettingStreet() {
  G.betDone = true;
  G.phase = 'bet';
  updateHud();
  Sfx.chip();
  log('— Betting street —');
  showBetModal(
    `<h1>Betting Street</h1>
     <div id="betPot">Pot: <b>${G.pot}</b> &nbsp;·&nbsp; You: <b>${G.chipsYou}</b> &nbsp;·&nbsp; VEX: <b>${G.chipsVex}</b></div>
     <p>13 cards down. VEX's grid is hidden — how confident are you?</p>
     <p class="vex-tell">${tell()}</p>`,
    [
      { label: 'Check', ghost: true, onClick: () => { Sfx.check(); log('You check.'); vexRespondToCheck(); } },
      { label: `Bet ${BET}`, onClick: playerBets },
    ]
  );
}

function vexRespondToCheck() {
  const action = AI.aiOpenAction(G.vg);
  if (action === 'bet') {
    G.chipsVex -= BET; G.pot += BET;
    Sfx.chip();
    updateHud();
    log('VEX <span class="gold">bets 10</span>.');
    showBetModal(
      `<h1>VEX Bets ${BET}</h1>
       <div id="betPot">Pot: <b>${G.pot}</b></div>
       <p class="vex-tell">${tell()}</p>`,
      [
        { label: `Call ${BET}`, onClick: () => { playerCalls(); } },
        { label: 'Fold', ghost: true, danger: true, onClick: () => playerFolds() },
      ]
    );
  } else {
    Sfx.check();
    log('VEX checks.');
    hideOverlay('betOverlay');
    continueAfterBet();
  }
}

function playerBets() {
  G.chipsYou -= BET; G.pot += BET;
  Sfx.chip();
  updateHud();
  log(`You <span class="gold">bet ${BET}</span>.`);
  const action = AI.aiFacingBet(G.vg);
  if (action === 'call') {
    G.chipsVex -= BET; G.pot += BET;
    Sfx.chip();
    updateHud();
    log('VEX calls.');
    hideOverlay('betOverlay');
    continueAfterBet();
  } else {
    Sfx.fold();
    log('VEX folds!');
    hideOverlay('betOverlay');
    foldWin('you');
  }
}

function playerCalls() {
  G.chipsYou -= BET; G.pot += BET;
  Sfx.chip();
  updateHud();
  log(`You call ${BET}.`);
  hideOverlay('betOverlay');
  continueAfterBet();
}

function playerFolds() {
  Sfx.fold();
  log('You fold.');
  hideOverlay('betOverlay');
  foldWin('vex');
}

function continueAfterBet() {
  aiMove();
}

function foldWin(winner) {
  G.phase = 'roundover';
  if (winner === 'you') {
    G.chipsYou += G.pot;
    $('foldTitle').textContent = 'VEX folds — you take the pot!';
    Sfx.win();
  } else {
    G.chipsVex += G.pot;
    $('foldTitle').textContent = 'You fold — VEX takes the pot.';
    Sfx.lose();
  }
  G.pot = 0;
  $('foldSub').innerHTML = `You: <b>${G.chipsYou}</b> &nbsp;·&nbsp; VEX: <b>${G.chipsVex}</b>`;
  updateHud();
  showOverlay('foldOverlay');
}

/* ---------------- scoring & reveal ---------------- */

function endRound() {
  G.phase = 'reveal';
  G.vexRevealed = true;
  updateHud();
  Sfx.reveal();
  aiStatus('VEX reveals its grid…');

  // VEX spends its flux swaps optimally
  const before = P.scoreGrid(G.vg).total;
  const swaps = AI.aiFluxSwaps(G.vg, 2);
  const after = P.scoreGrid(G.vg).total;
  if (swaps.length > 0) {
    log(`VEX used ${swaps.length} flux swap${swaps.length > 1 ? 's' : ''} (+${after - before} pts).`);
  }

  renderVex(null, true); // staggered reveal
  setTimeout(() => showScores(), 1300);
}

function handRows(scored) {
  return scored.hands.map((h) => {
    const label = h.kind === 'row' ? `Row ${h.index + 1}` : `Col ${h.index + 1}`;
    const best = h === scored.best ? ' best' : '';
    return `<div class="hand-row${best}"><span>${label} — ${h.result.name}</span>` +
           `<span class="pts">+${h.result.score}</span></div>`;
  }).join('');
}

function countUp(el, target, done) {
  const t0 = performance.now();
  const dur = 900;
  function frame(t) {
    const k = Math.min(1, (t - t0) / dur);
    el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(frame);
    else if (done) done();
  }
  requestAnimationFrame(frame);
}

function showScores() {
  G.phase = 'roundover';
  const sp = P.scoreGrid(G.pg);
  const sv = P.scoreGrid(G.vg);
  const cmp = P.compareGrids(sp, sv);

  $('scoreYou').innerHTML = `<h3>Your grid</h3>${handRows(sp)}`;
  $('scoreVex').innerHTML = `<h3>VEX's grid</h3>${handRows(sv)}`;
  $('youTotal').textContent = '0';
  $('vexTotal').textContent = '0';

  let banner, cls;
  if (cmp > 0) {
    G.chipsYou += G.pot;
    banner = 'You win the round!';
    Sfx.win();
  } else if (cmp < 0) {
    G.chipsVex += G.pot;
    banner = 'VEX wins the round.';
    Sfx.lose();
  } else {
    const half = Math.floor(G.pot / 2);
    G.chipsYou += G.pot - half;
    G.chipsVex += half;
    banner = 'Dead heat — pot split.';
    Sfx.check();
  }
  G.pot = 0;
  $('winnerBanner').textContent = banner;
  $('scoreChips').innerHTML = `You: <b>${G.chipsYou}</b> &nbsp;·&nbsp; VEX: <b>${G.chipsVex}</b>`;
  $('nextBtn').textContent = G.round >= G.maxRounds ? 'Final Results' : 'Next Round';
  updateHud();
  showOverlay('scoreOverlay');
  countUp($('youTotal'), sp.total, () => countUp($('vexTotal'), sv.total));
}

function nextAfterScores() {
  hideOverlay('scoreOverlay');
  if (G.chipsYou <= 0 || G.chipsVex <= 0) { gameOver(); return; }
  if (G.round >= G.maxRounds) { gameOver(); return; }
  G.round++;
  startRound();
}

function gameOver() {
  G.phase = 'gameover';
  const youWin = G.chipsYou > G.chipsVex;
  const tie = G.chipsYou === G.chipsVex;
  $('endTitle').textContent = tie ? 'A Perfect Stalemate' : (youWin ? 'You Beat VEX!' : 'VEX Takes the Match');
  $('endSub').innerHTML = tie
    ? `Both finish on <b>${G.chipsYou}</b> chips. Rematch?`
    : `Final chips — You: <b>${G.chipsYou}</b> · VEX: <b>${G.chipsVex}</b>`;
  if (youWin) Sfx.win(); else if (!tie) Sfx.lose();
  showOverlay('endOverlay');
}

/* ---------------- overlays ---------------- */

function showOverlay(id) { $(id).classList.remove('hidden'); }
function hideOverlay(id) { $(id).classList.add('hidden'); }

/* ---------------- boot ---------------- */

function init() {
  buildGrid(playerGridEl, onPlayerCell);
  buildGrid(vexGridEl, () => {});
  $('fluxBtn').addEventListener('click', toggleFlux);
  $('startBtn').addEventListener('click', () => {
    Sfx.unlock(); Sfx.click();
    hideOverlay('howtoOverlay');
    startMatch();
  });
  $('nextBtn').addEventListener('click', () => { Sfx.click(); nextAfterScores(); });
  $('foldNextBtn').addEventListener('click', () => {
    Sfx.click();
    hideOverlay('foldOverlay');
    if (G.chipsYou <= 0 || G.chipsVex <= 0) { gameOver(); return; }
    if (G.round >= G.maxRounds) { gameOver(); return; }
    G.round++;
    startRound();
  });
  $('againBtn').addEventListener('click', () => { Sfx.click(); startMatch(); });
  $('muteBtn').addEventListener('click', () => {
    Sfx.setMuted(!Sfx.isMuted());
    $('muteBtn').textContent = Sfx.isMuted() ? '🔇' : '🔊';
  });
  $('helpBtn').addEventListener('click', () => { Sfx.click(); showOverlay('howtoOverlay'); });
  $('howtoClose').addEventListener('click', () => { Sfx.click(); hideOverlay('howtoOverlay'); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && G.fluxMode) toggleFlux();
  });
  updateHud();
  showOverlay('howtoOverlay');
}

document.addEventListener('DOMContentLoaded', init);

})();
