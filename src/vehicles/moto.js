// La Chilera: la moto roja del Brayan, el sobrino de Don Chema. El repartidor va con casco,
// el paquete amarrado con pulpo en la parrilla de atrás. Frente a -z.
import * as T from 'three';
import {GeoB, hex} from '../core/geo.js';
import {scene, U} from '../core/gfx.js';
import {VS_TEX, FS_TEX} from '../core/shaders.js';
import {PI, TAU, abs, cos, sin, sqrt, atan2, acos, min, clamp, damp, lerp, sstep} from '../core/util.js';
import {C, initMats, part, setPartLayer, dome, L1, L2, NECK_KNOT, buildTorso, buildArms, armIK, buildHead, buildLegGeos, buildLeg, buildPackage, updatePackage, buildRibbon, updateRibbon, resetRibbon, worldOf} from './rider.js';

const K = {
  red: hex('#d8262c'), redD: hex('#9e1a22'), oro: hex('#ffc91f'), turq: hex('#12b5b0'), cream: hex('#fff3d6'), white: hex('#fbfaf6'),
  chrome: hex('#dcdad6'), chromeD: hex('#8f8d8a'), metal: hex('#4a4f58'), metalD: hex('#2a2d34'), tire: hex('#1a1416'), ink: hex('#17100e'),
  seat: hex('#2a1f1c'), lamp: hex('#fff1c4'), tail: hex('#ff2b2b'), amber: hex('#ffab1f'), strapA: hex('#e3262f'), strapB: hex('#ffc91f'),
};
const R_W = 0.33, FZ = -0.7, RZ = 0.64, HEAD = [0, 0.98, -0.47];
// Cadera, puños y pedales del piloto, en coordenadas de la moto.
const HIP = [0.12, 0.94, 0.2], PEG = [0.2, 0.44, -0.02], GRIP = [0.36, 0.1, 0.04];
export const MOTO = {root: null, tilt: null, front: null, bar: null, wheels: [], body: null, head: null, arms: null, legs: null, pkg: null, scarf: null, brake: null, lean: 0};

function plateTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 160;
  const x = cv.getContext('2d');
  const draw = () => {
    x.fillStyle = '#d8262c';
    x.fillRect(0, 0, 512, 160);
    x.fillStyle = '#ffc91f';
    x.fillRect(0, 0, 512, 16);
    x.fillRect(0, 144, 512, 16);
    x.font = '400 70px "Shrikhand","Arial Black",Impact,sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.lineWidth = 10;
    x.strokeStyle = '#17100e';
    x.strokeText('La Chilera', 256, 84);
    x.fillStyle = '#fff3d6';
    x.fillText('La Chilera', 256, 84);
  };
  draw();
  const tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  if (document.fonts && document.fonts.load) document.fonts.load('400 70px "Shrikhand"').then(() => {
    draw();
    tex.needsUpdate = true;
  }, () => {});
  return tex;
}
// Llanta de rin de cinco rayos
function wheelGeo() {
  const b = new GeoB(), w = 0.065;
  b.tube([-w, 0, 0], [w, 0, 0], R_W, R_W, K.tire, 18);
  [-1, 1].forEach((s) => {
    b.tube([s * w, 0, 0], [s * (w + 0.008), 0, 0], R_W * 0.68, R_W * 0.68, K.chromeD, 16);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      b.box(s * (w + 0.016), cos(a) * R_W * 0.36, sin(a) * R_W * 0.36, 0.008, 0.02 + abs(sin(a)) * 0.13, 0.02 + abs(cos(a)) * 0.13, K.chrome);
    }
    b.tube([s * (w + 0.01), 0, 0], [s * (w + 0.03), 0, 0], 0.07, 0.06, K.chrome, 10);
  });
  return b.build();
}
// Casco abierto: blanco con franja roja y visera, la cara se ve.
function helmetGeo() {
  const b = new GeoB(), Rh = [0.165, 0.176, 0.17];
  const front = (th) => cos(th - PI * 1.5);
  dome(b, [0, 0.04, 0.012], [Rh[0] * 1.3, Rh[1] * 1.3, Rh[2] * 1.3], (th) => lerp(1.98, 1.0, sstep(-0.3, 0.72, front(th))), (ta, tb, q) => (abs(q[0]) < 0.042 && q[1] > 0.08 ? K.red : q[1] < -0.02 ? K.turq : K.white), 36, 7);
  const br = [];
  for (let k = 0; k <= 4; k++) {
    const u = k / 4, cz = -0.17 - 0.12 * u, w = 0.17 - 0.06 * u * u, y = 0.165 - 0.02 * u, o = [];
    for (let j = 0; j < 12; j++) {
      const a = (j / 12) * TAU, cx = cos(a);
      o.push([cx * w, y + sin(a) * 0.012 - 0.03 * cx * cx, cz]);
    }
    br.push(o);
  }
  b.loft(br, K.red);
  [-1, 1].forEach((s) => b.curve([[s * 0.2, -0.04, 0.02], [s * 0.14, -0.15, -0.05], [s * 0.06, -0.2, -0.1], [0, -0.21, -0.11]], () => 0.009, K.ink, 4));
  return b.build();
}
function buildMoto() {
  initMats();
  setPartLayer(1);
  const root = new T.Group(), tilt = new T.Group();
  root.add(tilt);
  scene.add(root);
  MOTO.root = root;
  MOTO.tilt = tilt;
  const b = new GeoB();
  // Cuadro, motor y escape
  b.tube(HEAD, [0, 0.86, 0.12], 0.04, 0.04, K.metalD, 8);
  b.tube([0, 0.9, -0.42], [0, 0.42, -0.2], 0.036, 0.036, K.metalD, 8);
  b.tube([0, 0.86, 0.12], [0, 0.42, 0.06], 0.034, 0.034, K.metalD, 8);
  b.box(0, 0.47, -0.08, 0.13, 0.15, 0.2, K.metal);
  b.tube([0, 0.56, -0.2], [0, 0.78, -0.34], 0.1, 0.085, K.metal, 10);
  for (let i = 0; i < 4; i++) b.tube([0, 0.6 + i * 0.045, -0.23 - i * 0.027], [0, 0.615 + i * 0.045, -0.24 - i * 0.027], 0.125, 0.125, K.chromeD, 10);
  b.tube([0.09, 0.4, -0.18], [0.16, 0.36, 0.2], 0.035, 0.035, K.chrome, 7);
  b.tube([0.16, 0.36, 0.2], [0.19, 0.5, 0.78], 0.05, 0.06, K.chrome, 9);
  b.tube([0.19, 0.5, 0.78], [0.2, 0.52, 0.86], 0.045, 0.04, K.ink, 8);
  // Basculante y amortiguadores con resorte amarillo
  [-1, 1].forEach((s) => {
    b.tube([s * 0.08, 0.44, 0.05], [s * 0.08, R_W, RZ], 0.025, 0.022, K.metalD, 6);
    b.tube([s * 0.11, 0.84, 0.44], [s * 0.09, 0.4, RZ - 0.06], 0.022, 0.022, K.chrome, 6);
    b.tube([s * 0.11, 0.78, 0.46], [s * 0.095, 0.48, RZ - 0.08], 0.042, 0.042, K.oro, 8);
  });
  // Tanque rojo con franja, asiento negro y tapas laterales
  b.sph([0, 0.96, -0.16], [0.17, 0.12, 0.3], K.red, 0, 8, 12);
  [-1, 1].forEach((s) => {
    b.box(s * 0.155, 0.96, -0.14, 0.012, 0.03, 0.17, K.oro);
    b.box(s * 0.16, 0.96, -0.14, 0.01, 0.012, 0.14, K.white);
  });
  b.tube([0, 1.07, -0.24], [0, 1.09, -0.24], 0.04, 0.04, K.chrome, 8);
  b.box(0, 0.93, 0.27, 0.13, 0.05, 0.3, K.seat);
  b.box(0, 0.965, 0.27, 0.1, 0.02, 0.27, mixSeat());
  b.box(0, 0.76, 0.3, 0.12, 0.09, 0.22, K.red);
  [-1, 1].forEach((s) => b.box(s * 0.125, 0.76, 0.3, 0.004, 0.04, 0.14, K.white));
  // Guardafango de atrás, calavera y parrilla
  b.curve(Array.from({length: 9}, (_, i) => {
    const a = -0.35 + (i / 8) * 1.7;
    return [0, R_W + cos(a) * 0.42, RZ + sin(a) * 0.42];
  }), () => 0.06, K.red, 7);
  b.box(0, 0.8, 0.98, 0.1, 0.035, 0.035, K.ink);
  [-1, 1].forEach((s) => b.box(s * 0.16, 0.8, 0.95, 0.035, 0.03, 0.03, K.amber, 1.2));
  b.box(0, 0.98, 0.7, 0.17, 0.015, 0.24, K.chromeD);
  [-1, 1].forEach((s) => {
    b.tube([s * 0.17, 0.98, 0.48], [s * 0.17, 0.98, 0.93], 0.016, 0.016, K.chrome, 5);
    b.tube([s * 0.17, 0.98, 0.9], [s * 0.12, 0.8, 0.86], 0.014, 0.014, K.chrome, 5);
  });
  // Pedales del piloto
  [-1, 1].forEach((s) => b.tube([s * 0.1, PEG[1], PEG[2]], [s * 0.24, PEG[1], PEG[2]], 0.02, 0.02, K.ink, 5));
  part(tilt, b.build());
  // Placa con el nombre, viendo hacia atrás
  const plate = new T.Mesh(new T.PlaneGeometry(0.42, 0.13), new T.ShaderMaterial({vertexShader: VS_TEX, fragmentShader: FS_TEX, uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uSunCol: U.uSunCol, uShade: U.uShade, uMap: {value: plateTexture()}}}));
  plate.position.set(0, 0.68, 0.99);
  plate.rotation.x = -0.25;
  plate.frustumCulled = false;
  plate.layers.enable(1);
  tilt.add(plate);
  const tl = new GeoB(), tb = new GeoB();
  tl.box(0, 0.86, 0.99, 0.07, 0.035, 0.02, K.tail, 1.1);
  tb.box(0, 0.86, 1.0, 0.09, 0.05, 0.02, K.tail, 4.5);
  part(tilt, tl.build(), false);
  MOTO.brake = part(tilt, tb.build(), false);
  MOTO.brake.visible = false;
  // Dirección: horquilla, foco, guardafango, manubrio y llanta de adelante. Gira desde el cabezal.
  const front = new T.Group();
  front.position.set(HEAD[0], HEAD[1], HEAD[2]);
  tilt.add(front);
  MOTO.front = front;
  const f = new GeoB(), ax = [0, R_W - HEAD[1], FZ - HEAD[2]];
  [-1, 1].forEach((s) => {
    f.tube([s * 0.075, 0.08, 0.02], [s * 0.075, ax[1] + 0.1, ax[2] + 0.03], 0.03, 0.03, K.chrome, 6);
    f.tube([s * 0.075, ax[1] + 0.32, ax[2] + 0.09], [s * 0.075, ax[1], ax[2]], 0.04, 0.036, K.metal, 6);
  });
  f.curve(Array.from({length: 8}, (_, i) => {
    const a = -1.25 + (i / 7) * 1.65;
    return [0, ax[1] + cos(a) * 0.4, ax[2] + sin(a) * 0.4];
  }), () => 0.05, K.red, 7);
  // Foco con su aro de cromo
  f.tube([0, -0.03, -0.06], [0, -0.03, -0.15], 0.11, 0.125, K.chrome, 12);
  f.tube([0, -0.03, -0.15], [0, -0.03, -0.16], 0.1, 0.1, K.lamp, 12, 2.8);
  [-1, 1].forEach((s) => f.sph([s * 0.17, -0.05, -0.08], [0.03, 0.025, 0.04], K.amber, 1.6, 4, 6));
  part(front, f.build());
  const wg = wheelGeo();
  const wf = part(front, wg);
  wf.position.set(0, ax[1], ax[2]);
  MOTO.wheels.push(wf);
  const wr = part(tilt, wg);
  wr.position.set(0, R_W, RZ);
  MOTO.wheels.push(wr);
  // Manubrio con espejos y puños
  const bar = new T.Group();
  bar.position.set(0, 0.12, 0.02);
  front.add(bar);
  MOTO.bar = bar;
  const h = new GeoB();
  h.tube([0, -0.06, 0], [0, 0.02, 0.02], 0.03, 0.03, K.metalD, 6);
  h.curve([[-GRIP[0], GRIP[1], GRIP[2]], [-0.2, 0.05, 0.03], [0, 0.03, 0.02], [0.2, 0.05, 0.03], [GRIP[0], GRIP[1], GRIP[2]]], () => 0.016, K.chromeD, 6);
  [-1, 1].forEach((s) => {
    h.tube([s * (GRIP[0] - 0.08), GRIP[1] - 0.005, GRIP[2]], [s * (GRIP[0] + 0.03), GRIP[1] + 0.003, GRIP[2] + 0.004], 0.026, 0.026, K.tire, 6);
    h.tube([s * 0.22, 0.06, 0.02], [s * 0.28, 0.3, 0.06], 0.009, 0.009, K.chromeD, 4);
    h.sph([s * 0.29, 0.33, 0.065], [0.055, 0.04, 0.012], K.ink, 0, 4, 7);
  });
  part(bar, h.build());
  // El repartidor: sentado, un poco agachado, con casco
  const body = new T.Group();
  body.position.set(0, HIP[1] + 0.04, HIP[2] - 0.02);
  tilt.add(body);
  MOTO.body = body;
  buildTorso(body);
  MOTO.arms = buildArms(body);
  MOTO.head = buildHead(body, {cap: false});
  part(MOTO.head, helmetGeo());
  const geos = buildLegGeos();
  MOTO.legs = [-1, 1].map((s) => {
    const lg = buildLeg(tilt, geos, HIP[0] * s, HIP[1], HIP[2], s);
    lg.root.rotation.z = s * 0.22;
    return lg;
  });
  // El paquete va en la parrilla, amarrado con pulpo.
  MOTO.pkg = buildPackage(tilt, 0, 0.995, 0.7, 1.05);
  const st = new GeoB();
  [[-0.12, K.strapA], [0.12, K.strapB]].forEach(([x, c]) => {
    st.curve([[x, -0.02, -0.25], [x, 0.37, -0.25], [x, 0.41, -0.2], [x, 0.41, 0.2], [x, 0.37, 0.25], [x, -0.02, 0.25]], () => 0.014, c, 5);
  });
  part(MOTO.pkg.group, st.build(), false);
  MOTO.scarf = buildRibbon({N: 14, seg: 0.1, width: (t) => 0.075 * (1 - t * 0.25)});
}
function mixSeat() {
  return [K.seat[0] * 1.35, K.seat[1] * 1.35, K.seat[2] * 1.35];
}
// Piernas: de la cadera al pedal, con la rodilla hacia adelante.
function legIK(leg, footY, footZ) {
  const ty = footY - HIP[1], tz = footZ - HIP[2];
  const d = min(sqrt(ty * ty + tz * tz), L1 + L2 - 0.002);
  const a = atan2(-tz, -ty);
  const bb = acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const g = acos(clamp((L2 * L2 + d * d - L1 * L1) / (2 * L2 * d), -1, 1));
  leg.hip.rotation.x = a + bb;
  leg.knee.rotation.x = -(bb + g);
  leg.foot.rotation.x = g - a - 0.1;
}
const _t = new T.Vector3();
// s: {x,y,speed,steer,air,crouch,brake,pkg,time,dt,spin,pitch,scale,rough}
function updateMoto(s) {
  const r = MOTO.root, tl = MOTO.tilt;
  r.position.set(s.x, s.y, 0);
  r.scale.setScalar(s.scale);
  r.rotation.y = -s.steer * 0.16 + (s.spin || 0);
  // Se acuesta en las curvas, levanta la trompa al acelerar y la clava al frenar.
  MOTO.lean = damp(MOTO.lean, s.air ? s.steer * -0.1 : -s.steer * 0.36, 9, s.dt);
  const rough = s.air ? 0 : (s.rough || 0) * clamp(s.speed / 18);
  tl.rotation.z = MOTO.lean + sin(s.time * 41) * 0.006 * (1 + rough * 2);
  tl.rotation.x = damp(tl.rotation.x, (s.pitch || 0) + (s.air ? 0 : s.crouch ? 0.045 : s.brake ? -0.035 : 0), 6, s.dt);
  tl.position.y = s.air ? 0 : abs(sin(s.time * 31)) * 0.012 * (0.3 + rough * 1.5);
  MOTO.wheels.forEach((w) => (w.rotation.x -= (s.speed * s.dt) / R_W));
  MOTO.front.rotation.y = -s.steer * 0.3;
  MOTO.brake.visible = !!s.brake;
  // Agachado cuando acelera, derecho cuando frena.
  const lean = damp(MOTO.body.rotation.x, s.crouch ? -0.34 : s.brake ? 0.04 : -0.16, 8, s.dt);
  MOTO.body.rotation.x = lean;
  MOTO.body.rotation.z = s.steer * 0.08;
  MOTO.head.rotation.x = -lean * 0.7 - 0.06;
  MOTO.head.rotation.y = s.steer * 0.32;
  MOTO.legs.forEach((leg) => legIK(leg, PEG[1] + 0.06 + (s.air ? 0.06 : 0), PEG[2] + 0.02));
  updatePackage(MOTO.pkg, s);
  r.updateMatrixWorld(true);
  MOTO.arms.forEach((arm) => {
    _t.set(arm.side * GRIP[0], GRIP[1] + 0.012, GRIP[2] + 0.01);
    MOTO.bar.localToWorld(_t);
    MOTO.body.worldToLocal(_t);
    armIK(arm, _t, [0.85, -0.45, 0.25]);
  });
  const q = worldOf(MOTO.body, NECK_KNOT[0], NECK_KNOT[1] + 0.02, NECK_KNOT[2] + 0.02);
  updateRibbon(MOTO.scarf, q.x, q.y, q.z, s.dt, 2 + s.speed * 0.9, s.time, 14, 1.2);
}
export const MOTO_V = {
  id: 'moto',
  phys: {jumpV: 9.7, grav: 25, steer: 12, steerRel: 18, vx: 14, sprint: 1.27, drain: 1 / 3.5, regen: 0.15, accel: 11, halfW: 0.42, jumpH: 1.15, scale: 1.1, scaleV: 1.0, sink: 0},
  cam: {y: 2.9, z: 7.0, lookY: 1.2, heroX: -2.9, heroZ: 4.8, heroY: 1.05, heroLook: 1.85, finish: [6, 1.35, 6.6], cutH: 1.35},
  build: buildMoto,
  update: updateMoto,
  kick(v) { MOTO.pkg.v += v; },
  setVisible(v) {
    MOTO.root.visible = v;
    MOTO.scarf.m.visible = v;
  },
  reset() {
    MOTO.root.updateMatrixWorld(true);
    const q = worldOf(MOTO.body, NECK_KNOT[0], NECK_KNOT[1] + 0.02, NECK_KNOT[2] + 0.02);
    resetRibbon(MOTO.scarf, q.x, q.y, q.z);
  },
  call() { return 'claxon'; },
};
// Punta del escape en el mundo: de ahí sale el humito al acelerar.
export function motoExhaust() {
  return worldOf(MOTO.tilt, 0.2, 0.52, 0.9);
}
