// Doña Choco: la de los chocobananos. Va adelante en su triciclo y te los tira de espaldas.
// Las marcas rojas dicen dónde van a caer: cambiate de carril o saltá el embarrón. A la tercera se le acaban.
import * as T from 'three';
import {GeoB, hex, mixC} from '../core/geo.js';
import {scene, U} from '../core/gfx.js';
import {VS_MARK, FS_MARK, VS_TEX, FS_TEX} from '../core/shaders.js';
import {PI, TAU, abs, sin, cos, min, max, ceil, clamp, damp, lerp, rnd, sstep} from '../core/util.js';
import {initMats, part, setPartLayer} from '../vehicles/rider.js';

const Q = {root: null, torso: null, arm: null, wheels: [], held: null, flying: [], splats: [], marks: []};
const LANE = 2.6, HIT_W = 1.2;
const SPL = [];
const laneOf = (cx, x) => cx + clamp(Math.round((x - cx) / LANE), -1, 1) * LANE;

function choco(b, s = 1, o = [0, 0, 0]) {
  const choc = hex('#5a2e1a'), ban = hex('#ffd84a'), stick = hex('#a8743f');
  const P = (x, y, z) => [o[0] + x * s, o[1] + y * s, o[2] + z * s];
  b.tube(P(0, -0.3, 0), P(0, 0.02, 0), 0.022 * s, 0.022 * s, stick, 5);
  b.curve([P(0, 0, 0), P(0.03, 0.24, 0), P(0.01, 0.46, 0.02), P(-0.04, 0.64, 0.04)], (t) => 0.085 * s * (1 - 0.32 * t), (ta) => (ta < 0.68 ? choc : ban), 8);
}
function signTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 160;
  const x = cv.getContext('2d');
  const draw = () => {
    x.fillStyle = '#fff6e6';
    x.fillRect(0, 0, 512, 160);
    x.fillStyle = '#e3262f';
    x.fillRect(0, 0, 512, 18);
    x.fillStyle = '#1b62c9';
    x.fillRect(0, 142, 512, 18);
    x.font = '400 64px "Shrikhand","Arial Black",Impact,sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = '#5a2e1a';
    x.fillText('Chocobananos', 256, 84);
  };
  draw();
  const tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace;
  if (document.fonts && document.fonts.load) document.fonts.load('400 64px "Shrikhand"').then(() => {
    draw();
    tex.needsUpdate = true;
  }, () => {});
  return tex;
}
function buildChoco() {
  initMats();
  setPartLayer(2);
  const ink = hex('#17100e'), white = hex('#f4f2ee'), red = hex('#e3262f'), blue = hex('#1b62c9'), yellow = hex('#ffc91f'), green = hex('#2bae56'), iron = hex('#2a262a'),
    skin = hex('#a86a44'), hair = hex('#1e1614'), corte = hex('#2a3f8f'), huipil = hex('#d8263c'), apron = hex('#fff3d6');
  const root = new T.Group();
  root.visible = false;
  root.scale.setScalar(1.08);
  scene.add(root);
  Q.root = root;
  // Triciclo: la hielera va adelante (-z), ella pedalea atrás.
  const b = new GeoB();
  b.box(0, 0.98, -0.9, 0.66, 0.42, 0.48, white);
  b.box(0, 1.43, -0.9, 0.69, 0.05, 0.51, blue);
  b.box(0, 0.75, -0.9, 0.67, 0.05, 0.49, red);
  [-1, 1].forEach((s) => b.tube([s * 0.6, 0.45, -0.9], [s * 0.6, 0.6, -0.4], 0.035, 0.035, iron, 4));
  b.tube([0, 0.62, -0.42], [0, 0.6, 0.55], 0.04, 0.04, iron, 4);
  b.tube([0, 0.6, 0.35], [0, 1.02, 0.32], 0.035, 0.035, iron, 4);
  b.box(0, 1.05, 0.32, 0.16, 0.05, 0.13, ink);
  b.tube([0, 0.66, -0.42], [0, 1.25, -0.32], 0.03, 0.03, iron, 4);
  b.tube([-0.3, 1.25, -0.3], [0.3, 1.25, -0.3], 0.022, 0.022, iron, 4);
  // Sombrilla de colores
  b.tube([0.45, 1.45, -0.95], [0.45, 2.7, -0.95], 0.03, 0.03, white, 4);
  const rings = [];
  for (const [r, y] of [[0.03, 3.05], [1.25, 2.66], [1.38, 2.56]]) {
    const o = [];
    for (let i = 0; i < 16; i++) o.push([0.45 + cos((i / 16) * TAU) * r, y, -0.95 + sin((i / 16) * TAU) * r]);
    rings.push(o);
  }
  b.loft(rings, (a, tb) => [red, yellow, green, blue][Math.floor(tb * 8) % 4]);
  // Chocobananos parados en la hielera
  for (let i = 0; i < 6; i++) choco(b, 0.72, [-0.42 + (i % 3) * 0.28, 1.62, -1.08 + Math.floor(i / 3) * 0.26]);
  part(root, b.build());
  // Rótulo de la hielera
  const sign = new T.Mesh(new T.PlaneGeometry(1.2, 0.38), new T.ShaderMaterial({vertexShader: VS_TEX, fragmentShader: FS_TEX, uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uSunCol: U.uSunCol, uShade: U.uShade, uMap: {value: signTexture()}}}));
  sign.position.set(0, 1.02, -1.39);
  sign.rotation.y = PI;
  sign.frustumCulled = false;
  sign.layers.enable(1);
  sign.layers.enable(2);
  root.add(sign);
  const wg = new GeoB();
  wg.tube([-0.05, 0, 0], [0.05, 0, 0], 0.3, 0.3, ink, 12);
  wg.tube([0.05, 0, 0], [0.06, 0, 0], 0.18, 0.18, white, 10);
  const wgeo = wg.build();
  [[-0.66, -0.9], [0.66, -0.9], [0, 0.55]].forEach(([x, z]) => {
    const w = part(root, wgeo);
    w.position.set(x, 0.3, z);
    Q.wheels.push(w);
  });
  // Doña Choco: corte azul, huipil rojo, delantal y trenzas. Gira el cuerpo para tirar.
  const legs = new GeoB();
  legs.tube([0, 0.72, 0.45], [0, 1.12, 0.36], 0.32, 0.27, corte, 8);
  [-1, 1].forEach((s) => legs.tube([s * 0.14, 0.95, 0.3], [s * 0.15, 0.55, -0.05], 0.07, 0.06, skin, 5));
  part(root, legs.build());
  const torso = new T.Group();
  torso.position.set(0, 1.12, 0.38);
  root.add(torso);
  Q.torso = torso;
  const t = new GeoB();
  t.tube([0, 0, 0], [0, 0.56, 0], 0.3, 0.25, (ta) => (ta > 0.45 && ta < 0.6 ? yellow : ta > 0.22 && ta < 0.3 ? green : huipil), 8);
  t.box(0, 0.12, -0.27, 0.24, 0.16, 0.03, apron);
  t.sph([0, 0.76, 0], [0.17, 0.19, 0.17], skin, 0, 6, 8);
  t.sph([0, 0.82, 0.03], [0.185, 0.17, 0.18], hair, 0, 6, 8);
  [-1, 1].forEach((s) => t.curve([[s * 0.12, 0.78, 0.12], [s * 0.15, 0.55, 0.2], [s * 0.13, 0.3, 0.18]], () => 0.04, hair, 5));
  t.box(0, 0.93, 0, 0.2, 0.04, 0.2, white);
  // Cara (mira hacia -z): cejas bravas y boca
  [-1, 1].forEach((s) => {
    t.box(s * 0.065, 0.81, -0.165, 0.035, 0.035, 0.01, ink);
    t.box(s * 0.07, 0.87, -0.16, 0.05, 0.012, 0.01, ink);
  });
  t.box(0, 0.7, -0.165, 0.05, 0.012, 0.01, ink);
  t.tube([-0.28, 0.48, 0], [-0.32, 0.12, -0.22], 0.06, 0.05, huipil, 5);
  part(torso, t.build());
  // El brazo que tira, con su chocobanano en la mano
  const arm = new T.Group();
  arm.position.set(0.27, 0.48, 0);
  torso.add(arm);
  Q.arm = arm;
  const a = new GeoB();
  a.tube([0, 0, 0], [0.08, 0.46, -0.05], 0.06, 0.05, huipil, 5);
  a.sph([0.09, 0.5, -0.06], 0.06, skin, 0, 4, 5);
  part(arm, a.build());
  const held = new GeoB();
  choco(held, 1);
  Q.held = part(arm, held.build());
  Q.held.position.set(0.09, 0.58, -0.06);
  setPartLayer(1);
  // Los que van volando y los embarrones en el suelo
  const fly = new GeoB();
  choco(fly, 1.3);
  const flyG = fly.build();
  for (let i = 0; i < 3; i++) {
    const m = part(scene, flyG);
    m.visible = false;
    Q.flying.push(m);
  }
  const sp = new GeoB();
  sp.painted = true;
  const choc = hex('#4a2414'), chocL = hex('#7a4228');
  sp.tube([0, 0.03, 0], [0, 0.05, 0], 1.0, 1.0, choc, 12);
  [[0.8, 0.5, 0.45], [-0.75, 0.4, 0.4], [0.3, -0.85, 0.42], [-0.45, -0.7, 0.36], [1.05, -0.3, 0.3], [-1.05, -0.2, 0.28]].forEach(([x, z, r]) => sp.tube([x, 0.03, z], [x, 0.05, z], r, r, choc, 9));
  sp.tube([-0.2, 0.05, 0.1], [-0.2, 0.06, 0.1], 0.45, 0.45, chocL, 10);
  const SPK = [hex('#ff4a4a'), hex('#4ad06a'), hex('#4a8aff'), hex('#ffd24a'), hex('#ffffff')];
  for (let i = 0; i < 26; i++) {
    const r = 0.15 + ((i * 37) % 80) / 100, ang = i * 2.39;
    sp.box(cos(ang) * r, 0.065, sin(ang) * r, 0.04, 0.008, 0.04, SPK[i % 5]);
  }
  const spG = sp.build();
  for (let i = 0; i < 6; i++) {
    const m = part(scene, spG, false);
    m.visible = false;
    Q.splats.push(m);
  }
  for (let i = 0; i < 2; i++) {
    const mk = new T.Mesh(new T.PlaneGeometry(2.5, 16), new T.ShaderMaterial({vertexShader: VS_MARK, fragmentShader: FS_MARK, uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uTime: U.uTime, uAmt: {value: 1}, uFreq: {value: 0.22}, uWid: {value: 1.25}}, depthWrite: false, depthTest: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, side: T.DoubleSide}));
    mk.visible = false;
    mk.frustumCulled = false;
    mk.renderOrder = -8;
    scene.add(mk);
    Q.marks.push(mk);
  }
}
function place(b, time, dt0, speed) {
  Q.root.visible = true;
  Q.root.position.set(b.x, 0, b.z);
  Q.root.rotation.y = b.yaw || 0;
  Q.wheels.forEach((w) => (w.rotation.x -= (speed * dt0) / 0.3));
  // Se voltea para tirar y vuelve a ver al frente.
  const turn = b.mode === 'aim' ? sstep(0, 0.25, b.t) : b.mode === 'throw' ? 1 - sstep(0.15, 0.55, b.t) : 0;
  Q.torso.rotation.y = turn * 2.5;
  Q.torso.rotation.z = sin(time * 9) * 0.03;
  Q.arm.rotation.x = b.mode === 'aim' ? -1.2 - 0.6 * sstep(0, 0.6, b.t) : b.mode === 'throw' ? lerp(-1.8, 0.6, sstep(0, 0.12, b.t)) : 0.15 + sin(time * 4) * 0.05;
  Q.held.visible = b.mode !== 'throw' || b.t > 0.4;
}
function hideAll() {
  if (Q.root) Q.root.visible = false;
  Q.flying.forEach((m) => (m.visible = false));
  Q.splats.forEach((m) => (m.visible = false));
  Q.marks.forEach((m) => (m.visible = false));
  SPL.length = 0;
}
export const chocoBoss = {
  _q: Q,
  _spl: SPL,
  build: buildChoco,
  sfx: 'campanita',
  hide: hideAll,
  start(api) {
    const {G, BOSS: b} = api;
    hideAll();
    const cx = api.center(G.dist);
    b.mode = 'cut';
    b.t = 0;
    b.count = 0;
    b.x = laneOf(cx, G.x);
    b.z = -18;
    b.yaw = 0;
    b.vol = null;
    Q.root.visible = true;
  },
  endCut(api) {
    const b = api.BOSS;
    b.mode = 'ride';
    b.next = 1.6;
    b.t = 0;
    api.UI.boss(true, 0);
    api.queuePhone('Don Lalo', '¡Esa es Doña Choco! Dice que le debés unos chocobananos. Cuando tire, cambiate de carril o saltá.');
  },
  cutView(api, cam, q) {
    const b = api.BOSS;
    cam.position.set(b.x - lerp(5.4, 4.8, q), lerp(2.45, 2.3, q), b.z - lerp(5.3, 4.6, q));
    cam.lookAt(b.x - 1.9, 1.65, b.z + 0.2);
  },
  // El piloto automático se sale de las marcas y de los embarrones.
  laneCost(api, x) {
    let c = 0;
    for (const s of SPL) {
      const d = s.D - api.G.dist;
      if (d < -1 || d > 70) continue;
      if (abs(x - s.x) < 2.0) c += 90;
    }
    return c;
  },
  auto(api) {
    const {G} = api;
    for (const s of SPL) {
      const d = s.D - G.dist;
      if (s.landed && d > 1 && d < G.speed * 0.3 && abs(G.x - s.x) < HIT_W + 0.5) return true;
    }
    return false;
  },
  update(api, dt, dt0, time) {
    const {G, BOSS: b, Audio} = api;
    b.t += dt0;
    const cx = api.center(G.dist);
    if (b.mode === 'cut') {
      b.x = laneOf(cx, G.x);
      place(b, time, dt0, 0);
      return;
    }
    if (b.mode === 'off' || b.mode === 'gone') {
      updateSplats(api, dt0, time);
      return;
    }
    // Va adelante, a unos 16 m, cambiando de carril.
    if (b.mode !== 'sold') {
      b.z = damp(b.z, -23, 2.5, dt0);
      b.x = damp(b.x, b.tx === undefined ? laneOf(cx, b.x) : b.tx, 3, dt0);
    }
    if (b.mode === 'ride') {
      b.next -= dt0;
      if (b.next <= 0 && !SPL.some((s) => !s.done)) {
        // Escoge dos carriles: el tuyo y otro. Queda uno libre.
        const mine = Math.round((laneOf(cx, G.x) - cx) / LANE);
        const others = [-1, 0, 1].filter((i) => i !== mine);
        const other = others[Math.floor(rnd() * others.length)];
        const lanes = b.count >= 2 ? [mine, other] : rnd() < 0.5 ? [mine] : [mine, other];
        const wind = 0.72 - b.count * 0.08, flight = 0.62;
        const Dl = G.dist + G.speed * (wind + flight) + 13;
        b.vol = {lanes, Dl, hit: false, n: lanes.length};
        lanes.forEach((i) => SPL.push({x: cx + i * LANE, D: Dl, t: -(wind + flight), wind, flight, landed: false, done: false, vol: b.vol}));
        b.mode = 'aim';
        b.t = 0;
        // Ella se pasa al carril libre: si te fijás, te dice por dónde.
        const free = lanes.length > 1 ? -lanes[0] - lanes[1] : others.find((i) => i !== lanes[0]);
        b.tx = cx + free * LANE;
        Audio.campanita();
        api.shout(b.count === 0 ? '¡Ahí van los chocobananos!' : '¡Otra vez!', 3, 2.8);
      }
    } else if (b.mode === 'aim') {
      if (b.t > (b.vol ? SPL.find((s) => s.vol === b.vol).wind : 0.6)) {
        b.mode = 'throw';
        b.t = 0;
        Audio.jump();
      }
    } else if (b.mode === 'throw') {
      if (b.t > 0.6) {
        b.mode = 'ride';
        b.t = 0;
        b.next = 3.0;
        b.tx = undefined;
      }
    } else if (b.mode === 'sold') {
      // Se orilla a venderle a los turistas y se queda atrás.
      b.x = damp(b.x, cx + 3.6, 2, dt0);
      b.z += lerp(2, 20, clamp(b.t / 2)) * dt0;
      b.yaw = damp(b.yaw || 0, -0.3, 3, dt0);
      if (b.z > 30) {
        b.mode = 'gone';
        Q.root.visible = false;
      }
    }
    // Volea terminada: si no te tocó ninguno, cuenta.
    if (b.vol && b.mode !== 'sold' && b.mode !== 'gone') {
      const mine = SPL.filter((s) => s.vol === b.vol);
      if (mine.length && mine.every((s) => s.done)) {
        if (!b.vol.hit) {
          b.count++;
          api.UI.boss(true, b.count);
          G.q += 8;
          G.clock += 1;
          G.racha = min(9, G.racha + 1);
          G.rachaT = 6;
          G.lines = 0.7;
          api.UI.floatTime('+1 s', true);
          api.impact(0.05, true);
          api.shout(b.count >= 3 ? '¡Se le acabaron los chocobananos!' : '¡Esquivado!', 2);
          Audio.near(1, 0);
        }
        b.vol = null;
        if (b.count >= 3) {
          b.mode = 'sold';
          b.t = 0;
          api.UI.boss(false, 3);
          api.queuePhone('Don Lalo', 'Ya se puso a venderle a los turistas. Seguí derecho al parque, patojo, que ahí te espero.');
          api.Audio.setLevel(api.MT.music[2]);
        }
      }
    }
    if (b.mode !== 'gone') {
      place(b, time, dt0, G.speed);
      api.dropShadow(b.x, b.z - 0.3, 0.9, 1.4);
    }
    updateSplats(api, dt0, time);
  },
};
// Vuelo, caída y embarrones; y el golpe si pasás encima sin saltar.
function updateSplats(api, dt0, time) {
  const {G, BOSS: b, Audio} = api;
  let fi = 0, si = 0, mi = 0;
  for (let i = SPL.length - 1; i >= 0; i--) {
    const s = SPL[i];
    s.t += dt0;
    const z = -(s.D - G.dist);
    if (!s.landed) {
      // Marca roja donde va a caer
      if (mi < Q.marks.length) {
        const mk = Q.marks[mi++];
        mk.visible = true;
        // La franja roja cubre desde donde cae hasta 14 m antes, para que se vea de lejos.
        mk.position.set(s.x, 0, z + 6);
        mk.material.uniforms.uAmt.value = 1.8 + 0.6 * sin(time * 18);
      }
      const ft = s.t + s.flight;
      if (ft > 0 && fi < Q.flying.length) {
        const u = clamp(ft / s.flight), m = Q.flying[fi++];
        const x0 = b.x + 0.3, z0 = b.z, y0 = 2.1;
        m.visible = true;
        m.position.set(lerp(x0, s.x, u), lerp(y0, 0.2, u) + 3.4 * sin(u * PI), lerp(z0, z, u));
        m.rotation.set(time * 9 + i, 0, time * 7);
      }
      if (s.t >= 0) {
        s.landed = true;
        Audio.land(0.8);
        api.burst(s.x, 0.3, z, 10, 4.5, 0.4, 0.14, [0.35, 0.18, 0.1], {world: 1, add: 0});
      }
    }
    if (s.landed && !s.done) {
      if (si < Q.splats.length) {
        const m = Q.splats[si++];
        m.visible = true;
        m.position.set(s.x, 0, z);
        m.scale.setScalar(min(1, 0.4 + s.t * 6) * 1.05);
      }
      // ¿Le pasaste encima?
      if (abs(s.D - G.dist) < 1.15 && abs(G.x - s.x) < HIT_W && G.y < 0.3 && G.iframes <= 0 && !s.hit) {
        s.hit = true;
        if (s.vol) s.vol.hit = true;
        G.iframes = 1;
        G.shake = 0.8;
        G.speed *= 0.6;
        G.hits++;
        G.racha = 1;
        api.impact(0.06, false);
        api.shout('¡Te embarró de chocolate!', 3);
        Audio.hit();
        api.UI.floatTime('−' + ceil(10 * (1 - G.up.carton * 0.3)) + '% paquete', false);
        api.damage(10);
      }
      if (G.dist > s.D + 2.5) s.done = true;
    }
    if (s.done && G.dist > s.D + 30) SPL.splice(i, 1);
    else if (s.done && si < Q.splats.length) {
      const m = Q.splats[si++];
      m.visible = z < 12;
      m.position.set(s.x, 0, z);
    }
  }
  for (; fi < Q.flying.length; fi++) Q.flying[fi].visible = false;
  for (; si < Q.splats.length; si++) Q.splats[si].visible = false;
  for (; mi < Q.marks.length; mi++) Q.marks[mi].visible = false;
}
