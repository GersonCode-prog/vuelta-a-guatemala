// Cariñoso, el toro que se salió del jaripeo: embiste de frente por un carril marcado en rojo.
// Se esquiva haciéndose a un lado en el último momento. A la tercera lo lazan.
import * as T from 'three';
import {GeoB, hex, mixC} from '../core/geo.js';
import {scene, U} from '../core/gfx.js';
import {VS_MARK, FS_MARK} from '../core/shaders.js';
import {PI, TAU, abs, sin, cos, min, max, ceil, clamp, damp, lerp, rnd} from '../core/util.js';
import {initMats, part, setPartLayer, ring} from '../vehicles/rider.js';
import {buildQuadLeg, legPose} from '../vehicles/horse.js';

const BULL = {root: null, body: null, legs: [], phase: 0, head: null};
const CH = {closeZ: 118, lockZ: -36, hitW: 1.7, hitH: 2.05, base: 25, add: 3.5};
let mark;
function buildBull() {
  initMats();
  setPartLayer(2);
  const coat = hex('#5a3428'), coatL = hex('#80563f'), muzzle = hex('#b49076'), horn = hex('#f3e6c8'), hornT = hex('#1a1416'), red = hex('#e3262f'), eyeW = hex('#fff3d6');
  const root = new T.Group();
  root.visible = false;
  scene.add(root);
  BULL.root = root;
  const body = new T.Group();
  root.add(body);
  BULL.body = body;
  const UX = [1, 0, 0], UY = [0, 1, 0];
  const b = new GeoB();
  // Tronco ancho, con la giba de los toros de la costa
  const tr = [[1.22, 1.3, 0.12, 0.16], [1.14, 1.3, 0.34, 0.42], [0.8, 1.27, 0.5, 0.56], [0.3, 1.24, 0.52, 0.6], [-0.2, 1.26, 0.56, 0.68], [-0.62, 1.3, 0.56, 0.72], [-0.92, 1.28, 0.4, 0.55], [-1.08, 1.22, 0.18, 0.26]];
  b.loft(tr.map((q) => ring([0, q[1], q[0]], UX, UY, q[2], q[3], 18)), (ta, tb, q) => (q[1] < 0.96 ? coatL : coat));
  b.sph([0, 2.02, -0.52], [0.3, 0.32, 0.42], coat, 0, 7, 10);
  // Papada
  b.sph([0, 0.84, -0.88], [0.18, 0.34, 0.26], coatL, 0, 6, 8);
  // Bandera roja del jaripeo
  b.curve([[-0.3, 1.62, 0.1], [0, 1.9, 0.1], [0.3, 1.62, 0.1]], () => 0.05, red, 5);
  b.curve([[-0.56, 1.3, 0.1], [-0.58, 0.95, 0.1], [-0.3, 0.68, 0.1], [0.3, 0.68, 0.1], [0.58, 0.95, 0.1], [0.56, 1.3, 0.1]], () => 0.035, red, 5);
  part(body, b.build());
  // Cabeza
  const head = new T.Group();
  head.position.set(0, 1.46, -1.08);
  body.add(head);
  BULL.head = head;
  const h = new GeoB();
  const hd = [[0.14, 0.14, 0.26, 0.28], [-0.05, 0.1, 0.3, 0.32], [-0.26, 0, 0.26, 0.28], [-0.5, -0.14, 0.2, 0.2], [-0.66, -0.22, 0.2, 0.16], [-0.74, -0.25, 0.12, 0.09]];
  h.loft(hd.map((q) => ring([0, q[1], q[0]], UX, [0, 0.82, 0.57], q[2], q[3], 14)), (ta) => (ta > 0.66 ? muzzle : coat));
  [-1, 1].forEach((s) => {
    // Cuernos largos que se ven de frente
    h.curve(Array.from({length: 8}, (_, i) => {
      const t = i / 7;
      return [s * (0.22 + 0.6 * t - 0.08 * t * t), 0.2 + 0.24 * t + 0.42 * t * t, -0.02 - 0.26 * t * t];
    }), (t) => lerp(0.085, 0.012, t), (ta) => (ta > 0.72 ? hornT : horn), 8);
    // Ojos furiosos
    h.sph([s * 0.2, 0.09, -0.235], [0.058, 0.05, 0.03], eyeW, 0, 6, 8);
    h.sph([s * 0.19, 0.085, -0.262], [0.03, 0.032, 0.012], red, 1.6, 5, 6);
    h.curve([[s * 0.09, 0.2, -0.275], [s * 0.2, 0.14, -0.27], [s * 0.3, 0.15, -0.2]], () => 0.022, hex('#0e0a0b'), 4);
    // Orejas caídas
    h.sph([s * 0.36, 0.0, 0.02], [0.16, 0.05, 0.08], coatL, 0, 5, 7);
    // Fosas
    h.sph([s * 0.095, -0.2, -0.77], [0.03, 0.022, 0.015], hex('#100b0b'), 0, 4, 5);
  });
  // Argolla de la nariz
  h.hoop(-0.3, -0.76, 0.06, 0.012, hex('#ffc91f'), 14, 5);
  // Copete
  [-0.1, 0, 0.1].forEach((x) => h.blade([[x, 0.3, 0.02], [x * 1.3, 0.3, -0.12], [x * 1.4, 0.2, -0.24]], [1, 0, 0], 0.06, hex('#0e0a0b'), 0.012));
  part(head, h.build());
  // Patas
  const dl = [
    {x: -0.3, y: 1.05, z: 0.86, front: false}, {x: 0.3, y: 1.05, z: 0.86, front: false},
    {x: -0.32, y: 1.02, z: -0.72, front: true}, {x: 0.32, y: 1.02, z: -0.72, front: true},
  ];
  BULL.legs = dl.map((d) => buildQuadLeg(body, Object.assign({upper: 0.52, lower: 0.42, r0: d.front ? 0.2 : 0.23, r1: 0.1, r2: 0.066, col: coat, colLow: coatL, hoof: hex('#0e0a0b')}, d)));
  const tail = new GeoB();
  tail.curve([[0, 0, 0], [0, 0.2, 0.28], [0, 0.42, 0.5], [0, 0.72, 0.62]], (t) => lerp(0.05, 0.022, t), coat, 6);
  tail.sph([0, 0.8, 0.64], [0.07, 0.14, 0.07], hex('#0e0a0b'), 0, 5, 6);
  BULL.tail = part(body, tail.build());
  BULL.tail.position.set(0, 1.5, 1.2);
  setPartLayer(1);
  mark = new T.Mesh(new T.PlaneGeometry(4.4, 120), new T.ShaderMaterial({vertexShader: VS_MARK, fragmentShader: FS_MARK, uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uTime: U.uTime, uAmt: {value: 1}, uFreq: {value: 0.11}, uWid: {value: 2.2}}, depthWrite: false, depthTest: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, side: T.DoubleSide}));
  mark.visible = false;
  mark.frustumCulled = false;
  mark.renderOrder = -8;
  scene.add(mark);
}
const PH = [0, 0.1, 0.5, 0.6];
function pose(b, speed, dt, time, mode) {
  const r = BULL.root;
  r.position.set(b.x, 0, b.z);
  r.rotation.y = PI;
  r.scale.setScalar(1.12);
  const paw = mode === 'aim';
  BULL.phase += (paw ? 2.2 : 0.8 + speed * 0.06) * dt;
  const ph = BULL.phase % 1;
  BULL.legs.forEach((leg, i) => {
    if (paw) {
      // Escarba con una mano antes de arrancar.
      leg.up.rotation.x = i === 2 ? 0.35 + sin(ph * TAU) * 0.55 : leg.front ? 0 : -0.3;
      leg.lo.rotation.x = i === 2 ? -0.6 - cos(ph * TAU) * 0.5 : leg.front ? 0 : 0.32;
    } else legPose(leg, (ph + PH[i]) % 1, 1, 0, 0);
  });
  const rock = sin(ph * TAU + 0.9);
  BULL.body.rotation.x = paw ? -0.1 : rock * 0.09;
  BULL.body.position.y = paw ? 0 : 0.04 + abs(sin(ph * TAU)) * 0.1;
  BULL.head.rotation.x = paw ? 0.32 + sin(time * 6) * 0.05 : 0.22 + rock * 0.08;
  BULL.tail.rotation.x = sin(time * 9) * 0.35;
}
function exitScene(api) {
  const {BOSS: b} = api;
  b.mode = 'lassoed';
  BULL.root.visible = false;
  mark.visible = false;
  api.UI.boss(false, 3);
  api.shout('¡Lo lazaron!', 2);
  api.Audio.crowd(1);
  api.queuePhone('Don Chepe', 'Ya lo lazamos, patojo. Seguí, que se te va la camioneta.');
  api.Audio.setLevel(api.MT.music[2]);
}
export const bullBoss = {
  build: buildBull,
  sfx: 'bellow',
  hide() {
    if (BULL.root) BULL.root.visible = false;
    if (mark) mark.visible = false;
  },
  start(api) {
    const {G, BOSS: b} = api;
    b.mode = 'cut';
    b.t = 0;
    b.count = 0;
    b.x = api.center(G.dist);
    b.z = -16;
    b.next = 0.6;
    b.lock = false;
    BULL.root.visible = true;
  },
  endCut(api) {
    const b = api.BOSS;
    b.mode = 'wait';
    BULL.root.visible = false;
    api.UI.boss(true, 0);
    api.queuePhone('Don Chepe', '¡Se salió Cariñoso del jaripeo! Hacete a un lado cuando venga. A la tercera lo lazan.');
  },
  cutView(api, cam, q) {
    const b = api.BOSS;
    cam.position.set(b.x - lerp(2.4, 1.7, q), lerp(1.45, 1.25, q), b.z + lerp(9.6, 7.8, q));
    cam.lookAt(b.x + 2.1, 1.92, b.z + 0.8);
  },
  // El piloto automático se aleja del carril marcado.
  laneCost(api, x) {
    const b = api.BOSS;
    if (b.mode !== 'aim' && b.mode !== 'charge') return 0;
    const u = abs(x - b.x);
    return u < CH.hitW + 1.2 ? 60 * (CH.hitW + 1.2 - u) : 0;
  },
  update(api, dt, dt0, time) {
    const {G, BOSS: b, Audio} = api;
    b.t += dt0;
    const tr = api.trackAt(G.dist), room = max(1, tr.hw - 1.2);
    if (b.mode === 'cut') {
      b.x = api.center(G.dist);
      pose(b, 0, dt0, time, 'aim');
      return;
    }
    if (b.mode === 'lassoed' || b.mode === 'off') return;
    let m = b.mode;
    if (m === 'wait') {
      b.next -= dt0;
      if (b.next <= 0) {
        b.mode = m = 'aim';
        b.aim = 0.75;
        b.z = -CH.closeZ;
        b.x = clamp(G.x, tr.cx - room, tr.cx + room);
        b.lock = false;
        BULL.root.visible = true;
        Audio.bellow();
        api.shout('¡Viene Cariñoso!', 3, 3.2);
      }
    } else if (m === 'aim') {
      b.aim -= dt0;
      b.x = damp(b.x, clamp(G.x, tr.cx - room, tr.cx + room), 2.5, dt0);
      if (b.aim <= 0) {
        b.mode = m = 'charge';
        Audio.rumble();
      }
    } else if (m === 'charge') {
      const pz = b.z, vb = CH.base + b.count * CH.add;
      b.z += (G.speed * (dt0 > 0 ? dt / dt0 : 1) + vb) * dt0;
      if (!b.lock) {
        b.x = damp(b.x, clamp(G.x, tr.cx - room, tr.cx + room), 2.2, dt0);
        if (b.z > CH.lockZ) b.lock = true;
      }
      // Polvo bajo las patas
      if (b.z < 8 && rnd() < dt0 * 40) api.fx(3, b.x + rnd(-0.7, 0.7), 0.2, b.z + 1.2, rnd(0.18, 0.42), 0.55, api.dust(), {add: 0, vy: rnd(0.4, 1.6), vz: rnd(1, 5), grow: 0.9, world: 0.9});
      if (pz < 0 && b.z >= 0) {
        const gap = abs(G.x - b.x);
        if (gap < CH.hitW && G.y < CH.hitH && G.iframes <= 0) {
          G.iframes = 1.2;
          G.shake = 1;
          G.speed *= 0.5;
          G.hits++;
          G.racha = 1;
          G.hitstop = 0.08;
          api.impact(0.07, false);
          api.shout('¡Te alcanzó Cariñoso!', 3);
          Audio.hit();
          Audio.bellow();
          api.UI.floatTime('−' + ceil(13 * (1 - G.up.carton * 0.3)) + '% paquete', false);
          api.damage(13);
        } else if (G.iframes <= 0) {
          b.count++;
          api.UI.boss(true, b.count);
          const over = gap < CH.hitW;
          G.q += over ? 14 : 8;
          G.clock += 1;
          G.racha = min(9, G.racha + 1);
          G.rachaT = 6;
          G.shake = 0.5;
          G.lines = 0.7;
          api.shout(over ? '¡Por encima del toro!' : '¡OLÉ!', 2);
          api.UI.floatTime('+1 s', true);
          api.impact(0.05, true);
          Audio.crowd(0.8);
          Audio.near(1, (b.x - G.x) / 6);
        }
      }
      if (b.z > 15) {
        if (b.count >= 3) {
          exitScene(api);
          return;
        }
        b.mode = 'wait';
        b.next = rnd(1.1, 1.8);
        BULL.root.visible = false;
      }
    }
    if (b.mode === 'aim' || b.mode === 'charge') {
      pose(b, 42, dt0, time, b.mode);
      api.dropShadow(b.x, b.z, 1.2, 2.2);
      mark.visible = b.z < 3;
      mark.position.set(b.x, 0, -52);
      mark.rotation.y = 0;
      mark.material.uniforms.uAmt.value = b.lock ? 1 : 0.55;
    } else mark.visible = false;
  },
};
