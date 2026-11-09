// Voces de caricatura: cada personaje "habla" con sílabas sintetizadas que siguen las vocales,
// el ritmo y la entonación de lo que dice, como en los juegos de antes. No hay grabaciones:
// una onda pasa por tres filtros que hacen de boca (formantes) y un poco de ruido hace las consonantes.
import {Audio} from './audio.js';
import {store, clamp, min, max} from './util.js';

let enabled = store.get('voices', true);

// Formantes F1-F3 de las vocales del español, voz de hombre adulto. Las demás voces se escalan.
const VOW = {a: [740, 1260, 2550], e: [470, 1880, 2560], i: [300, 2260, 2960], o: [500, 920, 2450], u: [330, 760, 2350]};
const NASAL = [260, 1150, 2350];
const ACC = {á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u'};
const isV = (c) => 'aeiouáéíóúü'.includes(c);
const plainV = (c) => ACC[c] || c;
const STRONG = 'aeoáéó';
// Pares de consonantes que van juntos al empezar la sílaba (pra, bla, cho, llo, rro).
const PAIR = /^(pr|br|tr|dr|cr|kr|gr|fr|pl|bl|cl|kl|gl|fl|ch|ll|rr)$/;

// ── Quién habla ──
// f0: tono; fs: tamaño de la boca (formantes); rate: sílabas por segundo; swing: cuánto sube y baja;
// bright: qué tan clara es la voz; rasp: carraspera; vib: vibrato.
const PEOPLE = {
  'Don Beto': {f0: 104, fs: 0.95, rate: 13, swing: 0.17, bright: 2300, rasp: 0.2, gain: 1},
  'La Licenciada': {f0: 218, fs: 1.17, rate: 14.5, swing: 0.13, bright: 3600, rasp: 0.04, gain: 0.9},
  'Mamá': {f0: 202, fs: 1.15, rate: 11.5, swing: 0.22, bright: 3200, rasp: 0.06, vib: 0.022, gain: 0.95},
  'Don Chepe': {f0: 94, fs: 0.92, rate: 10.5, swing: 0.25, bright: 2100, rasp: 0.22, gain: 1},
  'Don Chus': {f0: 126, fs: 0.97, rate: 12.5, swing: 0.21, bright: 2700, rasp: 0.14, gain: 1},
  'Doña Tere': {f0: 192, fs: 1.12, rate: 11, swing: 0.2, bright: 3000, rasp: 0.08, vib: 0.026, gain: 0.95},
  Repartidor: {f0: 152, fs: 1.02, rate: 15, swing: 0.22, bright: 3400, rasp: 0.05, gain: 1},
  PMT: {f0: 118, fs: 0.97, rate: 12, swing: 0.14, bright: 2600, rasp: 0.12, gain: 1},
  'Don Lalo': {f0: 116, fs: 0.96, rate: 13.5, swing: 0.24, bright: 2900, rasp: 0.1, gain: 1},
  'Doña Choco': {f0: 228, fs: 1.16, rate: 15, swing: 0.24, bright: 3500, rasp: 0.08, vib: 0.015, gain: 0.95},
  'Don Chema': {f0: 98, fs: 0.93, rate: 11.5, swing: 0.22, bright: 2400, rasp: 0.24, gain: 1},
};
const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
};
// Los clientes no tienen voz fija: sale de su nombre (Doña, La, o termina en a: voz de mujer).
function profileOf(who) {
  if (PEOPLE[who]) return PEOPLE[who];
  const n = String(who || '').toLowerCase().trim(), h = hash(n), h2 = hash(n + '·');
  const fem = /^(doña|la |seño|niña|abuela|tía)/.test(n) || /a$/.test(n);
  return fem
    ? {f0: 190 + h * 50, fs: 1.12 + h2 * 0.08, rate: 11.5 + h2 * 2.5, swing: 0.16 + h * 0.08, bright: 3000 + h2 * 600, rasp: 0.05, gain: 0.92}
    : {f0: 98 + h * 40, fs: 0.92 + h2 * 0.08, rate: 11 + h2 * 3, swing: 0.15 + h * 0.1, bright: 2200 + h2 * 700, rasp: 0.08 + h * 0.15, gain: 1};
}

// ── Sílabas ──
// Parte una palabra en sílabas: {on: consonantes de entrada, nuc: vocales, coda: consonantes de salida}.
function wordSyl(w) {
  // qu y gu suenan k y g; la h no suena (menos en ch); la x de Xela suena a sh y en medio a ks.
  let s = w.replace(/qu([eiéí])/g, 'k$1').replace(/gu([eiéí])/g, 'g$1').replace(/(^|[^c])h/g, '$1').replace(/^x/, 's').replace(/x/g, 'ks');
  if (s === 'y') s = 'i';
  s = s.replace(/y$/, 'i');
  const runs = [];
  for (let i = 0; i < s.length;) {
    const v = isV(s[i]);
    let j = i + 1;
    while (j < s.length && isV(s[j]) === v) j++;
    runs.push({v, s: s.slice(i, j)});
    i = j;
  }
  // Vocales seguidas: diptongo si una es débil (i, u) sin tilde; si no, son dos sílabas.
  const items = [];
  for (const r of runs) {
    if (!r.v) {
      items.push(r);
      continue;
    }
    let cur = r.s[0];
    for (let k = 1; k < r.s.length; k++) {
      const a = r.s[k - 1], b = r.s[k];
      const split = (STRONG.includes(a) && STRONG.includes(b)) || 'íú'.includes(a) || 'íú'.includes(b) || cur.length >= 3;
      if (split) {
        items.push({v: true, s: cur});
        cur = b;
      } else cur += b;
    }
    items.push({v: true, s: cur});
  }
  const syl = [];
  let pend = '';
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (!it.v) {
      if (!syl.length) {
        pend = it.s;
        continue;
      }
      const last = k === items.length - 1;
      if (last) syl[syl.length - 1].coda = it.s;
      else if (it.s.length === 1) pend = it.s;
      else {
        const two = it.s.slice(-2);
        const cut = PAIR.test(two) ? it.s.length - 2 : it.s.length - 1;
        syl[syl.length - 1].coda = it.s.slice(0, cut);
        pend = it.s.slice(cut);
      }
      continue;
    }
    syl.push({on: pend, nuc: it.s, coda: ''});
    pend = '';
  }
  if (!syl.length) return syl;
  // Acento: la tilde manda; si no, grave si termina en vocal, n o s, y aguda si no.
  let st = syl.findIndex((x) => /[áéíóú]/.test(x.nuc));
  if (st < 0) st = /[aeiouns]$/.test(s) && syl.length > 1 ? syl.length - 2 : syl.length - 1;
  syl[st].stress = true;
  return syl;
}
// Qué tipo de consonante abre la sílaba: P (p t k), B (b d g), S (s z), F, J, C (ch), N (m n ñ), L (l r), Y (y ll).
function consOf(on) {
  if (!on) return {c: ''};
  const o = on.replace(/^[^a-zñ]+/, '');
  if (o.startsWith('ch')) return {c: 'C', nf: 3300};
  if (o.startsWith('ll') || o.startsWith('y')) return {c: 'Y'};
  const a = o[0];
  if ('ptkcq'.includes(a)) return {c: 'P', nf: a === 'p' ? 950 : a === 't' ? 3700 : 2100, r: /r/.test(o)};
  if ('bvdgw'.includes(a)) return {c: 'B', r: /r/.test(o)};
  if ('szx'.includes(a)) return {c: 'S', nf: 5400};
  if (a === 'f') return {c: 'F', nf: 3100, r: /r/.test(o)};
  if (a === 'j') return {c: 'J', nf: 1700};
  if ('mnñ'.includes(a)) return {c: 'N'};
  if ('lr'.includes(a)) return {c: 'L', r: a === 'r'};
  return {c: ''};
}
// Del texto a un plan: sílabas con tiempo, tono, fuerza y hasta qué letra se muestra el texto.
function plan(text, P, maxDur) {
  const low = text.toLowerCase();
  const re = /[a-zñáéíóúü]+/g;
  const out = [];
  let m;
  while ((m = re.exec(low))) {
    const syl = wordSyl(m[0]);
    if (!syl.length) continue;
    const w0 = m.index, wl = m[0].length;
    // Lo que sigue a la palabra: pausa según la puntuación.
    re.lastIndex = w0 + wl;
    let j = w0 + wl;
    while (j < low.length && !/[a-zñáéíóúü]/.test(low[j])) j++;
    const gap = low.slice(w0 + wl, j);
    const pause = /\.\.\.|…/.test(gap) ? 0.32 : /[.!?]/.test(gap) ? 0.24 : /[,;:—]/.test(gap) ? 0.12 : 0;
    syl.forEach((x, k) => {
      const nuc = [...x.nuc].map(plainV);
      // La vocal fuerte del diptongo es la principal; la débil es deslizamiento.
      let main = nuc.findIndex((v) => 'aeo'.includes(v));
      if (main < 0) main = nuc.length - 1;
      const lastSyl = k === syl.length - 1;
      out.push(Object.assign(consOf(x.on), {
        v1: nuc[0] === nuc[main] || main === 0 ? nuc[main] : nuc[0],
        v2: nuc.length > 1 ? (main === 0 ? nuc[nuc.length - 1] : nuc[main]) : null,
        coda: /s$|z$/.test(x.coda) ? 's' : /n$|m$/.test(x.coda) ? 'n' : '',
        stress: !!x.stress,
        end: lastSyl ? j : w0 + Math.round((wl * (k + 1)) / syl.length),
        wEnd: lastSyl,
        pause: lastSyl ? pause : 0,
        stop: lastSyl ? (/[?]/.test(gap) ? '?' : /[!]/.test(gap) ? '!' : /[.]/.test(gap) ? '.' : '') : '',
      }));
    });
  }
  if (!out.length) return {syl: out, marks: [], dur: 0};
  // Frases: tono que baja al final; sube en las preguntas; arranca alto en las exclamaciones.
  let s0 = 0;
  for (let e = 0; e < out.length; e++) {
    if (!out[e].stop && e !== out.length - 1) continue;
    const n = e - s0 + 1, kind = out[e].stop || '.';
    for (let k = s0; k <= e; k++) {
      const p = n > 1 ? (k - s0) / (n - 1) : 1, x = out[k];
      let c;
      if (kind === '?') c = k >= e - 1 ? 1.26 + (k - e + 1) * 0.08 : 1.02 - 0.06 * p;
      else if (kind === '!') c = 1.2 - 0.26 * p;
      else c = 1.07 - 0.17 * p - (k === e ? 0.05 : 0);
      if (x.stress) c += 0.08;
      c += (hash(text + k) - 0.5) * 0.07;
      x.f = P.f0 * (1 + (c - 1) * (P.swing / 0.18));
      x.amp = (x.stress ? 1 : 0.8) * (kind === '!' ? 1.08 : 1);
      x.last = k === e;
    }
    s0 = e + 1;
  }
  // Tiempos: las acentuadas y el final de frase duran más.
  let t = 0;
  const base = 1 / P.rate;
  for (const x of out) {
    x.d = base * (x.stress ? 1.17 : 1) * (x.last ? 1.35 : 1) * ('SFJC'.includes(x.c) && x.c ? 1.06 : 1);
    t += x.d + (x.wEnd ? 0.018 : 0) + x.pause;
  }
  // Si es muy largo, habla más rápido; si aún no cabe, se calla al final de una frase.
  const k = clamp(maxDur / t, 0.72, 1);
  let cut = out.length;
  if (t * k > maxDur) {
    let acc = 0;
    for (let i = 0; i < out.length; i++) {
      acc += (out[i].d + (out[i].wEnd ? 0.018 : 0)) * k + out[i].pause;
      if (acc > maxDur) break;
      if (out[i].stop || out[i].pause >= 0.12) cut = i + 1;
    }
    if (cut === out.length) cut = max(1, Math.floor(out.length * (maxDur / (t * k))));
  }
  const syl = out.slice(0, cut), marks = [];
  t = 0;
  for (const x of syl) {
    x.d *= k;
    x.t = t;
    marks.push([t + x.d * 0.35, x.end]);
    t += x.d + (x.wEnd ? 0.018 : 0) + (x === syl[syl.length - 1] ? 0 : x.pause);
  }
  return {syl, marks, dur: t};
}

// ── Cadenas de sonido: teléfono, megáfono y voz directa ──
let N = null;
function chains() {
  const ctx = Audio._ctx();
  if (!ctx) return null;
  if (N && N.ctx === ctx) return N;
  const {comp, verbSend} = Audio._bus();
  const filt = (type, f, q) => {
    const b = ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  };
  const shaper = (k) => {
    const w = ctx.createWaveShaper(), n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) c[i] = Math.tanh(((i / (n - 1)) * 2 - 1) * k) / Math.tanh(k);
    w.curve = c;
    return w;
  };
  const line = (nodes, out) => {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    nodes[nodes.length - 1].connect(out);
    return nodes[0];
  };
  const pk = filt('peaking', 1700, 1);
  pk.gain.value = 4;
  const phG = ctx.createGain();
  phG.gain.value = 0.95;
  const mgG = ctx.createGain();
  mgG.gain.value = 0.6;
  const dr = ctx.createGain();
  const drV = ctx.createGain();
  drV.gain.value = 0.16;
  dr.connect(drV);
  drV.connect(verbSend);
  N = {
    ctx,
    // La distorsión va antes del pasabajos, para que no chille.
    phone: line([filt('highpass', 330, 0.7), pk, shaper(2.2), filt('lowpass', 3300, 0.8), filt('lowpass', 4200, 0.6), phG], comp),
    mega: line([filt('highpass', 650, 0.8), shaper(5), filt('lowpass', 2600, 1.2), filt('lowpass', 3400, 0.6), mgG], comp),
    direct: line([dr], comp),
  };
  return N;
}

// ── Hablar ──
const CUR = {};
function stop(ch) {
  const c = CUR[ch], ctx = Audio._ctx();
  if (!c || !ctx) return;
  const t = ctx.currentTime;
  c.env.gain.cancelScheduledValues(t);
  c.env.gain.setTargetAtTime(0, t, 0.02);
  c.nEnv.gain.cancelScheduledValues(t);
  c.nEnv.gain.setTargetAtTime(0, t, 0.02);
  for (const s of c.srcs) {
    try {
      s.stop(t + 0.12);
    } catch (e) {
      /* ya paró */
    }
  }
  if (c.duck) Audio.duck(1, t, 0);
  CUR[ch] = null;
}
// Dice 'text' con la voz de 'who'. Devuelve el plan (duración y marcas para ir mostrando el texto) o null.
function speak(who, text, o = {}) {
  if (!enabled || Audio.muted) return null;
  const C = chains();
  if (!C || C.ctx.state !== 'running') return null;
  const ctx = C.ctx, ch = o.ch || 'call';
  const P = profileOf(who);
  const S = plan(String(text || ''), P, o.maxDur || 3.4);
  if (!S.syl.length) return null;
  stop(ch);
  const {noiseBuf} = Audio._bus();
  const t0 = ctx.currentTime + (o.delay || 0), fs = P.fs;
  // Fuente: diente de sierra suavizado más un soplo de ruido (carraspera).
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = P.bright;
  lp.Q.value = 0.5;
  osc.connect(lp);
  const br = ctx.createBufferSource();
  br.buffer = noiseBuf;
  br.loop = true;
  const brG = ctx.createGain();
  brG.gain.value = 0.05 + P.rasp * 0.5;
  br.connect(brG);
  const env = ctx.createGain();
  env.gain.value = 0;
  const QS = [5, 7, 9], GS = [1.7, 1.05, 0.45];
  const F = QS.map((q, k) => {
    const b = ctx.createBiquadFilter();
    b.type = 'bandpass';
    b.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = GS[k];
    lp.connect(b);
    brG.connect(b);
    b.connect(g);
    g.connect(env);
    return b;
  });
  // Consonantes: ruido filtrado aparte.
  const cz = ctx.createBufferSource();
  cz.buffer = noiseBuf;
  cz.loop = true;
  const cbp = ctx.createBiquadFilter();
  cbp.type = 'bandpass';
  cbp.Q.value = 1.4;
  const nEnv = ctx.createGain();
  nEnv.gain.value = 0;
  cz.connect(cbp);
  cbp.connect(nEnv);
  const out = ctx.createGain();
  out.gain.value = 0.75 * (P.gain || 1) * (o.gain || 1);
  env.connect(out);
  nEnv.connect(out);
  out.connect(o.chain === 'mega' ? C.mega : o.chain === 'direct' ? C.direct : C.phone);
  const srcs = [osc, br, cz];
  if (P.vib) {
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5.6;
    lg.gain.value = P.f0 * P.vib;
    lfo.connect(lg);
    lg.connect(osc.frequency);
    srcs.push(lfo);
  }
  const s0 = S.syl[0];
  osc.frequency.setValueAtTime(s0.f, t0);
  F.forEach((b, k) => b.frequency.setValueAtTime(VOW[s0.v1][k] * fs, t0));
  env.gain.setValueAtTime(0, t0);
  nEnv.gain.setValueAtTime(0, t0);
  for (const x of S.syl) {
    const ts = t0 + x.t, d = x.d, A = x.amp;
    // Cuánto dura la consonante antes de la vocal.
    const vo = x.c === 'P' ? 0.022 : x.c === 'S' ? 0.05 : x.c === 'F' || x.c === 'J' || x.c === 'C' ? 0.042 : x.c === 'B' ? 0.014 : x.c === 'N' || x.c === 'Y' ? 0.03 : 0.008;
    if (x.c === 'P' || x.c === 'C') {
      cbp.frequency.setValueAtTime(x.nf, ts);
      nEnv.gain.setTargetAtTime((x.c === 'C' ? 0.3 : 0.32) * A, ts, 0.002);
      nEnv.gain.setTargetAtTime(0, ts + (x.c === 'C' ? 0.03 : 0.008), 0.008);
    } else if (x.c === 'S' || x.c === 'F' || x.c === 'J') {
      cbp.frequency.setValueAtTime(x.nf, ts);
      nEnv.gain.setTargetAtTime((x.c === 'S' ? 0.26 : x.c === 'F' ? 0.12 : 0.2) * A, ts, 0.008);
      nEnv.gain.setTargetAtTime(0, ts + vo - 0.006, 0.008);
    }
    // Parte con voz
    const pre = x.c === 'P' || x.c === 'S' || x.c === 'F' || x.c === 'J' || x.c === 'C' ? 0.015 : x.c === 'B' ? 0.12 : x.c ? 0.32 : 0.05;
    env.gain.setTargetAtTime(pre * A, ts, 0.006);
    env.gain.setTargetAtTime(A, ts + vo, 0.012);
    if (x.r) {
      // La erre: un golpecito de lengua.
      env.gain.setTargetAtTime(0.35 * A, ts + vo + 0.004, 0.004);
      env.gain.setTargetAtTime(A, ts + vo + 0.02, 0.006);
    }
    // La boca: nasal o desde la i, y luego la vocal; si hay diptongo, se desliza a la otra.
    const v1 = VOW[x.v1];
    if (x.c === 'N' || x.c === 'Y') {
      const from = x.c === 'N' ? NASAL : VOW.i;
      F.forEach((b, k) => b.frequency.setTargetAtTime(from[k] * fs, ts, 0.006));
    }
    F.forEach((b, k) => b.frequency.setTargetAtTime(v1[k] * fs, ts + vo * 0.6, 0.012));
    if (x.v2) F.forEach((b, k) => b.frequency.setTargetAtTime(VOW[x.v2][k] * fs, ts + vo + (d - vo) * 0.45, 0.022));
    // Tono: entra a su nota y cae un poquito.
    osc.frequency.setTargetAtTime(x.f, ts, 0.016);
    osc.frequency.setTargetAtTime(x.f * (x.last ? 0.9 : 0.965), ts + d * 0.55, x.last ? 0.08 : 0.05);
    // Cierre de la sílaba: ese final o nasal.
    if (x.coda === 's') {
      cbp.frequency.setValueAtTime(5400, ts + d * 0.66);
      nEnv.gain.setTargetAtTime(0.17 * A, ts + d * 0.66, 0.01);
      nEnv.gain.setTargetAtTime(0, ts + d * 0.92, 0.012);
      env.gain.setTargetAtTime(0.1 * A, ts + d * 0.66, 0.012);
    } else if (x.coda === 'n') {
      F.forEach((b, k) => b.frequency.setTargetAtTime(NASAL[k] * fs, ts + d * 0.68, 0.012));
      env.gain.setTargetAtTime(0.5 * A, ts + d * 0.68, 0.015);
    }
    const tail = x.pause > 0 || x.last ? 0 : x.wEnd ? 0.06 : 0.24;
    env.gain.setTargetAtTime(tail * A, ts + d * 0.8, x.pause > 0 || x.last ? 0.03 : 0.018);
  }
  const end = t0 + S.dur + 0.06;
  env.gain.setTargetAtTime(0, end, 0.03);
  for (const s of srcs) {
    s.start(t0);
    s.stop(end + 0.25);
  }
  const duck = o.ch !== 'shout';
  if (duck) Audio.duck(0.5, t0, end);
  const me = {env, nEnv, srcs, duck};
  CUR[ch] = me;
  osc.onended = () => {
    if (CUR[ch] === me) CUR[ch] = null;
  };
  return {dur: S.dur + (o.delay || 0), marks: S.marks.map(([t, i]) => [t + (o.delay || 0), i])};
}
// ¿Está hablando alguien en ese canal?
const busy = (ch) => !!CUR[ch];

export const Voice = {
  get on() { return enabled; },
  toggle() {
    enabled = !enabled;
    store.set('voices', enabled);
    if (!enabled) {
      stop('call');
      stop('shout');
    }
    return enabled;
  },
  speak,
  stop,
  stopAll() {
    stop('call');
    stop('shout');
  },
  busy,
  _plan: (who, text, maxDur = 3.4) => plan(text, profileOf(who), maxDur),
  _syl: wordSyl,
};
