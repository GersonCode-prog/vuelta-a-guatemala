// La bicicleta de reparto de Monterrico.
import * as T from 'three';
import {GeoB} from '../core/geo.js';
import {scene} from '../core/gfx.js';
import {PI, cos, sin, sqrt, atan2, acos, min, clamp, damp} from '../core/util.js';
import {C, initMats, part, setPartLayer, L1, L2, NECK_KNOT, buildTorso, buildArms, armIK, buildHead, buildLegGeos, buildLeg, buildPackage, updatePackage, buildRibbon, updateRibbon, resetRibbon, worldOf} from './rider.js';

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
const HIP = [0.1, 1.0, 0.16], GRIP = [0.33, 0.33, 0.02];
export const BIKE = {id: 'bike', root: null, tilt: null, parts: {}, crank: 0, scarf: null, pkg: null};
function buildBike() {
  initMats();
  setPartLayer(1);
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
  // Repartidor
  const body = new T.Group();
  body.position.set(0, 1.0, 0.16);
  tilt.add(body);
  BIKE.body = body;
  buildTorso(body);
  BIKE.arms = buildArms(body);
  BIKE.head = buildHead(body);
  const geos = buildLegGeos();
  BIKE.legs = [-1, 1].map((s) => buildLeg(tilt, geos, HIP[0] * s, HIP[1], HIP[2], s));
  BIKE.pkg = buildPackage(tilt, 0, 0.85, 0.54);
  BIKE.scarf = buildRibbon({N: 14, seg: 0.1});
}
function legIK(leg, footY, footZ) {
  const ty = footY - HIP[1], tz = footZ - HIP[2];
  const d = min(sqrt(ty * ty + tz * tz), L1 + L2 - 0.002);
  const a = atan2(-tz, -ty);
  const b = acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const g = acos(clamp((L2 * L2 + d * d - L1 * L1) / (2 * L2 * d), -1, 1));
  leg.hip.rotation.x = a + b;
  leg.knee.rotation.x = -(b + g);
  leg.foot.rotation.x = g - a - 0.18 * sin(BIKE.crank + (leg.side > 0 ? PI : 0));
}
const _w = new T.Vector3();
// s: {x,y,speed,steer,air,crouch,brake,pkg,time,dt,spin,pitch,scale}
function updateBike(s) {
  const r = BIKE.root, tl = BIKE.tilt;
  r.position.set(s.x, s.y, 0);
  r.scale.setScalar(s.scale);
  r.rotation.y = -s.steer * 0.22 + (s.spin || 0);
  // Con viento de lado se inclina contra él.
  tl.rotation.z = -s.steer * 0.42 - (s.pull || 0) * 0.12;
  tl.rotation.x = s.pitch || 0;
  BIKE.front.rotation.y = -s.steer * 0.34;
  BIKE.parts.wheelF.rotation.x -= (s.speed * s.dt) / 0.37;
  BIKE.parts.wheelR.rotation.x -= (s.speed * s.dt) / 0.37;
  const pedal = s.air ? 0.25 : s.brake ? 0 : s.speed * 0.62 + (s.crouch ? 3 : 0);
  BIKE.crank += pedal * s.dt;
  BIKE.parts.crank.rotation.x = -BIKE.crank;
  const lean = damp(BIKE.body.rotation.x, s.crouch ? -0.3 : s.brake ? 0.14 : -0.06, 8, s.dt);
  BIKE.body.rotation.x = lean;
  BIKE.body.rotation.z = sin(BIKE.crank) * (s.crouch ? 0.16 : 0.06);
  BIKE.head.rotation.x = -lean * 0.8;
  BIKE.head.rotation.y = s.steer * 0.3;
  BIKE.legs.forEach((leg) => {
    const a = BIKE.crank + (leg.side > 0 ? PI : 0);
    legIK(leg, 0.37 + 0.17 * sin(a) + 0.08, -0.02 + 0.17 * cos(a));
  });
  updatePackage(BIKE.pkg, s);
  r.updateMatrixWorld(true);
  BIKE.arms.forEach((arm) => {
    _w.set(arm.side * GRIP[0], GRIP[1] + 0.01, GRIP[2] + 0.035);
    BIKE.front.localToWorld(_w);
    BIKE.body.worldToLocal(_w);
    armIK(arm, _w);
  });
  const q = worldOf(BIKE.body, NECK_KNOT[0], NECK_KNOT[1], NECK_KNOT[2]);
  updateRibbon(BIKE.scarf, q.x, q.y, q.z, s.dt, 1.5 + s.speed * 0.8, s.time);
}
// Interfaz común de vehículos: el juego solo habla con esto.
export const BIKE_V = {
  id: 'bike',
  phys: {jumpV: 9.8, grav: 26, steer: 11, steerRel: 18, vx: 13.5, sprint: 1.26, drain: 1 / 3.4, regen: 0.14, accel: 10, halfW: 0.34, jumpH: 1.05, scale: 1.22, scaleV: 1.05, sink: 0.2},
  cam: {y: 2.72, z: 6.4, lookY: 1.12, heroX: -2.7, heroZ: 4.4, heroY: 1.0, heroLook: 1.85, finish: [6, 1.3, 6], cutH: 1.3},
  build: buildBike,
  update: updateBike,
  kick(v) { BIKE.pkg.v += v; },
  setVisible(b) {
    BIKE.root.visible = b;
    BIKE.scarf.m.visible = b;
  },
  reset() {
    BIKE.body.updateWorldMatrix(true, false);
    const q = worldOf(BIKE.body, NECK_KNOT[0], NECK_KNOT[1], NECK_KNOT[2]);
    resetRibbon(BIKE.scarf, q.x, q.y, q.z);
  },
  call() { return 'bell'; },
};
