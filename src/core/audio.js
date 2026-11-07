// Música generada en el navegador: marimba con trémolo sobre ritmo de cumbia, más efectos.
import {store, clamp, lerp, rnd, min, max, pow, floor} from './util.js';

let ctx = null, master, comp, music, musicLP, duck, sfx, dlySend, dly, dlyFb, dlyLP, verb, verbSend, noiseBuf, amb, ambLP, ambG, wind, windG;
let playing = false, muted = store.get('muted', false), vol = store.get('vol', 0.8);
let level = 0, step = 0, nextT = 0, leadNext = 0, leadI = 0, slow = 1, crickT = 0;
const mtof = (m) => 440 * pow(2, (m - 69) / 12);
// Cada tema: acordes por dos compases, ritmo y frases de la marimba.
const THEMES = [
  {bpm: 108, ch: [[55, 62, 67, 71], [60, 64, 67, 72], [62, 66, 69, 72], [55, 62, 67, 71]], kick: 'x.......x.......', guira: 'x.xxx.xxx.xxx.xx', conga: '......x....x..x.', bass: 'x.....x.x.....x.', lead: [4, 2, 2, 1, 1, 2, 4, 2, 2, 4, 4], oct: 12, vel: 0.2},
  {bpm: 96, ch: [[52, 59, 64, 67], [48, 55, 60, 64], [50, 57, 62, 65], [47, 54, 59, 62]], kick: 'x...............', guira: '....x.......x...', conga: '..........x.....', bass: 'x.......x.......', lead: [8, 2, 2, 4, 6, 2, 8], oct: 12, vel: 0.17},
  {bpm: 122, ch: [[48, 60, 64, 67], [53, 60, 65, 69], [55, 62, 67, 71], [48, 60, 64, 67]], kick: 'x...x...x...x...', guira: 'xxx.xxx.xxx.xxx.', conga: '..x...x...x..xx.', bass: 'x.x...x.x.x...x.', lead: [2, 1, 1, 2, 2, 2, 1, 1, 2, 4], oct: 24, vel: 0.19},
  {bpm: 148, ch: [[45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62], [40, 56, 59, 64]], kick: 'x..x..x.x..x..x.', guira: 'xxxxxxxxxxxxxxxx', conga: '....x.......x.xx', bass: 'x.xx.xx.x.xx.xx.', lead: [1, 1, 1, 1, 2, 1, 1, 2, 2, 4], oct: 24, vel: 0.2},
  // Taxisco: son en seis por ocho al amanecer
  {bpm: 92, div: 3, bar: 24, amb: 'birds', ch: [[50, 62, 66, 69], [55, 62, 67, 71], [57, 61, 64, 69], [50, 62, 66, 69]], kick: 'x.....x.....', guira: '..x..x..x..x', conga: '.....x.....x', bass: 'x..x..x..x..', lead: [3, 3, 6, 3, 3, 6, 12], oct: 12, vel: 0.2},
  // Cañales: más apurado, en menor
  {bpm: 116, ch: [[52, 59, 64, 67], [48, 60, 64, 67], [50, 57, 62, 66], [47, 59, 62, 66]], kick: 'x.....x...x.....', guira: 'x.x.xxx.x.x.xxx.', conga: '....x.....x...x.', bass: 'x..x..x.x..x..x.', lead: [2, 2, 4, 2, 2, 4, 8], oct: 12, vel: 0.19},
  // Feria: marimba y banda
  {bpm: 132, stab: 'x...x.x.x...x.x.', ch: [[48, 60, 64, 67], [53, 60, 65, 69], [55, 62, 67, 71], [48, 60, 64, 67]], kick: 'x...x...x...x...', guira: 'xxx.xxx.xxx.xxx.', conga: '..x..xx...x..xx.', bass: 'x.x...x.x.x...x.', lead: [2, 1, 1, 2, 2, 2, 1, 1, 2, 4], oct: 24, vel: 0.19},
  // Toro: pasodoble con trompeta, cadencia frigia
  {bpm: 150, stab: 'x.x...x.x.x...x.', horn: [76, 77, 79, 77, 76, 76, 74, 72, 71, 72, 74, 76], ch: [[52, 59, 64, 68], [53, 60, 65, 69], [55, 62, 67, 71], [53, 60, 65, 69]], kick: 'x...x...x...x...', guira: 'x.x.x.x.x.x.x.x.', conga: '......x.......x.', bass: 'x...x...x...x...', lead: [4, 4, 8], oct: 12, vel: 0.15},
  // Roosevelt: cumbia de camioneta, con bocinas de fondo
  {bpm: 126, amb: 'city', stab: 'x..x..x.x..x..x.', ch: [[57, 64, 69, 73], [62, 66, 69, 74], [64, 68, 71, 76], [57, 64, 69, 73]], kick: 'x...x...x...x...', guira: 'x.xxx.xxx.xxx.xx', conga: '..x...x...x..xx.', bass: 'x..x..x.x..x..x.', lead: [2, 2, 1, 1, 2, 4, 2, 2, 4], oct: 12, vel: 0.19},
  // Periférico: más rápido, en menor, con trompeta
  {bpm: 140, amb: 'city', horn: [69, 72, 74, 72, 69, 67, 69, 64], ch: [[50, 57, 62, 65], [46, 58, 62, 65], [48, 55, 60, 64], [45, 57, 61, 64]], kick: 'x...x...x...x...', guira: 'xxx.xxx.xxx.xxx.', conga: '....x.......x.x.', bass: 'x.xx.x.xx.xx.x.x', lead: [2, 1, 1, 2, 2, 4, 2, 2], oct: 24, vel: 0.17},
  // Zona 1 de noche: son lento con acordes de séptima
  {bpm: 98, amb: 'city', ch: [[53, 60, 64, 69], [55, 62, 65, 71], [52, 59, 64, 67], [57, 60, 64, 67]], kick: 'x.......x.......', guira: '....x.......x...', conga: '......x.....x...', bass: 'x.....x.x.......', lead: [6, 2, 4, 4, 8, 2, 2, 4], oct: 12, vel: 0.17},
  // El Rey del Camino: persecución
  {bpm: 158, stab: 'x.x...x.x.x...x.', horn: [69, 72, 74, 76, 74, 72, 69, 67, 69, 72, 76, 79], ch: [[45, 57, 60, 64], [43, 55, 59, 62], [41, 53, 57, 60], [40, 52, 56, 59]], kick: 'x...x...x.x.x...', guira: 'xxxxxxxxxxxxxxxx', conga: '....x.......x.xx', bass: 'x.xx.xx.x.xx.xx.', lead: [1, 1, 2, 1, 1, 2, 2, 4], oct: 24, vel: 0.17},
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
  master.gain.value = muted ? 0 : vol * 0.7;
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
  // La música baja un poco mientras alguien habla.
  duck = ctx.createGain();
  musicLP.connect(duck);
  duck.connect(comp);
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
// Banda de pueblo: acordes de metal y trompeta.
function stab(ch, t, dur, v) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2600, t);
  lp.frequency.exponentialRampToValueAtTime(900, t + dur);
  const g = ctx.createGain();
  env(g, t, v, 0.012, dur);
  lp.connect(g);
  g.connect(music);
  ch.slice(1).forEach((m) => osc(mtof(m), t, dur, lp, 'sawtooth'));
}
function horn(f, t, dur, v) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 3;
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(3400, t + 0.06);
  lp.frequency.exponentialRampToValueAtTime(1700, t + dur);
  const g = ctx.createGain();
  env(g, t, v, 0.03, dur);
  lp.connect(g);
  g.connect(music);
  const s = ctx.createGain();
  s.gain.value = 0.22;
  g.connect(s);
  s.connect(verbSend);
  const a = osc(f, t, dur, lp, 'sawtooth'), b = osc(f * 1.004, t, dur, lp, 'square');
  const vib = osc(5.6, t + 0.1, dur, (() => {
    const d = ctx.createGain();
    d.gain.value = f * 0.006;
    d.connect(a.frequency);
    d.connect(b.frequency);
    return d;
  })());
  return vib;
}
function playStep(s, t) {
  const A = THEMES[level], sb = s % A.kick.length, ci = floor(s / (A.bar || 32)) % 4, ch = A.ch[ci], spb = 60 / (A.bpm * slow);
  if (A.kick[sb] === 'x') kick(t);
  if (A.guira[sb] === 'x') guira(t, sb % 4 === 0 ? 0.07 : 0.042);
  if (A.conga[sb] === 'x') conga(t, sb % 3 === 0);
  if (A.bass[sb] === 'x') bass(mtof(ch[0] - (ch[0] > 50 ? 12 : 0) + (sb > 7 && sb < 12 && !A.div ? 7 : 0)), t, spb * 0.5);
  if (A.stab && A.stab[sb] === 'x') stab(ch, t, spb * 0.28, 0.1);
  if (A.horn && s % 8 === 0) {
    const n = A.horn[floor(s / 8) % A.horn.length];
    horn(mtof(n), t, spb * 1.55, 0.13);
  }
  // Melodía: frase que camina por las notas del acorde, con trémolo en las notas largas.
  if (s >= leadNext) {
    const d = A.lead[leadI % A.lead.length];
    const tones = ch.slice(1);
    const walk = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2];
    const n = tones[walk[leadI % walk.length]] + A.oct + (leadI % 13 === 7 ? 12 : 0);
    const stp = spb / (A.div || 4);
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
    nextT += 60 / (THEMES[level].bpm * slow) / (THEMES[level].div || 4);
    step++;
  }
  if (THEMES[level].amb === 'birds' && now > crickT) {
    crickT = now + rnd(0.7, 2.4);
    const f0 = rnd(2300, 3600), n = floor(rnd(2, 5));
    for (let i = 0; i < n; i++) {
      const g = ctx.createGain(), t0 = now + i * 0.13;
      env(g, t0, 0.018, 0.012, 0.1);
      g.connect(sfx);
      const o = osc(f0, t0, 0.1, g);
      o.frequency.exponentialRampToValueAtTime(f0 * rnd(1.15, 1.4), t0 + 0.08);
    }
  }
  // Ciudad: bocinas lejanas de vez en cuando
  if (THEMES[level].amb === 'city' && now > crickT) {
    crickT = now + rnd(1.4, 3.8);
    const f = rnd(330, 520), n = Math.random() < 0.5 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const g = ctx.createGain(), lp = ctx.createBiquadFilter(), t0 = now + i * 0.22;
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      env(g, t0, 0.028, 0.01, 0.18);
      lp.connect(g);
      g.connect(sfx);
      osc(f, t0, 0.18, lp, 'square');
      osc(f * 1.26, t0, 0.18, lp, 'square');
    }
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
    if (ctx && !muted) master.gain.setTargetAtTime(v * 0.7, ctx.currentTime, 0.03);
  },
  toggleMute() {
    muted = !muted;
    store.set('muted', muted);
    if (ctx) master.gain.setTargetAtTime(muted ? 0 : vol * 0.7, ctx.currentTime, 0.03);
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
  // Pisada: tierra sorda, o tabla y adoquín que suenan a clop.
  hoof(v, hard, wet) {
    if (!ctx) return;
    const t = ctx.currentTime, g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = wet ? 'bandpass' : 'lowpass';
    f.frequency.value = wet ? 1500 : hard ? 1500 : 420;
    env(g, t, (hard ? 0.26 : 0.34) * v, 0.002, hard ? 0.05 : 0.08);
    f.connect(g);
    g.connect(sfx);
    noise(t, 0.1, f);
    const g2 = ctx.createGain();
    env(g2, t, (hard ? 0.1 : 0.2) * v, 0.002, 0.07);
    g2.connect(sfx);
    const o = osc(hard ? 620 : 128, t, 0.07, g2, hard ? 'triangle' : 'sine');
    o.frequency.exponentialRampToValueAtTime(hard ? 380 : 62, t + 0.06);
  },
  neigh() {
    if (!init()) return;
    const t = ctx.currentTime, g = ctx.createGain(), f = ctx.createBiquadFilter(), d = 0.85;
    f.type = 'bandpass';
    f.Q.value = 2.2;
    f.frequency.setValueAtTime(1300, t);
    f.frequency.exponentialRampToValueAtTime(2100, t + 0.2);
    f.frequency.exponentialRampToValueAtTime(760, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.36, t + 0.06);
    g.gain.setValueAtTime(0.33, t + 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    f.connect(g);
    g.connect(sfx);
    const o = osc(620, t, d, f, 'sawtooth');
    o.frequency.exponentialRampToValueAtTime(980, t + 0.16);
    o.frequency.exponentialRampToValueAtTime(330, t + d);
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.setValueAtTime(15, t);
    lfo.frequency.linearRampToValueAtTime(27, t + d);
    lg.gain.value = 95;
    lfo.connect(lg);
    lg.connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + d + 0.03);
  },
  moo(big = 0) {
    if (!ctx) return;
    const t = ctx.currentTime, g = ctx.createGain(), f = ctx.createBiquadFilter(), d = big ? 1.05 : 0.7;
    f.type = 'lowpass';
    f.Q.value = 3;
    f.frequency.setValueAtTime(320, t);
    f.frequency.exponentialRampToValueAtTime(big ? 900 : 620, t + d * 0.5);
    f.frequency.exponentialRampToValueAtTime(240, t + d);
    env(g, t, big ? 0.5 : 0.24, 0.1, d);
    f.connect(g);
    g.connect(sfx);
    const o = osc(big ? 92 : 128, t, d, f, 'sawtooth');
    o.frequency.exponentialRampToValueAtTime(big ? 124 : 158, t + d * 0.4);
    o.frequency.exponentialRampToValueAtTime(big ? 74 : 104, t + d);
  },
  bellow() { Audio.moo(1); },
  rumble() {
    if (!ctx) return;
    const t = ctx.currentTime, g = ctx.createGain(), f = ctx.createBiquadFilter(), d = 2.1;
    f.type = 'lowpass';
    f.frequency.value = 170;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + d * 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.45);
    f.connect(g);
    g.connect(sfx);
    noise(t, d + 0.5, f);
  },
  cohete(v = 1) {
    if (!ctx) return;
    const t = ctx.currentTime, g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 900;
    const n = v < 1 ? 1 : 5;
    g.gain.value = 0;
    for (let i = 0; i < n; i++) {
      const u = t + i * 0.06 + (i ? Math.random() * 0.02 : 0);
      g.gain.setValueAtTime(0.5 * v, u);
      g.gain.exponentialRampToValueAtTime(0.0001, u + 0.05);
    }
    f.connect(g);
    g.connect(sfx);
    g.connect(verbSend);
    noise(t, 0.08 * n + 0.1, f);
  },
  // Olé del público: ruido con dos formantes.
  crowd(v = 1) {
    if (!ctx) return;
    const t = ctx.currentTime, d = 0.95, base = ctx.createBufferSource();
    base.buffer = noiseBuf;
    base.loop = true;
    [[620, 460], [1120, 1500]].forEach(([a, b]) => {
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass';
      f.Q.value = 3.2;
      f.frequency.setValueAtTime(a, t);
      f.frequency.exponentialRampToValueAtTime(b, t + d * 0.6);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.42 * v, t + 0.14);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      base.connect(f);
      f.connect(g);
      g.connect(sfx);
    });
    base.start(t, Math.random());
    base.stop(t + d + 0.05);
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
  // Pito de la camioneta: tres notas de bocina musical.
  pito() {
    if (!init()) return;
    const t = ctx.currentTime;
    [[67, 0, 0.16], [72, 0.17, 0.16], [76, 0.34, 0.34]].forEach(([m, d, len]) => {
      const g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      env(g, t + d, 0.12, 0.01, len);
      lp.connect(g);
      g.connect(sfx);
      osc(mtof(m), t + d, len, lp, 'sawtooth');
      osc(mtof(m) * 1.005, t + d, len, lp, 'square');
    });
  },
  // Bocinazo grave del Rey del Camino
  honk() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [0, 0.3].forEach((d) => {
      const g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      env(g, t + d, 0.2, 0.01, 0.26);
      lp.connect(g);
      g.connect(sfx);
      osc(196, t + d, 0.26, lp, 'sawtooth');
      osc(247, t + d, 0.26, lp, 'sawtooth');
    });
  },
  // Sirena de la PMT: sube y baja mientras te sigue.
  siren(on) {
    if (!ctx) return;
    const t = ctx.currentTime;
    if (on && !Audio._siren) {
      const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'sawtooth';
      o.frequency.value = 820;
      lfo.type = 'triangle';
      lfo.frequency.value = 1.6;
      lg.gain.value = 230;
      lfo.connect(lg);
      lg.connect(o.frequency);
      lp.type = 'lowpass';
      lp.frequency.value = 1900;
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.3);
      o.connect(lp);
      lp.connect(g);
      g.connect(sfx);
      o.start(t);
      lfo.start(t);
      Audio._siren = {o, lfo, g};
    } else if (!on && Audio._siren) {
      const sr = Audio._siren;
      sr.g.gain.setTargetAtTime(0.0001, t, 0.15);
      sr.o.stop(t + 0.8);
      sr.lfo.stop(t + 0.8);
      Audio._siren = null;
    }
  },
  _siren: null,
  // Ráfaga del mar
  gust() {
    if (!init()) return;
    const t = ctx.currentTime, g = ctx.createGain(), f = ctx.createBiquadFilter(), d = 1.7;
    f.type = 'bandpass';
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(420, t);
    f.frequency.exponentialRampToValueAtTime(1500, t + d * 0.4);
    f.frequency.exponentialRampToValueAtTime(520, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + d * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    f.connect(g);
    g.connect(sfx);
    noise(t, d + 0.05, f);
  },
  // Rechinido de la camioneta desalineada: dos "iiic" de dirección vieja.
  squeak() {
    if (!init()) return;
    const t = ctx.currentTime;
    [0, 0.24].forEach((dd, i) => {
      const g = ctx.createGain(), f = ctx.createBiquadFilter(), f0 = i ? 1250 : 1080;
      f.type = 'bandpass';
      f.Q.value = 1.6;
      f.frequency.setValueAtTime(f0 * 1.1, t + dd);
      f.frequency.exponentialRampToValueAtTime(f0 * 1.55, t + dd + 0.2);
      env(g, t + dd, 0.42, 0.015, 0.25);
      f.connect(g);
      g.connect(sfx);
      const o = osc(f0, t + dd, 0.25, f, 'sawtooth');
      o.frequency.exponentialRampToValueAtTime(f0 * 1.45, t + dd + 0.2);
    });
  },
  // Sello de la multa
  stamp() {
    if (!ctx) return;
    const t = ctx.currentTime, g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    env(g, t + 0.25, 0.5, 0.002, 0.18);
    f.connect(g);
    g.connect(sfx);
    noise(t + 0.25, 0.2, f);
    const g2 = ctx.createGain();
    env(g2, t + 0.25, 0.3, 0.002, 0.15);
    g2.connect(sfx);
    const o = osc(150, t + 0.25, 0.15, g2);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.38);
    [69, 65].forEach((m, i) => marimba(mtof(m), t + 0.45 + i * 0.14, 0.18, 0.3, sfx, 0));
  },
  // Frenos de aire al parar
  airbrake() {
    if (!ctx) return;
    const t = ctx.currentTime, g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 2600;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    f.connect(g);
    g.connect(sfx);
    noise(t, 0.52, f);
  },
  // Baja la música a 'level' entre t0 y t1 (para las voces).
  duck(level, t0, t1) {
    if (!ctx) return;
    duck.gain.cancelScheduledValues(t0);
    duck.gain.setTargetAtTime(level, t0, 0.07);
    if (t1) duck.gain.setTargetAtTime(1, t1, 0.18);
  },
  _ctx: () => ctx,
  _master: () => master,
  _bus: () => ({comp, verbSend, noiseBuf}),
};
