// La Chusita: la camioneta roja de Don Chus, con el repartidor al timón y el paquete en la parrilla.
import * as T from 'three';
import {GeoB, hex, mixC} from '../core/geo.js';
import {scene, U} from '../core/gfx.js';
import {VS_TEX, FS_TEX} from '../core/shaders.js';
import {PI, TAU, cos, sin, clamp, damp, lerp} from '../core/util.js';
import {C, initMats, part, setPartLayer, NECK_KNOT, buildTorso, buildArms, armIK, buildHead, buildPackage, updatePackage, buildRibbon, updateRibbon, resetRibbon, worldOf} from './rider.js';

const B = {
  red: hex('#d8262c'), redD: hex('#9e1a22'), oro: hex('#ffc91f'), turq: hex('#12b5b0'), cream: hex('#fff3d6'), white: hex('#f7f4ee'), chrome: hex('#dcdad6'), chromeD: hex('#8f8d8a'),
  glass: hex('#26333f'), tire: hex('#1a1416'), ink: hex('#17100e'), lamp: hex('#fff1c4'), tail: hex('#ff2b2b'), amber: hex('#ffab1f'), seat: hex('#3a2a26'),
  sack: hex('#d8c08a'), basket: hex('#b88a4a'), blue: hex('#1b62c9'), pink: hex('#ff5d7d'), green: hex('#2bae56'),
};
// Frente a -z: la defensa queda en z ≈ -0.3 y la cola en z ≈ 9.2.
const FRONT = -0.3, BACK = 9.25, W = 1.22, FLOOR = 0.62, ROOF = 3.2;
export const BUS = {root: null, tilt: null, wheels: [], arms: null, body: null, head: null, pkg: null, scarf: null, brake: null, tailDim: null, bounce: 0};

function plateTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 128;
  const x = cv.getContext('2d');
  const draw = () => {
    x.fillStyle = '#ffc91f';
    x.fillRect(0, 0, 512, 128);
    x.fillStyle = '#d8262c';
    x.fillRect(0, 0, 512, 16);
    x.fillRect(0, 112, 512, 16);
    x.font = '400 66px "Shrikhand","Arial Black",Impact,sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.lineWidth = 10;
    x.strokeStyle = '#17100e';
    x.strokeText('La Chusita', 256, 66);
    x.fillStyle = '#d8262c';
    x.fillText('La Chusita', 256, 66);
  };
  draw();
  const tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  if (document.fonts && document.fonts.load) document.fonts.load('400 66px "Shrikhand"').then(() => {
    draw();
    tex.needsUpdate = true;
  }, () => {});
  return tex;
}
function wheelGeo(r, dual) {
  const b = new GeoB(), w = dual ? 0.3 : 0.17;
  b.tube([-w, 0, 0], [w, 0, 0], r, r, B.tire, 14);
  [-1, 1].forEach((s) => {
    b.tube([s * w, 0, 0], [s * (w + 0.012), 0, 0], r * 0.6, r * 0.6, B.chrome, 12);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      b.box(s * (w + 0.02), cos(a) * r * 0.36, sin(a) * r * 0.36, 0.01, 0.04, 0.04, B.chromeD);
    }
  });
  return b.build();
}
function buildBus() {
  initMats();
  setPartLayer(1);
  const root = new T.Group(), tilt = new T.Group();
  root.add(tilt);
  scene.add(root);
  BUS.root = root;
  BUS.tilt = tilt;
  const b = new GeoB();
  const zc = (FRONT + 1.7 + BACK) / 2, hz = (BACK - FRONT - 1.7) / 2, yc = (FLOOR + ROOF) / 2, hy = (ROOF - FLOOR) / 2;
  // Carrocería de bus escolar pintada a la chapina
  b.box(0, yc, zc, W, hy, hz, B.red);
  b.box(0, 1.58, zc, W + 0.012, 0.09, hz + 0.01, B.oro);
  b.box(0, 1.4, zc, W + 0.014, 0.05, hz + 0.012, B.turq);
  b.box(0, 1.15, zc, W + 0.012, 0.04, hz + 0.01, B.cream);
  b.box(0, 2.52, zc, W + 0.01, 0.55, hz + 0.006, B.cream);
  b.box(0, ROOF + 0.06, zc, W - 0.03, 0.06, hz - 0.02, B.white);
  // Trompa
  const nz = FRONT + 0.85;
  b.box(0, 1.2, nz, 1.02, 0.58, 0.85, B.red);
  b.box(0, 1.79, nz + 0.1, 0.9, 0.04, 0.72, B.redD);
  b.box(0, 1.12, FRONT - 0.03, 0.66, 0.42, 0.04, B.chrome);
  for (let k = 0; k < 5; k++) b.box(0, 0.86 + k * 0.13, FRONT - 0.07, 0.6, 0.018, 0.02, B.chromeD);
  [-1, 1].forEach((s) => {
    b.sph([s * 0.84, 1.24, FRONT - 0.02], [0.17, 0.17, 0.08], B.lamp, 2.6, 6, 8);
    b.box(s * 0.84, 0.95, FRONT - 0.02, 0.1, 0.06, 0.03, B.amber, 1.8);
    // Espejos
    b.tube([s * 1.0, 1.75, nz - 0.5], [s * 1.55, 2.1, nz - 0.5], 0.025, 0.025, B.chromeD, 4);
    b.box(s * 1.58, 2.3, nz - 0.5, 0.05, 0.28, 0.14, B.ink);
  });
  b.box(0, 0.72, FRONT - 0.12, 1.12, 0.12, 0.1, B.chrome);
  // Parabrisas y ventanas
  const wz = FRONT + 1.72;
  b.box(0, 2.58, wz - 0.01, 1.1, 0.44, 0.02, B.glass);
  b.box(0, 2.58, wz - 0.03, 0.03, 0.44, 0.02, B.ink);
  for (let i = 0; i < 7; i++) {
    const z = wz + 0.9 + i * 0.95;
    [-1, 1].forEach((s) => {
      if (s < 0 && i === 0) return; // la ventana del chofer va abierta
      b.box(s * (W + 0.01), 2.55, z, 0.012, 0.36, 0.38, B.glass);
    });
  }
  // Cola: puerta de emergencia, vidrios, focos y defensa cromada
  const rz = BACK + 0.012;
  b.box(0, 2.55, rz, 0.5, 0.42, 0.012, B.glass);
  [-1, 1].forEach((s) => {
    b.box(s * 0.82, 2.55, rz, 0.28, 0.42, 0.012, B.glass);
    b.box(s * 1.04, 1.2, rz + 0.01, 0.1, 0.16, 0.02, B.amber, 1.2);
  });
  b.box(0, 0.68, BACK + 0.08, 1.24, 0.1, 0.1, B.chrome);
  b.box(0.0, 1.56, rz + 0.005, 0.56, 0.62, 0.012, B.redD);
  // Escalera a la parrilla
  [0.62, 0.92].forEach((x) => b.tube([x, 0.9, BACK + 0.1], [x, ROOF + 0.5, BACK + 0.1], 0.025, 0.025, B.chrome, 4));
  for (let y = 1.0; y < ROOF + 0.4; y += 0.32) b.tube([0.62, y, BACK + 0.1], [0.92, y, BACK + 0.1], 0.018, 0.018, B.chrome, 4);
  // Tubo de escape que sube por la esquina
  b.tube([-1.08, 0.9, BACK - 0.2], [-1.08, ROOF + 0.9, BACK - 0.2], 0.07, 0.07, B.chromeD, 7);
  // Parrilla con bultos
  [-1, 1].forEach((s) => b.box(s * 1.12, ROOF + 0.32, zc, 0.025, 0.14, hz - 0.1, B.chrome));
  for (let z = FRONT + 2.2; z < BACK - 0.2; z += 1.2) b.box(0, ROOF + 0.18, z, 1.1, 0.02, 0.025, B.chromeD);
  [[-0.55, FRONT + 2.6, B.basket, 0.42], [0.45, FRONT + 3.5, B.sack, 0.48], [-0.4, FRONT + 4.6, B.pink, 0.36], [0.5, FRONT + 5.5, B.turq, 0.4], [-0.5, FRONT + 6.5, B.sack, 0.44]].forEach(([x, z, c, s]) => b.box(x, ROOF + 0.18 + s, z, s, s, s * 1.2, c));
  b.tube([0.1, ROOF + 0.32, FRONT + 4.0], [0.1, ROOF + 0.32, FRONT + 4.35], 0.42, 0.42, B.tire, 12);
  // Guardafangos
  [-1, 1].forEach((s) => b.box(s * 1.02, 0.55, BACK - 1.0, 0.24, 0.32, 0.02, B.ink));
  part(tilt, b.build());
  // Nombre pintado atrás
  const plate = new T.Mesh(new T.PlaneGeometry(1.1, 0.28), new T.ShaderMaterial({vertexShader: VS_TEX, fragmentShader: FS_TEX, uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uSunCol: U.uSunCol, uShade: U.uShade, uMap: {value: plateTexture()}}}));
  plate.position.set(0, 1.62, BACK + 0.03);
  plate.frustumCulled = false;
  plate.layers.enable(1);
  tilt.add(plate);
  // Focos de atrás: tenues, y fuertes al frenar
  const tl = new GeoB(), tb = new GeoB();
  [-1, 1].forEach((s) => {
    [1.0, 1.55].forEach((y) => {
      tl.box(s * 1.04, y - 0.3, BACK + 0.03, 0.11, 0.1, 0.02, B.tail, 1.1);
      tb.box(s * 1.04, y - 0.3, BACK + 0.05, 0.14, 0.13, 0.02, B.tail, 4.5);
    });
  });
  BUS.tailDim = part(tilt, tl.build(), false);
  BUS.brake = part(tilt, tb.build(), false);
  BUS.brake.visible = false;
  // Llantas
  const wf = wheelGeo(0.52, false), wr = wheelGeo(0.52, true);
  [[-1.02, FRONT + 0.85, wf], [1.02, FRONT + 0.85, wf], [-0.92, BACK - 1.75, wr], [0.92, BACK - 1.75, wr]].forEach(([x, z, g]) => {
    const w = part(tilt, g);
    w.position.set(x, 0.52, z);
    BUS.wheels.push(w);
  });
  // Asiento, timón y el repartidor manejando
  const cab = new GeoB();
  cab.box(-0.55, 1.45, wz + 0.75, 0.32, 0.08, 0.3, B.seat);
  cab.box(-0.55, 1.95, wz + 1.05, 0.32, 0.5, 0.06, B.seat);
  cab.tube([-0.55, 1.35, wz + 0.25], [-0.55, 1.95, wz + 0.42], 0.035, 0.035, B.ink, 5);
  part(tilt, cab.build());
  const wheel = new GeoB();
  wheel.hoop(0, 0, 0.24, 0.025, B.ink, 24, 5);
  wheel.tube([0, -0.22, 0], [0, 0.22, 0], 0.015, 0.015, B.ink, 4);
  BUS.steer = part(tilt, wheel.build());
  BUS.steer.position.set(-0.55, 2.02, wz + 0.42);
  BUS.steer.rotation.set(0, PI / 2, 0);
  BUS.steer.rotation.order = 'YXZ';
  BUS.steer.rotation.x = 0;
  const body = new T.Group();
  body.position.set(-0.55, 1.58, wz + 0.82);
  body.rotation.x = 0.22;
  tilt.add(body);
  BUS.body = body;
  buildTorso(body);
  BUS.arms = buildArms(body);
  BUS.head = buildHead(body);
  // El paquete va amarrado atrás en la parrilla, a la vista.
  BUS.pkg = buildPackage(tilt, 0.25, ROOF + 0.2, BACK - 1.2, 1.7);
  const rope = new GeoB();
  rope.curve([[-0.2, ROOF + 0.2, BACK - 0.8], [-0.2, ROOF + 0.95, BACK - 0.76], [0.7, ROOF + 0.95, BACK - 0.76], [0.7, ROOF + 0.2, BACK - 0.8]], () => 0.016, B.cream, 4);
  part(tilt, rope.build(), false);
  BUS.scarf = buildRibbon({N: 16, seg: 0.12, width: (t) => 0.09 * (1 - t * 0.25)});
}
const _t = new T.Vector3();
// s: {x,y,speed,steer,air,crouch,brake,pkg,time,dt,spin,pitch,scale}
function updateBus(s) {
  const r = BUS.root, tl = BUS.tilt;
  r.position.set(s.x, s.y, 0);
  r.scale.setScalar(s.scale);
  // Desalineada, la trompa se va para un lado.
  r.rotation.y = -s.steer * 0.07 + (s.spin || 0) + (s.pull || 0) * 0.05;
  // Se ladea hacia afuera en las curvas y cabecea al frenar.
  tl.rotation.z = damp(tl.rotation.z, s.air ? 0 : s.steer * 0.055, 6, s.dt);
  tl.rotation.x = damp(tl.rotation.x, (s.pitch || 0) + (s.brake ? 0.035 : s.crouch ? -0.02 : 0), 6, s.dt);
  BUS.bounce += s.dt * (8 + s.speed * 0.3);
  tl.position.y = s.air ? 0 : sin(BUS.bounce) * 0.012 * clamp(s.speed / 20);
  BUS.wheels.forEach((w) => (w.rotation.x -= (s.speed * s.dt) / 0.52));
  BUS.brake.visible = !!s.brake;
  BUS.steer.rotation.x = -s.steer * 1.4;
  BUS.head.rotation.y = s.steer * 0.35;
  BUS.head.rotation.x = -0.15;
  updatePackage(BUS.pkg, s);
  r.updateMatrixWorld(true);
  // Las manos siguen el timón.
  BUS.arms.forEach((arm) => {
    const a = arm.side * 1.2 - s.steer * 1.4;
    _t.set(0, cos(a) * 0.22, sin(a) * 0.22);
    BUS.steer.localToWorld(_t);
    BUS.body.worldToLocal(_t);
    armIK(arm, _t, [0.9, -0.4, 0.1]);
  });
  // La faja va amarrada al espejo del chofer y ondea afuera.
  const q = worldOf(BUS.tilt, -1.5, 2.25, FRONT + 0.4);
  updateRibbon(BUS.scarf, q.x, q.y, q.z, s.dt, 2 + s.speed * 0.8, s.time, 14, 1.2);
}
export const BUS_V = {
  id: 'bus',
  phys: {jumpV: 10.6, grav: 25, steer: 7, steerRel: 11, vx: 12.5, sprint: 1.24, drain: 1 / 3.6, regen: 0.13, accel: 7.5, halfW: 1.05, jumpH: 1.6, scale: 0.86, scaleV: 0.8, sink: 0},
  cam: {y: 6.1, z: 13.8, lookY: 1.7, heroX: -10, heroZ: -15, heroY: 2.3, heroLook: 3.1, finish: [-5.8, 3.6, 12.5], cutH: 2.3, cutFar: 2.4},
  build: buildBus,
  update: updateBus,
  kick(v) { BUS.pkg.v += v; },
  setVisible(v) {
    BUS.root.visible = v;
    BUS.scarf.m.visible = v;
  },
  reset() {
    BUS.root.updateMatrixWorld(true);
    const q = worldOf(BUS.tilt, -1.5, 2.25, FRONT + 0.4);
    resetRibbon(BUS.scarf, q.x, q.y, q.z);
  },
  call() { return 'pito'; },
};
// Para el humo negro del escape: dónde queda la punta del tubo.
export const exhaustTip = () => worldOf(BUS.tilt, -1.08, ROOF + 0.9, BACK - 0.2);
