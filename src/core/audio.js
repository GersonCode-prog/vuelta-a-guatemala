// Música generada en el navegador: marimba con trémolo sobre ritmo de cumbia, más efectos.
import {store, clamp, lerp, rnd, min, max, pow, floor} from './util.js';

let ctx = null, master, comp, music, musicLP, sfx, dlySend, dly, dlyFb, dlyLP, verb, verbSend, noiseBuf, amb, ambLP, ambG, wind, windG;
let playing = false, muted = store.get('muted', false), vol = store.get('vol', 0.8);
let level = 0, step = 0, nextT = 0, leadNext = 0, leadI = 0, slow = 1, crickT = 0;
const mtof = (m) => 440 * pow(2, (m - 69) / 12);
// Cada tema: acordes por dos compases, ritmo y frases de la marimba.
const THEMES = [
  {bpm: 108, ch: [[55, 62, 67, 71], [60, 64, 67, 72], [62, 66, 69, 72], [55, 62, 67, 71]], kick: 'x.......x.......', guira: 'x.xxx.xxx.xxx.xx', conga: '......x....x..x.', bass: 'x.....x.x.....x.', lead: [4, 2, 2, 1, 1, 2, 4, 2, 2, 4, 4], oct: 12, vel: 0.2},
  {bpm: 96, ch: [[52, 59, 64, 67], [48, 55, 60, 64], [50, 57, 62, 65], [47, 54, 59, 62]], kick: 'x...............', guira: '....x.......x...', conga: '..........x.....', bass: 'x.......x.......', lead: [8, 2, 2, 4, 6, 2, 8], oct: 12, vel: 0.17},
  {bpm: 122, ch: [[48, 60, 64, 67], [53, 60, 65, 69], [55, 62, 67, 71], [48, 60, 64, 67]], kick: 'x...x...x...x...', guira: 'xxx.xxx.xxx.xxx.', conga: '..x...x...x..xx.', bass: 'x.x...x.x.x...x.', lead: [2, 1, 1, 2, 2, 2, 1, 1, 2, 4], oct: 24, vel: 0.19},
  {bpm: 148, ch: [[45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62], [40, 56, 59, 64]], kick: 'x..x..x.x..x..x.', guira: 'xxxxxxxxxxxxxxxx', conga: '....x.......x.xx', bass: 'x.xx.xx.x.xx.xx.', lead: [1, 1, 1, 1, 2, 1, 1, 2, 2, 4], oct: 24, vel: 0.2},
];
function ir(sec, decay) {
  const n = floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n, w = (Math.random() * 2 - 1) * pow(1 - t, decay);
      lp += (w - lp) * lerp(0.75, 0.15, t);
      d[i] = lp;
    }
  }
  return b;
}
function init() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : vol * 0.76;
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 5;
  comp.attack.value = 0.004;
  comp.release.value = 0.16;
  comp.connect(master);
  master.connect(ctx.destination);
  music = ctx.createGain();
  music.gain.value = 1.15;
  musicLP = ctx.createBiquadFilter();
  musicLP.type = 'lowpass';
  musicLP.frequency.value = 17000;
  music.connect(musicLP);
  musicLP.connect(comp);
  sfx = ctx.createGain();
  sfx.gain.value = 0.95;
  sfx.connect(comp);
  dlySend = ctx.createGain();
  dly = ctx.createDelay(2);
  dly.delayTime.value = 0.28;
  dlyFb = ctx.createGain();
  dlyFb.gain.value = 0.28;
  dlyLP = ctx.createBiquadFilter();
  dlyLP.type = 'lowpass';
  dlyLP.frequency.value = 3000;
  dlySend.connect(dly);
  dly.connect(dlyLP);
  dlyLP.connect(dlyFb);
  dlyFb.connect(dly);
  dlyLP.connect(music);
  verb = ctx.createConvolver();
  verb.buffer = ir(1.8, 2.6);
  verbSend = ctx.createGain();
  verbSend.gain.value = 0.7;
  verbSend.connect(verb);
  verb.connect(comp);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  // Mar de fondo
  amb = ctx.createBufferSource();
  amb.buffer = noiseBuf;
  amb.loop = true;
  ambLP = ctx.createBiquadFilter();
  ambLP.type = 'lowpass';
  ambLP.frequency.value = 520;
  ambG = ctx.createGain();
  ambG.gain.value = 0;
  amb.connect(ambLP);
  ambLP.connect(ambG);
  ambG.connect(comp);
  amb.start();
  // Viento según velocidad
  wind = ctx.createBufferSource();
  wind.buffer = noiseBuf;
  wind.loop = true;
  const wf = ctx.createBiquadFilter();
  wf.type = 'bandpass';
  wf.frequency.value = 900;
  wf.Q.value = 0.6;
  windG = ctx.createGain();
  windG.gain.value = 0;
  wind.connect(wf);
  wf.connect(windG);
  windG.connect(comp);
  wind.start();
  return true;
}
const env = (g, t, peak, atk, end) => {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(max(peak, 0.0002), t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + end);
};
const osc = (f, t, end, dest, type = 'sine') => {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(min(f, 18000), t);
  o.connect(dest);
  o.start(t);
  o.stop(t + end + 0.03);
  return o;
};
function noise(t, end, dest) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s.connect(dest);
  s.start(t, Math.random() * 1.5);
  s.stop(t + end + 0.03);
  return s;
}
function marimba(f, t, v, send = 0.26, dest, pan) {
  if (!ctx) return;
  const dur = clamp(1.05 - f / 2500, 0.24, 1.05);
  const out = ctx.createGain();
  let tail = out;
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan !== undefined ? pan : rnd(-0.4, 0.4);
    out.connect(p);
    tail = p;
  }
  tail.connect(dest || music);
  if (send > 0) {
    const s = ctx.createGain();
    s.gain.value = send;
    tail.connect(s);
    s.connect(dlySend);
    const r = ctx.createGain();
    r.gain.value = send * 0.6;
    tail.connect(r);
    r.connect(verbSend);
  }
  const g1 = ctx.createGain(), g2 = ctx.createGain(), g3 = ctx.createGain();
  g1.connect(out);
  g2.connect(out);
  g3.connect(out);
  env(g1, t, v, 0.003, dur);
  env(g2, t, v * 0.3, 0.002, dur * 0.3);
  env(g3, t, v * 0.09, 0.001, 0.05);
  osc(f, t, dur, g1);
  osc(f * 3.94, t, dur * 0.3, g2);
  osc(f * 9.2, t, 0.06, g3);
}
function kick(t, v = 0.7) {
  const g = ctx.createGain(), o = ctx.createOscillator();
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
  env(g, t, v, 0.003, 0.24);
  o.connect(g);
  g.connect(music);
  o.start(t);
  o.stop(t + 0.28);
}
function guira(t, v) {
  const g = ctx.createGain(), f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 6200;
  env(g, t, v, 0.001, 0.05);
  f.connect(g);
  g.connect(music);
  noise(t, 0.06, f);
}
function conga(t, hi) {
  const g = ctx.createGain(), o = ctx.createOscillator();
  o.frequency.setValueAtTime(hi ? 330 : 210, t);
  o.frequency.exponentialRampToValueAtTime(hi ? 240 : 150, t + 0.07);
  env(g, t, 0.22, 0.002, 0.14);
  o.connect(g);
  g.connect(music);
  o.start(t);
  o.stop(t + 0.17);
}
function bass(f, t, dur) {
  const g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 520;
  env(g, t, 0.36, 0.006, dur);
  lp.connect(g);
  g.connect(music);
  osc(f, t, dur, lp, 'triangle');
}
function playStep(s, t) {
  const A = THEMES[level], sb = s % 16, ci = floor(s / 32) % 4, ch = A.ch[ci], spb = 60 / (A.bpm * slow);
  if (A.kick[sb] === 'x') kick(t);
  if (A.guira[sb] === 'x') guira(t, sb % 4 === 0 ? 0.07 : 0.042);
  if (A.conga[sb] === 'x') conga(t, sb % 3 === 0);
  if (A.bass[sb] === 'x') bass(mtof(ch[0] - (ch[0] > 50 ? 12 : 0) + (sb > 7 && sb < 12 ? 7 : 0)), t, spb * 0.5);
  // Melodía: frase que camina por las notas del acorde, con trémolo en las notas largas.
  if (s >= leadNext) {
    const d = A.lead[leadI % A.lead.length];
    const tones = ch.slice(1);
    const walk = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2];
    const n = tones[walk[leadI % walk.length]] + A.oct + (leadI % 13 === 7 ? 12 : 0);
    const stp = spb / 4;
    if (d >= 4) {
      const reps = d * 2;
      for (let k = 0; k < reps; k++) {
        const tt = t + (k * stp) / 2, a = A.vel * (0.62 + 0.3 * (1 - k / reps));
        marimba(mtof(n), tt, a * 0.8, 0.14);
        marimba(mtof(n - 4), tt + 0.004, a * 0.5, 0.08);
      }
    } else {
      marimba(mtof(n), t, A.vel, 0.24);
      if (d >= 2) marimba(mtof(n - 3), t + 0.004, A.vel * 0.52, 0.12);
    }
    leadNext = s + d;
    leadI++;
  }
}
function tick() {
  if (!ctx || !playing) return;
  const now = ctx.currentTime;
  if (nextT < now - 0.2) nextT = now + 0.03;
  let guard = 0;
  while (nextT < now + 0.15 && guard++ < 16) {
    playStep(step, nextT);
    nextT += 60 / (THEMES[level].bpm * slow) / 4;
    step++;
  }
  if (level === 1 && now > crickT) {
    crickT = now + rnd(0.5, 1.6);
    const n = floor(rnd(2, 5));
    for (let i = 0; i < n; i++) {
      const g = ctx.createGain();
      env(g, now + i * 0.07, 0.022, 0.003, 0.05);
      g.connect(sfx);
      osc(rnd(3900, 4700), now + i * 0.07, 0.05, g);
    }
  }
}
export const Audio = {
  get muted() { return muted; },
  get vol() { return vol; },
  start(lv = 0) {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume();
    playing = true;
    level = lv;
    step = 0;
    leadNext = 0;
    leadI = 0;
    nextT = ctx.currentTime + 0.08;
    music.gain.cancelScheduledValues(ctx.currentTime);
    music.gain.setTargetAtTime(1.15, ctx.currentTime, 0.1);
  },
  stop() { playing = false; },
  setLevel(lv) {
    if (lv !== level) {
      level = lv;
      leadNext = step;
    }
  },
  suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); },
  resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
  tick,
  setVol(v) {
    vol = v;
    store.set('vol', v);
    if (ctx && !muted) master.gain.setTargetAtTime(v * 0.76, ctx.currentTime, 0.03);
  },
  toggleMute() {
    muted = !muted;
    store.set('muted', muted);
    if (ctx) master.gain.setTargetAtTime(muted ? 0 : vol * 0.76, ctx.currentTime, 0.03);
    return muted;
  },
  fadeMusic(sec) { if (ctx) music.gain.setTargetAtTime(0.0001, ctx.currentTime, sec / 3); },
  ambient(sea, speed) {
    if (!ctx) return;
    const t = ctx.currentTime;
    ambG.gain.setTargetAtTime(sea * (0.09 + 0.04 * Math.sin(t * 0.6)), t, 0.3);
    windG.gain.setTargetAtTime(clamp(speed / 40) * 0.05, t, 0.1);
  },
  coin(i) {
    if (!ctx) return;
    const sc = [74, 76, 79, 81, 83, 86, 88, 91];
    marimba(mtof(sc[i % sc.length] + 12), ctx.currentTime, 0.2, 0.3, sfx, 0);
  },
  pickup() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [79, 83, 86, 91].forEach((m, i) => marimba(mtof(m), t + i * 0.055, 0.2, 0.4, sfx, 0));
  },
  jump() {
    if (!ctx) return;
    const t = ctx.currentTime, g = ctx.createGain(), o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(240, t);
    o.frequency.exponentialRampToValueAtTime(640, t + 0.13);
    env(g, t, 0.16, 0.01, 0.17);
    o.connect(g);
    g.connect(sfx);
    o.start(t);
    o.stop(t + 0.2);
  },
  land(v = 1) {
    if (!ctx) return;
    const t = ctx.currentTime, g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 650;
    env(g, t, 0.26 * v, 0.002, 0.13);
    f.connect(g);
    g.connect(sfx);
    noise(t, 0.15, f);
    const g2 = ctx.createGain();
    env(g2, t, 0.15 * v, 0.002, 0.08);
    g2.connect(sfx);
    osc(1250, t, 0.08, g2, 'square');
  },
  near(c, pan) {
    if (!ctx) return;
    const t = ctx.currentTime, g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(3000, t + 0.07);
    f.frequency.exponentialRampToValueAtTime(320, t + 0.2);
    env(g, t, 0.12 + 0.16 * c, 0.01, 0.22);
    let tail = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      g.connect(p);
      tail = p;
    }
    f.connect(g);
    tail.connect(sfx);
    noise(t, 0.24, f);
  },
  bell() {
    if (!init()) return;
    const t = ctx.currentTime;
    [0, 0.13].forEach((d) => {
      const g = ctx.createGain();
      env(g, t + d, 0.15, 0.002, 0.28);
      g.connect(sfx);
      osc(2350, t + d, 0.28, g);
      osc(3120, t + d, 0.2, g);
    });
  },
  hit() {
    if (!ctx) return;
    const t = ctx.currentTime, g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(4600, t);
    f.frequency.exponentialRampToValueAtTime(190, t + 0.34);
    env(g, t, 0.62, 0.002, 0.42);
    f.connect(g);
    g.connect(sfx);
    noise(t, 0.45, f);
    const g2 = ctx.createGain();
    env(g2, t, 0.6, 0.002, 0.34);
    g2.connect(sfx);
    const o = osc(120, t, 0.34, g2);
    o.frequency.exponentialRampToValueAtTime(36, t + 0.3);
    const g3 = ctx.createGain();
    env(g3, t, 0.14, 0.002, 0.3);
    g3.connect(sfx);
    osc(910, t, 0.3, g3, 'triangle');
    osc(1370, t, 0.26, g3, 'triangle');
  },
  splash() {
    if (!ctx) return;
    const t = ctx.currentTime, g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.6;
    f.frequency.setValueAtTime(1800, t);
    f.frequency.exponentialRampToValueAtTime(380, t + 0.55);
    env(g, t, 0.55, 0.01, 0.65);
    f.connect(g);
    g.connect(sfx);
    g.connect(verbSend);
    noise(t, 0.68, f);
  },
  wave() {
    if (!ctx) return;
    const t = ctx.currentTime, g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(240, t);
    f.frequency.exponentialRampToValueAtTime(2300, t + 2.7);
    f.frequency.exponentialRampToValueAtTime(320, t + 4.7);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 2.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4.8);
    f.connect(g);
    g.connect(sfx);
    noise(t, 4.85, f);
  },
  bark() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [0, 0.17].forEach((d) => {
      const g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 950;
      f.Q.value = 2;
      env(g, t + d, 0.42, 0.006, 0.12);
      f.connect(g);
      g.connect(sfx);
      const o = osc(310, t + d, 0.12, f, 'sawtooth');
      o.frequency.exponentialRampToValueAtTime(190, t + d + 0.1);
    });
  },
  phone() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [0, 0.09, 0.18].forEach((d, i) => {
      const g = ctx.createGain();
      env(g, t + d, 0.06, 0.003, 0.07);
      g.connect(sfx);
      osc(1320 + i * 220, t + d, 0.07, g, 'square');
    });
  },
  buy() {
    if (!init()) return;
    const t = ctx.currentTime;
    [72, 76, 79, 84].forEach((m, i) => marimba(mtof(m), t + i * 0.06, 0.24, 0.4, sfx, 0));
  },
  ui() {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume();
    marimba(mtof(74), ctx.currentTime + 0.01, 0.22, 0.4, sfx, 0);
    marimba(mtof(79), ctx.currentTime + 0.08, 0.16, 0.4, sfx, 0);
  },
  fanfare() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [67, 71, 74, 79, 83, 86, 91].forEach((m, i) => {
      marimba(mtof(m), t + i * 0.09, 0.26, 0.5, sfx, 0);
      marimba(mtof(m - 12), t + i * 0.09, 0.18, 0.3, sfx, 0);
    });
  },
  fail() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [69, 65, 62, 57].forEach((m, i) => marimba(mtof(m), t + i * 0.16, 0.24, 0.5, sfx, 0));
  },
  _ctx: () => ctx,
  _master: () => master,
};
