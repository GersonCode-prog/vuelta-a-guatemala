// La bicicleta, el repartidor con su faja típica y el paquete en la parrilla.
import * as T from 'three';
import {GeoB, hex} from '../core/geo.js';
import {scene, celUni, U, camera} from '../core/gfx.js';
import {VS_CEL, FS_CEL, VS_HULL, FS_HULL, VS_SCARF, FS_SCARF, VS_TEX, FS_TEX} from '../core/shaders.js';
import {PI, TAU, cos, sin, sqrt, atan2, acos, min, max, clamp, damp, lerp, sstep} from '../core/util.js';

const C = {
  frame: hex('#12b5b0'), frameD: hex('#0b7f86'), tire: hex('#1a1416'), rim: hex('#d8d3cc'), seat: hex('#2a1f1c'), shirt: hex('#ffc91f'), stripe: hex('#e3262f'), guard: hex('#e3262f'),
  short: hex('#27305e'), skin: hex('#c68a5e'), skinD: hex('#a56a44'), shoe: hex('#fff3d6'), sock: hex('#f5ecd9'), cap: hex('#e3262f'), hair: hex('#1a1013'), ink: hex('#17100e'), white: hex('#fffaf0'), lamp: hex('#ffd76a'),
  box: hex('#c98a4b'), boxD: hex('#8d5a2a'), string: hex('#fff3d6'), tape: hex('#c9c4bb'),
};
let mat, hullMat, partLayer = 1;
function part(parent, geo, hull = true) {
  const m = new T.Mesh(geo, mat);
  m.frustumCulled = false;
  m.layers.enable(partLayer);
  const g = new T.Group();
  g.add(m);
  if (hull) {
    const h = new T.Mesh(geo, hullMat);
    h.frustumCulled = false;
    h.layers.enable(partLayer);
    g.add(h);
  }
  parent.add(g);
  return g;
}
// Anillo de n puntos en el plano (u,v) alrededor de c.
const ring = (c, u, v, ru, rv, n = 14) => Array.from({length: n}, (_, i) => {
  const a = (i / n) * TAU, x = cos(a) * ru, y = sin(a) * rv;
  return [c[0] + u[0] * x + v[0] * y, c[1] + u[1] * x + v[1] * y, c[2] + u[2] * x + v[2] * y];
});
// Domo desde la coronilla hasta una línea que cambia según el ángulo: pelo y gorra de borde limpio.
function dome(b, c, R, latFn, col, n = 36, k = 6) {
  const rings = [];
  for (let i = 1; i <= k; i++) {
    const o = [];
    for (let j = 0; j < n; j++) {
      const th = (j / n) * TAU, lat = (latFn(th, j) * i) / k;
      o.push([c[0] + R[0] * sin(lat) * cos(th), c[1] + R[1] * cos(lat), c[2] + R[2] * sin(lat) * sin(th)]);
    }
    rings.push(o);
  }
  b.loft(rings, col);
}
function wheelGeo() {
  const b = new GeoB(), R = 0.37;
  b.hoop(0, 0, R, 0.036, C.tire, 48, 7);
  b.hoop(0, 0, R - 0.044, 0.012, C.rim, 40, 5);
  b.tube([-0.04, 0, 0], [0.04, 0, 0], 0.036, 0.036, C.rim, 8);
  return b.build();
}
function spokeGeo() {
  const b = new GeoB(), R = 0.33;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI;
    b.tube([0, cos(a) * R, sin(a) * R], [0, -cos(a) * R, -sin(a) * R], 0.0055, 0.0055, C.rim, 3);
  }
  return b.build();
}
export const BIKE = {root: null, tilt: null, parts: {}, crank: 0, scarf: null, pkgSpring: 0, pkgV: 0, spin: 0, visible: true, label: null};
const L1 = 0.46, L2 = 0.47, HIP = [0.1, 1.0, 0.16];
const ARM_A = 0.285, ARM_B = 0.285, SHOULDER = [0.2, 0.385, -0.17], GRIP = [0.33, 0.33, 0.02];
export function drawLabel() {
  const c = BIKE.label, g = c.getContext('2d'), W = c.width, H = c.height;
  g.fillStyle = '#fff3d6';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#e3262f';
  g.lineWidth = 12;
  g.strokeRect(10, 10, W - 20, H - 20);
  g.fillStyle = '#e3262f';
  g.font = '400 92px "Shrikhand", "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('FRÁGIL', W / 2, H / 2 + 4, W - 60);
  if (BIKE.labelTex) BIKE.labelTex.needsUpdate = true;
}
export function buildBike() {
  const uni = celUni();
  mat = new T.ShaderMaterial({vertexShader: VS_CEL, fragmentShader: FS_CEL, uniforms: uni});
  hullMat = new T.ShaderMaterial({vertexShader: VS_HULL, fragmentShader: FS_HULL, uniforms: uni, side: T.BackSide});
  const root = new T.Group(), tilt = new T.Group();
  root.add(tilt);
  scene.add(root);
  BIKE.root = root;
  BIKE.tilt = tilt;
  const P = BIKE.parts;
  // Cuadro de bicicleta vieja de reparto
  const f = new GeoB();
  const seatTop = [0, 0.86, 0.2], bb = [0, 0.37, -0.02], headT = [0, 0.88, -0.44], headB = [0, 0.66, -0.47], rear = [0.05, 0.37, 0.58];
  f.tube(seatTop, bb, 0.03, 0.035, C.frame, 8);
  f.tube(seatTop, headT, 0.028, 0.028, C.frame, 8);
  f.tube(bb, headB, 0.035, 0.035, C.frame, 8);
  f.tube(bb, rear, 0.017, 0.017, C.frameD, 6);
  f.tube(seatTop, rear, 0.015, 0.015, C.frameD, 6);
  f.tube([-0.05, 0.37, 0.58], bb, 0.017, 0.017, C.frameD, 6);
  f.tube([-0.05, 0.37, 0.58], seatTop, 0.015, 0.015, C.frameD, 6);
  f.tube(headT, headB, 0.034, 0.034, C.frameD, 8);
  f.tube(seatTop, [0, 0.98, 0.22], 0.022, 0.022, C.rim, 6);
  f.sph([0, 1.0, 0.23], [0.085, 0.035, 0.16], C.seat, 0, 6, 10);
  // Guardafango trasero y parrilla
  f.curve(Array.from({length: 11}, (_, i) => {
    const a = -0.55 + (i / 10) * 2.25;
    return [0, 0.37 + cos(a) * 0.42, 0.58 + sin(a) * 0.42];
  }), () => 0.022, C.guard, 6);
  f.box(0, 0.84, 0.54, 0.16, 0.012, 0.24, C.rim);
  [-1, 1].forEach((s) => f.tube([s * 0.14, 0.84, 0.54], [s * 0.05, 0.37, 0.58], 0.009, 0.009, C.rim, 4));
  // Plato y cubrecadena
  f.tube([0.055, 0.37, -0.02], [0.065, 0.37, -0.02], 0.085, 0.085, C.ink, 14);
  f.box(0.06, 0.37, 0.27, 0.012, 0.035, 0.3, C.frameD);
  // Faro
  P.frame = part(tilt, f.build());
  // Dirección con rueda delantera
  const fr = new T.Group();
  fr.position.set(0, 0.8, -0.46);
  tilt.add(fr);
  const b = new GeoB();
  b.tube([0, 0.3, 0], [0, -0.1, 0], 0.024, 0.026, C.rim, 6);
  b.curve([[-GRIP[0], GRIP[1], GRIP[2] + 0.04], [-0.14, 0.3, 0.0], [0, 0.31, 0], [0.14, 0.3, 0.0], [GRIP[0], GRIP[1], GRIP[2] + 0.04]], () => 0.016, C.rim, 6);
  [-1, 1].forEach((s) => {
    b.tube([s * (GRIP[0] - 0.06), GRIP[1], GRIP[2] + 0.03], [s * (GRIP[0] + 0.03), GRIP[1] + 0.006, GRIP[2] + 0.04], 0.026, 0.026, C.tire, 6);
    b.tube([s * 0.035, -0.06, 0], [s * 0.035, -0.43, -0.13], 0.016, 0.014, C.frame, 5);
  });
  b.curve(Array.from({length: 9}, (_, i) => {
    const a = -1.5 + (i / 8) * 2.3;
    return [0, -0.43 + cos(a) * 0.42, -0.13 + sin(a) * 0.42];
  }), () => 0.02, C.guard, 6);
  b.tube([0, 0.2, -0.03], [0, 0.2, -0.09], 0.055, 0.07, C.rim, 8);
  b.sph([0, 0.2, -0.095], [0.058, 0.058, 0.02], C.lamp, 2.6, 5, 8);
  b.sph([-0.2, 0.345, 0.0], 0.03, C.lamp, 0, 5, 7);
  P.bars = part(fr, b.build());
  BIKE.front = fr;
  const wg = wheelGeo(), sg = spokeGeo();
  P.wheelF = part(fr, wg);
  part(P.wheelF, sg, false);
  P.wheelF.position.set(0, -0.43, -0.13);
  P.wheelR = part(tilt, wg);
  part(P.wheelR, sg, false);
  P.wheelR.position.set(0, 0.37, 0.58);
  // Biela y pedales
  const c = new GeoB();
  c.tube([-0.09, 0, 0], [0.09, 0, 0], 0.024, 0.024, C.rim, 8);
  [-1, 1].forEach((s) => {
    c.tube([s * 0.09, 0, 0], [s * 0.1, s * 0.17, 0], 0.012, 0.012, C.rim, 5);
    c.box(s * 0.145, s * 0.17, 0, 0.05, 0.012, 0.035, C.ink);
  });
  P.crank = part(tilt, c.build());
  P.crank.position.set(0, 0.37, -0.02);
  // Cuerpo
  const body = new T.Group();
  body.position.set(0, 1.0, 0.16);
  tilt.add(body);
  BIKE.body = body;
  const t = new GeoB(), U0 = [1, 0, 0], V0 = [0, 0.39, 0.92];
  const torsoAt = [[0, -0.03, 0.02, 0.15, 0.115], [0, 0.09, -0.03, 0.148, 0.11], [0, 0.23, -0.09, 0.16, 0.12], [0, 0.35, -0.15, 0.185, 0.125], [0, 0.43, -0.19, 0.15, 0.095], [0, 0.47, -0.205, 0.06, 0.055]];
  t.loft(torsoAt.map((q) => ring([q[0], q[1], q[2]], U0, V0, q[3], q[4], 16)), C.shirt);
  // Franja roja de la camisa, ruedo y pañuelo
  t.loft([[0, 0.205, -0.08, 0.1615, 0.1215], [0, 0.285, -0.115, 0.1725, 0.1245]].map((q) => ring([q[0], q[1], q[2]], U0, V0, q[3], q[4], 16)), C.stripe);
  t.loft([[0, -0.03, 0.02, 0.153, 0.118], [0, 0.02, 0, 0.152, 0.116]].map((q) => ring([q[0], q[1], q[2]], U0, V0, q[3], q[4], 16)), C.stripe);
  t.tube([0, 0.44, -0.19], [0, 0.58, -0.3], 0.058, 0.052, C.skin, 10);
  t.loft([[0, 0.465, -0.2, 0.082, 0.075], [0, 0.51, -0.23, 0.075, 0.07]].map((q) => ring([q[0], q[1], q[2]], U0, V0, q[3], q[4], 14)), C.stripe);
  t.sph([0, 0.48, -0.13], [0.035, 0.03, 0.03], C.stripe, 0, 5, 7);
  [-1, 1].forEach((s) => t.sph([s * SHOULDER[0], SHOULDER[1], SHOULDER[2]], 0.078, C.shirt, 0, 7, 10));
  P.torso = part(body, t.build());
  // Brazos: se ajustan solos para que las manos sigan en el manubrio.
  const upG = new GeoB();
  upG.curve([[0, 0, 0], [0, -ARM_A * 0.5, 0], [0, -ARM_A * 0.72, 0]], (q) => lerp(0.07, 0.056, q), C.shirt, 10);
  upG.tube([0, -ARM_A * 0.7, 0], [0, -ARM_A * 0.76, 0], 0.06, 0.06, C.stripe, 10);
  upG.tube([0, -ARM_A * 0.72, 0], [0, -ARM_A, 0], 0.044, 0.04, C.skin, 8);
  upG.sph([0, -ARM_A, 0], 0.041, C.skin, 0, 5, 7);
  const loG = new GeoB();
  loG.curve([[0, 0, 0], [0, -ARM_B * 0.4, 0], [0, -ARM_B, 0]], (q) => lerp(0.042, 0.03, q), C.skin, 8);
  loG.sph([0, -ARM_B - 0.02, 0], [0.042, 0.05, 0.042], C.skin, 0, 6, 8);
  const upper = upG.build(), lower = loG.build();
  BIKE.arms = [-1, 1].map((s) => ({side: s, up: part(body, upper), lo: part(body, lower)}));
  // Cabeza de anime: grande, de ojos marcados, con pelo en picos bajo la gorra
  const headG = new T.Group();
  headG.position.set(0, 0.64, -0.325);
  body.add(headG);
  BIKE.head = headG;
  const h = new GeoB(), Rh = [0.165, 0.176, 0.17];
  h.sph([0, 0.03, 0], Rh, C.skin, 0, 12, 16);
  h.sph([0, -0.055, -0.03], [0.128, 0.115, 0.125], C.skin, 0, 8, 12);
  [-1, 1].forEach((s) => {
    h.sph([s * 0.166, 0.02, 0.012], [0.024, 0.04, 0.032], C.skinD, 0, 5, 7);
    h.sph([s * 0.07, 0.022, -0.152], [0.028, 0.047, 0.016], C.ink, 0, 6, 8);
    h.sph([s * 0.062, 0.044, -0.166], [0.011, 0.014, 0.005], C.white, 0.4, 4, 6);
    h.curve([[s * 0.036, 0.096, -0.164], [s * 0.078, 0.112, -0.152], [s * 0.118, 0.098, -0.124]], () => 0.0085, C.hair, 4);
  });
  h.sph([0, -0.012, -0.178], [0.012, 0.012, 0.012], C.skinD, 0, 4, 5);
  h.curve([[-0.045, -0.075, -0.142], [-0.02, -0.092, -0.156], [0.02, -0.092, -0.156], [0.045, -0.075, -0.142]], () => 0.007, C.ink, 4);
  const front = (th) => cos(th - PI * 1.5);
  dome(h, [0, 0.03, 0.002], [Rh[0] * 1.05, Rh[1] * 1.05, Rh[2] * 1.05], (th, j) => {
    const f = front(th), base = lerp(2.05, 0.9, sstep(-0.35, 0.72, f));
    const spike = (j % 3 === 1 ? 0.2 : 0) * (f > 0.15 ? 1 : 0.45);
    return base + spike;
  }, C.hair);
  dome(h, [0, 0.035, 0], [Rh[0] * 1.11, Rh[1] * 1.12, Rh[2] * 1.11], () => 1.14, C.cap, 24, 5);
  h.sph([0, 0.235, 0], 0.016, C.white, 0, 3, 5);
  const br = [];
  for (let k = 0; k <= 5; k++) {
    const u = k / 5, cz = -0.135 - 0.215 * u, w = 0.17 - 0.055 * u * u, y = 0.1 - 0.018 * u, o = [];
    for (let j = 0; j < 12; j++) {
      const a = (j / 12) * TAU, cx = cos(a);
      o.push([cx * w, y + sin(a) * 0.011 - 0.032 * cx * cx, cz]);
    }
    br.push(o);
  }
  h.loft(br, C.cap);
  P.head = part(headG, h.build());
  // Piernas
  const tg = new GeoB();
  tg.curve([[0, 0.03, 0], [0, -L1 * 0.5, 0], [0, -L1 * 0.72, 0]], (q) => lerp(0.088, 0.072, q), C.short, 10);
  tg.tube([0, -L1 * 0.72, 0], [0, -L1 * 0.78, 0], 0.073, 0.075, C.stripe, 10);
  tg.tube([0, -L1 * 0.74, 0], [0, -L1, 0], 0.062, 0.055, C.skin, 8);
  tg.sph([0, -L1, 0], 0.057, C.skin, 0, 6, 8);
  const thigh = tg.build();
  const sn = new GeoB();
  const shp = Array.from({length: 9}, (_, i) => [0, (-L2 * i) / 8, i < 5 ? 0.012 * sin((i / 4) * PI) : 0]);
  sn.curve(shp, (q) => (q < 0.3 ? lerp(0.054, 0.066, q / 0.3) : lerp(0.066, 0.04, (q - 0.3) / 0.7)), (ta) => (ta < 0.64 ? C.skin : C.sock), 9);
  const shin = sn.build();
  const shoeG = new GeoB();
  shoeG.sph([0, -0.035, -0.055], [0.058, 0.044, 0.125], C.shoe, 0, 7, 9);
  shoeG.box(0, -0.078, -0.055, 0.056, 0.008, 0.118, C.stripe);
  const shoe = shoeG.build();
  BIKE.legs = [-1, 1].map((s) => {
    const hip = new T.Group();
    hip.position.set(HIP[0] * s, HIP[1], HIP[2]);
    tilt.add(hip);
    const th = part(hip, thigh);
    const kn = new T.Group();
    kn.position.set(0, -L1, 0);
    th.add(kn);
    part(kn, shin);
    const ft = new T.Group();
    ft.position.set(0, -L2, 0);
    kn.add(ft);
    part(ft, shoe);
    return {hip: th, knee: kn, foot: ft, side: s};
  });
  // Paquete: es lo que más se ve en toda la partida.
  const pk = new T.Group();
  pk.position.set(0, 0.85, 0.54);
  tilt.add(pk);
  BIKE.pkg = pk;
  const pb = new GeoB();
  pb.box(0, 0.2, 0, 0.245, 0.2, 0.25, C.box);
  pb.box(0, 0.4, 0, 0.247, 0.004, 0.012, C.boxD);
  pb.box(0, 0.2, 0.253, 0.02, 0.202, 0.004, C.string);
  pb.box(0, 0.403, 0, 0.02, 0.004, 0.254, C.string);
  pb.box(0, 0.403, 0, 0.247, 0.004, 0.02, C.string);
  pb.box(0.247, 0.2, 0, 0.004, 0.202, 0.02, C.string);
  pb.box(-0.247, 0.2, 0, 0.004, 0.202, 0.02, C.string);
  P.box = part(pk, pb.build());
  BIKE.label = document.createElement('canvas');
  BIKE.label.width = 384;
  BIKE.label.height = 150;
  drawLabel();
  const tex = new T.CanvasTexture(BIKE.label);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  BIKE.labelTex = tex;
  const lab = new T.Mesh(new T.PlaneGeometry(0.27, 0.105), new T.ShaderMaterial({vertexShader: VS_TEX, fragmentShader: FS_TEX, uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uSunCol: U.uSunCol, uShade: U.uShade, uMap: {value: tex}}}));
  lab.position.set(0, 0.27, 0.257);
  lab.rotation.z = -0.05;
  lab.frustumCulled = false;
  lab.layers.enable(1);
  pk.add(lab);
  const tp1 = new GeoB();
  tp1.box(-0.1, 0.11, 0.256, 0.11, 0.024, 0.004, C.tape);
  tp1.box(0.12, 0.09, 0.256, 0.024, 0.08, 0.004, C.tape);
  P.tape1 = part(pk, tp1.build());
  const tp2 = new GeoB();
  tp2.box(0, 0.407, 0.09, 0.19, 0.004, 0.03, C.tape);
  tp2.box(-0.14, 0.13, 0.256, 0.085, 0.06, 0.004, C.boxD);
  tp2.box(0.247, 0.13, 0.12, 0.004, 0.06, 0.085, C.tape);
  P.tape2 = part(pk, tp2.build());
  // Faja típica: cuerda verlet dibujada como cinta
  const N = 14, pos = new Float32Array(N * 2 * 3), uv = new Float32Array(N * 2 * 2), idx = [];
  for (let i = 0; i < N; i++) {
    uv[i * 4] = i / (N - 1);
    uv[i * 4 + 1] = 0;
    uv[i * 4 + 2] = i / (N - 1);
    uv[i * 4 + 3] = 1;
    if (i < N - 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  g.setIndex(idx);
  const m = new T.Mesh(g, new T.ShaderMaterial({vertexShader: VS_SCARF, fragmentShader: FS_SCARF, side: T.DoubleSide, uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uSunCol: U.uSunCol, uShade: U.uShade}}));
  m.frustumCulled = false;
  m.layers.enable(1);
  scene.add(m);
  BIKE.scarf = {m, N, seg: 0.1, p: new Float32Array(N * 3), q: new Float32Array(N * 3)};
}
const _a = new T.Vector3(), _vd = new T.Vector3(), _sd = new T.Vector3();
function updateScarf(dt, wind, time) {
  const s = BIKE.scarf, {p, q, N, seg} = s;
  _a.set(0, 0.485, -0.115).applyMatrix4(BIKE.body.matrixWorld);
  p[0] = _a.x; p[1] = _a.y; p[2] = _a.z;
  const h = min(dt, 1 / 30), h2 = h * h;
  for (let i = 1; i < N; i++) {
    const o = i * 3, t = i / (N - 1);
    const vx = (p[o] - q[o]) * 0.9, vy = (p[o + 1] - q[o + 1]) * 0.9, vz = (p[o + 2] - q[o + 2]) * 0.9;
    q[o] = p[o]; q[o + 1] = p[o + 1]; q[o + 2] = p[o + 2];
    // El viento empuja hacia atrás; el aleteo crece hacia la punta.
    p[o] += vx + sin(time * 11 - t * 9) * wind * 5 * t * h2;
    p[o + 1] += vy + (-18 + sin(time * 8.3 - t * 7) * wind * 3.4 * t) * h2;
    p[o + 2] += vz + wind * 9 * h2;
  }
  for (let it = 0; it < 3; it++)
    for (let i = 1; i < N; i++) {
      const a = (i - 1) * 3, c = i * 3, dx = p[c] - p[a], dy = p[c + 1] - p[a + 1], dz = p[c + 2] - p[a + 2];
      const d = sqrt(dx * dx + dy * dy + dz * dz) || 1e-5, e = (d - seg) / d;
      if (i === 1) {
        p[c] -= dx * e; p[c + 1] -= dy * e; p[c + 2] -= dz * e;
      } else {
        p[a] += dx * e * 0.5; p[a + 1] += dy * e * 0.5; p[a + 2] += dz * e * 0.5;
        p[c] -= dx * e * 0.5; p[c + 1] -= dy * e * 0.5; p[c + 2] -= dz * e * 0.5;
      }
    }
  // Nunca se estira: cada eslabón sigue al anterior con su largo exacto.
  for (let i = 1; i < N; i++) {
    const a = (i - 1) * 3, c = i * 3, dx = p[c] - p[a], dy = p[c + 1] - p[a + 1], dz = p[c + 2] - p[a + 2];
    const d = sqrt(dx * dx + dy * dy + dz * dz) || 1e-5;
    if (d > seg) {
      const k = seg / d;
      p[c] = p[a] + dx * k; p[c + 1] = p[a + 1] + dy * k; p[c + 2] = p[a + 2] + dz * k;
    }
  }
  const pos = s.m.geometry.attributes.position.array, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  for (let i = 0; i < N; i++) {
    const o = i * 3, j = min(i + 1, N - 1) * 3, k = max(i - 1, 0) * 3;
    _vd.set(p[o] - cx, p[o + 1] - cy, p[o + 2] - cz);
    _sd.set(p[j] - p[k], p[j + 1] - p[k + 1], p[j + 2] - p[k + 2]).cross(_vd).normalize();
    const w = 0.075 * (1 - (i / N) * 0.25), v = i * 6;
    pos[v] = p[o] - _sd.x * w; pos[v + 1] = p[o + 1] - _sd.y * w; pos[v + 2] = p[o + 2] - _sd.z * w;
    pos[v + 3] = p[o] + _sd.x * w; pos[v + 4] = p[o + 1] + _sd.y * w; pos[v + 5] = p[o + 2] + _sd.z * w;
  }
  s.m.geometry.attributes.position.needsUpdate = true;
}
function legIK(leg, footY, footZ) {
  const hipY = HIP[1], hipZ = HIP[2];
  const ty = footY - hipY, tz = footZ - hipZ;
  const d = min(sqrt(ty * ty + tz * tz), L1 + L2 - 0.002);
  const a = atan2(-tz, -ty);
  const b = acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const g = acos(clamp((L2 * L2 + d * d - L1 * L1) / (2 * L2 * d), -1, 1));
  leg.hip.rotation.x = a + b;
  leg.knee.rotation.x = -(b + g);
  leg.foot.rotation.x = g - a - 0.18 * sin(BIKE.crank + (leg.side > 0 ? PI : 0));
}
const _s = new T.Vector3(), _w = new T.Vector3(), _d = new T.Vector3(), _p = new T.Vector3(), _e = new T.Vector3(), DOWN = new T.Vector3(0, -1, 0);
function armIK(arm) {
  const s = arm.side;
  _w.set(s * GRIP[0], GRIP[1] + 0.01, GRIP[2] + 0.035);
  BIKE.front.localToWorld(_w);
  BIKE.body.worldToLocal(_w);
  _s.set(s * SHOULDER[0], SHOULDER[1], SHOULDER[2]);
  _d.copy(_w).sub(_s);
  const dist = clamp(_d.length(), 0.08, ARM_A + ARM_B - 0.002);
  _d.normalize();
  const ca = clamp((ARM_A * ARM_A + dist * dist - ARM_B * ARM_B) / (2 * ARM_A * dist), -1, 1), sa = sqrt(1 - ca * ca);
  // El codo se abre hacia afuera y un poco hacia abajo.
  _p.set(s * 0.8, -0.55, 0.2);
  _p.addScaledVector(_d, -_p.dot(_d)).normalize();
  _e.copy(_s).addScaledVector(_d, ARM_A * ca).addScaledVector(_p, ARM_A * sa);
  arm.up.position.copy(_s);
  arm.up.quaternion.setFromUnitVectors(DOWN, _p.copy(_e).sub(_s).normalize());
  arm.lo.position.copy(_e);
  arm.lo.quaternion.setFromUnitVectors(DOWN, _p.copy(_w).sub(_e).normalize());
}
// s: {x,y,speed,steer,air,crouch,brake,pkg,time,dt,spin,pitch,scale}
export function updateBike(s) {
  const r = BIKE.root, tl = BIKE.tilt;
  r.visible = BIKE.visible;
  BIKE.scarf.m.visible = BIKE.visible;
  r.position.set(s.x, s.y, 0);
  r.scale.setScalar(s.scale || 1.22);
  r.rotation.y = -s.steer * 0.22 + (s.spin || 0);
  tl.rotation.z = -s.steer * 0.42;
  tl.rotation.x = s.pitch || 0;
  BIKE.front.rotation.y = -s.steer * 0.34;
  BIKE.parts.wheelF.rotation.x -= (s.speed * s.dt) / 0.37;
  BIKE.parts.wheelR.rotation.x -= (s.speed * s.dt) / 0.37;
  const pedal = s.air ? 0.25 : s.brake ? 0 : s.speed * 0.62 + (s.crouch ? 3 : 0);
  BIKE.crank += pedal * s.dt;
  BIKE.parts.crank.rotation.x = -BIKE.crank;
  const lean = damp(BIKE.body.rotation.x, s.crouch ? -0.3 : s.brake ? 0.14 : -0.06, 8, s.dt);
  BIKE.body.rotation.x = lean;
  const rock = sin(BIKE.crank) * (s.crouch ? 0.16 : 0.06);
  BIKE.body.rotation.z = rock;
  BIKE.head.rotation.x = -lean * 0.8;
  BIKE.head.rotation.y = s.steer * 0.3;
  BIKE.legs.forEach((leg) => {
    const a = BIKE.crank + (leg.side > 0 ? PI : 0);
    legIK(leg, 0.37 + 0.17 * sin(a) + 0.08, -0.02 + 0.17 * cos(a));
  });
  // El paquete brinca con cada golpe.
  BIKE.pkgV += (-BIKE.pkgSpring * 170 - BIKE.pkgV * 12) * s.dt;
  BIKE.pkgSpring += BIKE.pkgV * s.dt;
  BIKE.pkg.position.y = 0.85 + max(0, BIKE.pkgSpring);
  BIKE.pkg.rotation.x = BIKE.pkgSpring * 2.1 + (s.y > 0 ? -0.05 : 0);
  BIKE.pkg.rotation.z = BIKE.pkgSpring * 1.2 * sin(s.time * 13);
  BIKE.parts.tape1.visible = s.pkg < 72;
  BIKE.parts.tape2.visible = s.pkg < 42;
  r.updateMatrixWorld(true);
  BIKE.arms.forEach(armIK);
  updateScarf(s.dt, 1.5 + s.speed * 0.8, s.time);
}
export function resetScarf() {
  const s = BIKE.scarf;
  BIKE.body.updateWorldMatrix(true, false);
  _a.set(0, 0.485, -0.115).applyMatrix4(BIKE.body.matrixWorld);
  for (let i = 0; i < s.N; i++) {
    s.p[i * 3] = s.q[i * 3] = _a.x;
    s.p[i * 3 + 1] = s.q[i * 3 + 1] = _a.y - i * 0.02;
    s.p[i * 3 + 2] = s.q[i * 3 + 2] = _a.z + i * s.seg;
  }
}
export const kickPackage = (v) => (BIKE.pkgV += v);

// ── Terremoto, el chucho de Doña Tere ──
export const DOG = {root: null, legs: [], t: 0, body: null};
export function buildDog() {
  partLayer = 2;
  const coat = hex('#c98f4f'), dark = hex('#6e4726'), belly = hex('#f2dcae');
  const root = new T.Group();
  root.visible = false;
  scene.add(root);
  DOG.root = root;
  const body = new T.Group();
  root.add(body);
  DOG.body = body;
  const b = new GeoB();
  b.sph([0, 0.84, 0], [0.32, 0.34, 0.8], (a, c, q) => (q[1] < 0.62 ? belly : Math.sin(q[2] * 8 + q[0] * 9) > 0.55 ? dark : coat), 0, 7, 10);
  b.tube([0, 1, -0.65], [0, 1.28, -0.9], 0.24, 0.2, coat, 8);
  b.curve([[-0.24, 1.14, -0.72], [0, 1.2, -0.62], [0.24, 1.14, -0.72]], () => 0.05, hex('#e3262f'), 5);
  [[-0.11, 1.0, -0.8], [0.11, 1.0, -0.8]].forEach((q) => b.sph(q, 0.02, hex('#ffc91f'), 0, 3, 4));
  part(body, b.build());
  const head = new T.Group();
  head.position.set(0, 1.34, -0.98);
  body.add(head);
  DOG.head = head;
  const h = new GeoB();
  h.sph([0, 0, 0], [0.25, 0.23, 0.27], coat, 0, 7, 9);
  h.tube([0, -0.05, -0.2], [0, -0.09, -0.52], 0.15, 0.11, belly, 8);
  h.sph([0, -0.04, -0.54], [0.06, 0.05, 0.05], hex('#1a1416'), 0, 4, 5);
  [-1, 1].forEach((s) => {
    h.sph([s * 0.11, 0.07, -0.22], [0.055, 0.06, 0.03], hex('#fff3d6'), 0, 5, 6);
    h.sph([s * 0.11, 0.06, -0.25], 0.028, hex('#e3262f'), 1.4, 4, 5);
    h.box(s * 0.12, 0.15, -0.24, 0.085, 0.018, 0.02, hex('#1a1416'));
    h.blade([[s * 0.18, 0.14, 0.03], [s * 0.33, 0.33, 0.06], [s * 0.4, 0.4, 0.14]], [0, 0, 1], 0.1, dark, 0.02);
  });
  h.box(0, -0.17, -0.42, 0.09, 0.03, 0.09, hex('#e3262f'));
  [-1, 1].forEach((s) => h.tube([s * 0.06, -0.09, -0.48], [s * 0.06, -0.15, -0.48], 0.018, 0.004, hex('#fff3d6'), 4));
  part(head, h.build());
  const leg = new GeoB();
  leg.tube([0, 0, 0], [0, -0.62, 0], 0.09, 0.06, coat, 6);
  leg.sph([0, -0.65, -0.04], [0.07, 0.05, 0.1], belly, 0, 4, 5);
  const lg = leg.build();
  DOG.legs = [[-0.2, 0.68, -0.5], [0.2, 0.68, -0.5], [-0.2, 0.68, 0.5], [0.2, 0.68, 0.5]].map((q, i) => {
    const p = part(body, lg);
    p.position.set(q[0], q[1], q[2]);
    p.userData.i = i;
    return p;
  });
  const tail = new GeoB();
  tail.curve([[0, 0, 0], [0, 0.26, 0.2], [0, 0.46, 0.2]], (t) => lerp(0.07, 0.025, t), coat, 5);
  DOG.tail = part(body, tail.build());
  DOG.tail.position.set(0, 1, 0.76);
}
export function updateDog(x, y, z, speed, dt, time, mode, yaw = 0) {
  const r = DOG.root, eat = mode === 'eat', low = mode === 'aim';
  r.position.set(x, y, z);
  r.scale.setScalar(1.18);
  r.rotation.y = yaw;
  DOG.t += dt * (eat || low ? 0 : 6 + speed * 0.55);
  const a = DOG.t;
  DOG.legs.forEach((l, i) => {
    l.rotation.x = eat ? 0 : low ? (i < 2 ? -0.5 : 0.6) : sin(a + (i < 2 ? 0 : 1.5) + (i % 2) * 0.5) * 0.72;
  });
  DOG.body.rotation.x = eat ? -0.32 : low ? -0.2 : sin(a * 2) * 0.07;
  DOG.body.position.y = eat ? -0.12 : low ? -0.2 + sin(time * 40) * 0.015 : Math.abs(sin(a)) * 0.16;
  DOG.head.rotation.x = eat ? -0.75 : low ? 0.14 : -0.08 + sin(time * 22) * 0.04;
  DOG.tail.rotation.z = sin(time * (eat ? 20 : 8)) * 0.7;
}
