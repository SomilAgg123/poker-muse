/* FLUX POKER — tiny WebAudio synth (no audio assets needed) */
'use strict';

(function () {
  let ctx = null;
  let muted = false;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    if (muted) return;
    const c = ac();
    if (!c) return;
    const t = c.currentTime + (when || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur, vol, when, lowpass) {
    if (muted) return;
    const c = ac();
    if (!c) return;
    const t = c.currentTime + (when || 0);
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass || 3000;
    const g = c.createGain();
    g.gain.value = vol || 0.08;
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  }

  const Sfx = {
    setMuted(m) { muted = m; },
    isMuted() { return muted; },
    unlock() { ac(); }, // call on first user gesture
    deal() { noise(0.09, 0.06, 0, 4500); },
    place() { tone(520, 0.09, 'triangle', 0.10); tone(780, 0.07, 'triangle', 0.06, 0.03); },
    flux() { tone(300, 0.22, 'sawtooth', 0.05, 0, 900); },
    chip() { noise(0.06, 0.10, 0, 6000); tone(2200, 0.05, 'square', 0.03); },
    check() { tone(440, 0.08, 'sine', 0.08); },
    fold() { tone(220, 0.25, 'sine', 0.09, 0, 140); },
    reveal() { noise(0.15, 0.05, 0, 2500); },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.11, i * 0.09));
    },
    lose() {
      [392, 330, 262].forEach((f, i) => tone(f, 0.2, 'triangle', 0.10, i * 0.11));
    },
    click() { tone(660, 0.05, 'sine', 0.05); },
  };

  window.FluxSfx = Sfx;
})();
