// El repartidor y lo que lleva siempre consigo, sea cual sea el vehículo: cuerpo, faja y paquete.
import * as T from 'three';
import {GeoB, hex} from '../core/geo.js';
import {scene, celUni, U, camera} from '../core/gfx.js';
import {VS_CEL, FS_CEL, VS_HULL, FS_HULL, VS_SCARF, FS_SCARF, VS_TEX, FS_TEX} from '../core/shaders.js';
import {PI, TAU, cos, sin, sqrt, min, max, clamp, lerp, sstep} from '../core/util.js';

export const C = {
  frame: hex('#12b5b0'), frameD: hex('#0b7f86'), tire: hex('#1a1416'), rim: hex('#d8d3cc'), seat: hex('#2a1f1c'), shirt: hex('#ffc91f'), stripe: hex('#e3262f'), guard: hex('#e3262f'),
  short: hex('#27305e'), skin: hex('#c68a5e'), skinD: hex('#a56a44'), shoe: hex('#fff3d6'), sock: hex('#f5ecd9'), cap: hex('#e3262f'), hair: hex('#1a1013'), ink: hex('#17100e'), white: hex('#fffaf0'), lamp: hex('#ffd76a'),
  box: hex('#c98a4b'), boxD: hex('#8d5a2a'), string: hex('#fff3d6'), tape: hex('#c9c4bb'),
};
let mat, hullMat, partLayer = 1;
export function initMats() {
  if (mat) return;
  const uni = celUni();
  mat = new T.ShaderMaterial({vertexShader: VS_CEL, fragmentShader: FS_CEL, uniforms: uni});
  hullMat = new T.ShaderMaterial({vertexShader: VS_HULL, fragmentShader: FS_HULL, uniforms: uni, side: T.BackSide});
}
// Capa 1: repartidor y vehículo. Capa 2: el jefe. Así cada corte muestra solo a quien toca.
export const setPartLayer = (n) => (partLayer = n);
export function part(parent, geo, hull = true) {
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
export const ring = (c, u, v, ru, rv, n = 14) => Array.from({length: n}, (_, i) => {
  const a = (i / n) * TAU, x = cos(a) * ru, y = sin(a) * rv;
  return [c[0] + u[0] * x + v[0] * y, c[1] + u[1] * x + v[1] * y, c[2] + u[2] * x + v[2] * y];
});
// Domo desde la coronilla hasta una línea que cambia según el ángulo: pelo y gorra de borde limpio.
export function dome(b, c, R, latFn, col, n = 36, k = 6) {
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

// ── Cuerpo ──
export const L1 = 0.46, L2 = 0.47, ARM_A = 0.285, ARM_B = 0.285, SHOULDER = [0.2, 0.385, -0.17], NECK_KNOT = [0, 0.485, -0.115];
export function buildTorso(body) {
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
  return part(body, t.build());
}
// Brazos: se ajustan solos para que las manos sigan donde deben.
export function buildArms(body) {
  const upG = new GeoB();
  upG.curve([[0, 0, 0], [0, -ARM_A * 0.5, 0], [0, -ARM_A * 0.72, 0]], (q) => lerp(0.07, 0.056, q), C.shirt, 10);
  upG.tube([0, -ARM_A * 0.7, 0], [0, -ARM_A * 0.76, 0], 0.06, 0.06, C.stripe, 10);
  upG.tube([0, -ARM_A * 0.72, 0], [0, -ARM_A, 0], 0.044, 0.04, C.skin, 8);
  upG.sph([0, -ARM_A, 0], 0.041, C.skin, 0, 5, 7);
  const loG = new GeoB();
  loG.curve([[0, 0, 0], [0, -ARM_B * 0.4, 0], [0, -ARM_B, 0]], (q) => lerp(0.042, 0.03, q), C.skin, 8);
  loG.sph([0, -ARM_B - 0.02, 0], [0.042, 0.05, 0.042], C.skin, 0, 6, 8);
  const upper = upG.build(), lower = loG.build();
  return [-1, 1].map((s) => ({side: s, up: part(body, upper), lo: part(body, lower)}));
}
const _s = new T.Vector3(), _d = new T.Vector3(), _p = new T.Vector3(), _e = new T.Vector3(), DOWN = new T.Vector3(0, -1, 0);
// target: posición de la mano en coordenadas del cuerpo.
export function armIK(arm, target, pole = [0.8, -0.55, 0.2]) {
  const s = arm.side;
  _s.set(s * SHOULDER[0], SHOULDER[1], SHOULDER[2]);
  _d.copy(target).sub(_s);
  const dist = clamp(_d.length(), 0.08, ARM_A + ARM_B - 0.002);
  _d.normalize();
  const ca = clamp((ARM_A * ARM_A + dist * dist - ARM_B * ARM_B) / (2 * ARM_A * dist), -1, 1), sa = sqrt(1 - ca * ca);
  // El codo se abre hacia afuera y un poco hacia abajo.
  _p.set(s * pole[0], pole[1], pole[2]);
  _p.addScaledVector(_d, -_p.dot(_d)).normalize();
  _e.copy(_s).addScaledVector(_d, ARM_A * ca).addScaledVector(_p, ARM_A * sa);
  arm.up.position.copy(_s);
  arm.up.quaternion.setFromUnitVectors(DOWN, _p.copy(_e).sub(_s).normalize());
  arm.lo.position.copy(_e);
  arm.lo.quaternion.setFromUnitVectors(DOWN, _p.copy(target).sub(_e).normalize());
}
// Cabeza de anime: grande, de ojos marcados, con pelo en picos bajo la gorra
export function buildHead(body) {
  const headG = new T.Group();
  headG.position.set(0, 0.64, -0.325);
  body.add(headG);
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
  part(headG, h.build());
  return headG;
}
export function buildLegGeos() {
  const tg = new GeoB();
  tg.curve([[0, 0.03, 0], [0, -L1 * 0.5, 0], [0, -L1 * 0.72, 0]], (q) => lerp(0.088, 0.072, q), C.short, 10);
  tg.tube([0, -L1 * 0.72, 0], [0, -L1 * 0.78, 0], 0.073, 0.075, C.stripe, 10);
  tg.tube([0, -L1 * 0.74, 0], [0, -L1, 0], 0.062, 0.055, C.skin, 8);
  tg.sph([0, -L1, 0], 0.057, C.skin, 0, 6, 8);
  const sn = new GeoB();
  const shp = Array.from({length: 9}, (_, i) => [0, (-L2 * i) / 8, i < 5 ? 0.012 * sin((i / 4) * PI) : 0]);
  sn.curve(shp, (q) => (q < 0.3 ? lerp(0.054, 0.066, q / 0.3) : lerp(0.066, 0.04, (q - 0.3) / 0.7)), (ta) => (ta < 0.64 ? C.skin : C.sock), 9);
  const shoeG = new GeoB();
  shoeG.sph([0, -0.035, -0.055], [0.058, 0.044, 0.125], C.shoe, 0, 7, 9);
  shoeG.box(0, -0.078, -0.055, 0.056, 0.008, 0.118, C.stripe);
  return {thigh: tg.build(), shin: sn.build(), shoe: shoeG.build()};
}
export function buildLeg(parent, geos, x, y, z, side) {
  const hip = new T.Group();
  hip.position.set(x, y, z);
  parent.add(hip);
  const th = part(hip, geos.thigh);
  const kn = new T.Group();
  kn.position.set(0, -L1, 0);
  th.add(kn);
  part(kn, geos.shin);
  const ft = new T.Group();
  ft.position.set(0, -L2, 0);
  kn.add(ft);
  part(ft, geos.shoe);
  return {root: hip, hip: th, knee: kn, foot: ft, side};
}

// ── Paquete: es lo que más se ve en toda la partida ──
const LABEL = {canvas: null, tex: null};
export function drawLabel() {
  const c = LABEL.canvas, g = c.getContext('2d'), W = c.width, H = c.height;
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
  if (LABEL.tex) LABEL.tex.needsUpdate = true;
}
export function buildPackage(parent, x, y, z, s = 1) {
  const pk = new T.Group();
  pk.position.set(x, y, z);
  pk.scale.setScalar(s);
  parent.add(pk);
  const pb = new GeoB();
  pb.box(0, 0.2, 0, 0.245, 0.2, 0.25, C.box);
  pb.box(0, 0.4, 0, 0.247, 0.004, 0.012, C.boxD);
  pb.box(0, 0.2, 0.253, 0.02, 0.202, 0.004, C.string);
  pb.box(0, 0.403, 0, 0.02, 0.004, 0.254, C.string);
  pb.box(0, 0.403, 0, 0.247, 0.004, 0.02, C.string);
  pb.box(0.247, 0.2, 0, 0.004, 0.202, 0.02, C.string);
  pb.box(-0.247, 0.2, 0, 0.004, 0.202, 0.02, C.string);
  part(pk, pb.build());
  if (!LABEL.canvas) {
    LABEL.canvas = document.createElement('canvas');
    LABEL.canvas.width = 384;
    LABEL.canvas.height = 150;
    drawLabel();
    LABEL.tex = new T.CanvasTexture(LABEL.canvas);
    LABEL.tex.colorSpace = T.SRGBColorSpace;
    LABEL.tex.anisotropy = 4;
  }
  const lab = new T.Mesh(new T.PlaneGeometry(0.27, 0.105), new T.ShaderMaterial({vertexShader: VS_TEX, fragmentShader: FS_TEX, uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uSunCol: U.uSunCol, uShade: U.uShade, uMap: {value: LABEL.tex}}}));
  lab.position.set(0, 0.27, 0.257);
  lab.rotation.z = -0.05;
  lab.frustumCulled = false;
  lab.layers.enable(1);
  pk.add(lab);
  const tp1 = new GeoB();
  tp1.box(-0.1, 0.11, 0.256, 0.11, 0.024, 0.004, C.tape);
  tp1.box(0.12, 0.09, 0.256, 0.024, 0.08, 0.004, C.tape);
  const tape1 = part(pk, tp1.build());
  const tp2 = new GeoB();
  tp2.box(0, 0.407, 0.09, 0.19, 0.004, 0.03, C.tape);
  tp2.box(-0.14, 0.13, 0.256, 0.085, 0.06, 0.004, C.boxD);
  tp2.box(0.247, 0.13, 0.12, 0.004, 0.06, 0.085, C.tape);
  const tape2 = part(pk, tp2.build());
  return {group: pk, tape1, tape2, y0: y, spring: 0, v: 0};
}
// El paquete brinca con cada golpe.
export function updatePackage(p, s) {
  p.v += (-p.spring * 170 - p.v * 12) * s.dt;
  p.spring += p.v * s.dt;
  p.group.position.y = p.y0 + max(0, p.spring);
  p.group.rotation.x = p.spring * 2.1 + (s.y > 0 ? -0.05 : 0);
  p.group.rotation.z = p.spring * 1.2 * sin(s.time * 13);
  p.tape1.visible = s.pkg < 72;
  p.tape2.visible = s.pkg < 42;
}

// ── Cinta con física: faja típica y cola del caballo ──
export function buildRibbon({N = 14, seg = 0.1, width = (t) => 0.075 * (1 - t * 0.25), fragment = FS_SCARF, uniforms = {}, layer = 1}) {
  const pos = new Float32Array(N * 2 * 3), uv = new Float32Array(N * 2 * 2), idx = [];
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
  const m = new T.Mesh(g, new T.ShaderMaterial({vertexShader: VS_SCARF, fragmentShader: fragment, side: T.DoubleSide, uniforms: Object.assign({uBend: U.uBend, uCamZ: U.uCamZ, uSunCol: U.uSunCol, uShade: U.uShade}, uniforms)}));
  m.frustumCulled = false;
  m.layers.enable(layer);
  scene.add(m);
  return {m, N, seg, width, p: new Float32Array(N * 3), q: new Float32Array(N * 3)};
}
const _a = new T.Vector3(), _vd = new T.Vector3(), _sd = new T.Vector3();
// ax,ay,az: punto de amarre en el mundo. grav y flap cambian cuánto cuelga y cuánto aletea.
export function updateRibbon(r, ax, ay, az, dt, wind, time, grav = 18, flap = 1) {
  const {p, q, N, seg} = r;
  p[0] = ax; p[1] = ay; p[2] = az;
  const h = min(dt, 1 / 30), h2 = h * h;
  for (let i = 1; i < N; i++) {
    const o = i * 3, t = i / (N - 1);
    const vx = (p[o] - q[o]) * 0.9, vy = (p[o + 1] - q[o + 1]) * 0.9, vz = (p[o + 2] - q[o + 2]) * 0.9;
    q[o] = p[o]; q[o + 1] = p[o + 1]; q[o + 2] = p[o + 2];
    // El viento empuja hacia atrás; el aleteo crece hacia la punta.
    p[o] += vx + sin(time * 11 - t * 9) * wind * 5 * flap * t * h2;
    p[o + 1] += vy + (-grav + sin(time * 8.3 - t * 7) * wind * 3.4 * flap * t) * h2;
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
  const pos = r.m.geometry.attributes.position.array, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  for (let i = 0; i < N; i++) {
    const o = i * 3, j = min(i + 1, N - 1) * 3, k = max(i - 1, 0) * 3;
    _vd.set(p[o] - cx, p[o + 1] - cy, p[o + 2] - cz);
    _sd.set(p[j] - p[k], p[j + 1] - p[k + 1], p[j + 2] - p[k + 2]).cross(_vd).normalize();
    const w = r.width(i / (N - 1)), v = i * 6;
    pos[v] = p[o] - _sd.x * w; pos[v + 1] = p[o + 1] - _sd.y * w; pos[v + 2] = p[o + 2] - _sd.z * w;
    pos[v + 3] = p[o] + _sd.x * w; pos[v + 4] = p[o + 1] + _sd.y * w; pos[v + 5] = p[o + 2] + _sd.z * w;
  }
  r.m.geometry.attributes.position.needsUpdate = true;
}
export function resetRibbon(r, ax, ay, az) {
  for (let i = 0; i < r.N; i++) {
    r.p[i * 3] = r.q[i * 3] = ax;
    r.p[i * 3 + 1] = r.q[i * 3 + 1] = ay - i * 0.02;
    r.p[i * 3 + 2] = r.q[i * 3 + 2] = az + i * r.seg;
  }
}
const _local = new T.Vector3();
export const worldOf = (obj, x, y, z) => _a.copy(_local.set(x, y, z)).applyMatrix4(obj.matrixWorld);
