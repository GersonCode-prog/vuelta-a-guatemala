// Utilidades compartidas por todo el juego.
export const {PI, sin, cos, tan, abs, min, max, sqrt, floor, ceil, pow, exp, log, atan2, acos, hypot, sign, round} = Math;
export const TAU = PI * 2;
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => a + (b - a) * (1 - exp(-k * dt));
export const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const pick = (a) => a[floor(Math.random() * a.length)];
export const $ = (id) => document.getElementById(id);
// Generador con semilla: el nivel siempre sale igual y se puede aprender.
export const seeded = (s) => () => {
  s |= 0;
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem('vag.' + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('vag.' + k, JSON.stringify(v));
    } catch (e) {}
  },
};
export const TEST = window.__VAG_TEST || {};
export const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
export const COARSE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
export const MOBILE = COARSE && min(innerWidth, innerHeight) < 900;
export const clockText = (s) => {
  s = max(0, s);
  const m = floor(s / 60), c = ceil(s % 60) === 60 ? 0 : ceil(s % 60);
  const mm = ceil(s % 60) === 60 ? m + 1 : m;
  return mm + ':' + String(c).padStart(2, '0');
};
