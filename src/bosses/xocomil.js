// El Xocomil: el viento de la tarde hecho nube, cachetón y bravo. Va adelante sobre el lago y sopla:
// primero una ola que hay que brincar de frente, después remolinos que hay que rodear, y al final las dos cosas.
// A la tercera que lo esquivás, se calma.
import * as T from 'three';
import {GeoB, hex} from '../core/geo.js';
import {scene, U, VIEW} from '../core/gfx.js';
import {VS_MARK, FS_MARK, FS_SWIRL} from '../core/shaders.js';
import {PI, TAU, abs, sin, min, max, ceil, floor, clamp, damp, lerp, rnd, sstep} from '../core/util.js';
import {initMats, part, setPartLayer} from '../vehicles/rider.js';
import {olaInto} from '../world/props-atitlan.js';

const X = {root: null, head: null, cheeks: [], mouth: null, pupils: [], waves: [], swirls: [], marks: []};
const LANE = 2.5, HIT_W = 1.35, WAVE_V = 9, JUMP_OK = 0.45;
const HZ = [];
const laneOf = (cx, x) => cx + clamp(Math.round((x - cx) / LANE), -1, 1) * LANE;
const FOAM = [1.5, 1.6, 1.6];

function buildXoco() {
  initMats();
  setPartLayer(2);
  const white = hex('#f7f9fc'), gray = hex('#b4bed2'), ink = hex('#17100e'), deep = hex('#1d2a4a'), blush = hex('#f2b4c4');
  const root = new T.Group();
  root.visible = false;
  root.scale.setScalar(1.7);
  scene.add(root);
  X.root = root;
  const head = new T.Group();
  root.add(head);
  X.head = head;
  // La nube: bolas blancas con la panza gris
  const b = new GeoB();
  [[0, 0, 0, 3.0], [-2.5, -0.5, 0.2, 2.2], [2.6, -0.4, 0.1, 2.3], [-1.3, 1.7, -0.2, 2.0], [1.4, 1.8, -0.3, 2.1], [0.1, 2.6, -0.6, 1.8], [-3.8, -1.2, -0.4, 1.5], [3.9, -1.1, -0.5, 1.6],
    [-1.5, -1.8, 0.4, 1.7], [1.6, -1.9, 0.4, 1.7], [0, -2.2, 0.2, 1.5], [-4.9, -0.3, -0.9, 1.0], [5.0, -0.2, -1.0, 1.1]].forEach(([x, y, z, r]) => b.sph([x, y, z], r, (a) => (a > 0.64 ? gray : white), 0, 8, 12));
  // Ojos bravos que miran al que viene (la cara ve hacia +z)
  [-1, 1].forEach((s) => {
    b.sph([s * 1.05, 0.55, 2.62], [0.58, 0.7, 0.34], white, 0, 7, 9);
    b.tube([s * 0.42, 1.12, 2.95], [s * 1.62, 1.58, 2.66], 0.17, 0.13, ink, 6);
  });
  part(head, b.build());
  [-1, 1].forEach((s) => {
    const p = new GeoB();
    p.sph([0, 0, 0], [0.24, 0.28, 0.1], ink, 0, 5, 7);
    p.sph([0.07, 0.09, 0.07], 0.06, white, 0.6, 3, 5);
    const g = part(head, p.build(), false);
    g.position.set(s * 1.0, 0.45, 2.94);
    X.pupils.push(g);
  });
  // Cachetes que se inflan antes de soplar
  [-1, 1].forEach((s) => {
    const c = new GeoB();
    c.sph([0, 0, 0], 1.0, (a) => (a < 0.5 ? white : blush), 0, 7, 9);
    const g = part(head, c.build());
    g.position.set(s * 1.95, -0.6, 1.95);
    X.cheeks.push(g);
  });
  // Boca: rayita brava, y una O cuando sopla
  const m = new GeoB();
  // Se arma de lado y se gira un cuarto de vuelta: el aro queda viendo al frente.
  m.sph([0, 0, 0], [0.2, 0.4, 0.5], deep, 0, 6, 9);
  m.hoop(0, 0, 0.45, 0.09, white, 20, 5);
  const mouth = part(head, m.build());
  mouth.position.set(0, -1.1, 2.88);
  mouth.rotation.y = PI / 2;
  X.mouth = mouth;
  // Olas que sopla y remolinos: se ven en el juego, no en el corte.
  setPartLayer(0);
  const wb = new GeoB();
  olaInto(wb);
  const wg = wb.build();
  for (let i = 0; i < 2; i++) {
    const w = part(scene, wg);
    w.visible = false;
    X.waves.push(w);
  }
  setPartLayer(1);
  for (let i = 0; i < 3; i++) {
    const s = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({vertexShader: VS_MARK, fragmentShader: FS_SWIRL, uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uTime: U.uTime, uAmt: {value: 1}}, depthWrite: false, transparent: true, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, side: T.DoubleSide}));
    s.visible = false;
    s.frustumCulled = false;
    s.renderOrder = -7;
    scene.add(s);
    X.swirls.push(s);
  }
  for (let i = 0; i < 3; i++) {
    const mk = new T.Mesh(new T.PlaneGeometry(2.4, 16), new T.ShaderMaterial({vertexShader: VS_MARK, fragmentShader: FS_MARK, uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uTime: U.uTime, uAmt: {value: 1}, uFreq: {value: 0.22}, uWid: {value: 1.2}}, depthWrite: false, depthTest: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, side: T.DoubleSide}));
    mk.visible = false;
    mk.frustumCulled = false;
    mk.renderOrder = -8;
    scene.add(mk);
    X.marks.push(mk);
  }
}
function place(b, time, G) {
  X.root.visible = true;
  X.root.position.set(b.x, b.y, b.z);
  const k = b.puff || 0;
  X.cheeks.forEach((c, i) => c.scale.setScalar(1 + k * 0.55 + sin(time * 3 + i) * 0.03));
  // Brava: boca de rayita. Al soplar: una O redonda.
  const blowing = b.mode === 'blow' ? 1 - sstep(0.6, 1.0, b.t) : 0;
  X.mouth.scale.set(1, lerp(0.35, 1.25, max(blowing, k * 0.3)), lerp(1.5, 0.85, max(blowing, k)));
  const look = clamp((G.x - b.x) * 0.03, -0.12, 0.12);
  X.pupils.forEach((p, i) => p.position.set((i ? 1 : -1) * 1.0 + look, 0.45 - 0.06, 2.94));
  X.head.rotation.z = sin(time * 0.7) * 0.05;
  X.head.rotation.y = sin(time * 0.5) * 0.08;
}
function hideAll() {
  if (X.root) X.root.visible = false;
  X.waves.forEach((m) => (m.visible = false));
  X.swirls.forEach((m) => (m.visible = false));
  X.marks.forEach((m) => (m.visible = false));
  HZ.length = 0;
}
// Suelta la ronda: la ola sale de lejos y viene hacia vos; los remolinos se avisan con marcas rojas.
function blow(api, b, cx) {
  const {G, Audio} = api;
  const round = {hit: false};
  b.round = round;
  if (b.kind !== 'remolinos') {
    HZ.push({type: 'ola', D: G.dist + 80, v: WAVE_V, t: 0, done: false, round});
    Audio.wave();
  }
  if (b.kind !== 'ola') {
    const mine = Math.round((laneOf(cx, G.x) - cx) / LANE);
    const others = [-1, 0, 1].filter((i) => i !== mine);
    const lanes = [mine, others[floor(rnd() * others.length)]];
    const combo = b.kind === 'combo', warn = combo ? 2.6 : 1.6;
    const Dl = G.dist + G.speed * warn + (combo ? 34 : 14);
    lanes.forEach((i) => HZ.push({type: 'swirl', lane: i, D: Dl, x: cx + i * LANE, t: -warn, formed: false, done: false, round}));
  }
}
export const xocomilBoss = {
  _x: X,
  _hz: HZ,
  build: buildXoco,
  sfx: 'gust',
  hide: hideAll,
  start(api) {
    const {G, BOSS: b} = api;
    hideAll();
    b.mode = 'cut';
    b.t = 0;
    b.count = 0;
    b.round = null;
    b.puff = 0;
    b.spin = 0;
    b.x = api.center(G.dist + 46);
    b.y = 9.6;
    b.z = -50;
    X.root.scale.setScalar(1.7);
    X.root.visible = true;
  },
  endCut(api) {
    const b = api.BOSS;
    b.mode = 'ride';
    b.next = 1.3;
    b.t = 0;
    api.UI.boss(true, 0);
    api.queuePhone('Don Chema', '¡Ese es el Xocomil! Cuando sople, brincá la ola de frente. Si hace remolinos, cambiate de carril.');
  },
  // Desde abajo y de lejos, para que quepa entera; en vertical va al centro.
  cutView(api, cam, q) {
    const b = api.BOSS;
    if (VIEW.aspect < 1) {
      cam.position.set(b.x + 2, b.y - lerp(3.4, 3, q), b.z + lerp(76, 70, q));
      cam.lookAt(b.x + 0.6, b.y + 1.4, b.z);
      return;
    }
    cam.position.set(b.x + lerp(5.5, 4.5, q), b.y - lerp(3.8, 3.2, q), b.z + lerp(60, 54, q));
    cam.lookAt(b.x + lerp(12.8, 11.8, q), b.y + 0.5, b.z);
  },
  // El piloto automático rodea los remolinos y brinca las olas a tiempo.
  laneCost(api, x) {
    let c = 0;
    for (const h of HZ) {
      if (h.type !== 'swirl' || h.done) continue;
      const d = h.D - api.G.dist;
      if (d < -1.5 || d > 80) continue;
      if (abs(x - h.x) < 2.0) c += 90;
    }
    return c;
  },
  auto(api) {
    const {G} = api;
    for (const h of HZ) {
      if (h.type !== 'ola' || h.done) continue;
      const d = h.D - G.dist;
      if (d > 0.5 && d < (G.speed + h.v) * 0.3) return true;
    }
    return false;
  },
  update(api, dt, dt0, time) {
    const {G, BOSS: b, Audio} = api;
    b.t += dt0;
    const cx = api.center(G.dist);
    b.x = damp(b.x, api.center(G.dist + 46) + sin(time * 0.4) * 2.0, 1.2, dt0);
    if (b.mode !== 'calm') b.y = 9.6 + sin(time * 0.9) * 0.4;
    // La vuelta que te da el remolino
    if (b.spin > 0) {
      b.spin -= dt0;
      G.spin = b.spin > 0 ? (1 - b.spin / 0.75) * TAU : 0;
    }
    if (b.mode === 'cut') {
      place(b, time, G);
      return;
    }
    if (b.mode === 'off' || b.mode === 'gone') {
      updateHz(api, dt, dt0, time);
      return;
    }
    if (b.mode !== 'calm') b.z = damp(b.z, -40, 1.2, dt0);
    if (b.mode === 'ride') {
      b.puff = damp(b.puff, 0, 4, dt0);
      b.next -= dt0;
      if (b.next <= 0 && !HZ.some((h) => !h.done)) {
        b.kind = b.count === 0 ? 'ola' : b.count === 1 ? 'remolinos' : 'combo';
        b.mode = 'charge';
        b.t = 0;
        Audio.gust();
        api.shout(b.kind === 'remolinos' ? '¡Va a hacer remolinos!' : b.kind === 'combo' ? '¡Ola y remolinos!' : '¡Ahí viene una ola!', 3, 2.8);
      }
    } else if (b.mode === 'charge') {
      b.puff = sstep(0, 0.8, b.t);
      if (b.t > 0.85) {
        blow(api, b, cx);
        b.mode = 'blow';
        b.t = 0;
      }
    } else if (b.mode === 'blow') {
      b.puff = 1 - sstep(0, 0.5, b.t);
      G.lines = max(G.lines, 0.4 * (1 - b.t));
      // Viento que sale de la boca hacia vos
      if (rnd() < dt0 * 46) {
        const s = X.root.scale.x;
        api.fx(0, b.x + rnd(-1.2, 1.2) * s, b.y - 1.1 * s + rnd(-0.6, 0.6), b.z + 3.4 * s, rnd(0.15, 0.3), 0.9, [1.5, 1.6, 1.7], {vz: rnd(34, 44), vy: -rnd(3, 6), vx: rnd(-3, 3), world: 0});
      }
      if (b.t > 1.0) {
        b.mode = 'ride';
        b.t = 0;
        b.next = b.kind === 'combo' ? 3.4 : 2.6;
      }
    } else if (b.mode === 'calm') {
      // Se deshace y se va para arriba.
      b.y += dt0 * 1.6;
      b.puff = 0;
      X.root.scale.setScalar(1.7 * (1 - 0.8 * sstep(0, 2.4, b.t)));
      if (b.t > 2.6) {
        b.mode = 'gone';
        X.root.visible = false;
      }
    }
    // Ronda terminada: si no te agarró nada, cuenta.
    if (b.round && b.mode !== 'calm' && b.mode !== 'gone') {
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
          api.shout(b.count >= 3 ? '¡Se calmó el Xocomil!' : '¡Esquivado!', 2);
          Audio.near(1, 0);
        }
        b.round = null;
        if (b.count >= 3) {
          b.mode = 'calm';
          b.t = 0;
          api.UI.boss(false, 3);
          api.queuePhone('Don Chema', 'Ya se calmó el lago. Seguí derecho al muelle de San Pedro, que ahí te espero.');
          Audio.setLevel(api.MT.music[1]);
        }
      }
    }
    if (b.mode !== 'gone') place(b, time, G);
    updateHz(api, dt, dt0, time);
  },
};
// Olas que vienen, remolinos que se forman, y el golpe si te agarran.
function updateHz(api, dt, dt0, time) {
  const {G, BOSS: b, Audio} = api;
  let wi = 0, si = 0, mi = 0;
  const hurt = (h, n, text, vy) => {
    h.hit = true;
    if (h.round) h.round.hit = true;
    G.iframes = 1;
    G.shake = 0.9;
    G.speed *= h.type === 'ola' ? 0.55 : 0.6;
    G.hits++;
    G.racha = 1;
    if (vy) {
      G.vy = vy;
      G.y = max(G.y, 0.02);
      G.air = true;
    }
    api.impact(0.06, false);
    api.shout(text, 3);
    Audio.splash();
    Audio.hit();
    api.burst(G.x, 0.5, 0.3, 16, 6, 0.6, 0.2, FOAM, {world: 0.5, add: 0});
    api.UI.floatTime('−' + ceil(n * (1 - G.up.carton * 0.3)) + '% paquete', false);
    api.damage(n);
  };
  for (let i = HZ.length - 1; i >= 0; i--) {
    const h = HZ[i];
    h.t += dt0;
    if (h.type === 'ola') {
      h.D -= h.v * dt;
      const z = -(h.D - G.dist);
      if (wi < X.waves.length) {
        const m = X.waves[wi++];
        m.visible = z < 40;
        m.position.set(api.center(h.D), 0, z);
        m.scale.set(17, 0.08 + 1.3 * sstep(0, 0.9, h.t), 1.6);
      }
      if (!h.done && h.D <= G.dist) {
        h.done = true;
        if (G.state === 'play' && G.y < JUMP_OK && G.iframes <= 0) hurt(h, 10, '¡Te revolcó la ola!', 4.6);
        else if (G.y >= JUMP_OK) {
          api.shout('¡Por encima de la ola!', 2);
          api.burst(G.x, 0.3, 1.2, 12, 5, 0.5, 0.16, FOAM, {world: 0.8, add: 0});
        }
      }
      if (h.done && h.D < G.dist - 28) HZ.splice(i, 1);
      continue;
    }
    // Remolino: sigue el carril donde se marcó
    h.x = api.center(h.D) + h.lane * LANE;
    const z = -(h.D - G.dist);
    if (!h.formed) {
      if (mi < X.marks.length) {
        const mk = X.marks[mi++];
        mk.visible = true;
        mk.position.set(h.x, 0, z + 6);
        mk.material.uniforms.uAmt.value = 1.6 + 0.6 * sin(time * 16);
      }
      if (h.t >= 0) {
        h.formed = true;
        Audio.remolino();
        api.burst(h.x, 0.2, z, 10, 4, 0.5, 0.16, FOAM, {world: 1, add: 0});
      }
    } else if (!h.done) {
      if (abs(h.D - G.dist) < 1.6 && abs(G.x - h.x) < HIT_W && G.y < 0.3 && G.iframes <= 0 && !h.hit && G.state === 'play') {
        hurt(h, 8, '¡Te agarró el remolino!', 0);
        b.spin = 0.75;
      }
      if (G.dist > h.D + 2.5) h.done = true;
    }
    if (h.formed && si < X.swirls.length && z < 16) {
      const s = X.swirls[si++];
      s.visible = true;
      s.position.set(h.x, 0, z);
      s.scale.setScalar(min(1, 0.3 + h.t * 3) * 1.8);
      s.material.uniforms.uAmt.value = h.done ? max(0, 1 - (G.dist - h.D - 2.5) / 20) : 1;
    }
    if (h.done && G.dist > h.D + 30) HZ.splice(i, 1);
  }
  for (; wi < X.waves.length; wi++) X.waves[wi].visible = false;
  for (; si < X.swirls.length; si++) X.swirls[si].visible = false;
  for (; mi < X.marks.length; mi++) X.marks[mi].visible = false;
}
