// Objetos del mundo: modelos hechos con código y dibujados por instancias.
import * as T from 'three';
import {GeoB, hex, mixC} from '../core/geo.js';
import {scene, celUni, U, camera, CAM_Z} from '../core/gfx.js';
import {VS_CEL, FS_CEL, VS_HULL, FS_HULL, VS_SHADOW, FS_SHADOW, VS_SIGN, FS_SIGN} from '../core/shaders.js';
import {PI, TAU, cos, sin, floor, min, max, seeded, lerp, MOBILE} from '../core/util.js';
import {FARM_SPEC, buildWheel, syncWheel} from './props-farm.js';
import {CITY_SPEC} from './props-city.js';

const C = {
  trunk: hex('#6d4a33'), trunkD: hex('#3f2a22'), leaf: hex('#2f8f4e'), leafD: hex('#1e6b45'), coco: hex('#5c3f22'), cocoG: hex('#6fae3a'),
  wood: hex('#a8743f'), woodD: hex('#6e4726'), rock: hex('#2e2733'), sand: hex('#cdb07a'), red: hex('#e3262f'), oro: hex('#ffc91f'), turq: hex('#12b5b0'),
  white: hex('#fff3d6'), black: hex('#1a1416'), blue: hex('#1b62c9'), pink: hex('#ff5d7d'), green: hex('#2bae56'), crab: hex('#e8452c'), shell: hex('#2d6b52'),
  skin: hex('#b9784f'), gray: hex('#a7a3ad'), straw: hex('#c8a35a'), wall: hex('#fff7ea'), roof: hex('#8d6a58'), tin: hex('#8a97a3'),
  mang: hex('#1f5f4a'), mangD: hex('#163f3a'), root: hex('#4a3a3a'), caiman: hex('#47603a'), tort: hex('#f3c766'),
};

function palm() {
  const b = new GeoB(), pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push([-1.2 * t * t, 8.4 * t, 0]);
  }
  b.curve(pts, (t) => lerp(0.28, 0.15, t), (ta) => (floor(ta * 12) % 2 ? C.trunk : C.trunkD), 7);
  const top = pts[8];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.2, L = 3.6, f = [];
    for (let k = 0; k <= 7; k++) {
      const t = k / 7;
      f.push([top[0] + cos(a) * L * t, top[1] + 1.1 * t - 3.3 * t * t, top[2] + sin(a) * L * t]);
    }
    b.blade(f, [-sin(a), 0, cos(a)], 0.42, (ta) => mixC(C.leaf, C.leafD, ta), 0.03);
  }
  for (let i = 0; i < 3; i++) b.sph([top[0] + cos(i * 2.1) * 0.25, top[1] - 0.22, top[2] + sin(i * 2.1) * 0.25], 0.2, C.coco, 0, 5, 6);
  return b.build();
}
function umbrella() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 2.5, 0], 0.05, 0.04, C.white, 6);
  const rings = [];
  for (const [r, y] of [[0.02, 2.72], [0.75, 2.5], [1.35, 2.14], [1.46, 2.02]]) {
    const o = [];
    for (let i = 0; i < 24; i++) o.push([cos((i / 24) * TAU) * r, y, sin((i / 24) * TAU) * r]);
    rings.push(o);
  }
  b.loft(rings, (ta, tb) => (floor(tb * 8) % 2 ? C.oro : C.red));
  return b.build();
}
function lancha() {
  const b = new GeoB(), rings = [];
  const K = [[-3.7, 0.02, 0.5, 0.95], [-3.1, 0.4, 0.34, 0.86], [-2, 0.74, 0.2, 0.76], [0, 0.92, 0.12, 0.72], [2, 0.9, 0.12, 0.72], [3.3, 0.76, 0.18, 0.72]];
  for (const [z, w, y0, y1] of K) {
    const o = [];
    for (let i = 0; i < 12; i++) {
      const q = (i / 12) * TAU;
      o.push([cos(q) * w, (y0 + y1) / 2 + sin(q) * (y1 - y0) * 0.5, z]);
    }
    rings.push(o);
  }
  b.loft(rings, (ta, tb, q) => (q[1] > 0.56 ? C.white : q[1] > 0.42 ? C.red : C.turq));
  b.box(0, 0.74, -0.7, 0.72, 0.04, 0.16, C.woodD);
  b.box(0, 0.74, 1, 0.72, 0.04, 0.16, C.woodD);
  b.box(0, 0.98, 3.4, 0.16, 0.34, 0.16, C.black);
  b.tube([0, 0.8, 3.45], [0, 0.1, 3.5], 0.05, 0.05, C.gray, 6);
  return b.build();
}
function logp() {
  const b = new GeoB(), pts = [];
  for (let i = 0; i <= 6; i++) pts.push([-1 + i / 3, 0.38 + 0.05 * sin(i * 1.8), 0.08 * sin(i * 2.4)]);
  b.curve(pts, (t) => 0.34 + 0.05 * sin(t * 9), (ta) => (floor(ta * 8) % 2 ? C.wood : C.woodD), 8);
  b.tube([0.4, 0.5, 0], [0.62, 1, 0.08], 0.1, 0.03, C.woodD, 5);
  return b.build();
}
function castle() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 0.34, 0], 0.72, 0.6, C.sand, 10);
  b.tube([0, 0.34, 0], [0, 0.62, 0], 0.36, 0.3, C.sand, 8);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.6;
    b.tube([cos(a) * 0.55, 0.1, sin(a) * 0.55], [cos(a) * 0.55, 0.56, sin(a) * 0.55], 0.15, 0.11, C.sand, 7);
  }
  b.tube([0, 0.62, 0], [0, 1, 0], 0.012, 0.012, C.black, 4);
  b.box(0.08, 0.92, 0, 0.08, 0.05, 0.01, C.red);
  return b.build();
}
function crab() {
  const b = new GeoB();
  b.sph([0, 0.2, 0], [0.34, 0.15, 0.26], C.crab, 0, 6, 8);
  [-1, 1].forEach((s) => {
    for (let i = 0; i < 3; i++) b.tube([s * 0.25, 0.18, -0.12 + i * 0.12], [s * 0.54, 0.02, -0.16 + i * 0.16], 0.03, 0.015, C.crab, 4);
    b.tube([s * 0.28, 0.24, -0.16], [s * 0.42, 0.3, -0.34], 0.04, 0.04, C.crab, 4);
    b.sph([s * 0.45, 0.32, -0.42], [0.13, 0.09, 0.15], C.crab, 0, 5, 6);
    b.sph([s * 0.09, 0.38, -0.16], 0.05, C.white, 0, 4, 5);
  });
  return b.build();
}
function turtle() {
  const b = new GeoB();
  b.sph([0, 0.09, 0], [0.16, 0.08, 0.2], C.shell, 0, 5, 7);
  b.sph([0, 0.09, -0.24], [0.06, 0.05, 0.08], hex('#7fb78a'), 0, 4, 6);
  [-1, 1].forEach((s) => {
    b.tube([s * 0.13, 0.07, -0.1], [s * 0.3, 0.02, -0.02], 0.04, 0.012, hex('#7fb78a'), 4);
    b.tube([s * 0.11, 0.07, 0.15], [s * 0.2, 0.02, 0.24], 0.03, 0.012, hex('#7fb78a'), 4);
  });
  return b.build();
}
function rock() {
  const b = new GeoB();
  b.sph([0, 0.35, 0], [0.9, 0.62, 0.78], (a, c) => (floor(a * 5 + c * 7) % 2 ? C.rock : mixC(C.rock, C.white, 0.08)), 0, 5, 7);
  return b.build();
}
function ramp() {
  const b = new GeoB();
  const w = 1.6, L = 2.2, H = 0.85;
  // rampa a franjas: un tablón por franja
  const N = 6;
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N;
    const z0 = lerp(L, -L, t0), z1 = lerp(L, -L, t1), y0 = H * t0, y1 = H * t1;
    const c = i % 2 ? C.oro : C.black;
    const a = [[-w, y0, z0], [w, y0, z0], [w, y1, z1], [-w, y1, z1]].map((q) => b.vert(q, c));
    const ref = [0, -1, 0];
    b.tri(a[0], a[1], a[2], ref);
    b.tri(a[0], a[2], a[3], ref);
  }
  b.box(0, H / 2, -L + 0.06, w, H / 2, 0.06, C.woodD);
  [-1, 1].forEach((s) => b.box(s * (w - 0.04), H * 0.3, -L * 0.45, 0.05, H * 0.3, L * 0.5, C.woodD));
  return b.build();
}
function person() {
  const b = new GeoB();
  b.tube([-0.11, 0, 0], [-0.1, 0.72, 0], 0.09, 0.1, C.black, 6);
  b.tube([0.11, 0, 0], [0.1, 0.72, 0], 0.09, 0.1, C.black, 6);
  b.tube([0, 0.72, 0], [0, 1.32, 0], 0.2, 0.23, C.white, 8);
  b.sph([0, 1.54, 0], 0.17, C.skin, 0, 6, 8);
  b.tube([-0.25, 1.28, 0], [-0.34, 0.8, 0], 0.06, 0.05, C.skin, 5);
  b.tube([0.25, 1.28, 0], [0.42, 1.8, 0], 0.06, 0.05, C.skin, 5);
  b.tube([0, 1.68, 0], [0, 1.76, 0], 0.27, 0.13, C.straw, 10);
  return b.build();
}
function coin() {
  const b = new GeoB();
  b.tube([0, 0, -0.05], [0, 0, 0.05], 0.42, 0.42, C.oro, 16, 0.32);
  b.curve(Array.from({length: 13}, (_, i) => [cos((i / 12) * TAU) * 0.2, sin((i / 12) * TAU) * 0.2, 0.07]), () => 0.05, hex('#b4560f'), 5);
  b.tube([0.09, -0.09, 0.07], [0.27, -0.27, 0.07], 0.05, 0.05, hex('#b4560f'), 5);
  return b.build();
}
function greenCoco() {
  const b = new GeoB();
  b.sph([0, 0, 0], [0.38, 0.42, 0.38], C.cocoG, 0.14, 7, 9);
  b.tube([0.05, 0.3, 0], [0.18, 0.74, 0], 0.03, 0.03, C.pink, 5);
  return b.build();
}
function tape() {
  const b = new GeoB();
  const pts = Array.from({length: 17}, (_, i) => [cos((i / 16) * TAU) * 0.3, sin((i / 16) * TAU) * 0.3, 0]);
  b.curve(pts, () => 0.12, C.gray, 7, 0.1);
  return b.build();
}
function tortilla() {
  const b = new GeoB();
  b.tube([0, 0, -0.04], [0, 0, 0.04], 0.5, 0.5, C.tort, 18, 0.16);
  [[0.15, 0.1], [-0.2, 0.05], [0.02, -0.22], [-0.1, 0.25], [0.26, -0.12]].forEach(([x, y]) => b.tube([x, y, 0.045], [x, y, 0.05], 0.07, 0.07, hex('#9d5f22'), 6));
  return b.build();
}
function fallCoco() {
  const b = new GeoB();
  b.sph([0, 0.32, 0], 0.32, C.coco, 0, 6, 8);
  return b.build();
}
function fence() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 1.2, 0], 0.08, 0.06, C.woodD, 5);
  b.box(0, 0.86, 0, 0.05, 0.06, 1.7, C.wood);
  b.box(0, 0.42, 0, 0.05, 0.06, 1.7, C.wood);
  return b.build();
}
function gatePosts() {
  const b = new GeoB();
  [-1, 1].forEach((s) => {
    b.tube([s * 6, 0, 0], [s * 6, 6.2, 0], 0.26, 0.2, C.woodD, 7);
    b.tube([s * 6, 6.2, 0], [s * 6, 6.6, 0], 0.32, 0.08, C.leaf, 7);
  });
  b.box(0, 5.45, -0.04, 6.1, 0.72, 0.1, C.black);
  return b.build();
}
function crate() {
  const b = new GeoB();
  b.box(0, 0.5, 0, 0.62, 0.5, 0.55, C.wood);
  b.box(0, 0.5, 0.57, 0.64, 0.06, 0.02, C.woodD);
  b.box(0.2, 1.3, 0.05, 0.36, 0.3, 0.32, C.woodD);
  return b.build();
}
function net() {
  const b = new GeoB();
  b.sph([0, 0.15, 0], [1, 0.26, 0.72], (a, c) => (floor(c * 16) % 2 ? hex('#3c8e8f') : hex('#d5c79a')), 0, 5, 16);
  b.sph([0.5, 0.3, 0.1], 0.12, C.oro, 0, 4, 6);
  return b.build();
}
function caiman() {
  const b = new GeoB(), pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push([-2.3 + 4.6 * t, 0.16 + 0.05 * sin(t * 20), 0.25 * sin(t * 5)]);
  }
  b.curve(pts, (t) => (t < 0.5 ? lerp(0.06, 0.34, t * 2) : lerp(0.34, 0.14, (t - 0.5) * 2)), (ta) => (floor(ta * 12) % 2 ? C.caiman : mixC(C.caiman, C.black, 0.4)), 7);
  [1.25, 1.55].forEach((x, i) => b.sph([x + 0.2, 0.34, pts[11][2] + (i ? 0.12 : -0.12)], 0.06, C.oro, 2, 4, 5));
  [[-0.4, 1], [0.8, 1], [-0.4, -1], [0.8, -1]].forEach(([x, s]) => b.tube([x, 0.1, s * 0.2], [x - 0.12, 0.02, s * 0.5], 0.08, 0.05, C.caiman, 5));
  return b.build();
}
function heron() {
  const b = new GeoB();
  b.sph([0, 0, 0], [0.22, 0.2, 0.55], C.white, 0.05, 6, 8);
  b.curve([[0, 0.08, -0.4], [0, 0.3, -0.6], [0, 0.18, -0.8], [0, 0.3, -1]], (t) => lerp(0.08, 0.05, t), C.white, 5);
  b.tube([0, 0.3, -1], [0, 0.26, -1.34], 0.05, 0.01, C.oro, 5);
  [-1, 1].forEach((s) => b.blade([[s * 0.18, 0.08, 0], [s * 0.8, 0.28, 0.04], [s * 1.5, 0.18, 0.14]], [0, 0, 1], 0.36, C.white, 0.02));
  b.tube([0, 0, 0.5], [0, -0.06, 1.2], 0.03, 0.02, C.black, 4);
  return b.build();
}
function mangrove() {
  const b = new GeoB();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU, R = 1.9;
    const pts = [];
    for (let k = 0; k <= 4; k++) {
      const t = k / 4;
      pts.push([cos(a) * R * (1 - t * 0.85), 1.9 * sin((t * PI) / 2) * (1 + 0.1 * sin(i)), sin(a) * R * (1 - t * 0.85)]);
    }
    b.curve(pts, () => 0.09, C.root, 5);
  }
  b.tube([0, 1.6, 0], [0.1, 4.4, 0], 0.2, 0.14, C.root, 6);
  [[0, 5, 0, 2.7, 1.7], [1.5, 4.5, 0.5, 1.8, 1.25], [-1.5, 4.6, -0.4, 1.9, 1.3], [0.2, 4.4, 1.5, 1.7, 1.1], [0.1, 6, -0.4, 1.8, 1.2]].forEach(([x, y, z, r, h], i) =>
    b.sph([x, y, z], [r, h, r], (a) => mixC(i % 2 ? C.mang : C.mangD, hex('#3b8f5c'), a < 0.4 ? 0.5 : 0), 0, 6, 9),
  );
  return b.build();
}
function reed() {
  const b = new GeoB();
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, r = 0.34;
    b.blade([[cos(a) * r, 0, sin(a) * r], [cos(a) * r * 1.5, 0.9, sin(a) * r * 1.5], [cos(a) * r * 2.8, 1.5 + (i % 3) * 0.2, sin(a) * r * 2.8]], [-sin(a), 0, cos(a)], 0.09, (t) => mixC(C.green, C.oro, t * 0.4), 0.01);
  }
  return b.build();
}
function lantern() {
  const b = new GeoB();
  b.tube([0, -1, 0], [0, 2.2, 0], 0.08, 0.06, C.woodD, 6);
  b.tube([0, 2.2, 0], [0.5, 2.5, 0], 0.03, 0.03, C.black, 4);
  b.sph([0.5, 2.28, 0], 0.15, C.oro, 3.6, 5, 6);
  return b.build();
}
function house(alt) {
  const b = new GeoB();
  const hx = 5.4, hz = 4.6, h = alt ? 3.6 : 3;
  b.box(0, h / 2, 0, hx, h / 2, hz, C.wall);
  // techo de lámina a dos aguas
  const rw = hx + 0.7, rz = hz + 0.7, r = h + 1.3;
  const ring = [[-rw, h, -rz], [rw, h, -rz], [rw, h, rz], [-rw, h, rz]].map((q) => b.vert(q, alt ? C.tin : C.roof));
  const r0 = b.vert([-rw, r, 0], alt ? C.tin : C.roof), r1 = b.vert([rw, r, 0], alt ? C.tin : C.roof);
  const ref = [0, h + 0.2, 0];
  b.tri(ring[0], ring[1], r1, ref);
  b.tri(ring[0], r1, r0, ref);
  b.tri(ring[3], ring[2], r1, ref);
  b.tri(ring[3], r1, r0, ref);
  b.tri(ring[0], ring[3], r0, ref);
  b.tri(ring[1], ring[2], r1, ref);
  // Zócalo pintado, puerta, ventanas con balcón y corredor con horcones
  const zo = alt ? mixC(C.blue, C.white, 0.2) : mixC(C.red, C.woodD, 0.35), lit = hex('#ffcf73');
  b.box(0, 0.4, hz + 0.015, hx + 0.01, 0.4, 0.03, zo);
  b.box(0, 1.08, hz + 0.03, 0.85, 1.08, 0.05, C.woodD);
  b.box(0, 1.08, hz + 0.05, 0.72, 0.96, 0.03, alt ? hex('#227a7a') : hex('#8a3a2c'));
  [-1, 1].forEach((s) => {
    const wx = s * 3.15;
    b.box(wx, 1.72, hz + 0.03, 0.94, 0.74, 0.05, zo);
    b.box(wx, 1.72, hz + 0.05, 0.8, 0.62, 0.04, lit, 1.5);
    b.box(wx, 1.72, hz + 0.09, 0.04, 0.62, 0.02, C.black);
    b.box(wx - 0.4, 1.72, hz + 0.09, 0.03, 0.62, 0.02, C.black);
    b.box(wx + 0.4, 1.72, hz + 0.09, 0.03, 0.62, 0.02, C.black);
    b.box(wx, 1.72, hz + 0.09, 0.8, 0.03, 0.02, C.black);
    b.box(s * hx + s * 0.02, 1.65, 0, 0.04, 0.62, 0.9, lit, 1.5);
    b.box(s * (hx - 0.15), h / 2, hz + 1.9, 0.09, h / 2, 0.09, C.woodD);
  });
  // Techo del corredor
  const ax = hx - 0.05, az0 = hz, az1 = hz + 2.2, ay0 = h + 0.02, ay1 = h - 0.38;
  const col = alt ? C.tin : mixC(C.roof, C.red, 0.3);
  const v = [[-ax, ay0, az0], [ax, ay0, az0], [ax, ay1, az1], [-ax, ay1, az1]].map((q) => b.vert(q, col));
  b.tri(v[0], v[1], v[2], [0, 0, hz + 1]);
  b.tri(v[0], v[2], v[3], [0, 0, hz + 1]);
  b.sph([0, h - 0.55, hz + 1.2], 0.11, hex('#ffe9a8'), 3, 4, 6);
  return b.build();
}
function lamp() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 5.6, 0], 0.1, 0.07, C.tin, 6);
  b.tube([0, 5.6, 0], [1.6, 5.9, 0], 0.05, 0.05, C.tin, 5);
  b.sph([1.7, 5.78, 0], [0.28, 0.13, 0.2], hex('#ffd691'), 4.2, 5, 7);
  return b.build();
}
function stringLights() {
  const b = new GeoB(), n = 14, pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([-8 + 16 * t, 5.6 - 1.4 * (1 - (2 * t - 1) * (2 * t - 1)), 0]);
  }
  b.curve(pts, () => 0.018, C.black, 4);
  const cols = [C.red, C.oro, C.turq, C.pink, C.green];
  pts.forEach((q, i) => {
    if (i % 1 === 0) b.sph([q[0], q[1] - 0.12, q[2]], 0.11, cols[i % 5], 2.8, 4, 5);
  });
  return b.build();
}
function tuktuk() {
  const b = new GeoB();
  b.box(0, 0.74, 0.3, 0.76, 0.44, 0.92, C.red);
  b.box(0, 0.62, -0.92, 0.42, 0.34, 0.42, C.red);
  b.box(0, 1.84, 0.1, 0.82, 0.08, 1.24, C.black);
  b.tube([-0.74, 1.1, -0.6], [-0.74, 1.84, -0.6], 0.03, 0.03, C.black, 4);
  b.tube([0.74, 1.1, -0.6], [0.74, 1.84, -0.6], 0.03, 0.03, C.black, 4);
  b.tube([-0.74, 1.1, 1.18], [-0.74, 1.84, 1.18], 0.03, 0.03, C.black, 4);
  b.tube([0.74, 1.1, 1.18], [0.74, 1.84, 1.18], 0.03, 0.03, C.black, 4);
  b.box(0, 1.05, 1.22, 0.74, 0.3, 0.02, C.oro);
  [[-0.76, 0.86], [0.76, 0.86], [0, -1.28]].forEach(([x, z]) => b.tube([x - 0.08, 0.26, z], [x + 0.08, 0.26, z], 0.26, 0.26, C.black, 10));
  b.sph([-0.5, 0.64, 1.26], 0.09, C.red, 2, 4, 5);
  b.sph([0.5, 0.64, 1.26], 0.09, C.red, 2, 4, 5);
  return b.build();
}
function moto() {
  const b = new GeoB();
  b.tube([0, 0.3, -0.72], [0, 0.32, -0.7], 0.3, 0.3, C.black, 10);
  [-0.72, 0.72].forEach((z) => b.tube([-0.06, 0.3, z], [0.06, 0.3, z], 0.3, 0.3, C.black, 10));
  b.box(0, 0.68, 0, 0.17, 0.2, 0.62, C.blue);
  b.tube([0, 0.86, 0.08], [0, 1.5, -0.06], 0.2, 0.24, C.oro, 8);
  b.sph([0, 1.72, -0.1], 0.19, C.red, 0, 6, 8);
  b.sph([0, 0.84, -0.86], 0.12, hex('#fff2bd'), 5, 5, 6);
  return b.build();
}
function cart() {
  const b = new GeoB();
  b.box(0, 0.9, 0, 1.1, 0.46, 0.68, C.turq);
  b.box(0, 1.38, 0, 1.16, 0.04, 0.74, C.white);
  [-1, 1].forEach((s) => b.tube([s * 1.1, 0.36, 0.72], [s * 1.1, 0.36, 0.5], 0.36, 0.36, C.black, 10));
  b.tube([0, 1.38, 0], [0, 2.5, 0], 0.04, 0.04, C.white, 4);
  const rings = [];
  for (const [r, y] of [[0.02, 2.82], [1.4, 2.4], [1.56, 2.28]]) {
    const o = [];
    for (let i = 0; i < 16; i++) o.push([cos((i / 16) * TAU) * r, y, sin((i / 16) * TAU) * r]);
    rings.push(o);
  }
  b.loft(rings, (a, tb) => (floor(tb * 8) % 2 ? C.red : C.white));
  b.sph([-0.5, 1.5, 0], [0.26, 0.1, 0.1], hex('#d9894b'), 0.35, 4, 6);
  b.sph([0.45, 1.5, 0.1], [0.26, 0.1, 0.1], hex('#d9894b'), 0.35, 4, 6);
  return b.build();
}
// Pintado (sin filo de luz): desde la cámara baja se ve como hoyo oscuro, no como charco brillante.
function pothole() {
  const b = new GeoB();
  b.flat = -1;
  b.tube([0, 0.012, 0], [0, 0.03, 0], 1, 0.82, hex('#14100e'), 12);
  return b.build();
}
function tumulo() {
  const b = new GeoB();
  const rings = [];
  for (let i = 0; i <= 8; i++) {
    const x = -1 + i / 4, o = [];
    for (let k = 0; k <= 6; k++) {
      const t = (k / 6) * PI;
      o.push([x, sin(t) * 0.28, -cos(t) * 0.8]);
    }
    rings.push(o);
  }
  b.loft(rings, (ta) => (floor(ta * 8) % 2 ? C.oro : C.black));
  return b.build();
}
function chicken() {
  const b = new GeoB();
  b.sph([0, 0.32, 0], [0.18, 0.2, 0.24], C.white, 0, 5, 7);
  b.sph([0, 0.56, -0.18], 0.1, C.white, 0, 4, 6);
  b.box(0, 0.68, -0.18, 0.02, 0.05, 0.07, C.red);
  b.tube([0, 0.54, -0.26], [0, 0.52, -0.36], 0.04, 0.005, C.oro, 4);
  b.tube([0.08, 0.15, 0], [0.08, 0, 0], 0.02, 0.02, C.oro, 4);
  b.tube([-0.08, 0.15, 0], [-0.08, 0, 0], 0.02, 0.02, C.oro, 4);
  return b.build();
}
function barrel() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 0.5, 0], 0.36, 0.42, C.blue, 10);
  b.tube([0, 0.5, 0], [0, 1, 0], 0.42, 0.36, C.blue, 10);
  return b.build();
}
function pierPost() {
  const b = new GeoB();
  b.tube([0, -2, 0], [0, 1.1, 0], 0.16, 0.14, C.woodD, 7);
  return b.build();
}
function ferry() {
  const b = new GeoB(), rings = [];
  const K = [[-7, 0.02, 0.5, 1.3], [-5.6, 1.6, 0.25, 1.2], [-2, 2.3, 0.1, 1.05], [3, 2.4, 0.1, 1], [6.4, 2.1, 0.2, 1]];
  for (const [z, w, y0, y1] of K) {
    const o = [];
    for (let i = 0; i < 14; i++) {
      const q = (i / 14) * TAU;
      o.push([cos(q) * w, (y0 + y1) / 2 + sin(q) * (y1 - y0) * 0.5, z]);
    }
    rings.push(o);
  }
  b.loft(rings, (ta, tb, q) => (q[1] > 0.82 ? C.white : q[1] > 0.6 ? C.oro : C.red));
  b.box(0, 0.98, 1, 2.1, 0.06, 4.4, C.wood);
  [[-1.8, -3], [1.8, -3], [-1.8, 5], [1.8, 5]].forEach(([x, z]) => b.tube([x, 1, z], [x, 3, z], 0.05, 0.05, C.white, 5));
  b.box(0, 3.05, 1, 2.3, 0.08, 4.8, C.turq);
  b.tube([0, 1, 5.6], [0, 1.7, 5.6], 0.2, 0.22, C.oro, 7);
  b.sph([0, 1.92, 5.6], 0.15, C.skin, 0, 5, 6);
  return b.build();
}

// nombre → modelo, cupo, sombra [rx,rz], contorno
const SPEC = {
  palm: [palm, 90, [2.6, 2.6]], umbrella: [umbrella, 30, [1.2, 1.2]], lancha: [lancha, 30, [1.1, 3.6]], log: [logp, 30, [1, 0.45]], castle: [castle, 30, [0.8, 0.8]],
  crab: [crab, 60, [0.45, 0.32]], turtle: [turtle, 60, [0.2, 0.25]], rock: [rock, 50, [1, 0.85]], ramp: [ramp, 20, null], person: [person, 40, [0.4, 0.35]],
  coin: [coin, 90, [0.28, 0.28]], greencoco: [greenCoco, 16, [0.3, 0.3]], tape: [tape, 12, [0.3, 0.3]], tortilla: [tortilla, 12, [0.42, 0.42]], cocofall: [fallCoco, 24, [0.34, 0.34]],
  fence: [fence, 90, null], gate: [gatePosts, 8, null], crate: [crate, 40, [0.75, 0.65]], net: [net, 30, [1, 0.7]], caiman: [caiman, 16, [1.8, 0.45]], heron: [heron, 16, [0.7, 0.4]],
  mangrove: [mangrove, 130, [2.4, 2.4]], reed: [reed, 90, null], lantern: [lantern, 50, null], house: [() => house(false), 40, null], house2: [() => house(true), 40, null],
  lamp: [lamp, 30, null], string: [stringLights, 20, null], tuktuk: [tuktuk, 24, [1, 1.7]], moto: [moto, 24, [0.4, 1]], cart: [cart, 20, [1.3, 0.85]], pothole: [pothole, 30, null, true],
  tumulo: [tumulo, 16, null], chicken: [chicken, 40, [0.24, 0.26]], barrel: [barrel, 30, [0.45, 0.45]], post: [pierPost, 80, null], ferry: [ferry, 2, null],
};
const defs = {};
let shadowMesh, shadowCount = 0;
const SHADOW_CAP = 400;
let signMesh, signAttr, signTex, signMap = {};

export function buildProps() {
  const uni = celUni();
  const mat = new T.ShaderMaterial({vertexShader: VS_CEL, fragmentShader: FS_CEL, uniforms: uni});
  const hullMat = new T.ShaderMaterial({vertexShader: VS_HULL, fragmentShader: FS_HULL, uniforms: uni, side: T.BackSide});
  Object.assign(SPEC, FARM_SPEC, CITY_SPEC);
  buildWheel();
  for (const name in SPEC) {
    const [fn, cap, sh, noHull] = SPEC[name];
    const g = fn();
    const fx = new T.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(T.DynamicDrawUsage);
    g.setAttribute('iFx', fx);
    const m = new T.InstancedMesh(g, mat, cap);
    m.instanceMatrix.setUsage(T.DynamicDrawUsage);
    m.frustumCulled = false;
    m.count = 0;
    scene.add(m);
    let h = null;
    if (!noHull) {
      h = new T.InstancedMesh(g, hullMat, cap);
      h.instanceMatrix = m.instanceMatrix;
      h.frustumCulled = false;
      h.count = 0;
      scene.add(h);
    }
    defs[name] = {m, h, cap, n: 0, fx: fx.array, sh, attr: fx};
  }
  // Sombras: se pintan antes que los objetos, sin prueba de profundidad.
  const sg = new T.PlaneGeometry(2, 2);
  shadowMesh = new T.InstancedMesh(sg, new T.ShaderMaterial({vertexShader: VS_SHADOW, fragmentShader: FS_SHADOW, depthTest: false, depthWrite: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor,
    uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uShadowC: U.uShadowC, uShadowA: U.uShadowA}}), SHADOW_CAP);
  shadowMesh.frustumCulled = false;
  shadowMesh.renderOrder = -9;
  shadowMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  scene.add(shadowMesh);
}
function put(name, x, y, z, r, sx, sy, sz, tr, tg, tb, flash) {
  const d = defs[name];
  if (d.n >= d.cap) return;
  const a = d.m.instanceMatrix.array, o = d.n * 16, c = cos(r), s = sin(r);
  a[o] = c * sx; a[o + 1] = 0; a[o + 2] = -s * sx; a[o + 3] = 0;
  a[o + 4] = 0; a[o + 5] = sy; a[o + 6] = 0; a[o + 7] = 0;
  a[o + 8] = s * sz; a[o + 9] = 0; a[o + 10] = c * sz; a[o + 11] = 0;
  a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
  const f = d.n * 4;
  d.fx[f] = tr; d.fx[f + 1] = tg; d.fx[f + 2] = tb; d.fx[f + 3] = flash;
  d.n++;
  if (d.sh) shadow(x, z, d.sh[0] * sx, d.sh[1] * sz);
}
const _sL = {v: 3};
export const setShadowLen = (v) => (_sL.v = v);
function shadow(x, z, rx, rz) {
  if (shadowCount >= SHADOW_CAP) return;
  const a = shadowMesh.instanceMatrix.array, o = shadowCount * 16, L = _sL.v * max(rz, 0.6);
  a[o] = rx; a[o + 1] = 0; a[o + 2] = 0; a[o + 3] = 0;
  a[o + 4] = 0; a[o + 5] = 1; a[o + 6] = 0; a[o + 7] = 0;
  a[o + 8] = 0; a[o + 9] = 0; a[o + 10] = rz + L; a[o + 11] = 0;
  a[o + 12] = x; a[o + 13] = 0; a[o + 14] = z + L; a[o + 15] = 1;
  shadowCount++;
}
// Sombra de algo que no es instancia (la nave del jugador, el perro).
export const dropShadow = shadow;

const VIEW_D = 330;
const NOT = [1, 1, 1];
export function syncProps(level, dist, time, decorOnly) {
  for (const k in defs) defs[k].n = 0;
  shadowCount = 0;
  const items = level.items;
  // avance del cursor: items ordenados por D
  while (level.cursor < items.length && items[level.cursor].D < dist - 16) level.cursor++;
  while (level.cursor > 0 && items[level.cursor - 1].D >= dist - 16) level.cursor--;
  const camX = camera.position.x, camY = camera.position.y, camZ = camera.position.z;
  for (let i = level.cursor; i < items.length; i++) {
    const it = items[i];
    if (it.D > dist + VIEW_D) break;
    if (it.gone || (decorOnly && !it.decor)) continue;
    // En teléfono se dibuja la mitad del follaje: se nota poco y rinde mucho.
    if (MOBILE && i % 2 && (it.t === 'mangrove' || it.t === 'reed' || it.t === 'palm' || it.t === 'tuft' || it.far)) continue;
    drawItem(it, dist, time, camX, camY, camZ);
  }
  if (!decorOnly) for (const it of level.movers) {
    if (it.gone || !it.on) continue;
    if (it.D > dist + VIEW_D || it.D < dist - 16) continue;
    drawItem(it, dist, time, camX, camY, camZ);
  }
  for (const k in defs) {
    const d = defs[k];
    d.m.count = d.n;
    d.m.visible = d.n > 0;
    if (d.h) {
      d.h.count = d.n;
      d.h.visible = d.n > 0;
    }
    if (d.n) {
      d.m.instanceMatrix.needsUpdate = true;
      d.attr.needsUpdate = true;
    }
  }
  shadowMesh.count = shadowCount;
  shadowMesh.instanceMatrix.needsUpdate = true;
  syncSigns(level, dist, decorOnly);
  syncWheel(level, dist, time);
}
function drawItem(it, dist, time, camX, camY, camZ) {
  let z = -(it.D - dist), x = it.x;
  // Nada se atraviesa con la cámara (lo que pasa por arriba, como las pasarelas, sí).
  const zc = z - camZ, xc = x - camX;
  const big = it.w || 1;
  if (!it.over && zc * zc + xc * xc < big * big + 1.5 && (it.y || 0) + 2 > camY - 2) return;
  const t = it.tint || NOT;
  let r = it.r || 0, y = it.y || 0;
  // Lo que la camioneta se lleva de encuentro sale volando.
  if (it.knock !== undefined) {
    const k = time - it.knock;
    if (k > 1.3) {
      it.gone = true;
      return;
    }
    x += it.kx * k * 9;
    y += 7 * k - 11 * k * k;
    z += k * 6;
    r += it.kx * k * 7;
  }
  if (it.spin) {
    r = time * it.spin + (it.ph || 0);
    y += Math.sin(time * 2.6 + it.D) * 0.14;
  }
  if (it.rotV) r += time * it.rotV;
  let sy = it.sy || it.s || 1, name = it.t;
  if (it.flick) sy *= 0.82 + 0.26 * Math.sin(time * 9 + it.D) + 0.12 * Math.sin(time * 23 + it.x);
  // Los que caminan alternan entre dos cuadros.
  if (it.walk && floor(time * it.walk + it.D) % 2) name = it.t + 'B';
  put(name, x, y, z, r, it.sx || it.s || 1, sy, it.sz || it.s || 1, t[0], t[1], t[2], it.flash || 0);
}
export const signItems = [];
// ── Letreros ──
const SIGNS = [
  ['RESERVA NATURAL MONTERRICO', '#1a1416', '#ffc91f'], ['EL MANGLAR', '#1a1416', '#7fe3c8'], ['BIENVENIDOS AL PUEBLO', '#e3262f', '#fff3d6'], ['MUELLE', '#12b5b0', '#fff3d6'],
  ['Tienda La Bendición', '#fff3d6', '#e3262f'], ['Comedor Doña Tere', '#ffc91f', '#1a1416'], ['Ceviches El Pelícano', '#12b5b0', '#fff3d6'], ['Shucos El Gordo', '#e3262f', '#ffc91f'],
  ['Pinchazos 24 horas', '#1a1416', '#fff3d6'], ['Agua de coco Q5', '#2bae56', '#fff3d6'], ['Tortillería Lupita', '#ff5d7d', '#fff3d6'], ['Salón Yesenia', '#7a3fb0', '#fff3d6'],
  ['TORTUGARIO', '#2d6b52', '#fff3d6'], ['¡AGUAS!', '#ffc91f', '#e3262f'], ['Lanchas a La Avellana', '#1b62c9', '#fff3d6'], ['Hay tamales', '#fff3d6', '#2d6b52'],
  ['BIENVENIDOS A TAXISCO', '#1b62c9', '#fff3d6'], ['CAÑAVERALES', '#2d6b52', '#ffc91f'], ['FERIA DE GUAZACAPÁN', '#e3262f', '#ffc91f'], ['TERMINAL DE BUSES', '#12b5b0', '#fff3d6'],
  ['A la capital', '#ffc91f', '#e3262f'], ['Leche fresca', '#fff3d6', '#1b62c9'], ['Cuidado: ganado', '#ffc91f', '#1a1416'], ['Quema de caña', '#1a1416', '#ffc91f'],
  ['Puente angosto', '#ffc91f', '#1a1416'], ['Churrascos La Feria', '#e3262f', '#fff3d6'], ['Tiro al blanco', '#1b62c9', '#ffc91f'], ['Algodones', '#ff5d7d', '#fff3d6'],
  ['Elotes locos', '#2bae56', '#fff3d6'], ['Rueda de Chicago', '#7a3fb0', '#ffc91f'], ['Hoy: jaripeo', '#1a1416', '#ff5d7d'], ['Talabartería Don Chepe', '#6e4726', '#fff3d6'],
  ['FERIA DE TAXISCO', '#7a3fb0', '#ffc91f'],
  ['CALZADA ROOSEVELT', '#1f6b3a', '#fff3d6'], ['ANILLO PERIFÉRICO', '#1f6b3a', '#fff3d6'], ['PUENTE EL INCIENSO', '#1f6b3a', '#fff3d6'], ['ZONA 1 · CENTRO', '#1f6b3a', '#fff3d6'],
  ['El Trébol', '#1f6b3a', '#fff3d6'], ['Shucos El Volcán', '#e3262f', '#ffc91f'], ['Farmacia La Bendición', '#2bae56', '#fff3d6'], ['Pollo Frito Doña Tina', '#ffc91f', '#e3262f'],
  ['Ferretería El Clavo', '#1b62c9', '#fff3d6'], ['Licuados Mary', '#ff5d7d', '#fff3d6'], ['Taller El Pistón', '#1a1416', '#ffc91f'], ['Hotel Colonial', '#6e4726', '#fff3d6'],
  ['Café La Sexta', '#2d6b52', '#fff3d6'], ['Respete el semáforo', '#e3262f', '#fff3d6'], ['Parada de bus', '#1b62c9', '#fff3d6'], ['Hombres trabajando', '#ff7a1a', '#1a1416'],
  ['Pinchazos Don Memo', '#1a1416', '#fff3d6'], ['Panadería La Espiga', '#fff3d6', '#6e4726'], ['Shucos', '#e3262f', '#fff3d6'], ['Cuidado: túmulo', '#ffc91f', '#1a1416'],
];
// Proporción con la que se muestra cada letrero. La fila del atlas es de 16:1, así que la letra
// se dibuja estirada para que en el letrero se vea con su forma real.
const SIGN_ASPECT = {'¡AGUAS!': 3.3, 'EL MANGLAR': 8.4, 'MUELLE': 8.3, 'Lanchas a La Avellana': 8.2, 'BIENVENIDOS AL PUEBLO': 8.4, 'CAÑAVERALES': 8.4, 'FERIA DE GUAZACAPÁN': 8.4, 'TERMINAL DE BUSES': 8.4, 'BIENVENIDOS A TAXISCO': 8.4, 'FERIA DE TAXISCO': 8.4,
  'CALZADA ROOSEVELT': 6.4, 'ANILLO PERIFÉRICO': 6.4, 'PUENTE EL INCIENSO': 6.4, 'ZONA 1 · CENTRO': 6.4, 'El Trébol': 4.6, 'Respete el semáforo': 6.2, 'Shucos': 3.4};
export function drawSignAtlas() {
  const cv = signTex ? signTex.image : document.createElement('canvas');
  const rows = SIGNS.length, h = 64;
  cv.width = 1024;
  cv.height = rows * h;
  const x = cv.getContext('2d');
  x.clearRect(0, 0, cv.width, cv.height);
  SIGNS.forEach(([t, bg, fg], i) => {
    const y = i * h;
    x.fillStyle = bg;
    x.fillRect(4, y + 3, 1016, h - 6);
    x.strokeStyle = fg;
    x.lineWidth = 3;
    x.strokeRect(10, y + 9, 1004, h - 18);
    x.fillStyle = fg;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    const stretch = 16 / (SIGN_ASPECT[t] || 6), room = 930 / stretch;
    let px = 40;
    x.font = '400 ' + px + 'px "Shrikhand","Arial Black",Impact,sans-serif';
    const w = x.measureText(t).width;
    if (w > room) {
      px = (px * room) / w;
      x.font = '400 ' + px + 'px "Shrikhand","Arial Black",Impact,sans-serif';
    }
    x.save();
    x.translate(512, y + h / 2 + 2);
    x.scale(stretch, 1);
    x.fillText(t, 0, 0);
    x.restore();
    signMap[t] = i;
  });
  if (!signTex) {
    signTex = new T.CanvasTexture(cv);
    signTex.colorSpace = T.NoColorSpace;
    signTex.generateMipmaps = true;
    signTex.minFilter = T.LinearMipmapLinearFilter;
    const cap = 90;
    const g = new T.InstancedBufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
    g.setAttribute('uv', new T.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    signAttr = {iP: new T.InstancedBufferAttribute(new Float32Array(cap * 4), 4), iUv: new T.InstancedBufferAttribute(new Float32Array(cap * 4), 4), iS: new T.InstancedBufferAttribute(new Float32Array(cap * 2), 2), cap};
    g.setAttribute('iP', signAttr.iP.setUsage(T.DynamicDrawUsage));
    g.setAttribute('iUv', signAttr.iUv.setUsage(T.DynamicDrawUsage));
    g.setAttribute('iS', signAttr.iS.setUsage(T.DynamicDrawUsage));
    g.instanceCount = 0;
    signMesh = new T.Mesh(g, new T.ShaderMaterial({vertexShader: VS_SIGN, fragmentShader: FS_SIGN, side: T.DoubleSide,
      uniforms: {uAtlas: {value: signTex}, uBend: U.uBend, uCamZ: U.uCamZ, uFog: U.uFog, uSunCol: U.uSunCol, uFogA: U.uFogA, uFogB: U.uFogB, uNight: U.uNight}}));
    signMesh.frustumCulled = false;
    scene.add(signMesh);
  }
  signTex.needsUpdate = true;
}
function syncSigns(level, dist, decorOnly) {
  if (!signMesh) return;
  let n = 0;
  const rows = SIGNS.length;
  for (const s of level.signs) {
    if (s.D < dist - 10 || s.D > dist + VIEW_D) continue;
    if (n >= signAttr.cap) break;
    if (decorOnly && !s.decor) continue;
    const i = signMap[s.text] || 0;
    signAttr.iP.setXYZW(n, s.x, s.y, -(s.D - dist), 0);
    signAttr.iUv.setXYZW(n, 0, 1 - (i + 1) / rows, 1, 1 / rows);
    signAttr.iS.setXY(n, s.w, s.h);
    n++;
  }
  signMesh.geometry.instanceCount = n;
  signMesh.visible = n > 0;
  signAttr.iP.needsUpdate = signAttr.iUv.needsUpdate = signAttr.iS.needsUpdate = true;
}
