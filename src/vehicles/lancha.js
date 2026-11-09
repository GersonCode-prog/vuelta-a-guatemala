// La Sirena: la lancha de Don Chema. El repartidor va atrás con la mano en la caña del motor,
// y el paquete amarrado en la banca de en medio. Proa a -z, popa a +z.
import * as T from 'three';
import {GeoB, hex} from '../core/geo.js';
import {scene, U} from '../core/gfx.js';
import {VS_TEX, FS_TEX} from '../core/shaders.js';
import {sin, abs, clamp, damp, lerp} from '../core/util.js';
import {initMats, part, setPartLayer, buildTorso, buildArms, armIK, buildHead, buildLegGeos, buildLeg, buildPackage, updatePackage, buildRibbon, updateRibbon, resetRibbon, worldOf} from './rider.js';
import {hullInto, deckInto, railInto} from '../world/props-atitlan.js';

const K = {
  hull: hex('#fbfaf6'), teal: hex('#12a5b8'), tealD: hex('#0b7f8e'), red: hex('#d8263c'), oro: hex('#ffc91f'), wood: hex('#b8854f'), woodD: hex('#7a5230'),
  floor: hex('#d9d4c8'), ink: hex('#17100e'), motor: hex('#2a2d34'), motorL: hex('#4a4f58'), chrome: hex('#c8c6c2'), cream: hex('#fff3d6'), blue: hex('#1b62c9'),
};
// [z, medio ancho, cubierta, quilla]: la proa se levanta del agua.
const SECS = [[-1.75, 0.03, 0.66, 0.34], [-1.45, 0.3, 0.62, 0.06], [-1.05, 0.54, 0.58, -0.12], [-0.5, 0.7, 0.55, -0.22], [0.15, 0.79, 0.52, -0.27], [0.85, 0.8, 0.5, -0.28], [1.6, 0.78, 0.48, -0.28], [2.35, 0.74, 0.47, -0.26]];
const STERN = 2.35, SEAT_Z = 1.62, SEAT_Y = 0.7;
// Medio ancho y altura de la cubierta en cualquier punto del largo.
function at(z) {
  let i = 0;
  while (i < SECS.length - 2 && z > SECS[i + 1][0]) i++;
  const a = SECS[i], b = SECS[i + 1], u = clamp((z - a[0]) / (b[0] - a[0]));
  return [lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
}
export const BOAT = {root: null, tilt: null, motor: null, arms: null, body: null, head: null, pkg: null, scarf: null, legs: null, bob: 0};

function nameTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 128;
  const x = cv.getContext('2d');
  const draw = () => {
    x.fillStyle = '#fbfaf6';
    x.fillRect(0, 0, 512, 128);
    x.fillStyle = '#12a5b8';
    x.fillRect(0, 104, 512, 24);
    x.font = '400 66px "Shrikhand","Arial Black",Impact,sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.lineWidth = 9;
    x.strokeStyle = '#17100e';
    x.strokeText('La Sirena', 256, 56);
    x.fillStyle = '#12a5b8';
    x.fillText('La Sirena', 256, 56);
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
function buildBoat() {
  initMats();
  setPartLayer(1);
  const root = new T.Group(), tilt = new T.Group();
  root.add(tilt);
  scene.add(root);
  BOAT.root = root;
  BOAT.tilt = tilt;
  const b = new GeoB();
  hullInto(b, SECS, [K.hull, K.teal, K.red]);
  // Piso adentro, cubierta blanca en la proa y la borda
  deckInto(b, SECS, 0.88, 0.012, K.floor, 2);
  deckInto(b, SECS, 0.95, 0.045, K.hull, 0, 2);
  railInto(b, SECS, 0.05, K.tealD);
  // Bancas de madera
  [[-0.45, 0.66], [0.6, 0.66], [SEAT_Z, SEAT_Y - 0.04]].forEach(([z, y]) => b.box(0, y, z, at(z)[0] * 0.9, 0.035, 0.17, K.wood));
  // Defensas blancas colgando y el cabo de proa
  [-1, 1].forEach((s) => [-0.2, 1.1].forEach((z) => b.sph([s * (at(z)[0] + 0.05), at(z)[1] - 0.12, z], [0.07, 0.13, 0.07], K.cream, 0, 4, 6)));
  b.tube([0, 0.66, -1.62], [0, 0.72, -1.62], 0.05, 0.05, K.ink, 5);
  // Palito de proa, donde va amarrada la faja
  b.tube([0, 0.66, -1.42], [0, 1.45, -1.42], 0.022, 0.018, K.woodD, 5);
  part(tilt, b.build());
  // Nombre pintado en el espejo de popa
  const plate = new T.Mesh(new T.PlaneGeometry(1.0, 0.25), new T.ShaderMaterial({vertexShader: VS_TEX, fragmentShader: FS_TEX, uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uSunCol: U.uSunCol, uShade: U.uShade, uMap: {value: nameTexture()}}}));
  plate.position.set(0, 0.29, STERN + 0.012);
  plate.frustumCulled = false;
  plate.layers.enable(1);
  tilt.add(plate);
  // Motor fuera de borda: gira entero con la caña.
  const motor = new T.Group();
  motor.position.set(0, 0.47, STERN + 0.04);
  tilt.add(motor);
  BOAT.motor = motor;
  const m = new GeoB();
  m.box(0, 0.02, 0.06, 0.1, 0.12, 0.08, K.motorL);
  m.sph([0, 0.4, 0.24], [0.22, 0.27, 0.3], K.motor, 0, 7, 9);
  m.box(0, 0.36, 0.24, 0.225, 0.035, 0.3, K.cream);
  m.tube([0, 0.16, 0.24], [0, -0.78, 0.26], 0.07, 0.06, K.motorL, 6);
  m.box(0, -0.52, 0.26, 0.16, 0.012, 0.2, K.motorL);
  // La caña: de la tapa del motor hacia adelante, del lado derecho
  m.tube([0.06, 0.3, 0.06], [0.33, 0.3, -0.42], 0.03, 0.03, K.motorL, 5);
  m.tube([0.33, 0.3, -0.42], [0.36, 0.3, -0.58], 0.042, 0.042, K.ink, 6);
  part(motor, m.build());
  // El repartidor sentado en la banca de atrás
  const body = new T.Group();
  body.position.set(0, SEAT_Y + 0.02, SEAT_Z);
  body.rotation.x = 0.08;
  tilt.add(body);
  BOAT.body = body;
  buildTorso(body);
  BOAT.arms = buildArms(body);
  BOAT.head = buildHead(body);
  // Piernas dobladas hacia adelante, con los pies en el piso
  const geos = buildLegGeos();
  BOAT.legs = [-1, 1].map((s) => {
    const lg = buildLeg(body, geos, s * 0.1, -0.02, 0.0, s);
    lg.hip.rotation.x = 1.78;
    lg.knee.rotation.x = -1.0;
    lg.foot.rotation.x = -0.78;
    lg.root.rotation.z = s * 0.06;
    return lg;
  });
  // El paquete va amarrado en la banca de en medio.
  BOAT.pkg = buildPackage(tilt, 0, 0.69, 0.6, 1.25);
  BOAT.scarf = buildRibbon({N: 14, seg: 0.1, width: (t) => 0.075 * (1 - t * 0.25)});
}
const _t = new T.Vector3();
// s: {x,y,speed,steer,air,crouch,brake,pkg,time,dt,spin,pitch,scale,rough}
function updateBoat(s) {
  const r = BOAT.root, tl = BOAT.tilt;
  r.position.set(s.x, s.y, 0);
  r.scale.setScalar(s.scale);
  r.rotation.y = -s.steer * 0.13 + (s.spin || 0);
  const sp = clamp(s.speed / 22), rough = s.air ? 0 : (s.rough || 0) * sp;
  BOAT.bob += s.dt * (1.5 + rough * 2.5);
  // Se ladea para la curva, levanta la proa cuando va rápido y se mece con el agua.
  const roll = s.air ? 0 : s.steer * 0.12;
  tl.rotation.z = damp(tl.rotation.z, roll, 5, s.dt) + (s.air ? 0 : sin(BOAT.bob * 1.3) * 0.016 * (1 + rough * 2.5));
  const pitch = (s.pitch || 0) + (s.air ? 0 : 0.065 * sp + (s.crouch ? 0.03 : 0) - (s.brake ? 0.06 : 0));
  tl.rotation.x = damp(tl.rotation.x, pitch, 4, s.dt) + (s.air ? 0 : sin(BOAT.bob * 1.05 + 1) * 0.012 * (1 + rough * 3));
  tl.position.y = s.air ? 0 : sin(BOAT.bob * 1.7) * 0.03 + abs(sin(s.time * 8.7)) * 0.06 * rough;
  BOAT.motor.rotation.y = s.steer * 0.4;
  BOAT.head.rotation.y = s.steer * 0.3;
  BOAT.head.rotation.x = -0.08;
  updatePackage(BOAT.pkg, s);
  r.updateMatrixWorld(true);
  // Mano derecha en la caña; la izquierda en la borda.
  const [left, right] = BOAT.arms;
  _t.set(0.36, 0.3, -0.56);
  BOAT.motor.localToWorld(_t);
  BOAT.body.worldToLocal(_t);
  armIK(right, _t, [0.9, -0.4, 0.3]);
  _t.set(-0.64, 0.62, SEAT_Z - 0.25);
  BOAT.tilt.localToWorld(_t);
  BOAT.body.worldToLocal(_t);
  armIK(left, _t, [0.9, -0.5, 0.1]);
  // La faja ondea desde el palito de proa.
  const q = worldOf(BOAT.tilt, 0, 1.42, -1.42);
  updateRibbon(BOAT.scarf, q.x, q.y, q.z, s.dt, 2 + s.speed * 0.8, s.time, 14, 1.2);
}
export const LANCHA_V = {
  id: 'lancha',
  phys: {jumpV: 9.6, grav: 24, steer: 9.5, steerRel: 13, vx: 12.5, sprint: 1.25, drain: 1 / 3.6, regen: 0.14, accel: 7.5, halfW: 0.8, jumpH: 1.25, scale: 1.0, scaleV: 0.9, sink: 0},
  // El corte de llegada la toma de lado, para que se vea al repartidor y el motor: [cámara x, y, z, mira x, y, z].
  cam: {y: 3.5, z: 8.8, lookY: 1.2, heroX: -3.9, heroZ: 6.6, heroY: 1.2, heroLook: 1.6, finish: [6.4, 1.6, 8.6], cutH: 1.2,
    cut: {w: [-6.4, 1.3, -1.6, -1.9, 1.1, 1.6], t: [-7.0, 1.5, -1.2, -0.3, 0.9, 1.4]}},
  build: buildBoat,
  update: updateBoat,
  kick(v) { BOAT.pkg.v += v; },
  setVisible(v) {
    BOAT.root.visible = v;
    BOAT.scarf.m.visible = v;
  },
  reset() {
    BOAT.root.updateMatrixWorld(true);
    const q = worldOf(BOAT.tilt, 0, 1.42, -1.42);
    resetRibbon(BOAT.scarf, q.x, q.y, q.z);
  },
  call() { return 'bocina'; },
};
// Popa de la lancha en coordenadas del mundo, para la estela.
export const sternAt = (x) => ({x, z: STERN + 0.2});
