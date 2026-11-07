// Objetos de Taxisco y Guazacapán: ganado, cercos, cañaverales, tráileres, feria y la camioneta.
import * as T from 'three';
import {GeoB, hex, mixC} from '../core/geo.js';
import {scene, celUni, U} from '../core/gfx.js';
import {VS_CEL, FS_CEL, VS_HULL, FS_HULL} from '../core/shaders.js';
import {PI, TAU, cos, sin, floor, lerp, seeded, MOBILE} from '../core/util.js';

const C = {
  hide: hex('#ece6da'), hideD: hex('#b9b0a2'), muzzle: hex('#3d3433'), horn: hex('#e5d8bc'), ink: hex('#1a1416'), wood: hex('#a8743f'), woodD: hex('#6e4726'), woodG: hex('#8a8172'), wire: hex('#3f3b3a'),
  leaf: hex('#3f9a48'), leafD: hex('#26763f'), leafL: hex('#79bd4e'), trunk: hex('#7a6456'), trunkD: hex('#54433b'), cane: hex('#b7c95c'), caneD: hex('#7f9c43'), caneLeaf: hex('#5fae45'), caneLeafL: hex('#a4cf58'),
  red: hex('#e3262f'), oro: hex('#ffc91f'), turq: hex('#12b5b0'), pink: hex('#ff5d7d'), white: hex('#fff3d6'), blue: hex('#1b62c9'), green: hex('#2bae56'), purple: hex('#7a3fb0'), skin: hex('#b9784f'), straw: hex('#d4b265'), hay: hex('#d9b94f'), hayD: hex('#a98a35'),
  mud: hex('#4d3224'), mudL: hex('#6d4a32'), stone: hex('#9b948a'), dirt: hex('#a06c42'), grassy: hex('#5a9a48'), metal: hex('#c8c6c0'), metalD: hex('#7d7c7a'), glass: hex('#23303a'), tire: hex('#1a1416'), concrete: hex('#b9b3a6'), water: hex('#4bb5c9'), flameA: hex('#ff5a1a'), flameB: hex('#ffc23a'), corn: hex('#f6cf3e'), husk: hex('#8bbf4d'),
};
const R0 = [1, 0, 0], RY = [0, 1, 0], RZ = [0, 0, 1];
const ring = (c, u, v, ru, rv, n = 12) => Array.from({length: n}, (_, i) => {
  const a = (i / n) * TAU, x = cos(a) * ru, y = sin(a) * rv;
  return [c[0] + u[0] * x + v[0] * y, c[1] + u[1] * x + v[1] * y, c[2] + u[2] * x + v[2] * y];
});
// Vaca cebú, la de la costa: giba, orejas caídas y papada.
function cowModel(frame) {
  const b = new GeoB();
  const tr = [[0.92, 1.0, 0.1, 0.13], [0.8, 0.99, 0.27, 0.33], [0.3, 0.97, 0.335, 0.41], [-0.2, 0.99, 0.335, 0.43], [-0.6, 1.03, 0.29, 0.41], [-0.78, 1.04, 0.14, 0.2]];
  b.loft(tr.map((q) => ring([0, q[1], q[0]], R0, RY, q[2], q[3], 14)), (ta, tb, q) => (q[1] < 0.74 ? C.hideD : C.hide));
  b.sph([0, 1.42, -0.42], [0.15, 0.2, 0.24], C.hideD, 0, 6, 8);
  b.sph([0, 0.74, -0.68], [0.09, 0.24, 0.16], C.hideD, 0, 5, 7);
  // Cabeza
  b.sph([0, 1.28, -0.92], [0.17, 0.18, 0.2], C.hide, 0, 7, 9);
  b.tube([0, 1.2, -1.02], [0, 1.04, -1.28], 0.12, 0.095, C.hide, 8);
  b.sph([0, 1.02, -1.3], [0.095, 0.07, 0.07], C.muzzle, 0, 5, 7);
  [-1, 1].forEach((s) => {
    b.sph([s * 0.13, 1.3, -1.02], [0.03, 0.04, 0.03], C.ink, 0, 4, 5);
    b.blade([[s * 0.15, 1.3, -0.88], [s * 0.3, 1.22, -0.86], [s * 0.38, 1.04, -0.84]], [0, 0, 1], 0.075, C.hideD, 0.015);
    b.curve([[s * 0.07, 1.44, -0.9], [s * 0.1, 1.52, -0.9], [s * 0.1, 1.6, -0.88]], (t) => lerp(0.03, 0.01, t), C.horn, 5);
  });
  // Patas: dos cuadros bastan para que parezca que camina.
  const f = frame ? 1 : -1;
  [[-0.2, -0.56, 1], [0.2, -0.56, -1], [-0.2, 0.68, -1], [0.2, 0.68, 1]].forEach(([x, z, s]) => {
    const dz = 0.2 * s * f;
    b.tube([x, 0.78, z], [x, 0.4, z + dz * 0.5], 0.1, 0.06, C.hide, 6);
    b.tube([x, 0.4, z + dz * 0.5], [x, 0.03, z + dz], 0.058, 0.045, C.hide, 6);
    b.tube([x, 0.08, z + dz], [x, 0, z + dz], 0.058, 0.066, C.ink, 6);
  });
  b.curve([[0, 1.14, 0.9], [0.05 * f, 0.92, 1.0], [0.08 * f, 0.56, 1.0]], (t) => lerp(0.035, 0.02, t), C.hideD, 5);
  b.sph([0.08 * f, 0.5, 1.0], [0.05, 0.1, 0.05], C.ink, 0, 4, 5);
  return b.build();
}
const cow = () => cowModel(0);
const cowB = () => cowModel(1);
function wire() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0.02, 1.34, 0], 0.075, 0.055, C.woodG, 5);
  [0.5, 0.85, 1.18].forEach((y) => b.box(0, y, 0, 0.012, 0.012, 3.05, C.wire));
  return b.build();
}
// Alambrado o tranquera atravesada: se salta.
function xfence() {
  const b = new GeoB();
  [-2, 2].forEach((x) => b.tube([x, 0, 0], [x, 1.32, 0], 0.09, 0.07, C.woodD, 6));
  [0.42, 0.76, 1.08].forEach((y) => b.box(0, y, 0, 2.02, 0.055, 0.04, C.wood));
  return b.build();
}
function gateFarm() {
  const b = new GeoB();
  [-1, 1].forEach((s) => b.tube([s * 3.1, 0, 0], [s * 3.1, 1.5, 0], 0.13, 0.1, C.woodD, 6));
  [0.34, 0.62, 0.9, 1.18].forEach((y) => b.box(0, y, 0, 3.05, 0.05, 0.05, C.white));
  b.box(0, 0.76, 0, 0.05, 0.48, 0.05, C.white);
  [-1, 1].forEach((s) => b.tube([s * 3, 0.32, 0.01], [s * 0.05, 1.18, 0.01], 0.03, 0.03, C.white, 4));
  return b.build();
}
function trough() {
  const b = new GeoB();
  b.box(0, 0.36, 0, 1.15, 0.36, 0.42, C.concrete);
  b.box(0, 0.7, 0, 1.03, 0.025, 0.31, C.water, 0.2);
  return b.build();
}
function bale() {
  const b = new GeoB();
  b.box(0, 0.52, 0, 1.0, 0.52, 0.66, C.hay);
  [-0.45, 0.45].forEach((x) => {
    b.box(x, 0.52, 0.665, 0.03, 0.53, 0.008, C.hayD);
    b.box(x, 1.045, 0, 0.03, 0.008, 0.665, C.hayD);
  });
  return b.build();
}
function mud() {
  const b = new GeoB(), n = 20, c = b.vert([0, 0.03, 0], C.mud), v = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, r = 1 + 0.18 * sin(a * 3 + 1) + 0.1 * sin(a * 7);
    v.push(b.vert([cos(a) * r, 0.022, sin(a) * r], C.mudL));
  }
  for (let i = 0; i < n; i++) b.tri(c, v[i], v[(i + 1) % n], [0, -1, 0]);
  return b.build();
}
function cans() {
  const b = new GeoB();
  [[-0.32, 0], [0.32, 0.06], [0, -0.44]].forEach(([x, z]) => {
    b.tube([x, 0, z], [x, 0.56, z], 0.2, 0.2, C.metal, 9);
    b.tube([x, 0.56, z], [x, 0.74, z], 0.2, 0.09, C.metal, 9);
    b.tube([x, 0.74, z], [x, 0.82, z], 0.11, 0.11, C.metalD, 8);
  });
  return b.build();
}
function wheels(b, xs, zs, r = 0.34) {
  xs.forEach((x) => zs.forEach((z) => b.tube([x - 0.11, r, z], [x + 0.11, r, z], r, r, C.tire, 10)));
}
function pickup() {
  const b = new GeoB();
  b.box(0, 0.62, 0, 0.82, 0.22, 2.0, hex('#2d7fb8'));
  b.box(0, 1.14, -0.42, 0.74, 0.36, 0.62, hex('#2d7fb8'));
  b.box(0, 1.2, -1.03, 0.66, 0.24, 0.02, C.glass);
  b.box(0, 1.2, 0.2, 0.66, 0.24, 0.02, C.glass);
  b.box(0, 0.86, -1.42, 0.8, 0.1, 0.58, hex('#23658f'));
  b.box(0, 0.9, 1.0, 0.8, 0.18, 0.95, hex('#23658f'));
  [[-0.38, 0.75], [0.38, 0.75], [-0.38, 1.25], [0.38, 1.25], [0, 1.0]].forEach(([x, z]) => b.tube([x, 1.0, z], [x, 1.5, z], 0.17, 0.17, C.metal, 8));
  [-0.55, 0.55].forEach((x) => b.sph([x, 0.72, 2.0], 0.07, C.red, 1.6, 3, 5));
  wheels(b, [-0.78, 0.78], [-1.25, 1.2]);
  return b.build();
}
// Ceiba: el árbol nacional, copa en pisos y raíces de tabla.
function ceiba() {
  const b = new GeoB();
  b.curve([[0, 0, 0], [0.04, 3, 0], [0, 7.4, 0], [0, 11, 0]], (t) => lerp(0.95, 0.5, t), C.trunk, 10);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    b.tube([cos(a) * 0.3, 1.8, sin(a) * 0.3], [cos(a) * 1.8, 0, sin(a) * 1.8], 0.22, 0.06, C.trunkD, 5);
  }
  const lay = [[9.8, 6.8, 1.0], [11.8, 5.6, 1.1], [13.6, 3.9, 1.05]];
  for (const [y, r, h] of lay) {
    const rs = [], k = 16;
    for (const [rr, yy] of [[0.25, y + h * 1.1], [0.8, y + h * 0.55], [1, y], [0.82, y - h * 0.55], [0.1, y - h * 0.65]]) {
      const o = [];
      for (let j = 0; j < k; j++) {
        const a = (j / k) * TAU, wob = 1 + 0.12 * sin(a * 5 + y);
        o.push([cos(a) * r * rr * wob, yy, sin(a) * r * rr * wob]);
      }
      rs.push(o);
    }
    b.loft(rs, (ta) => (ta < 0.4 ? C.leaf : ta < 0.7 ? C.leafD : mixC(C.leafD, C.ink, 0.25)));
  }
  [[0.7, 8.2], [2.1, 9], [-1.9, 9.2], [-0.8, 10.8], [1.4, 11]].forEach(([x, y], i) => b.tube([0, y - 1.5, 0], [x * 1.6, y, (i % 2 ? 1 : -1) * 1.1], 0.2, 0.08, C.trunk, 5));
  return b.build();
}
// Conacaste: copa ancha y plana, la sombra de los potreros.
function conacaste() {
  const b = new GeoB();
  b.curve([[0, 0, 0], [0.1, 1.6, 0], [0.05, 3.2, 0]], (t) => lerp(0.42, 0.28, t), C.trunkD, 8);
  [[1.9, 0.5], [-1.7, -0.5], [0.3, 1.9], [-0.4, -1.8]].forEach(([x, z]) => b.tube([0, 2.7, 0], [x, 4, z], 0.17, 0.06, C.trunkD, 5));
  const blobs = [[0, 4.5, 0, 4.6, 1], [2.6, 4.2, 1.2, 2.6, 0.82], [-2.8, 4.3, -0.8, 2.8, 0.86], [0.5, 4.2, -2.8, 2.4, 0.76], [-0.6, 4.25, 2.8, 2.5, 0.78]];
  blobs.forEach(([x, y, z, r, h], i) => b.sph([x, y, z], [r, h, r], (ta) => (ta < 0.42 ? (i % 2 ? C.leafL : C.leaf) : C.leafD), 0, 7, 12));
  return b.build();
}
function tuft() {
  const b = new GeoB();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.4, h = 0.42 + (i % 3) * 0.12;
    b.leaf([[cos(a) * 0.07, 0, sin(a) * 0.07], [cos(a) * 0.17, h * 0.6, sin(a) * 0.17], [cos(a) * 0.34, h, sin(a) * 0.34]], [-sin(a), 0, cos(a)], 0.05, i % 2 ? C.leafL : C.leaf);
  }
  return b.build();
}
function rancho() {
  const b = new GeoB();
  b.box(0, 1.2, 0, 3.2, 1.2, 2.4, hex('#c9a57a'));
  b.box(0, 0.26, 2.41, 3.2, 0.26, 0.01, hex('#7c5a3e'));
  b.box(-0.5, 0.98, 2.42, 0.62, 0.98, 0.02, C.woodD);
  b.box(1.75, 1.3, 2.42, 0.56, 0.44, 0.02, C.glass);
  const rw = 3.9, rz = 3.1, y0 = 2.3, y1 = 4.1;
  const q = [[-rw, y0, -rz], [rw, y0, -rz], [rw, y0, rz], [-rw, y0, rz]].map((p) => b.vert(p, C.straw));
  const a = b.vert([-rw * 0.7, y1, 0], C.hayD), c = b.vert([rw * 0.7, y1, 0], C.hayD), ref = [0, y0 - 0.3, 0];
  b.tri(q[0], q[1], c, ref);
  b.tri(q[0], c, a, ref);
  b.tri(q[3], q[2], c, ref);
  b.tri(q[3], c, a, ref);
  b.tri(q[0], q[3], a, ref);
  b.tri(q[1], q[2], c, ref);
  return b.build();
}
// Loma de tierra: hace de rampa natural en los potreros.
function loma() {
  const b = new GeoB(), w = 1.9, L = 2.64, H = 0.86, N = 8;
  const rows = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, z = lerp(L, -L, t), y = t < 0.98 ? H * t : H;
    rows.push([[-w * 1.2, 0, z], [-w, y, z], [w, y, z], [w * 1.2, 0, z]].map((q, j) => b.vert(q, j === 1 || j === 2 ? (i % 2 ? C.dirt : mixC(C.dirt, C.hay, 0.3)) : C.grassy)));
  }
  const ref = [0, -2, 0];
  for (let i = 0; i < N; i++) for (let j = 0; j < 3; j++) {
    b.tri(rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], ref);
    b.tri(rows[i][j], rows[i + 1][j + 1], rows[i][j + 1], ref);
  }
  const e = rows[N], d = b.vert([0, 0, -L - 0.5], C.dirt);
  for (let j = 0; j < 3; j++) b.tri(e[j], e[j + 1], d, ref);
  return b.build();
}
// Mata de caña: columna verde a rayas verticales con hojas que caen. Ligera porque se dibujan cientos.
function caneBody(b, R, leaves, tall) {
  b.painted = true;
  const seg = 14, prof = [[1.4, 0], [1.8, 0.9], [1.95, 2.2], [1.85, 3.3], [1.35, 4.1], [0.55, 4.7]];
  const rs = prof.map(([r, y], k) => Array.from({length: seg}, (_, j) => {
    const a = (j / seg) * TAU, wob = 1 + 0.07 * sin(a * 5 + y * 3), top = k > 3 ? 0.45 * sin(a * 7 + 1) : 0;
    return [cos(a) * r * wob, (y + top) * tall, sin(a) * r * wob];
  }));
  const hi = C.caneLeaf, mid = mixC(C.caneLeaf, C.ink, 0.2), lo = mixC(C.caneLeaf, C.ink, 0.42), base = mixC(C.caneD, C.ink, 0.5);
  b.loft(rs, (ta, tb) => {
    const light = Math.floor(tb * seg) % 2;
    if (ta < 0.19) return base;
    if (ta < 0.42) return light ? lo : mixC(C.caneD, C.ink, 0.3);
    return ta < 0.7 ? (light ? mid : lo) : light ? hi : mid;
  }, 0, false);
  for (let i = 0; i < leaves; i++) {
    const a = R() * TAU, up = R(), r0 = lerp(1.95, 0.6, up), y0 = lerp(1.7, 4.8, up) * tall, x = cos(a) * r0, z = sin(a) * r0, L = 1 + R() * 1.2;
    b.leaf([[x, y0, z], [x + cos(a) * L * 0.45, y0 + 0.42, z + sin(a) * L * 0.45], [x + cos(a) * L, y0 - 0.7, z + sin(a) * L]], [-sin(a), 0, cos(a)], 0.1, i % 3 ? C.caneLeafL : C.caneLeaf);
  }
}
function cane() {
  const b = new GeoB(), R = seeded(77);
  caneBody(b, R, 40, 1);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + R(), x = cos(a) * 1.9, z = sin(a) * 1.9, h = 1.3 + R() * 1.2;
    b.tube([x, 0, z], [x * 1.05, h, z * 1.05], 0.06, 0.045, R() < 0.5 ? C.cane : C.caneD, 4);
  }
  return b.build();
}
function caneFar() {
  const b = new GeoB(), R = seeded(13);
  caneBody(b, R, 9, 1.05);
  return b.build();
}
function canePile() {
  const b = new GeoB(), R = seeded(9);
  for (let i = 0; i < 16; i++) {
    const y = 0.1 + (i % 4) * 0.13, z = (R() - 0.5) * 0.7;
    b.tube([-1.8 - R() * 0.3, y, z + (R() - 0.5) * 0.2], [1.8 + R() * 0.3, y + 0.03, z + (R() - 0.5) * 0.2], 0.05, 0.05, i % 3 ? C.cane : C.caneD, 4);
  }
  for (let i = 0; i < 8; i++) {
    const x = -1.9 + i * 0.55;
    b.leaf([[x, 0.4, 0], [x + 0.2, 0.75, 0.2], [x + 0.4, 0.45, 0.5]], [1, 0, 0], 0.08, C.caneLeaf);
  }
  return b.build();
}
// Tráiler de caña de la zafra.
function caneTruck() {
  const b = new GeoB();
  b.box(0, 1.4, -3.9, 1.12, 0.92, 0.95, C.red);
  b.box(0, 1.72, -4.86, 0.98, 0.42, 0.02, C.glass);
  b.box(0, 0.86, -5.05, 1.05, 0.26, 0.2, C.metalD);
  [-0.72, 0.72].forEach((x) => b.sph([x, 0.9, -5.26], 0.11, C.oro, 2, 4, 6));
  b.box(0, 2.42, -3.9, 1.0, 0.12, 0.86, hex('#b81e26'));
  b.box(0, 0.86, 1.1, 1.12, 0.14, 3.9, C.metalD);
  [-1.1, 1.1].forEach((x) => [-2.4, -0.8, 0.8, 2.4, 4.4].forEach((z) => b.tube([x, 0.9, z], [x, 3.3, z], 0.04, 0.04, C.metalD, 4)));
  const R = seeded(31);
  for (let i = 0; i < 46; i++) {
    const row = i % 9, lay = floor(i / 9), x = -0.92 + row * 0.23 + (R() - 0.5) * 0.06, y = 1.14 + lay * 0.42 + (R() - 0.5) * 0.08;
    b.tube([x, y, -2.75 + (R() - 0.5) * 0.3], [x, y + 0.03, 4.9 + (R() - 0.5) * 0.4], 0.11, 0.11, i % 3 === 0 ? C.caneD : C.cane, 4);
  }
  [-0.6, 0.6].forEach((x) => b.sph([x, 0.84, 5.02], 0.1, C.red, 2, 4, 6));
  wheels(b, [-1.02, 1.02], [-3.8, 3, 4.1], 0.46);
  return b.build();
}
// Llamas de la quema: se animan estirándolas.
function flame() {
  const b = new GeoB();
  [[0, 0, 1], [-0.9, 0.3, 0.72], [0.85, -0.3, 0.8], [0.25, 0.8, 0.62], [-0.3, -0.75, 0.66]].forEach(([x, z, k]) => {
    const rs = [[0.66 * k, 0], [0.42 * k, 1.5 * k], [0.2 * k, 2.8 * k], [0.02, 4 * k]].map(([r, y], i) => ring([x + (i % 2 ? 0.12 : -0.08), y, z], R0, RZ, r, r, 7));
    b.loft(rs, (ta) => mixC(C.flameB, C.flameA, ta), (ta) => 0.55 + ta * 0.35);
  });
  return b.build();
}
function burnCane() {
  const b = new GeoB();
  b.tube([-0.9, 0.12, 0], [0.9, 0.18, 0], 0.12, 0.1, hex('#3a2a22'), 6);
  b.tube([-0.7, 0.34, 0.1], [0.8, 0.28, -0.1], 0.1, 0.09, hex('#2a1e1a'), 6);
  [-0.6, 0, 0.6].forEach((x) => b.tube([x, 0.2, 0], [x + 0.1, 1.1, 0], 0.24, 0.02, C.flameA, 6, 2.2));
  return b.build();
}
function elote() {
  const b = new GeoB();
  const rs = [[-0.62, 0.05], [-0.5, 0.2], [0, 0.24], [0.42, 0.2], [0.58, 0.05]].map(([y, r]) => ring([0, y, 0], R0, RZ, r, r, 10));
  b.loft(rs, (ta, tb) => (floor(ta * 8 + tb * 10) % 2 ? C.corn : mixC(C.corn, C.oro, 0.5)), 0.28);
  [0, 2.1, 4.2].forEach((a) => b.leaf([[cos(a) * 0.1, -0.68, sin(a) * 0.1], [cos(a) * 0.42, -0.1, sin(a) * 0.42], [cos(a) * 0.32, 0.5, sin(a) * 0.32]], [-sin(a), 0, cos(a)], 0.15, C.husk));
  return b.build();
}
function pinata() {
  const b = new GeoB(), cols = [C.pink, C.oro, C.turq, C.red, C.green, C.purple];
  b.sph([0, 0, 0], 0.42, C.oro, 0.12, 7, 9);
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  dirs.forEach((d, i) => b.tube([d[0] * 0.28, d[1] * 0.28, d[2] * 0.28], [d[0] * 0.92, d[1] * 0.92, d[2] * 0.92], 0.17, 0.012, cols[i], 6));
  b.tube([0, 0.9, 0], [0, 3, 0], 0.012, 0.012, C.ink, 3);
  return b.build();
}
function cohete() {
  const b = new GeoB();
  for (let i = -6; i <= 6; i++) {
    const x = i * 0.27, z = sin(i * 1.2) * 0.2;
    b.tube([x, 0.06, z - 0.12], [x, 0.06, z + 0.12], 0.06, 0.06, i % 2 ? C.red : C.white, 5);
  }
  b.curve(Array.from({length: 7}, (_, i) => [-1.7 + i * 0.57, 0.14, sin(i) * 0.1]), () => 0.012, C.ink, 3);
  return b.build();
}
function stall() {
  const b = new GeoB();
  [[-1.75, -1.05], [1.75, -1.05], [-1.75, 1.05], [1.75, 1.05]].forEach(([x, z]) => b.tube([x, 0, z], [x, 2.55, z], 0.05, 0.05, C.woodD, 5));
  b.box(0, 0.48, 0, 1.72, 0.48, 1.02, C.wood);
  b.box(0, 1.0, 0, 1.76, 0.03, 1.05, C.white);
  const N = 8, v = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = lerp(-2.05, 2.05, t);
    v.push([[x, 2.3, 1.42], [x, 3.08, 0], [x, 2.3, -1.42]]);
  }
  for (let i = 0; i < N; i++) {
    const col = i % 2 ? C.white : C.red;
    [[0, 1], [1, 2]].forEach(([a, c]) => {
      const q = [v[i][a], v[i + 1][a], v[i + 1][c], v[i][c]].map((p) => b.vert(p, col));
      b.tri(q[0], q[1], q[2], [0, 1.2, 0]);
      b.tri(q[0], q[2], q[3], [0, 1.2, 0]);
    });
  }
  const goods = [C.oro, C.pink, C.turq, C.green, C.red, C.purple];
  for (let i = 0; i < 7; i++) b.sph([-1.45 + i * 0.48, 1.16, (i % 2 ? 0.28 : -0.2)], 0.18, goods[i % 6], 0.1, 5, 6);
  return b.build();
}
function crowd() {
  const b = new GeoB(), shirts = [C.red, C.turq, C.oro, C.white, C.pink, C.blue, C.green], skins = [C.skin, mixC(C.skin, C.ink, 0.25)];
  for (let i = 0; i < 5; i++) {
    const z = -2.4 + i * 1.2, x = (i % 2 ? 0.28 : -0.2), h = 0.92 + (i * 7 % 3) * 0.08, s = shirts[(i * 3) % 7];
    b.tube([x, 0, z], [x, 0.8 * h, z], 0.15, 0.17, i % 2 ? C.ink : C.blue, 5);
    b.tube([x, 0.8 * h, z], [x, 1.36 * h, z], 0.21, 0.24, s, 6);
    b.sph([x, 1.58 * h, z], 0.18, skins[i % 2], 0, 5, 6);
    b.tube([x, 1.72 * h, z], [x, 1.84 * h, z], 0.19, 0.13, i % 3 ? mixC(C.ink, C.skin, 0.1) : C.straw, 6);
    if (i % 2 === 0) b.tube([x, 1.3 * h, z + 0.24], [x + 0.08, 1.98 * h, z + 0.3], 0.055, 0.04, skins[i % 2], 4);
  }
  return b.build();
}
// Papel picado: banderines atravesando la calle.
function banner() {
  const b = new GeoB(), n = 20, cols = [C.red, C.oro, C.turq, C.pink, C.green, C.white, C.purple, C.blue];
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([-8.4 + 16.8 * t, 7.1 - 1.15 * (1 - (2 * t - 1) * (2 * t - 1)), 0]);
  }
  b.curve(pts, () => 0.012, C.ink, 3);
  for (let i = 0; i < n; i++) {
    const p = pts[i], c = cols[i % 8];
    b.box(p[0] + 0.42, p[1] - 0.32, 0, 0.32, 0.3, 0.012, c);
  }
  return b.build();
}
function gigante() {
  const b = new GeoB(), R = (y, r) => ring([0, y, 0], R0, RZ, r, r, 12);
  b.loft([R(0, 0.95), R(1.2, 0.82), R(2.5, 0.52), R(3.1, 0.34)], (ta, tb) => (floor(ta * 7) % 2 ? C.white : C.red));
  b.tube([0, 3.08, 0], [0, 3.5, 0], 0.32, 0.36, C.oro, 10);
  [-1, 1].forEach((s) => {
    b.tube([s * 0.34, 3.32, 0], [s * 1.0, 2.6, -0.12], 0.14, 0.11, C.oro, 7);
    b.sph([s * 1.02, 2.5, -0.12], 0.14, C.skin, 0, 5, 6);
  });
  b.tube([0, 3.5, 0], [0, 3.72, 0], 0.12, 0.12, C.skin, 7);
  b.sph([0, 4.18, 0], [0.5, 0.58, 0.5], C.skin, 0, 9, 11);
  b.sph([0, 4.36, 0.08], [0.54, 0.5, 0.5], C.ink, 0, 8, 11);
  [-1, 1].forEach((s) => {
    b.sph([s * 0.19, 4.2, -0.46], [0.09, 0.11, 0.04], C.white, 0, 5, 6);
    b.sph([s * 0.19, 4.2, -0.5], 0.05, C.ink, 0, 4, 5);
    b.sph([s * 0.33, 4.0, -0.34], 0.09, C.pink, 0, 4, 5);
  });
  b.curve([[-0.18, 3.96, -0.48], [0, 3.88, -0.5], [0.18, 3.96, -0.48]], () => 0.022, C.red, 4);
  b.tube([0, 4.82, 0], [0, 5.1, 0], 0.26, 0.36, C.oro, 9, 0.4);
  return b.build();
}
function carousel() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 0.32, 0], 3.1, 3.1, C.purple, 20);
  b.tube([0, 0.32, 0], [0, 4, 0], 0.3, 0.3, C.oro, 10);
  const rs = [[3.5, 3.9], [3.5, 4.1], [1.5, 5], [0.08, 5.8]].map(([r, y]) => ring([0, y, 0], R0, RZ, r, r, 20));
  b.loft(rs, (ta, tb) => (floor(tb * 10) % 2 ? C.red : C.white));
  b.sph([0, 5.95, 0], 0.22, C.oro, 1.5, 5, 7);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU, x = cos(a) * 2.3, z = sin(a) * 2.3, col = [C.white, C.pink, C.turq, C.oro, C.blue, C.red][i], y = 1.1 + (i % 2) * 0.45;
    b.tube([x, 0.32, z], [x, 3.9, z], 0.035, 0.035, C.oro, 4);
    b.tube([x - sin(a) * 0.5, y, z + cos(a) * 0.5], [x + sin(a) * 0.5, y + 0.1, z - cos(a) * 0.5], 0.17, 0.17, col, 6);
    b.tube([x + sin(a) * 0.46, y + 0.1, z - cos(a) * 0.46], [x + sin(a) * 0.68, y + 0.55, z - cos(a) * 0.68], 0.1, 0.08, col, 5);
  }
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU;
    b.sph([cos(a) * 3.5, 3.86, sin(a) * 3.5], 0.08, i % 2 ? C.oro : C.pink, 2.6, 3, 4);
  }
  return b.build();
}
// Sillas voladoras: torre, toldo a rayas y sillas colgando hacia afuera, como si ya giraran.
function sillas() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 0.3, 0], 2.4, 2.4, C.blue, 18);
  b.tube([0, 0.3, 0], [0, 8.2, 0], 0.32, 0.24, C.metal, 10);
  const rs = [[0.2, 9.4], [3.3, 8.2], [3.4, 7.9], [3.2, 7.7]].map(([r, y]) => ring([0, y, 0], R0, RZ, r, r, 24));
  b.loft(rs, (ta, tb) => (floor(tb * 12) % 2 ? C.oro : C.purple));
  b.sph([0, 9.55, 0], 0.26, C.red, 1.6, 5, 7);
  const cols = [C.red, C.turq, C.oro, C.pink, C.green, C.white];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU, top = [cos(a) * 3.1, 7.75, sin(a) * 3.1], seat = [cos(a) * 4.9, 3.5, sin(a) * 4.9];
    b.tube(top, seat, 0.02, 0.02, C.metal, 3);
    b.tube([seat[0] - sin(a) * 0.05, seat[1], seat[2] + cos(a) * 0.05], [seat[0] + cos(a) * 0.06, seat[1] - 0.05, seat[2] + sin(a) * 0.06], 0.26, 0.24, cols[i % 6], 6);
    b.sph([cos(a) * 3.3, 7.72, sin(a) * 3.3], 0.09, i % 2 ? C.oro : C.pink, 2.8, 3, 4);
  }
  return b.build();
}
// El pulpo: brazos que suben y bajan, con un carrito en cada punta.
function pulpo() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 0.45, 0], 2.2, 2.4, C.purple, 16);
  b.tube([0, 0.45, 0], [0, 2.9, 0], 0.55, 0.42, C.oro, 10);
  b.sph([0, 3.1, 0], [0.9, 0.6, 0.9], C.red, 0.4, 7, 10);
  [-1, 1].forEach((s) => b.sph([s * 0.36, 3.3, -0.74], 0.16, C.white, 0, 4, 5));
  const cols = [C.turq, C.pink, C.oro, C.green, C.blue];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU, up = i % 2 ? 1.1 : -0.4, d = [cos(a), sin(a)];
    const pts = [[d[0] * 0.5, 3, d[1] * 0.5], [d[0] * 2.4, 3.9 + up * 0.5, d[1] * 2.4], [d[0] * 4.4, 3.2 + up, d[1] * 4.4], [d[0] * 5.2, 2.3 + up, d[1] * 5.2]];
    b.curve(pts, (t) => lerp(0.24, 0.12, t), C.red, 7);
    const c = [d[0] * 5.3, 1.6 + up, d[1] * 5.3];
    b.tube([c[0], c[1] - 0.5, c[2]], [c[0], c[1] + 0.3, c[2]], 0.55, 0.75, cols[i], 10);
    b.sph([c[0], c[1] + 0.4, c[2]], 0.12, C.oro, 2.4, 3, 4);
  }
  return b.build();
}
// La camioneta roja: el siguiente vehículo.
function busRed() {
  const b = new GeoB(), red = C.red, cream = C.white, stripe = C.oro, turq = C.turq;
  b.box(0, 1.92, 0.3, 1.24, 1.04, 4.75, red);
  b.box(0, 1.22, 0.3, 1.25, 0.1, 4.76, stripe);
  b.box(0, 2.72, 0.3, 1.2, 0.06, 4.72, cream);
  b.box(0, 3.04, 0.3, 1.12, 0.1, 4.7, turq);
  // Trompa de bus escolar
  b.box(0, 1.28, -5.15, 1.08, 0.5, 0.8, red);
  b.box(0, 1.08, -5.96, 1.1, 0.16, 0.06, C.metal);
  [-0.74, 0.74].forEach((x) => b.sph([x, 1.34, -5.96], 0.16, C.oro, 2.2, 5, 7));
  b.box(0, 2.1, -4.45, 1.08, 0.56, 0.02, C.glass);
  for (let i = 0; i < 8; i++) {
    const z = -3.6 + i * 1.05;
    [-1, 1].forEach((s) => b.box(s * 1.25, 2.2, z, 0.012, 0.36, 0.44, C.glass));
  }
  b.box(0, 2.25, 5.06, 1.02, 0.5, 0.02, C.glass);
  // Parrilla con canastos y bultos
  [-1, 1].forEach((s) => b.box(s * 1.14, 3.28, 0.3, 0.025, 0.14, 4.6, C.metalD));
  [[-0.5, -2.4, C.oro], [0.45, -1.2, C.turq], [-0.2, 0.4, C.pink], [0.5, 1.8, C.straw], [-0.45, 3, C.blue]].forEach(([x, z, c]) => b.box(x, 3.46, z, 0.42, 0.32, 0.5, c));
  [-0.7, 0.7].forEach((x) => b.sph([x, 1.34, 5.06], 0.12, C.red, 2.2, 4, 6));
  wheels(b, [-1.14, 1.14], [-3.9, 3.3], 0.52);
  return b.build();
}
export const FARM_SPEC = {
  cow: [cow, 40, [0.5, 1.1]], cowB: [cowB, 40, [0.5, 1.1]], wire: [wire, 150, null, true], xfence: [xfence, 50, null], gatefarm: [gateFarm, 10, null], trough: [trough, 16, [1.1, 0.45]], bale: [bale, 24, [0.95, 0.65]],
  mud: [mud, 20, null, true], cans: [cans, 16, [0.5, 0.5]], pickup: [pickup, 10, [0.9, 2]], ceiba: [ceiba, 14, [4.6, 4.6]], conacaste: [conacaste, 30, [4, 4]], tuft: [tuft, 170, null, true], rancho: [rancho, 12, [3, 2.4]],
  loma: [loma, 14, null], cane: [cane, 170, null, true], canefar: [caneFar, 170, null, true], canepile: [canePile, 24, [1.7, 0.5]], canetruck: [caneTruck, 10, [1.2, 5]], flame: [flame, 90, null, true], burncane: [burnCane, 20, [0.8, 0.4]],
  elote: [elote, 12, [0.3, 0.3]], pinata: [pinata, 14, null], cohete: [cohete, 16, null, true], stall: [stall, 60, [1.9, 1.2]], crowd: [crowd, 70, null], banner: [banner, 26, null, true], gigante: [gigante, 8, [0.9, 0.9]], carousel: [carousel, 4, [3.2, 3.2]], sillas: [sillas, 4, [3, 3]], pulpo: [pulpo, 4, [3.6, 3.6]], busred: [busRed, 4, [1.3, 5]],
};
// ── Rueda de Chicago: una sola se reubica a lo largo del nivel ──
const WHEEL = {root: null, wheel: null, cars: []};
export function buildWheel() {
  const uni = Object.assign(celUni(), {uFlash: {value: 0}});
  const mat = new T.ShaderMaterial({vertexShader: VS_CEL, fragmentShader: FS_CEL, uniforms: uni});
  const hullMat = new T.ShaderMaterial({vertexShader: VS_HULL, fragmentShader: FS_HULL, uniforms: uni, side: T.BackSide});
  const mesh = (parent, g, hull = true) => {
    const m = new T.Mesh(g, mat);
    m.frustumCulled = false;
    parent.add(m);
    if (hull) {
      const h = new T.Mesh(g, hullMat);
      h.frustumCulled = false;
      parent.add(h);
    }
    return m;
  };
  const root = new T.Group();
  root.visible = false;
  root.rotation.y = PI / 2 - 0.5;
  scene.add(root);
  WHEEL.root = root;
  const RAD = 8.4, AX = 9.6;
  const st = new GeoB();
  [-1, 1].forEach((s) => {
    st.tube([s * 0.95, AX, 0], [s * 2.2, 0, 4.4], 0.13, 0.17, C.metal, 6);
    st.tube([s * 0.95, AX, 0], [s * 2.2, 0, -4.4], 0.13, 0.17, C.metal, 6);
  });
  st.tube([-1.05, AX, 0], [1.05, AX, 0], 0.2, 0.2, C.oro, 8);
  st.box(0, 0.16, 0, 2.7, 0.16, 5.1, C.purple);
  mesh(root, st.build());
  const wheel = new T.Group();
  wheel.position.set(0, AX, 0);
  root.add(wheel);
  WHEEL.wheel = wheel;
  const w = new GeoB(), NS = 12;
  [-0.82, 0.82].forEach((x) => {
    w.hoopAt(x, RAD, 0.075, C.red, 64, 6);
    w.hoopAt(x, RAD * 0.62, 0.05, C.oro, 48, 5);
    for (let i = 0; i < NS; i++) {
      const a = (i / NS) * TAU, y = cos(a) * RAD, z = sin(a) * RAD;
      w.tube([x, 0, 0], [x, y, z], 0.045, 0.035, C.white, 4);
      w.sph([x, y, z], 0.13, i % 2 ? C.oro : C.pink, 3, 3, 5);
      for (let k = 1; k < 4; k++) w.sph([x, y * (k / 4), z * (k / 4)], 0.075, [C.turq, C.oro, C.pink][k - 1], 2.6, 3, 4);
    }
  });
  for (let i = 0; i < NS; i++) {
    const a = (i / NS) * TAU;
    w.tube([-0.82, cos(a) * RAD, sin(a) * RAD], [0.82, cos(a) * RAD, sin(a) * RAD], 0.04, 0.04, C.metal, 4);
  }
  mesh(wheel, w.build());
  const car = new GeoB();
  car.box(0, -0.72, 0, 0.62, 0.3, 0.58, C.turq);
  car.tube([0, -0.42, 0], [0, 0, 0], 0.03, 0.03, C.metal, 4);
  car.box(0, -0.3, 0, 0.64, 0.05, 0.6, C.white);
  const carG = car.build();
  for (let i = 0; i < NS; i++) {
    const g = new T.Group(), a = (i / NS) * TAU;
    g.position.set(0, cos(a) * RAD, sin(a) * RAD);
    wheel.add(g);
    mesh(g, carG, false);
    WHEEL.cars.push(g);
  }
}
const VIEW_FAR = 330;
export function syncWheel(level, dist, time) {
  const list = level.wheels;
  if (!WHEEL.root) return;
  if (!list || !list.length) {
    WHEEL.root.visible = false;
    return;
  }
  let best = null;
  for (const w of list) if (w.D > dist - 20 && w.D < dist + VIEW_FAR && (!best || w.D < best.D)) best = w;
  WHEEL.root.visible = !!best;
  if (!best) return;
  WHEEL.root.position.set(best.x, 0, -(best.D - dist));
  const a = time * 0.28;
  WHEEL.wheel.rotation.x = a;
  for (const g of WHEEL.cars) g.rotation.x = -a;
}
