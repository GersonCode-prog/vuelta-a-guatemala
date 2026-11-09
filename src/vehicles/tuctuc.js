// La Bendecida: el tuc-tuc rojo de Don Lalo, con el repartidor al manubrio y el paquete en el asiento de atrás.
import * as T from 'three';
import {GeoB, hex, mixC} from '../core/geo.js';
import {scene, U} from '../core/gfx.js';
import {VS_TEX, FS_TEX} from '../core/shaders.js';
import {PI, TAU, cos, sin, clamp, damp, lerp} from '../core/util.js';
import {initMats, part, setPartLayer, buildTorso, buildArms, armIK, buildHead, buildPackage, updatePackage, buildRibbon, updateRibbon, resetRibbon, worldOf} from './rider.js';

const K = {
  red: hex('#d8262c'), redD: hex('#9e1a22'), oro: hex('#ffc91f'), turq: hex('#12b5b0'), cream: hex('#fff3d6'), chrome: hex('#dcdad6'), chromeD: hex('#8f8d8a'),
  tire: hex('#1a1416'), ink: hex('#17100e'), lamp: hex('#fff1c4'), tail: hex('#ff2b2b'), amber: hex('#ffab1f'), seat: hex('#3a2a26'), canvas: hex('#1f2a3a'),
  fringe: [hex('#ff5d7d'), hex('#ffc91f'), hex('#12b5b0'), hex('#2bae56')], glass: hex('#26333f'),
};
// Frente a -z. La trompa queda en z ≈ -1.25 y la cola en z ≈ 1.35.
const FRONT = -1.25, BACK = 1.35, W = 0.66, ROOF = 1.86;
export const TUK = {root: null, tilt: null, wheels: [], arms: null, body: null, head: null, pkg: null, scarf: null, brake: null, bar: null, bounce: 0, front: null};

function plateTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 128;
  const x = cv.getContext('2d');
  const draw = () => {
    x.fillStyle = '#ffc91f';
    x.fillRect(0, 0, 512, 128);
    x.fillStyle = '#12b5b0';
    x.fillRect(0, 0, 512, 14);
    x.fillRect(0, 114, 512, 14);
    x.font = '400 62px "Shrikhand","Arial Black",Impact,sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.lineWidth = 10;
    x.strokeStyle = '#17100e';
    x.strokeText('La Bendecida', 256, 66);
    x.fillStyle = '#d8262c';
    x.fillText('La Bendecida', 256, 66);
  };
  draw();
  const tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  if (document.fonts && document.fonts.load) document.fonts.load('400 62px "Shrikhand"').then(() => {
    draw();
    tex.needsUpdate = true;
  }, () => {});
  return tex;
}
function wheelGeo(r) {
  const b = new GeoB(), w = 0.08;
  b.tube([-w, 0, 0], [w, 0, 0], r, r, K.tire, 14);
  [-1, 1].forEach((s) => {
    b.tube([s * w, 0, 0], [s * (w + 0.012), 0, 0], r * 0.58, r * 0.58, K.chrome, 12);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      b.box(s * (w + 0.02), cos(a) * r * 0.32, sin(a) * r * 0.32, 0.01, 0.03, 0.03, K.chromeD);
    }
  });
  return b.build();
}
function buildTuk() {
  initMats();
  setPartLayer(1);
  const root = new T.Group(), tilt = new T.Group();
  root.add(tilt);
  scene.add(root);
  TUK.root = root;
  TUK.tilt = tilt;
  const b = new GeoB();
  // Cabina de atrás: piso, costados bajos y el asiento
  b.box(0, 0.5, 0.55, W, 0.2, 0.8, K.red);
  b.box(0, 0.78, 1.25, W, 0.22, 0.1, K.red);
  [-1, 1].forEach((s) => b.box(s * (W - 0.03), 0.82, 0.62, 0.03, 0.18, 0.62, K.red));
  b.box(0, 0.62, 0.62, W + 0.012, 0.035, 0.81, K.oro);
  b.box(0, 0.54, 0.62, W + 0.014, 0.02, 0.81, K.turq);
  b.box(0, 0.78, 0.95, 0.56, 0.08, 0.3, K.seat);
  b.box(0, 1.08, 1.18, 0.56, 0.28, 0.06, K.seat);
  // Trompa: el frente angosto con el foco y el parabrisas
  b.box(0, 0.62, -0.75, 0.42, 0.3, 0.55, K.red);
  b.box(0, 0.98, -0.95, 0.4, 0.12, 0.35, K.red);
  b.box(0, 0.34, -1.1, 0.12, 0.2, 0.16, K.redD);
  // Foco: la carcasa tapa la luz cuando se ve desde atrás.
  b.tube([0, 1.0, FRONT + 0.1], [0, 1.0, FRONT - 0.02], 0.15, 0.15, K.ink, 12);
  b.tube([0, 1.0, FRONT - 0.02], [0, 1.0, FRONT - 0.035], 0.12, 0.12, K.lamp, 12, 2.6);
  [-1, 1].forEach((s) => b.box(s * 0.3, 0.86, FRONT + 0.06, 0.05, 0.04, 0.02, K.amber, 1.8));
  b.box(0, 1.42, -0.98, 0.6, 0.34, 0.02, K.glass);
  b.box(0, 1.08, -0.98, 0.62, 0.03, 0.04, K.ink);
  [-1, 1].forEach((s) => b.tube([s * 0.62, 1.0, -0.98], [s * 0.62, ROOF, -0.98], 0.03, 0.03, K.ink, 5));
  // Postes y techo de lona con flecos de colores
  [-1, 1].forEach((s) => {
    b.tube([s * 0.62, 0.9, 1.25], [s * 0.62, ROOF, 1.25], 0.03, 0.03, K.ink, 5);
    b.tube([s * 0.62, 0.9, 0.2], [s * 0.62, ROOF, 0.2], 0.028, 0.028, K.ink, 5);
  });
  b.box(0, ROOF + 0.04, 0.15, 0.7, 0.06, 1.2, K.canvas);
  b.box(0, ROOF + 0.1, 0.15, 0.62, 0.04, 1.1, mixC(K.canvas, K.cream, 0.15));
  for (let i = 0; i < 12; i++) {
    const z = -0.95 + i * 0.2;
    [-1, 1].forEach((s) => b.box(s * 0.71, ROOF - 0.07, z, 0.012, 0.06, 0.045, K.fringe[i % 4]));
  }
  for (let i = 0; i < 7; i++) b.box(-0.6 + i * 0.2, ROOF - 0.07, 1.36, 0.045, 0.06, 0.012, K.fringe[i % 4]);
  // Calcomanías a los lados
  [-1, 1].forEach((s) => {
    b.box(s * (W + 0.005), 0.5, 0.9, 0.004, 0.08, 0.18, K.cream);
    b.box(s * (W + 0.008), 0.5, 0.9, 0.004, 0.05, 0.13, K.turq);
  });
  // Cola: focos y defensa
  [-1, 1].forEach((s) => b.box(s * 0.52, 0.56, BACK + 0.03, 0.08, 0.06, 0.02, K.amber, 1.2));
  b.box(0, 0.34, BACK + 0.06, 0.62, 0.05, 0.05, K.chrome);
  // Espejos
  [-1, 1].forEach((s) => {
    b.tube([s * 0.42, 1.22, -0.9], [s * 0.72, 1.42, -0.92], 0.016, 0.016, K.chromeD, 4);
    b.box(s * 0.74, 1.5, -0.92, 0.05, 0.09, 0.03, K.ink);
  });
  part(tilt, b.build());
  // Nombre pintado atrás
  const plate = new T.Mesh(new T.PlaneGeometry(1.02, 0.25), new T.ShaderMaterial({vertexShader: VS_TEX, fragmentShader: FS_TEX, uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uSunCol: U.uSunCol, uShade: U.uShade, uMap: {value: plateTexture()}}}));
  plate.position.set(0, 0.8, BACK + 0.035);
  plate.frustumCulled = false;
  plate.layers.enable(1);
  tilt.add(plate);
  const tl = new GeoB(), tb = new GeoB();
  [-1, 1].forEach((s) => {
    tl.box(s * 0.52, 0.7, BACK + 0.03, 0.07, 0.05, 0.02, K.tail, 1.1);
    tb.box(s * 0.52, 0.7, BACK + 0.05, 0.1, 0.07, 0.02, K.tail, 4.5);
  });
  part(tilt, tl.build(), false);
  TUK.brake = part(tilt, tb.build(), false);
  TUK.brake.visible = false;
  // Llantas: una adelante (gira con el manubrio) y dos atrás
  const wg = wheelGeo(0.27);
  const front = new T.Group();
  front.position.set(0, 0.27, -0.95);
  tilt.add(front);
  TUK.front = front;
  const wf = part(front, wg);
  TUK.wheels.push(wf);
  [[-0.6, 0.85], [0.6, 0.85]].forEach(([x, z]) => {
    const w = part(tilt, wg);
    w.position.set(x, 0.27, z);
    TUK.wheels.push(w);
  });
  // Manubrio
  const bar = new GeoB();
  bar.tube([0, -0.18, 0.05], [0, 0, 0], 0.025, 0.025, K.ink, 5);
  bar.tube([-0.34, 0.02, 0.06], [0.34, 0.02, 0.06], 0.022, 0.022, K.chromeD, 5);
  [-1, 1].forEach((s) => bar.tube([s * 0.3, 0.02, 0.06], [s * 0.4, 0.02, 0.08], 0.032, 0.032, K.ink, 6));
  TUK.bar = part(tilt, bar.build());
  TUK.bar.position.set(0, 1.12, -0.62);
  // El repartidor sentado al centro
  const body = new T.Group();
  body.position.set(0, 0.98, -0.12);
  body.rotation.x = 0.16;
  tilt.add(body);
  TUK.body = body;
  const seat = new GeoB();
  seat.box(0, 0.85, -0.1, 0.24, 0.06, 0.2, K.seat);
  seat.tube([-0.15, 0.95, -0.1], [-0.18, 0.62, -0.42], 0.06, 0.055, K.ink, 5);
  seat.tube([0.15, 0.95, -0.1], [0.18, 0.62, -0.42], 0.06, 0.055, K.ink, 5);
  part(tilt, seat.build());
  buildTorso(body);
  TUK.arms = buildArms(body);
  TUK.head = buildHead(body);
  // El paquete va en el asiento de atrás, amarrado.
  TUK.pkg = buildPackage(tilt, 0, 0.86, 0.92, 1.25);
  TUK.scarf = buildRibbon({N: 14, seg: 0.1, width: (t) => 0.075 * (1 - t * 0.25)});
}
const _t = new T.Vector3();
// s: {x,y,speed,steer,air,crouch,brake,pkg,time,dt,spin,pitch,scale,rough}
function updateTuk(s) {
  const r = TUK.root, tl = TUK.tilt;
  r.position.set(s.x, s.y, 0);
  r.scale.setScalar(s.scale);
  r.rotation.y = -s.steer * 0.1 + (s.spin || 0);
  // Liviano: se ladea en las curvas y tiembla en el empedrado.
  const rough = s.air ? 0 : (s.rough || 0) * clamp(s.speed / 18);
  tl.rotation.z = damp(tl.rotation.z, s.air ? 0 : s.steer * 0.1, 7, s.dt) + sin(s.time * 37) * 0.012 * rough;
  tl.rotation.x = damp(tl.rotation.x, (s.pitch || 0) + (s.brake ? 0.05 : s.crouch ? -0.03 : 0), 6, s.dt);
  TUK.bounce += s.dt * (10 + s.speed * 0.4);
  tl.position.y = s.air ? 0 : sin(TUK.bounce) * 0.01 * clamp(s.speed / 20) + Math.abs(sin(s.time * 29)) * 0.025 * rough;
  TUK.wheels.forEach((w) => (w.rotation.x -= (s.speed * s.dt) / 0.27));
  TUK.front.rotation.y = -s.steer * 0.35;
  TUK.bar.rotation.y = -s.steer * 0.35;
  TUK.brake.visible = !!s.brake;
  TUK.head.rotation.y = s.steer * 0.3;
  TUK.head.rotation.x = -0.12;
  updatePackage(TUK.pkg, s);
  r.updateMatrixWorld(true);
  // Las manos en los puños del manubrio
  TUK.arms.forEach((arm) => {
    _t.set(arm.side * 0.3, 0.02, 0.06);
    TUK.bar.localToWorld(_t);
    TUK.body.worldToLocal(_t);
    armIK(arm, _t, [0.9, -0.5, 0.1]);
  });
  // La faja ondea desde el poste de adelante.
  const q = worldOf(TUK.tilt, -0.66, ROOF - 0.12, -0.95);
  updateRibbon(TUK.scarf, q.x, q.y, q.z, s.dt, 2 + s.speed * 0.8, s.time, 14, 1.2);
}
export const TUK_V = {
  id: 'tuk',
  phys: {jumpV: 9.4, grav: 25, steer: 11, steerRel: 17, vx: 13.5, sprint: 1.24, drain: 1 / 3.6, regen: 0.14, accel: 9, halfW: 0.68, jumpH: 1.2, scale: 1.0, scaleV: 0.92, sink: 0},
  // El parabrisas tapa al piloto de frente, así que el corte lo toma de lado: [cámara x, y, z, mira x, y, z].
  cam: {y: 3.3, z: 7.6, lookY: 1.4, heroX: -3.3, heroZ: 5.4, heroY: 1.25, heroLook: 1.9, finish: [5.8, 1.4, 7.4], cutH: 1.5,
    cut: {w: [-5.8, 1.5, -2.2, -1.6, 1.35, 0.75], t: [-6.4, 1.6, -2.0, -0.2, 1.0, 0.2]}},
  build: buildTuk,
  update: updateTuk,
  kick(v) { TUK.pkg.v += v; },
  setVisible(v) {
    TUK.root.visible = v;
    TUK.scarf.m.visible = v;
  },
  reset() {
    TUK.root.updateMatrixWorld(true);
    const q = worldOf(TUK.tilt, -0.66, ROOF - 0.12, -0.95);
    resetRibbon(TUK.scarf, q.x, q.y, q.z);
  },
  call() { return 'meep'; },
};
