// El Cadejo: el chucho negro de ojos de brasa que sale de noche a los que andan tarde.
// Corre adelante arrastrando su cadena. Primero se te tira encima por un carril (quitate de ahí),
// después cruza la calle y deja la cadena tendida (brincala), y al final las dos cosas.
// A la tercera que lo esquivás, llega el Cadejo blanco, el que cuida a los caminantes, y el negro se va.
import * as T from 'three';
import {GeoB, hex} from '../core/geo.js';
import {scene, U, VIEW} from '../core/gfx.js';
import {VS_MARK, FS_MARK} from '../core/shaders.js';
import {PI, TAU, abs, sin, cos, min, max, ceil, floor, clamp, damp, lerp, rnd, sstep} from '../core/util.js';
import {initMats, part, setPartLayer} from '../vehicles/rider.js';

const LANE = 2.0, HIT_W = 1.2, JUMP_OK = 0.4, POUNCE_V = 15, TALL = 1.7;
const HZ = [];
const Q = {dogs: [], white: null, chain: null, marks: []};
const laneOf = (cx, x) => cx + clamp(Math.round((x - cx) / LANE), -1, 1) * LANE;
const SMOKE = [0.06, 0.045, 0.09], EMBER = [2.6, 0.7, 0.25];

// Perro grande y greñudo, con cascos de cabra, cola esponjada y la cadena al cuello. Mira a -z.
function dogModel(fur, furD, eye, eyeGlow, chain) {
  const root = new T.Group();
  root.visible = false;
  root.scale.setScalar(1.25);
  scene.add(root);
  const b = new GeoB(), iron = hex('#6a6470'), hoof = hex('#4a4650'), ember = hex('#ff5a2a'), tooth = hex('#fff6e6');
  b.sph([0, 0.84, 0.02], [0.44, 0.4, 0.74], fur, 0, 8, 12);
  b.sph([0, 0.9, -0.48], [0.47, 0.47, 0.44], fur, 0, 7, 10);
  b.sph([0, 0.82, 0.5], [0.41, 0.41, 0.42], fur, 0, 7, 10);
  // Greña en el lomo y el pecho
  for (let i = 0; i < 11; i++) {
    const z = -0.75 + i * 0.15, y = 1.18 + 0.06 * sin(i * 1.3);
    b.tube([0, y - 0.08, z], [0.04 * sin(i * 2.7), y + 0.2 + 0.06 * (i % 3), z + 0.18], 0.11, 0.012, i % 2 ? furD : fur, 5);
  }
  [-1, 1].forEach((s) => {
    for (let i = 0; i < 4; i++) b.tube([s * 0.32, 0.96 - i * 0.1, -0.6 + i * 0.05], [s * 0.46, 0.74 - i * 0.12, -0.7 + i * 0.05], 0.09, 0.01, furD, 4);
  });
  if (chain) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      b.sph([cos(a) * 0.38, 1.1 + sin(a) * 0.1, -0.78 + sin(a) * 0.24], [0.06, 0.04, 0.06], iron, 0.2, 3, 5);
    }
  }
  const body = part(root, b.build());
  // Cabeza: hocico, orejas paradas, colmillos y los ojos de brasa
  const head = new T.Group();
  head.position.set(0, 1.28, -0.92);
  root.add(head);
  const h = new GeoB();
  h.sph([0, 0, 0], [0.31, 0.29, 0.32], fur, 0, 7, 10);
  h.tube([0, -0.07, -0.2], [0, -0.13, -0.6], 0.18, 0.11, fur, 8);
  h.sph([0, -0.1, -0.62], [0.07, 0.055, 0.055], hex('#0a0810'), 0, 4, 6);
  h.curve([[-0.11, -0.21, -0.44], [0, -0.24, -0.53], [0.11, -0.21, -0.44]], () => 0.014, ember, 4, 1.2);
  [-1, 1].forEach((s) => {
    h.tube([s * 0.15, 0.18, 0.02], [s * 0.21, 0.42, 0.1], 0.1, 0.014, fur, 5);
    h.tube([s * 0.045, -0.19, -0.53], [s * 0.045, -0.29, -0.53], 0.02, 0.004, tooth, 4);
    h.sph([s * 0.13, 0.05, -0.25], [0.075, 0.065, 0.045], eye, eyeGlow, 5, 7);
    h.tube([s * 0.05, 0.15, -0.26], [s * 0.22, 0.12, -0.21], 0.025, 0.02, furD, 4);
  });
  part(head, h.build());
  // Patas gruesas con su casco partido
  const legs = [];
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const g = new T.Group();
    g.position.set(sx * 0.24, 0.84, sz * 0.48);
    root.add(g);
    const l = new GeoB();
    l.tube([0, 0.05, 0], [0, -0.42, sz * 0.06], 0.16, 0.1, fur, 6);
    l.tube([0, -0.42, sz * 0.06], [0, -0.76, -0.02], 0.09, 0.065, fur, 6);
    l.box(-0.035, -0.8, -0.03, 0.03, 0.04, 0.07, hoof);
    l.box(0.035, -0.8, -0.03, 0.03, 0.04, 0.07, hoof);
    part(g, l.build());
    legs.push(g);
  });
  // Cola esponjada
  const tl = new T.Group();
  tl.position.set(0, 1.0, 0.82);
  root.add(tl);
  const t = new GeoB();
  t.curve([[0, 0, 0], [0, 0.18, 0.25], [0, 0.42, 0.42], [0, 0.6, 0.5]], (q) => 0.08 + 0.1 * sin(q * PI), fur, 6);
  t.tube([0, 0.56, 0.5], [0, 0.78, 0.48], 0.09, 0.01, furD, 5);
  part(tl, t.build());
  return {root, body, head, legs, tail: tl, ph: rnd(TAU), a: 1};
}
// Cadena tendida de lado a lado: 12 m de eslabones, anclada en x=0.
function chainModel() {
  const b = new GeoB(), iron = hex('#6a5f6e'), hot = hex('#ff6a3a');
  for (let i = 0; i < 34; i++) {
    const x = i * 0.36 + 0.18, flat = i % 2 === 0, pts = [];
    for (let k = 0; k <= 12; k++) {
      const a = (k / 12) * TAU, u = cos(a) * 0.21, v = sin(a) * 0.1;
      pts.push(flat ? [x + u, 0.16, v] : [x + u, 0.16 + v, 0]);
    }
    b.curve(pts, () => 0.04, i % 3 === 1 ? hot : iron, 5, i % 3 === 1 ? 1.6 : 0.5);
  }
  return b.build();
}
function buildCadejo() {
  initMats();
  setPartLayer(2);
  const fur = hex('#3a3046'), furD = hex('#211a2c'), eye = hex('#ff1a0a');
  Q.dogs.push(dogModel(fur, furD, eye, 1.7, true));
  Q.dogs.push(dogModel(fur, furD, eye, 1.7, true));
  Q.white = dogModel(hex('#f4f2ff'), hex('#c8cbe8'), hex('#3ab8ff'), 1.4, false);
  setPartLayer(1);
  Q.chain = part(scene, chainModel());
  Q.chain.visible = false;
  for (let i = 0; i < 2; i++) {
    const mk = new T.Mesh(new T.PlaneGeometry(2.2, 16), new T.ShaderMaterial({vertexShader: VS_MARK, fragmentShader: FS_MARK, uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uTime: U.uTime, uAmt: {value: 1}, uFreq: {value: 0.22}, uWid: {value: 1.1}}, depthWrite: false, depthTest: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, side: T.DoubleSide}));
    mk.visible = false;
    mk.frustumCulled = false;
    mk.renderOrder = -8;
    scene.add(mk);
    Q.marks.push(mk);
  }
}
// Pose: corriendo, parado aullando, o en el aire.
function pose(d, x, y, z, yaw, run, dt0, time, o = {}) {
  d.root.visible = true;
  d.root.position.set(x, y, z);
  d.root.rotation.y = yaw;
  d.ph += dt0 * (4 + run * 7);
  const k = min(1, run);
  d.legs.forEach((g, i) => (g.rotation.x = (o.air ? (i < 2 ? -0.9 : 0.8) : sin(d.ph + (i < 2 ? 0 : PI) + (i % 2) * 0.5) * 0.75 * k)));
  d.body.position.y = o.air ? 0 : abs(sin(d.ph)) * 0.06 * k;
  d.body.rotation.x = o.howl ? 0.12 : 0;
  d.head.rotation.x = o.howl ? 0.3 + sin(time * 3) * 0.05 : sin(d.ph * 2) * 0.05 * k;
  d.head.rotation.y = o.look || 0;
  d.tail.rotation.x = -0.3 + sin(time * 6) * 0.2;
}
function vanish(api, x, y, z, n = 18) {
  for (let i = 0; i < n; i++) api.fx(3, x + rnd(-0.8, 0.8), y + rnd(0.2, 1.8), z + rnd(-0.8, 0.8), rnd(0.3, 0.7), rnd(0.6, 1.1), SMOKE, {add: 0, vx: rnd(-1, 1), vy: rnd(0.8, 2.2), vz: rnd(-1, 1), grow: 1.1, world: 1});
  api.fx(0, x, y + 1.2, z, 2.4, 0.25, [1.6, 0.25, 0.15], {world: 1});
}
function hideAll() {
  Q.dogs.forEach((d) => (d.root.visible = false));
  if (Q.white) Q.white.root.visible = false;
  if (Q.chain) Q.chain.visible = false;
  Q.marks.forEach((m) => (m.visible = false));
  HZ.length = 0;
}
// Suelta la ronda: 'salto' (se tira por tu carril), 'cadena' (cruza y la deja tendida) o 'combo'.
function release(api, b, cx) {
  const {G, Audio} = api;
  const round = {hit: false};
  b.round = round;
  const mine = Math.round((laneOf(cx, G.x) - cx) / LANE);
  if (b.kind !== 'salto') {
    const Dc = G.dist + G.speed * (b.kind === 'combo' ? 1.6 : 1.9) + 10;
    HZ.push({type: 'chain', D: Dc, t: 0, side: rnd() < 0.5 ? -1 : 1, done: false, round});
    Audio.cadena();
  }
  if (b.kind !== 'cadena') {
    const warn = b.kind === 'combo' ? 2.5 : 1.35;
    HZ.push({type: 'pounce', lane: mine, D: G.dist + G.speed * warn + 26, t: -warn, warn, done: false, round, x: cx + mine * LANE, y: 0});
  }
}
export const cadejoBoss = {
  _q: Q,
  _hz: HZ,
  build: buildCadejo,
  sfx: 'aullido',
  hide: hideAll,
  start(api) {
    const {G, BOSS: b} = api;
    hideAll();
    b.mode = 'cut';
    b.t = 0;
    b.count = 0;
    b.round = null;
    b.x = laneOf(api.center(G.dist), G.x);
    b.z = -16;
    b.look = 0;
    b.wx = G.x - 3;
    b.wz = 14;
    b.white = 0;
    b.tx = undefined;
  },
  endCut(api) {
    const b = api.BOSS;
    b.mode = 'ride';
    b.next = 1.4;
    b.t = 0;
    api.UI.boss(true, 0);
    api.queuePhone('Brayan', '¡Es el Cadejo! Cuando te clave los ojos rojos, quitate de ese carril. Y si deja la cadena tendida, brincala.');
  },
  // Abajo y de frente, para que se vean los ojos; en vertical, un poco más lejos.
  cutView(api, cam, q) {
    const b = api.BOSS, tall = VIEW.aspect < 1;
    if (tall) {
      cam.position.set(b.x, lerp(1.1, 1.15, q), b.z + lerp(11, 10.2, q));
      cam.lookAt(b.x + 0.55, 1.5, b.z);
      return;
    }
    cam.position.set(b.x, lerp(1.0, 1.1, q), b.z + lerp(9.6, 8.6, q));
    cam.lookAt(b.x + 1.6, 1.45, b.z);
  },
  // El piloto automático se sale del carril marcado y brinca la cadena.
  laneCost(api, x) {
    let c = 0;
    for (const h of HZ) {
      if (h.type !== 'pounce' || h.done) continue;
      const d = h.D - api.G.dist;
      if (d < -2 || d > 90) continue;
      if (abs(x - h.x) < 2.0) c += 95;
    }
    return c;
  },
  auto(api) {
    const {G} = api;
    for (const h of HZ) {
      if (h.type !== 'chain' || h.done) continue;
      const d = h.D - G.dist;
      if (d > 0.5 && d < G.speed * 0.28) return true;
    }
    return false;
  },
  update(api, dt, dt0, time) {
    const {G, BOSS: b, Audio} = api;
    b.t += dt0;
    const cx = api.center(G.dist);
    const A = Q.dogs[0];
    if (b.mode === 'cut') {
      // Parado en media calle, aullando, viendo hacia vos.
      b.x = laneOf(cx, G.x);
      pose(A, b.x, 0, b.z, PI, 0, dt0, time, {howl: true});
      return;
    }
    if (b.mode === 'off' || b.mode === 'gone') {
      updateHz(api, dt, dt0, time);
      updateWhite(api, b, dt0, time);
      return;
    }
    const pouncing = HZ.some((h) => h.type === 'pounce' && !h.done && h.t >= 0);
    if (b.mode !== 'leave') {
      b.z = damp(b.z, -19, 1.6, dt0);
      b.x = damp(b.x, b.tx === undefined ? laneOf(cx, b.x) : b.tx, 2.4, dt0);
    }
    if (b.mode === 'ride') {
      b.next -= dt0;
      // De vez en cuando voltea a verte.
      b.look = damp(b.look, sin(time * 0.9) > 0.6 ? 2.4 * Math.sign(G.x - b.x || 1) : 0, 4, dt0);
      if (b.next <= 0 && !HZ.some((h) => !h.done)) {
        b.kind = b.count === 0 ? 'salto' : b.count === 1 ? 'cadena' : 'combo';
        b.mode = 'charge';
        b.t = 0;
        Audio.grr();
        api.shout(b.kind === 'cadena' ? '¡Va a tender la cadena!' : b.kind === 'combo' ? '¡Cadena y salto!' : '¡Te clavó los ojos!', 3, 2.8);
      }
    } else if (b.mode === 'charge') {
      b.look = damp(b.look, 2.6 * Math.sign(G.x - b.x || 1), 8, dt0);
      if (b.t > 0.55) {
        release(api, b, cx);
        b.mode = 'run';
        b.t = 0;
        b.look = 0;
      }
    } else if (b.mode === 'run') {
      if (b.t > 1.2 && !HZ.some((h) => h.round === b.round && !h.done)) {
        b.mode = 'ride';
        b.t = 0;
        b.next = b.kind === 'combo' ? 2.6 : 2.0;
      }
    } else if (b.mode === 'leave') {
      // Se va corriendo y se hace humo.
      b.z -= dt0 * lerp(10, 40, sstep(0, 1.2, b.t));
      if (b.t > 1.4 && !b.puffed) {
        b.puffed = true;
        vanish(api, b.x, 0, b.z, 26);
        A.root.visible = false;
      }
      if (b.t > 3.6) b.mode = 'gone';
    }
    // Ronda terminada: si no te agarró nada, cuenta.
    if (b.round && b.mode !== 'leave' && b.mode !== 'gone') {
      const mine = HZ.filter((h) => h.round === b.round);
      if (mine.length && mine.every((h) => h.done)) {
        if (!b.round.hit) {
          b.count++;
          api.UI.boss(true, b.count);
          G.q += 8;
          G.clock += 1;
          G.racha = min(9, G.racha + 1);
          G.rachaT = 6;
          G.lines = 0.7;
          api.UI.floatTime('+1 s', true);
          api.impact(0.05, true);
          api.shout(b.count >= 3 ? '¡El Cadejo blanco!' : '¡Esquivado!', 2);
          Audio.near(1, 0);
        }
        b.round = null;
        if (b.count >= 3) {
          b.mode = 'leave';
          b.t = 0;
          b.puffed = false;
          b.white = 0.001;
          b.wx = G.x - 2.6;
          b.wz = 12;
          api.UI.boss(false, 3);
          Audio.bark();
          api.queuePhone('Brayan', '¡Te cuidó el Cadejo blanco! El negro ya se fue. Seguí derecho al parque, que ahí te esperamos.');
          Audio.setLevel(api.MT.music[1]);
        }
      }
    }
    if (b.mode !== 'gone' && !(b.mode === 'leave' && b.puffed)) {
      const hidden = pouncing && b.mode === 'run' && b.kind !== 'cadena';
      if (hidden) A.root.visible = false;
      else {
        pose(A, b.x, 0, b.z, b.mode === 'leave' ? 0 : 0, 1, dt0, time, {look: b.look});
        api.dropShadow(b.x, b.z, 0.7, 1.2);
        // La cadena que arrastra saca chispas
        if (rnd() < dt0 * 22) api.fx(0, b.x + rnd(-0.3, 0.3), 0.08, b.z + 1.4 + rnd(0, 0.8), rnd(0.05, 0.11), 0.35, EMBER, {vy: rnd(0.5, 2), vz: rnd(2, 5), vx: rnd(-1, 1), grav: 6, world: 0.4});
      }
    }
    updateHz(api, dt, dt0, time);
    updateWhite(api, b, dt0, time);
  },
};
// El Cadejo blanco: entra corriendo por un lado, te acompaña un rato y se adelanta.
function updateWhite(api, b, dt0, time) {
  const W = Q.white;
  if (!b.white) {
    W.root.visible = false;
    return;
  }
  b.white += dt0;
  const {G} = api, t = b.white;
  b.wx = damp(b.wx, G.x - 2.4, 3, dt0);
  b.wz = t < 2.4 ? damp(b.wz, -2.5, 1.6, dt0) : b.wz - dt0 * lerp(4, 30, sstep(2.4, 3.6, t));
  if (t > 4.2) {
    if (W.root.visible) vanish(api, b.wx, 0, b.wz, 14);
    W.root.visible = false;
    b.white = 0;
    return;
  }
  pose(W, b.wx, 0, b.wz, 0, 1, dt0, time, {look: t > 0.8 && t < 2.2 ? 0.9 : 0});
  api.dropShadow(b.wx, b.wz, 0.7, 1.2);
  if (rnd() < dt0 * 10) api.fx(0, b.wx + rnd(-0.5, 0.5), rnd(0.4, 1.6), b.wz + rnd(-0.6, 0.6), rnd(0.06, 0.12), 0.6, [1.2, 1.8, 2.4], {vy: rnd(0.2, 0.8), world: 0.8});
}
// Los saltos por carril y la cadena tendida; y el golpe si te agarran.
function updateHz(api, dt, dt0, time) {
  const {G, Audio} = api;
  let mi = 0, chainUsed = false;
  const B = Q.dogs[1];
  let bUsed = false;
  const hurt = (h, n, text, vy) => {
    h.hit = true;
    if (h.round) h.round.hit = true;
    G.iframes = 1;
    G.shake = 0.9;
    G.speed *= 0.55;
    G.hits++;
    G.racha = 1;
    if (vy) {
      G.vy = vy;
      G.y = max(G.y, 0.02);
      G.air = true;
    }
    api.impact(0.06, false);
    api.shout(text, 3);
    Audio.hit();
    api.burst(G.x, 0.8, 0.2, 14, 6, 0.6, 0.2, SMOKE, {world: 0.5, add: 0});
    api.UI.floatTime('−' + ceil(n * (1 - G.up.carton * 0.3)) + '% paquete', false);
    api.damage(n);
  };
  for (let i = HZ.length - 1; i >= 0; i--) {
    const h = HZ[i];
    h.t += dt0;
    if (h.type === 'chain') {
      // El Cadejo cruza la calle y la cadena queda tendida, con brasas.
      const c = api.center(h.D), z = -(h.D - G.dist), run = clamp(h.t / 0.85), x0 = c - h.side * 6.5;
      const len = 13 * run;
      if (!chainUsed && z < 30) {
        chainUsed = true;
        Q.chain.visible = true;
        Q.chain.position.set(x0, 0, z);
        Q.chain.rotation.y = h.side > 0 ? 0 : PI;
        Q.chain.scale.set(max(0.02, len / 12), 1, 1);
        if (!h.done && rnd() < dt0 * 30) api.fx(0, x0 + h.side * rnd(0, len), 0.15, z, rnd(0.05, 0.12), 0.4, EMBER, {vy: rnd(0.5, 2.5), vx: rnd(-1, 1), grav: 6, world: 1});
      }
      if (h.t < 1.0 && !h.puff) {
        // El que la arrastra va por delante de la cadena.
        const B2 = Q.dogs[0];
        if (run < 1) {
          pose(B2, x0 + h.side * len, 0, z, h.side > 0 ? -PI / 2 : PI / 2, 1.4, dt0, time, {});
        } else {
          h.puff = true;
          vanish(api, x0 + h.side * 13, 0, z, 12);
        }
      }
      if (!h.done && h.D <= G.dist) {
        h.done = true;
        if (G.state === 'play' && G.y < JUMP_OK && G.iframes <= 0) hurt(h, 9, '¡Te enredó la cadena!', 3.8);
        else if (G.y >= JUMP_OK) {
          api.shout('¡Por encima de la cadena!', 2);
          Audio.cadena(0.5);
        }
      }
      if (h.done && h.D < G.dist - 24) HZ.splice(i, 1);
      continue;
    }
    // Salto por un carril: primero los ojos en lo oscuro, después se viene encima.
    h.x = api.center(h.D) + h.lane * LANE;
    const z = -(h.D - G.dist);
    if (h.t < 0) {
      // La franja roja va de los ojos hasta vos: ese carril es el del salto.
      if (mi < Q.marks.length) {
        const mk = Q.marks[mi++], L = max(16, -z - 1);
        mk.visible = true;
        mk.scale.set(1, 1, L / 16);
        mk.position.set(h.x, 0, z + L / 2);
        mk.material.uniforms.uAmt.value = 1.5 + 0.6 * sin(time * 16);
      }
      // Dos brasas que te miran desde lo oscuro
      const ey = 1.75 + 0.05 * sin(time * 5);
      [-1, 1].forEach((s) => api.fx(0, h.x + s * 0.2, ey, z, 0.5 + 0.1 * sin(time * 9), 0.05, [3.4, 0.35, 0.12], {world: 0}));
      api.fx(0, h.x, ey, z, 1.8, 0.05, [0.7, 0.06, 0.04], {world: 0});
    } else if (!h.done) {
      if (!h.came) {
        h.came = true;
        vanish(api, h.x, 0, z, 16);
        Audio.grr(1);
      }
      h.D -= POUNCE_V * dt;
      // Va en saltos largos
      h.y = abs(sin(h.t * 5.2)) * 0.7;
      if (mi < Q.marks.length) {
        const mk = Q.marks[mi++], L = max(4, -z);
        mk.visible = z < -1;
        mk.scale.set(1, 1, L / 16);
        mk.position.set(h.x, 0, z + L / 2);
        mk.material.uniforms.uAmt.value = 2.2;
      }
      if (!bUsed) {
        bUsed = true;
        pose(B, h.x, h.y, z, PI, 1.6, dt0, time, {air: h.y > 0.25});
        api.dropShadow(h.x, z, 0.7, 1.2);
      }
      if (abs(h.D - G.dist) < 1.1 && abs(G.x - h.x) < HIT_W && G.y < TALL && G.iframes <= 0 && !h.hit && G.state === 'play') hurt(h, 10, '¡Te botó el Cadejo!', 3);
      if (h.D < G.dist - 6) {
        h.done = true;
        vanish(api, h.x, 0, -(h.D - G.dist), 14);
      }
    }
    if (h.done && h.D < G.dist - 30) HZ.splice(i, 1);
  }
  if (!chainUsed && Q.chain) Q.chain.visible = false;
  if (!bUsed && B) B.root.visible = false;
  for (; mi < Q.marks.length; mi++) Q.marks[mi].visible = false;
}
