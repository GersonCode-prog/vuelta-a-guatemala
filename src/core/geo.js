// Constructor de modelos por código: todo objeto del juego sale de aquí, sin archivos 3D.
import * as T from 'three';
import {PI, TAU, cos, sin, hypot, lerp} from './util.js';

export const hex = (h) => {
  const c = new T.Color().setStyle(h);
  return [c.r, c.g, c.b];
};
export const mixC = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const nrm = (a) => {
  const l = hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export class GeoB {
  constructor() {
    this.p = [];
    this.c = [];
    this.g = [];
    this.f = [];
    this.i = [];
    this.flat = 0;
  }
  get n() {
    return this.p.length / 3;
  }
  vert(q, col, glow = 0) {
    this.p.push(q[0], q[1], q[2]);
    this.c.push(col[0], col[1], col[2]);
    this.g.push(glow);
    this.f.push(this.flat);
    return this.n - 1;
  }
  P(j) {
    return [this.p[j * 3], this.p[j * 3 + 1], this.p[j * 3 + 2]];
  }
  // Triángulo orientado hacia afuera respecto a un punto de referencia.
  tri(a, b, c, ref) {
    const A = this.P(a), B = this.P(b), C = this.P(c);
    const N = cross(sub(B, A), sub(C, A));
    const M = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3, (A[2] + B[2] + C[2]) / 3];
    if (dot(N, sub(M, ref)) < 0) this.i.push(a, c, b);
    else this.i.push(a, b, c);
  }
  // Une anillos de vértices. colFn(ta,tb,q) y glowFn son opcionales.
  loft(rings, col, glow = 0, caps = true) {
    const base = this.n, R = rings.length, N = rings[0].length;
    const colFn = typeof col === 'function' ? col : () => col;
    const glowFn = typeof glow === 'function' ? glow : () => glow;
    const cen = rings.map((r) => r.reduce((s, q) => [s[0] + q[0] / N, s[1] + q[1] / N, s[2] + q[2] / N], [0, 0, 0]));
    for (let a = 0; a < R; a++) for (let b = 0; b < N; b++) this.vert(rings[a][b], colFn(a / (R - 1), b / N, rings[a][b]), glowFn(a / (R - 1), b / N));
    for (let a = 0; a < R - 1; a++) {
      const ref = [(cen[a][0] + cen[a + 1][0]) / 2, (cen[a][1] + cen[a + 1][1]) / 2, (cen[a][2] + cen[a + 1][2]) / 2];
      for (let b = 0; b < N; b++) {
        const b2 = (b + 1) % N, v00 = base + a * N + b, v01 = base + a * N + b2, v10 = base + (a + 1) * N + b, v11 = base + (a + 1) * N + b2;
        this.tri(v00, v10, v01, ref);
        this.tri(v01, v10, v11, ref);
      }
    }
    if (caps) {
      [0, R - 1].forEach((a) => {
        const out = a === 0 ? sub(cen[0], cen[1]) : sub(cen[R - 1], cen[R - 2]);
        const ci = this.vert(cen[a], colFn(a / (R - 1), 0, cen[a]), glowFn(a / (R - 1), 0));
        const ref = sub(cen[a], nrm(out));
        for (let b = 0; b < N; b++) this.tri(base + a * N + b, base + a * N + (b + 1) % N, ci, ref);
      });
    }
    return this;
  }
  // Tubo entre dos puntos, con radios distintos.
  tube(a, b, r0, r1, col, n = 8, glow = 0) {
    const ax = nrm(sub(b, a));
    const up = Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = nrm(cross(ax, up)), v = cross(ax, u);
    const ring = (c, r) => {
      const o = [];
      for (let i = 0; i < n; i++) {
        const q = (i / n) * TAU, cs = cos(q) * r, sn = sin(q) * r;
        o.push([c[0] + u[0] * cs + v[0] * sn, c[1] + u[1] * cs + v[1] * sn, c[2] + u[2] * cs + v[2] * sn]);
      }
      return o;
    };
    return this.loft([ring(a, r0), ring(b, r1)], col, glow);
  }
  // Tubo que sigue una curva de puntos con radio variable.
  curve(pts, rFn, col, n = 7, glow = 0) {
    const rings = pts.map((c, k) => {
      const prev = pts[Math.max(k - 1, 0)], next = pts[Math.min(k + 1, pts.length - 1)];
      const ax = nrm(sub(next, prev));
      const up = Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const u = nrm(cross(ax, up)), v = cross(ax, u);
      const r = rFn(k / (pts.length - 1));
      const o = [];
      for (let i = 0; i < n; i++) {
        const q = (i / n) * TAU, cs = cos(q) * r, sn = sin(q) * r;
        o.push([c[0] + u[0] * cs + v[0] * sn, c[1] + u[1] * cs + v[1] * sn, c[2] + u[2] * cs + v[2] * sn]);
      }
      return o;
    });
    return this.loft(rings, col, glow);
  }
  // Hoja ligera de dos caras: tres tramos sin grosor. Para follaje que se dibuja por cientos.
  leaf(pts, wAxis, width, col) {
    const n = pts.length, wa = nrm(wAxis), make = (flip) => {
      const base = this.n;
      for (let k = 0; k < n; k++) {
        const c = pts[k], w = width * (k === n - 1 ? 0.04 : k === 0 ? 0.5 : 1);
        const prev = pts[Math.max(k - 1, 0)], next = pts[Math.min(k + 1, n - 1)];
        const up = nrm(cross(sub(next, prev), wa)), off = [up[0] * 0.001 * flip, up[1] * 0.001 * flip, up[2] * 0.001 * flip];
        this.vert([c[0] - wa[0] * w + off[0], c[1] - wa[1] * w + off[1], c[2] - wa[2] * w + off[2]], col);
        this.vert([c[0] + wa[0] * w + off[0], c[1] + wa[1] * w + off[1], c[2] + wa[2] * w + off[2]], col);
      }
      for (let k = 0; k < n - 1; k++) {
        const a = base + k * 2, b = a + 1, c = a + 2, d = a + 3;
        if (flip > 0) this.i.push(a, b, d, a, d, c);
        else this.i.push(a, d, b, a, c, d);
      }
    };
    make(1);
    make(-1);
    return this;
  }
  // Aro en el plano YZ a la altura x dada.
  hoopAt(x, R, r, col, seg = 48, n = 6) {
    const base = this.n;
    this.hoop(0, 0, R, r, col, seg, n);
    for (let j = base; j < this.n; j++) this.p[j * 3] += x;
    return this;
  }
  // Aro cerrado alrededor del eje X, sin costura.
  hoop(cy, cz, R, r, col, seg = 48, n = 7, glow = 0) {
    const base = this.n;
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * TAU;
      for (let j = 0; j < n; j++) {
        const q = (j / n) * TAU, rr = R + cos(q) * r;
        this.vert([sin(q) * r, cy + cos(a) * rr, cz + sin(a) * rr], col, glow);
      }
    }
    for (let i = 0; i < seg; i++) {
      const i2 = (i + 1) % seg, a = (i / seg) * TAU, ref = [0, cy + cos(a) * R, cz + sin(a) * R];
      for (let j = 0; j < n; j++) {
        const j2 = (j + 1) % n, v00 = base + i * n + j, v01 = base + i * n + j2, v10 = base + i2 * n + j, v11 = base + i2 * n + j2;
        this.tri(v00, v10, v01, ref);
        this.tri(v01, v10, v11, ref);
      }
    }
    return this;
  }
  sph(c, r, col, glow = 0, lat = 8, lon = 10) {
    const rr = Array.isArray(r) ? r : [r, r, r];
    const base = this.n;
    const colFn = typeof col === 'function' ? col : () => col;
    for (let a = 0; a <= lat; a++) {
      const ph = (a / lat) * PI;
      for (let b = 0; b < lon; b++) {
        const th = (b / lon) * TAU;
        const q = [c[0] + rr[0] * sin(ph) * cos(th), c[1] + rr[1] * cos(ph), c[2] + rr[2] * sin(ph) * sin(th)];
        this.vert(q, colFn(a / lat, b / lon, q), glow);
      }
    }
    for (let a = 0; a < lat; a++)
      for (let b = 0; b < lon; b++) {
        const b2 = (b + 1) % lon, v00 = base + a * lon + b, v01 = base + a * lon + b2, v10 = base + (a + 1) * lon + b, v11 = base + (a + 1) * lon + b2;
        if (a > 0) this.tri(v00, v10, v01, c);
        if (a < lat - 1) this.tri(v01, v10, v11, c);
      }
    return this;
  }
  box(cx, cy, cz, hx, hy, hz, col, glow = 0) {
    const b = this.n;
    this.flat = 1;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) this.vert([cx + sx * hx, cy + sy * hy, cz + sz * hz], col, glow);
    this.flat = 0;
    const ref = [cx, cy, cz];
    const q = (a, c, d, e) => {
      this.tri(b + a, b + c, b + d, ref);
      this.tri(b + a, b + d, b + e, ref);
    };
    q(1, 3, 7, 5);
    q(0, 4, 6, 2);
    q(2, 6, 7, 3);
    q(0, 1, 5, 4);
    q(4, 5, 7, 6);
    q(0, 2, 3, 1);
    return this;
  }
  // Hoja delgada (palma, ala, pluma) que sigue una curva.
  blade(pts, wAxis, width, col, thick = 0.02, glow = 0) {
    const N = 6;
    const rings = pts.map((c, k) => {
      const t = k / (pts.length - 1);
      const w = Math.max(0.004, width * Math.pow(sin(PI * Math.pow(t * 0.97 + 0.015, 0.7)), 0.8));
      const ax = nrm(sub(pts[Math.min(k + 1, pts.length - 1)], pts[Math.max(k - 1, 0)]));
      const wa = nrm(wAxis), up = nrm(cross(ax, wa));
      const o = [];
      for (let i = 0; i < N; i++) {
        const q = (i / N) * TAU;
        o.push([c[0] + wa[0] * cos(q) * w + up[0] * sin(q) * thick, c[1] + wa[1] * cos(q) * w + up[1] * sin(q) * thick, c[2] + wa[2] * cos(q) * w + up[2] * sin(q) * thick]);
      }
      return o;
    });
    return this.loft(rings, col, glow);
  }
  build() {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3));
    g.setAttribute('aCol', new T.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aGlow', new T.Float32BufferAttribute(this.g, 1));
    g.setAttribute('aFlat', new T.Float32BufferAttribute(this.f, 1));
    g.setIndex(this.i);
    g.computeVertexNormals();
    if (this.painted) {
      // Fondo pintado: sin luz propia, todas las caras se ven igual.
      const n = g.attributes.normal, f = g.attributes.aFlat;
      for (let i = 0; i < n.count; i++) {
        n.setXYZ(i, 0, 1, 0);
        f.setX(i, -1);
      }
    }
    return g;
  }
}
