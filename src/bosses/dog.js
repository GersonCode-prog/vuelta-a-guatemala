// Terremoto, el chucho de Doña Tere: corre a un lado, marca una franja roja y se lanza de costado.
// Se esquiva saltando o saliéndose de la franja. Con tres tortillas se llena.
import * as T from 'three';
import {GeoB, hex} from '../core/geo.js';
import {scene, U} from '../core/gfx.js';
import {VS_MARK, FS_MARK} from '../core/shaders.js';
import {PI, abs, sin, min, max, ceil, clamp, damp, lerp, rnd} from '../core/util.js';
import {initMats, part, setPartLayer} from '../vehicles/rider.js';

const DOG = {root: null, legs: [], t: 0, body: null};
const LUNGE = {len: 11, speed: 26, hitH: 0.95};
let mark;
function buildDog() {
  initMats();
  setPartLayer(2);
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
    return p;
  });
  const tail = new GeoB();
  tail.curve([[0, 0, 0], [0, 0.26, 0.2], [0, 0.46, 0.2]], (t) => lerp(0.07, 0.025, t), coat, 5);
  DOG.tail = part(body, tail.build());
  DOG.tail.position.set(0, 1, 0.76);
  setPartLayer(1);
  mark = new T.Mesh(new T.PlaneGeometry(2.4, LUNGE.len), new T.ShaderMaterial({vertexShader: VS_MARK, fragmentShader: FS_MARK, uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uTime: U.uTime, uAmt: {value: 1}, uFreq: {value: 0.7}, uWid: {value: 1}}, depthWrite: false, depthTest: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, side: T.DoubleSide}));
  mark.visible = false;
  mark.frustumCulled = false;
  mark.renderOrder = -8;
  scene.add(mark);
}
function pose(x, y, z, speed, dt, time, mode, yaw = 0) {
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
  DOG.body.position.y = eat ? -0.12 : low ? -0.2 + sin(time * 40) * 0.015 : abs(sin(a)) * 0.16;
  DOG.head.rotation.x = eat ? -0.75 : low ? 0.14 : -0.08 + sin(time * 22) * 0.04;
  DOG.tail.rotation.z = sin(time * (eat ? 20 : 8)) * 0.7;
}
function home(api) {
  const {G, BOSS: b} = api, tr = api.trackAt(G.dist), room = max(1, tr.hw - 0.7);
  let hx = G.x + b.side * 3.1;
  if (abs(hx - tr.cx) > room) {
    b.side = -b.side;
    hx = G.x + b.side * 3.1;
  }
  return clamp(hx, tr.cx - room, tr.cx + room);
}
export const dogBoss = {
  build: buildDog,
  hide() {
    if (DOG.root) DOG.root.visible = false;
    if (mark) mark.visible = false;
  },
  sfx: 'bark',
  start(api) {
    const {G, BOSS: b} = api;
    b.mode = 'cut';
    b.t = 0;
    b.next = 3;
    b.side = G.x < api.center(G.dist) ? 1 : -1;
    b.x = G.x + b.side * 3.1;
    b.z = 0.7;
    b.count = 0;
    DOG.root.visible = true;
  },
  endCut(api) {
    api.BOSS.mode = 'chase';
    api.UI.boss(true, 0);
    api.queuePhone('Mamá', '¡Las tortillas, mijo! Agarrá tres y se le quita lo bravo.');
  },
  cutView(api, cam, q) {
    const b = api.BOSS;
    cam.position.set(b.x + lerp(1.3, 0.8, q), lerp(1.2, 1.4, q), b.z - lerp(5.2, 3.9, q));
    cam.lookAt(b.x - 1.05, 1.62, b.z - 1.1);
  },
  // Tortilla agarrada: el perro se queda comiendo.
  onPick(api, it) {
    const {BOSS: b} = api;
    if (it.pick !== 'tortilla' || !b.on || b.mode === 'full') return;
    b.count++;
    api.UI.boss(true, b.count);
    api.shout(b.count >= 3 ? '¡Tomá, chucho!' : '¡Ahí va la tortilla!', 2);
    b.mode = 'eat';
    b.eatT = 4;
    api.burst(it.x, 1, 3, 8, 6, 0.5, 0.15, [1, 0.8, 0.4], {add: 0, world: 0.8});
  },
  auto(api) {
    const b = api.BOSS;
    return b.mode === 'aim' && b.aim < 0.42;
  },
  update(api, dt, dt0, time) {
    const {G, BOSS: b, Audio} = api;
    b.t += dt0;
    let yaw = 0, hop = 0, mode = 'run';
    if (b.mode === 'chase') {
      b.z = damp(b.z, 0.7 + sin(time * 1.3) * 0.4, 3, dt0);
      b.x = damp(b.x, home(api), 4, dt0);
      b.next -= dt0;
      if (b.next <= 0 && G.y <= 0.2) {
        b.mode = 'aim';
        b.aim = 0.88;
        b.x0 = b.x;
        b.xEnd = b.x - b.side * LUNGE.len;
        Audio.bark();
        api.shout('¡Grrr!', 3, 1.4);
      }
      yaw = b.side * 0.22;
    } else if (b.mode === 'aim') {
      b.aim -= dt0;
      b.z = damp(b.z, 0.3, 8, dt0);
      yaw = b.side * 1.25;
      mode = 'aim';
      if (b.aim <= 0) {
        b.mode = 'lunge';
        b.hitDone = false;
      }
    } else if (b.mode === 'lunge') {
      const px = b.x;
      b.x -= b.side * LUNGE.speed * dt0;
      yaw = b.side * 1.5;
      hop = sin(clamp(abs(b.x - b.x0) / LUNGE.len) * PI) * 0.5;
      if (!b.hitDone && (px - G.x) * (b.x - G.x) <= 0) {
        b.hitDone = true;
        if (G.y < LUNGE.hitH && G.iframes <= 0) {
          G.iframes = 1;
          G.shake = 0.8;
          G.speed *= 0.62;
          G.hits++;
          G.racha = 1;
          G.hitstop = 0.06;
          api.impact(0.05, false);
          api.shout('¡Te mordió el paquete!', 3);
          Audio.hit();
          api.UI.floatTime('−' + ceil(13 * (1 - G.up.carton * 0.3)) + '% paquete', false);
          api.damage(13);
        } else if (G.iframes <= 0) {
          G.q += 4;
          G.clock += 0.5;
          G.racha = min(9, G.racha + 1);
          G.rachaT = 6;
          api.shout('¡Por poquito!', 2);
          Audio.near(1, 0);
        }
      }
      if ((b.x - b.xEnd) * b.side <= 0) {
        b.mode = 'chase';
        b.side = -b.side;
        b.next = rnd(2.2, 3.2) - (0.5 * G.dist) / api.LV.length;
      }
    } else if (b.mode === 'eat') {
      b.z += G.speed * dt;
      b.eatT -= dt0;
      mode = 'eat';
      if (b.count >= 3 && b.z > 26) {
        b.mode = 'full';
        api.UI.boss(false, 3);
        api.shout('¡Se llenó!', 2);
        api.queuePhone('Doña Tere', 'Ya se durmió el Terremoto. Andá tranquilo, mijo.');
        Audio.setLevel(api.MT.music[2]);
      } else if (b.eatT <= 0 && b.count < 3) {
        b.mode = 'return';
        Audio.bark();
      }
    } else if (b.mode === 'return') {
      b.z -= 11 * dt0;
      b.x = damp(b.x, home(api), 3, dt0);
      if (b.z <= 1) {
        b.mode = 'chase';
        b.next = rnd(1.6, 2.6);
      }
    } else if (b.mode === 'cut') {
      b.x = G.x + b.side * 3.1;
      b.z = 0.7;
    }
    const vis = b.mode !== 'full' && b.z < 40;
    DOG.root.visible = vis;
    pose(b.x, hop, b.z, mode === 'eat' ? 0 : G.speed, dt0, time, mode, yaw);
    if (vis) api.dropShadow(b.x, b.z, 0.8, 1.5);
    const aiming = b.mode === 'aim';
    mark.visible = aiming;
    if (aiming) {
      // La franja corre de costado a la altura del perro.
      mark.position.set(b.x0 - (b.side * LUNGE.len) / 2, 0, b.z);
      mark.rotation.y = (b.side * PI) / 2;
    }
  },
};
