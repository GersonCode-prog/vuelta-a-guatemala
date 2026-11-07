// Turbo, el caballo de Don Chepe: "Se llama Turbo porque una vez corrió."
import * as T from 'three';
import {GeoB, hex, mixC} from '../core/geo.js';
import {scene, U} from '../core/gfx.js';
import {FS_TAIL} from '../core/shaders.js';
import {PI, TAU, cos, sin, min, max, clamp, damp, lerp, sstep, abs} from '../core/util.js';
import {C, initMats, part, setPartLayer, ring, NECK_KNOT, buildTorso, buildArms, armIK, buildHead, buildLegGeos, buildLeg, buildPackage, updatePackage, buildRibbon, updateRibbon, resetRibbon, worldOf} from './rider.js';

const H = {
  coat: hex('#a4582a'), coatD: hex('#7c3f1e'), belly: hex('#c07a42'), mane: hex('#1f1412'), hoof: hex('#231a18'), sock: hex('#f8ecd8'), blaze: hex('#fff6e8'),
  blanket: hex('#e3262f'), band: hex('#ffc91f'), band2: hex('#12b5b0'), leather: hex('#4a2a18'), leatherL: hex('#7a4a28'), metal: hex('#d8d3cc'), rein: hex('#3a1f12'), eye: hex('#17100e'),
};
export const HORSE = {root: null, tilt: null, pivot: null, body: null, legs: [], phase: 0, rear: 0, tail: null, scarf: null, pkg: null};

// Pierna de cuatro patas en dos tramos con casco. Sirve también para el toro.
export function buildQuadLeg(parent, {x, y, z, upper, lower, r0, r1, r2, col, colLow, sock, hoof, front}) {
  const up = new T.Group();
  up.position.set(x, y, z);
  parent.add(up);
  const a = new GeoB();
  a.curve([[0, 0.04, 0], [0, -upper * 0.5, front ? 0 : 0.02], [0, -upper, 0]], (t) => lerp(r0, r1, t), col, 9);
  a.sph([0, -upper, 0], r1 * 1.08, col, 0, 5, 8);
  part(up, a.build());
  const lo = new T.Group();
  lo.position.set(0, -upper, 0);
  up.add(lo);
  const b = new GeoB();
  b.curve([[0, 0, 0], [0, -lower * 0.55, 0], [0, -lower, 0]], (t) => lerp(r1 * 0.86, r2, t), (t) => (t > 0.45 && sock ? sock : colLow || col), 8);
  b.sph([0, -lower, 0], r2 * 1.25, sock || colLow || col, 0, 5, 7);
  const hf = hoof || H.hoof;
  b.loft([[0, -lower - 0.03, -0.015, r2 * 1.25, r2 * 1.35], [0, -lower - 0.12, -0.03, r2 * 1.65, r2 * 1.85]].map((q) => ring([q[0], q[1], q[2]], [1, 0, 0], [0, 0, 1], q[3], q[4], 10)), hf);
  part(lo, b.build());
  return {up, lo, front};
}
// Pose de galope. p va de 0 a 1: apoyo mientras la pata barre hacia atrás, y luego vuelo doblada.
export function legPose(leg, p, k, air, rear) {
  let u, l;
  if (p < 0.36) {
    const t = p / 0.36;
    u = lerp(0.68, -0.62, t);
    l = leg.front ? -0.05 - 0.1 * sin(t * PI) : 0.32 + 0.12 * sin(t * PI);
  } else {
    const t = (p - 0.36) / 0.64, e = t * t * (3 - 2 * t), s = sin(t * PI);
    u = lerp(-0.62, 0.68, e);
    l = leg.front ? -0.05 - 1.75 * s : 0.32 + 1.2 * s;
  }
  // Parado o despacio, las patas se acercan a la pose de descanso.
  const r0 = leg.front ? 0 : -0.32, l0 = leg.front ? 0 : 0.34;
  u = lerp(r0, u + (leg.front ? 0 : -0.1), k);
  l = lerp(l0, l, k);
  if (air > 0) {
    // En el salto recoge las manos y estira las patas de atrás.
    const au = leg.front ? 1.05 : -0.85, al = leg.front ? -1.75 : 0.42;
    u = lerp(u, au, air);
    l = lerp(l, al, air);
  }
  if (rear > 0) {
    const au = leg.front ? 1.4 + 0.3 * sin(p * TAU) : -0.72, al = leg.front ? -1.5 - 0.3 * sin(p * TAU) : 0.2;
    u = lerp(u, au, rear);
    l = lerp(l, al, rear);
  }
  leg.up.rotation.x = u;
  leg.lo.rotation.x = l;
}
function buildHorse() {
  initMats();
  setPartLayer(1);
  const root = new T.Group(), tilt = new T.Group(), pivot = new T.Group(), body = new T.Group();
  root.add(tilt);
  tilt.add(pivot);
  pivot.add(body);
  pivot.position.set(0, 0, 0.72);
  body.position.set(0, 0, -0.72);
  scene.add(root);
  Object.assign(HORSE, {root, tilt, pivot, body});
  // Tronco
  const b = new GeoB(), UX = [1, 0, 0], UY = [0, 1, 0];
  const coatF = (ta, tb, q) => (q[1] < 0.96 ? H.belly : H.coat);
  const trunk = [[1.03, 1.24, 0.1, 0.12], [0.97, 1.22, 0.2, 0.25], [0.8, 1.21, 0.3, 0.33], [0.5, 1.21, 0.335, 0.35], [0.15, 1.18, 0.3, 0.31], [-0.2, 1.19, 0.3, 0.35], [-0.52, 1.23, 0.3, 0.385], [-0.72, 1.27, 0.25, 0.34], [-0.86, 1.32, 0.13, 0.18]];
  b.loft(trunk.map((q) => ring([0, q[1], q[0]], UX, UY, q[2], q[3], 18)), coatF);
  // Cuello
  const nA = [0, 1.36, -0.62], nB = [0, 1.9, -1.2], nV = [0, 0.73, 0.68];
  const neckK = 6, nk = [];
  for (let i = 0; i <= neckK; i++) {
    const t = i / neckK, c = [0, lerp(nA[1], nB[1], t) + sin(t * PI) * 0.03, lerp(nA[2], nB[2], t)];
    nk.push(ring(c, UX, nV, lerp(0.2, 0.105, t), lerp(0.31, 0.155, t), 14));
  }
  b.loft(nk, H.coat);
  part(body, b.build());
  // Crin en picos a lo largo del cuello
  const mn = new GeoB();
  for (let i = 0; i < 11; i++) {
    const t = i / 10, c = [0, lerp(nA[1], nB[1], t) + nV[1] * lerp(0.29, 0.15, t), lerp(nA[2], nB[2], t) + nV[2] * lerp(0.29, 0.15, t)];
    const s = i % 2 ? 1 : -1;
    mn.blade([c, [s * 0.05, c[1] + 0.14, c[2] + 0.16], [s * 0.1, c[1] + 0.1, c[2] + 0.34]], [0, 0.5, -0.85], 0.075, H.mane, 0.012);
  }
  part(body, mn.build());
  // Sudadero y montura
  const sa = new GeoB();
  const blanketRow = (z) => {
    const yc = 1.2, o = [], rx = 0.325, ry = 0.365;
    for (let k = 0; k <= 12; k++) {
      const a = lerp(0.42, PI - 0.42, k / 12);
      o.push([cos(a) * rx, yc + sin(a) * ry, z]);
    }
    for (let k = 12; k >= 0; k--) {
      const a = lerp(0.42, PI - 0.42, k / 12);
      o.push([cos(a) * (rx - 0.03), yc + sin(a) * (ry - 0.03), z]);
    }
    return o;
  };
  [[-0.44, -0.37, H.band], [-0.37, -0.22, H.blanket], [-0.22, -0.16, H.band2], [-0.16, 0, H.blanket], [0, 0.06, H.band2], [0.06, 0.22, H.blanket], [0.22, 0.29, H.band]].forEach(([z0, z1, c]) => sa.loft([blanketRow(z0), blanketRow(z1)], c));
  sa.sph([0, 1.565, -0.08], [0.165, 0.055, 0.28], H.leather, 0, 7, 10);
  sa.sph([0, 1.6, -0.33], [0.05, 0.065, 0.05], H.leatherL, 0, 5, 7);
  sa.sph([0, 1.62, 0.17], [0.12, 0.075, 0.05], H.leatherL, 0, 5, 7);
  // Cincha
  sa.curve(Array.from({length: 13}, (_, i) => {
    const a = lerp(0.42, TAU - (0.42 + PI - PI), 0) + (i / 12) * (PI + 2 * 0.42) * -1 + 0.42;
    return [cos(a) * 0.325, 1.2 + sin(a) * 0.365, -0.2];
  }), () => 0.02, H.leather, 5);
  [-1, 1].forEach((s) => {
    sa.tube([s * 0.32, 1.3, -0.08], [s * 0.44, 0.95, -0.14], 0.012, 0.012, H.leather, 4);
  });
  part(body, sa.build());
  // Cabeza
  const neck = new T.Group();
  neck.position.set(0, 1.92, -1.24);
  body.add(neck);
  HORSE.neck = neck;
  const h = new GeoB();
  const hd = [[0.1, 0.06, 0.12, 0.14], [0, 0, 0.14, 0.165], [-0.14, -0.1, 0.125, 0.14], [-0.28, -0.21, 0.098, 0.11], [-0.42, -0.31, 0.095, 0.1], [-0.49, -0.345, 0.06, 0.06]];
  const axisV = [0, 0.65, 0.76];
  h.loft(hd.map((q) => ring([0, q[1], q[0]], UX, axisV, q[2], q[3], 14)), (ta, tb, q) => (ta > 0.72 ? mixC(H.belly, H.mane, 0.55) : H.coat));
  // Estrella blanca en la frente
  h.sph([0, 0.102, -0.118], [0.046, 0.075, 0.03], H.blaze, 0, 6, 8);
  [-1, 1].forEach((s) => {
    // Ojos de anime
    h.sph([s * 0.128, 0.04, -0.055], [0.022, 0.04, 0.038], H.eye, 0, 6, 8);
    h.sph([s * 0.143, 0.055, -0.068], [0.006, 0.012, 0.012], C.white, 0.5, 4, 5);
    h.curve([[s * 0.12, 0.1, -0.02], [s * 0.138, 0.102, -0.07], [s * 0.122, 0.085, -0.115]], () => 0.007, H.mane, 4);
    // Orejas
    h.loft([[0, 0.14, 0.045, 0.042, 0.03], [0.05, 0.25, 0.06, 0.032, 0.022], [0.09, 0.33, 0.07, 0.002, 0.002]].map((q) => ring([s * (0.075 + q[0] * 0.3), q[1], q[2]], UX, [0, 0, 1], q[3], q[4], 7)), H.coat);
    // Fosas y freno
    h.sph([s * 0.058, -0.3, -0.465], 0.017, H.eye, 0, 3, 5);
    h.sph([s * 0.1, -0.315, -0.37], 0.02, H.metal, 0, 4, 5);
  });
  // Copete
  [-0.05, 0, 0.05].forEach((x, i) => h.blade([[x, 0.15, 0.03], [x * 1.3, 0.14, -0.06], [x * 1.6, 0.06, -0.12 - i * 0.01]], [1, 0, 0], 0.05, H.mane, 0.01));
  // Cabezada roja
  h.curve(Array.from({length: 13}, (_, i) => {
    const a = (i / 12) * TAU;
    return [cos(a) * 0.105, -0.235 + sin(a) * 0.075, -0.3 + sin(a) * -0.088];
  }), () => 0.009, H.blanket, 4);
  [-1, 1].forEach((s) => h.tube([s * 0.105, -0.235, -0.3], [s * 0.115, 0.13, 0.03], 0.008, 0.008, H.blanket, 4));
  part(neck, h.build());
  // Riendas: del freno a las manos
  HORSE.gripL = new T.Object3D();
  HORSE.gripR = new T.Object3D();
  const gripY = 1.82, gripZ = -0.42;
  HORSE.gripL.position.set(-0.1, gripY, gripZ);
  HORSE.gripR.position.set(0.1, gripY, gripZ);
  body.add(HORSE.gripL, HORSE.gripR);
  const rn = new GeoB();
  [-1, 1].forEach((s) => {
    rn.curve([[s * 0.1, gripY, gripZ], [s * 0.14, gripY - 0.04, gripZ - 0.3], [s * 0.16, 1.8, -1.2], [s * 0.1, 1.92 - 0.315, -1.24 - 0.37]], () => 0.007, H.rein, 4);
  });
  part(body, rn.build(), false);
  // Patas
  const legDefs = [
    {x: -0.17, y: 1.06, z: 0.72, front: false}, {x: 0.17, y: 1.06, z: 0.72, front: false},
    {x: -0.18, y: 1.08, z: -0.58, front: true}, {x: 0.18, y: 1.08, z: -0.58, front: true},
  ];
  HORSE.legs = legDefs.map((d, i) => buildQuadLeg(body, Object.assign({upper: 0.5, lower: 0.46, r0: d.front ? 0.11 : 0.145, r1: 0.06, r2: 0.04, col: H.coat, colLow: H.coatD, sock: i === 1 || i === 2 ? H.sock : null}, d)));
  // Repartidor montado
  const rider = new T.Group();
  rider.position.set(0, 1.63, 0.02);
  body.add(rider);
  HORSE.rider = rider;
  buildTorso(rider);
  HORSE.arms = buildArms(rider);
  HORSE.head = buildHead(rider);
  const geos = buildLegGeos();
  HORSE.rLegs = [-1, 1].map((s) => {
    const l = buildLeg(body, geos, s * 0.13, 1.6, 0.04, s);
    l.root.rotation.z = s * 0.5;
    return l;
  });
  // Paquete amarrado atrás de la montura
  HORSE.pkg = buildPackage(body, 0, 1.53, 0.58, 0.9);
  const rope = new GeoB();
  rope.curve([[-0.3, 1.26, 0.58], [-0.25, 1.53, 0.6], [0.25, 1.53, 0.6], [0.3, 1.26, 0.58]], () => 0.011, H.leather, 4);
  part(body, rope.build(), false);
  // Cola y faja
  HORSE.tail = buildRibbon({N: 13, seg: 0.095, width: (t) => 0.035 + 0.1 * sin(min(t * 1.25, 1) * PI * 0.75) * (1 - t * t * 0.5), fragment: FS_TAIL, uniforms: {uCol: {value: new T.Color(H.mane[0], H.mane[1], H.mane[2])}}});
  HORSE.scarf = buildRibbon({N: 14, seg: 0.1});
  const stub = new GeoB();
  stub.sph([0, 1.36, 1.02], [0.075, 0.1, 0.09], H.mane, 0, 6, 8);
  part(body, stub.build());
}
const PH = [0, 0.11, 0.52, 0.63];
const _h = new T.Vector3();
let prevP = [0, 0, 0, 0];
// s: {x,y,speed,steer,air,crouch,brake,pkg,time,dt,spin,pitch,scale,rear,vy,onStep,water}
function updateHorse(s) {
  const r = HORSE.root;
  r.position.set(s.x, s.y, 0);
  r.scale.setScalar(s.scale);
  const pull = s.pull || 0;
  r.rotation.y = -s.steer * 0.2 + (s.spin || 0) + pull * 0.12;
  HORSE.tilt.rotation.z = -s.steer * 0.2;
  const k = clamp(s.speed / 7);
  // Zancada: más larga que rápida para que se lea como galope y no como patinaje.
  HORSE.phase += ((s.air ? 0 : 0.6) + s.speed * 0.082) * s.dt;
  const ph = HORSE.phase % 1;
  const air = s.air ? clamp((s.y - 0.02) * 2.2) : 0;
  HORSE.rear = damp(HORSE.rear, s.rear || 0, s.rear ? 9 : 5, s.dt);
  const rear = HORSE.rear;
  HORSE.legs.forEach((leg, i) => {
    const p = (ph + PH[i]) % 1;
    legPose(leg, p, k, air, rear);
    if (p < prevP[i] && !s.air && k > 0.4 && s.onStep) s.onStep(i, leg.front);
    prevP[i] = p;
  });
  const beat = sin(ph * TAU * 2 + 0.6), rock = sin(ph * TAU + 0.9);
  const vyP = s.air ? clamp((s.vy || 0) * 0.038, -0.42, 0.42) : 0;
  HORSE.pivot.rotation.x = rock * 0.075 * k + vyP + rear * 0.92 + (s.brake ? 0.05 : 0);
  HORSE.body.position.y = (0.03 + beat * 0.055) * k * (s.air ? 0 : 1);
  HORSE.neck.rotation.x = -rock * 0.09 * k - rear * 0.25 + (s.brake ? 0.22 : 0);
  // Cuando se jala, Turbo voltea la cabeza a la izquierda.
  HORSE.neck.rotation.y = -s.steer * 0.28 + pull * 0.7;
  // El repartidor acompaña el movimiento con un poco de retraso.
  const lean = damp(HORSE.rider.rotation.x, s.crouch ? -0.46 : s.brake ? 0.1 : -0.2 - rear * 0.5 + (s.air ? -0.2 : 0), 8, s.dt);
  HORSE.rider.rotation.x = lean - rock * 0.05 * k;
  HORSE.rider.rotation.z = s.steer * 0.1 - pull * 0.2;
  HORSE.rider.position.y = 1.63 + sin(ph * TAU * 2 - 0.5) * 0.028 * k;
  HORSE.head.rotation.x = -lean * 0.85;
  HORSE.head.rotation.y = s.steer * 0.32;
  HORSE.rLegs.forEach((leg) => {
    leg.hip.rotation.x = s.crouch ? 1.2 : 1.02;
    leg.knee.rotation.x = s.crouch ? -1.62 : -1.42;
    leg.foot.rotation.x = 0.45;
  });
  updatePackage(HORSE.pkg, s);
  r.updateMatrixWorld(true);
  HORSE.arms.forEach((arm, i) => {
    _h.setFromMatrixPosition((i === 0 ? HORSE.gripL : HORSE.gripR).matrixWorld);
    HORSE.rider.worldToLocal(_h);
    armIK(arm, _h, [0.7, -0.6, 0.45]);
  });
  const q = worldOf(HORSE.rider, NECK_KNOT[0], NECK_KNOT[1], NECK_KNOT[2]);
  updateRibbon(HORSE.scarf, q.x, q.y, q.z, s.dt, 1.5 + s.speed * 0.8, s.time);
  const t = worldOf(HORSE.body, 0, 1.36, 1.05);
  updateRibbon(HORSE.tail, t.x, t.y, t.z, s.dt, 1.2 + s.speed * 0.58, s.time + 3, 62, 0.55);
}
export const HORSE_V = {
  id: 'horse',
  phys: {jumpV: 11.6, grav: 26, steer: 9.5, steerRel: 15, vx: 12.5, sprint: 1.3, drain: 1 / 4, regen: 0.12, accel: 8, halfW: 0.44, jumpH: 1.9, scale: 1.16, scaleV: 1.02, sink: 0.26},
  cam: {y: 3.3, z: 7, lookY: 1.42, heroX: -3.6, heroZ: 6.1, heroY: 1.25, heroLook: 2.25, finish: [5.4, 1.3, 7.4], cutH: 1.75},
  build: buildHorse,
  update: updateHorse,
  kick(v) { HORSE.pkg.v += v; },
  setVisible(b) {
    HORSE.root.visible = b;
    HORSE.scarf.m.visible = b;
    HORSE.tail.m.visible = b;
  },
  reset() {
    HORSE.body.updateWorldMatrix(true, false);
    HORSE.rider.updateWorldMatrix(true, false);
    const q = worldOf(HORSE.rider, NECK_KNOT[0], NECK_KNOT[1], NECK_KNOT[2]);
    resetRibbon(HORSE.scarf, q.x, q.y, q.z);
    const t = worldOf(HORSE.body, 0, 1.36, 1.05);
    resetRibbon(HORSE.tail, t.x, t.y, t.z);
  },
  call() { return 'neigh'; },
};
