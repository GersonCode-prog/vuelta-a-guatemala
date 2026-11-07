// El Rey del Camino: otra camioneta que te quiere ganar el pasaje. Te rebasa, pone el pidevías
// y se te cruza en el carril marcado en rojo. Hay que cambiarse de carril. A la tercera lo para la PMT.
import * as T from 'three';
import {GeoB, hex, mixC} from '../core/geo.js';
import {scene, U} from '../core/gfx.js';
import {VS_MARK, FS_MARK} from '../core/shaders.js';
import {PI, TAU, abs, sin, cos, min, max, ceil, clamp, damp, lerp, rnd, sstep} from '../core/util.js';
import {initMats, part, setPartLayer} from '../vehicles/rider.js';

const R = {root: null, blink: [], wheels: [], cop: null, copL: [], brocha: null};
const LEN = 8.2, HIT_W = 2.0;
let mark;
function buildRival() {
  initMats();
  setPartLayer(2);
  const green = hex('#1f9a52'), greenD = hex('#14703a'), oro = hex('#ffc91f'), purple = hex('#7a3fb0'), cream = hex('#fff3d6'), chrome = hex('#dcdad6'), chromeD = hex('#8f8d8a'), glass = hex('#26333f'), ink = hex('#17100e'), lamp = hex('#fff1c4'), tail = hex('#ff2b2b');
  const root = new T.Group();
  root.visible = false;
  root.scale.setScalar(0.86);
  scene.add(root);
  R.root = root;
  const b = new GeoB();
  const F = -0.3, Bk = 9.25, W = 1.22;
  b.box(0, 1.9, 5.3, W, 1.3, 3.95, green);
  b.box(0, 1.58, 5.3, W + 0.012, 0.1, 3.96, oro);
  b.box(0, 1.38, 5.3, W + 0.014, 0.05, 3.97, purple);
  b.box(0, 2.52, 5.3, W + 0.01, 0.55, 3.955, cream);
  b.box(0, 3.26, 5.3, W - 0.03, 0.06, 3.93, cream);
  b.box(0, 1.2, F + 0.85, 1.02, 0.58, 0.85, green);
  b.box(0, 1.12, F - 0.03, 0.66, 0.42, 0.04, chrome);
  for (let k = 0; k < 5; k++) b.box(0, 0.86 + k * 0.13, F - 0.07, 0.6, 0.018, 0.02, chromeD);
  b.box(0, 0.72, F - 0.12, 1.12, 0.12, 0.1, chrome);
  [-1, 1].forEach((s) => {
    b.sph([s * 0.84, 1.24, F - 0.02], [0.17, 0.17, 0.08], lamp, 2.6, 6, 8);
    b.tube([s * 1.0, 1.75, F + 0.35], [s * 1.55, 2.1, F + 0.35], 0.025, 0.025, chromeD, 4);
    b.box(s * 1.58, 2.3, F + 0.35, 0.05, 0.28, 0.14, ink);
    b.box(s * 1.04, 0.95, Bk + 0.02, 0.12, 0.12, 0.02, tail, 1.6);
  });
  // Ojos pintados en el parabrisas, para que se vea bravo en el corte
  b.box(0, 2.58, F + 1.71, 1.1, 0.44, 0.02, glass);
  [-1, 1].forEach((s) => {
    b.box(s * 0.5, 2.78, F + 1.68, 0.38, 0.05, 0.01, oro, 1.2);
    b.curve([[s * 0.2, 2.9, F + 1.67], [s * 0.5, 2.82, F + 1.67], [s * 0.85, 2.95, F + 1.67]], () => 0.035, ink, 4);
  });
  for (let i = 0; i < 7; i++) [-1, 1].forEach((s) => b.box(s * (W + 0.01), 2.55, F + 2.6 + i * 0.95, 0.012, 0.36, 0.38, glass));
  b.box(0, 2.55, Bk + 0.012, 1.0, 0.42, 0.012, glass);
  b.box(0, 0.68, Bk + 0.08, 1.24, 0.1, 0.1, chrome);
  b.box(0, 1.55, Bk + 0.014, 0.9, 0.3, 0.01, oro);
  // Corona dorada en el techo, del rey del camino
  const cx = 0, cy = 3.35, cz = F + 2.0;
  b.tube([cx, cy, cz], [cx, cy + 0.35, cz], 0.6, 0.6, oro, 14, 0.5);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    b.tube([cx + cos(a) * 0.5, cy + 0.35, cz + sin(a) * 0.5], [cx + cos(a) * 0.55, cy + 0.85, cz + sin(a) * 0.55], 0.12, 0.02, oro, 5, 0.5);
    b.sph([cx + cos(a) * 0.55, cy + 0.88, cz + sin(a) * 0.55], 0.07, i % 2 ? hex('#e3262f') : hex('#12b5b0'), 1.6, 4, 5);
  }
  // Parrilla con bultos
  [[-0.5, 3.6, hex('#d8c08a')], [0.45, 5, hex('#ff5d7d')], [-0.3, 6.6, hex('#b88a4a')], [0.5, 8, hex('#12b5b0')]].forEach(([x, z, c]) => b.box(x, 3.6, z, 0.42, 0.36, 0.5, c));
  part(root, b.build());
  // Pidevías: se prenden por turnos cuando se va a cruzar.
  const bl = new GeoB();
  bl.sph([0, 0, 0], [0.12, 0.12, 0.06], hex('#ffab1f'), 4, 5, 6);
  const blg = bl.build();
  [[-1.04, 1.25, Bk + 0.04], [1.04, 1.25, Bk + 0.04], [-1.0, 0.95, F - 0.04], [1.0, 0.95, F - 0.04]].forEach(([x, y, z]) => {
    const m = part(root, blg, false);
    m.position.set(x, y, z);
    m.visible = false;
    R.blink.push({m, side: Math.sign(x)});
  });
  const wg = new GeoB();
  wg.tube([-0.2, 0, 0], [0.2, 0, 0], 0.52, 0.52, ink, 14);
  wg.tube([0.2, 0, 0], [0.21, 0, 0], 0.3, 0.3, chrome, 10);
  wg.tube([-0.2, 0, 0], [-0.21, 0, 0], 0.3, 0.3, chrome, 10);
  const wgeo = wg.build();
  [[-1.0, 0.55], [1.0, 0.55], [-0.95, 7.5], [0.95, 7.5]].forEach(([x, z]) => {
    const w = part(root, wgeo);
    w.position.set(x, 0.52, z);
    R.wheels.push(w);
  });
  // El brocha, colgado de la puerta gritando el destino
  const br = new T.Group();
  br.position.set(W + 0.25, 1.1, F + 2.2);
  root.add(br);
  R.brocha = br;
  const p = new GeoB(), skin = hex('#b9784f'), shirt = hex('#e3262f');
  p.tube([0, 0, 0], [0, 0.75, 0], 0.09, 0.09, ink, 5);
  p.tube([0, 0.75, 0], [0, 1.4, 0], 0.2, 0.22, shirt, 7);
  p.sph([0, 1.62, 0], 0.17, skin, 0, 6, 7);
  p.tube([0, 1.75, 0], [0, 1.82, 0], 0.2, 0.2, ink, 8);
  p.tube([-0.18, 1.3, 0], [-0.3, 1.9, 0.1], 0.05, 0.045, skin, 4);
  p.tube([0.18, 1.3, 0], [0.55, 1.7, -0.2], 0.05, 0.045, skin, 4);
  p.box(0.05, 1.56, -0.17, 0.06, 0.03, 0.02, ink);
  part(br, p.build());
  // La PMT, para el final
  const cop = new T.Group();
  cop.visible = false;
  scene.add(cop);
  R.cop = cop;
  const c = new GeoB(), uni = hex('#1f2f5e'), white = hex('#f4f2ee');
  c.tube([-0.07, 0.34, -0.78], [0.07, 0.34, -0.78], 0.34, 0.34, ink, 10);
  c.tube([-0.07, 0.34, 0.8], [0.07, 0.34, 0.8], 0.34, 0.34, ink, 10);
  c.box(0, 0.78, 0, 0.22, 0.24, 0.72, white);
  c.box(0, 0.86, -0.72, 0.26, 0.3, 0.12, hex('#1b62c9'));
  c.tube([0, 1.0, 0.1], [0, 1.62, 0.04], 0.21, 0.24, uni, 8);
  c.sph([0, 1.86, 0.02], 0.2, white, 0, 6, 8);
  [-1, 1].forEach((s) => c.tube([s * 0.22, 1.5, 0.02], [s * 0.3, 1.2, -0.5], 0.06, 0.05, uni, 5));
  part(cop, c.build());
  [hex('#ff2b2b'), hex('#2b6bff')].forEach((col, i) => {
    const g = new GeoB();
    g.sph([0, 0, 0], 0.11, col, 5, 4, 5);
    const m = part(cop, g.build(), false);
    m.position.set(i ? 0.14 : -0.14, 1.32, 0.66);
    R.copL.push(m);
  });
  setPartLayer(1);
  mark = new T.Mesh(new T.PlaneGeometry(3.1, 22), new T.ShaderMaterial({vertexShader: VS_MARK, fragmentShader: FS_MARK, uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uTime: U.uTime, uAmt: {value: 1}, uFreq: {value: 0.18}, uWid: {value: 1.6}}, depthWrite: false, depthTest: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, side: T.DoubleSide}));
  mark.visible = false;
  mark.frustumCulled = false;
  mark.renderOrder = -8;
  scene.add(mark);
}
// Carriles de la calle del jefe: tres, de 3.6 m.
const laneOf = (cx, x) => cx + clamp(Math.round((x - cx) / 3.6), -1, 1) * 3.6;
function place(b, time, dt0, speedRel) {
  R.root.visible = true;
  R.root.position.set(b.x, 0, b.z);
  R.root.rotation.y = -b.yaw;
  R.wheels.forEach((w) => (w.rotation.x -= (30 + speedRel) * dt0 / 0.52));
  R.brocha.rotation.z = -0.25 + sin(time * 6) * 0.08;
  const on = b.mode === 'aim' || b.mode === 'swerve' ? Math.floor(time * 6) % 2 === 0 : false;
  R.blink.forEach((q) => (q.m.visible = on && q.side === b.dir));
}
function pullOver(api) {
  const {BOSS: b} = api;
  b.mode = 'pulled';
  b.t = 0;
  R.cop.visible = true;
  mark.visible = false;
  api.UI.boss(false, 3);
  api.shout('¡A ése sí lo multaron!', 2);
  api.Audio.siren(true);
  api.queuePhone('Don Chus', 'Ja, al Rey del Camino lo paró la PMT. Seguí derecho, patojo, que ya casi llegás.');
  api.Audio.setLevel(api.MT.music[2]);
}
export const rivalBoss = {
  build: buildRival,
  sfx: 'honk',
  hide() {
    if (R.root) R.root.visible = false;
    if (R.cop) R.cop.visible = false;
    if (mark) mark.visible = false;
  },
  start(api) {
    const {G, BOSS: b} = api;
    const cx = api.center(G.dist);
    b.mode = 'cut';
    b.t = 0;
    b.count = 0;
    b.dir = G.x > cx ? -1 : 1;
    b.x = laneOf(cx, G.x) + b.dir * 3.6;
    b.z = -11;
    b.yaw = 0;
    b.next = 0.8;
    b.hitDone = false;
    R.root.visible = true;
  },
  endCut(api) {
    const b = api.BOSS;
    b.mode = 'wait';
    b.next = 0.6;
    R.root.visible = false;
    api.UI.boss(true, 0);
    api.queuePhone('Don Chus', '¡Ese es El Rey del Camino! Te va a querer cerrar. Cuando ponga el pidevías, cambiate de carril.');
  },
  cutView(api, cam, q) {
    const b = api.BOSS;
    cam.position.set(b.x - lerp(4.6, 3.6, q), lerp(1.5, 1.3, q), b.z - lerp(9.5, 7.6, q));
    cam.lookAt(b.x + 1.1, 2.3, b.z + 1.2);
  },
  // El piloto automático se sale del carril marcado y no se arrima al rival.
  laneCost(api, x) {
    const b = api.BOSS;
    let c = 0;
    if (b.mode === 'aim' || b.mode === 'swerve') c += abs(x - b.tx) < 3 ? 80 * (3 - abs(x - b.tx)) : 0;
    if ((b.mode === 'pass' || b.mode === 'aim') && b.z < 9 && b.z > -10) c += abs(x - b.x) < 2.6 ? 40 : 0;
    return c;
  },
  update(api, dt, dt0, time) {
    const {G, BOSS: b, Audio} = api;
    b.t += dt0;
    const cx = api.center(G.dist);
    if (b.mode === 'cut') {
      b.x = laneOf(cx, G.x) + b.dir * 3.6;
      place(b, time, dt0, 0);
      return;
    }
    if (b.mode === 'off' || b.mode === 'gone') return;
    // La camioneta del jugador ocupa z de 0 a ~8 (escalada); la del rival, de b.z a b.z + LEN*0.86.
    const overlapZ = (z0) => z0 < 7.6 && z0 + LEN * 0.86 > 0;
    if (b.mode === 'wait') {
      b.next -= dt0;
      R.root.visible = false;
      if (b.next <= 0) {
        // Entra por detrás, en un carril vecino.
        const lane = laneOf(cx, G.x);
        b.dir = lane - cx > 1 ? -1 : lane - cx < -1 ? 1 : G.x > cx ? -1 : 1;
        b.x = lane + b.dir * 3.6;
        b.z = 17;
        b.yaw = 0;
        b.mode = 'pass';
        b.hitDone = false;
        Audio.honk();
        api.shout('¡Viene El Rey!', 3, 3.6);
      }
    } else if (b.mode === 'pass') {
      b.z -= (10 + b.count * 1.5) * dt0;
      b.x = damp(b.x, laneOf(cx, b.x), 3, dt0);
      if (b.z < -12.5) {
        b.mode = 'aim';
        b.aim = 0.85 - b.count * 0.08;
        b.tx = laneOf(cx, G.x);
        b.dir = Math.sign(b.tx - b.x) || 1;
        b.x0 = b.x;
      }
    } else if (b.mode === 'aim') {
      b.aim -= dt0;
      b.z = damp(b.z, -13, 4, dt0);
      b.yaw = damp(b.yaw, b.dir * 0.05, 6, dt0);
      if (b.aim <= 0) {
        b.mode = 'swerve';
        b.sw = 0;
        Audio.honk();
      }
    } else if (b.mode === 'swerve') {
      b.sw += dt0 / 0.62;
      const u = sstep(0, 0.7, b.sw);
      b.x = lerp(b.x0, b.tx, u);
      b.yaw = b.dir * 0.22 * sin(u * PI);
      b.z += 13 * dt0;
      // Frenazo con la cola encima del carril
      if (!b.hitDone && overlapZ(b.z) && abs(G.x - b.x) < HIT_W && G.iframes <= 0 && G.y < 2.4) {
        b.hitDone = true;
        G.iframes = 1.2;
        G.shake = 1;
        G.speed *= 0.45;
        G.hits++;
        G.racha = 1;
        G.hitstop = 0.08;
        api.impact(0.07, false);
        api.shout('¡Te cerró El Rey!', 3);
        Audio.hit();
        api.UI.floatTime('−' + ceil(13 * (1 - G.up.carton * 0.3)) + '% paquete', false);
        api.damage(13);
      }
      if (b.sw >= 1) {
        if (!b.hitDone) {
          b.count++;
          api.UI.boss(true, b.count);
          G.q += 8;
          G.clock += 1;
          G.racha = min(9, G.racha + 1);
          G.rachaT = 6;
          G.lines = 0.7;
          api.shout(b.count >= 3 ? '¡Esquivado, y ahí viene la PMT!' : '¡Esquivado!', 2);
          api.UI.floatTime('+1 s', true);
          api.impact(0.05, true);
          Audio.near(1, (b.x - G.x) / 6);
        }
        b.mode = b.count >= 3 ? 'stop' : 'leave';
        b.t = 0;
      }
    } else if (b.mode === 'leave') {
      b.yaw = damp(b.yaw, 0, 6, dt0);
      b.z -= 34 * dt0;
      if (b.z < -90) {
        b.mode = 'wait';
        b.next = rnd(0.5, 1);
      }
    } else if (b.mode === 'stop') {
      b.yaw = damp(b.yaw, 0, 6, dt0);
      b.z = damp(b.z, -16, 2, dt0);
      if (b.t > 0.5) pullOver(api);
    } else if (b.mode === 'pulled') {
      // Se orilla con la patrulla al lado y se queda atrás.
      const edge = cx + 5.6 - 1.2;
      b.x = damp(b.x, edge, 2.2, dt0);
      b.yaw = damp(b.yaw, b.x < edge - 0.3 ? -0.12 : 0, 5, dt0);
      b.z += lerp(4, 22, clamp(b.t / 2)) * dt0;
      R.cop.position.set(b.x - 2.3, 0, b.z + 2);
      R.cop.scale.setScalar(1.05);
      R.copL.forEach((m, i) => (m.visible = Math.floor(time * 7 + i) % 2 === 0));
      if (b.z > 30) {
        b.mode = 'gone';
        R.root.visible = false;
        R.cop.visible = false;
        Audio.siren(false);
      }
    }
    // Choque de costado mientras te rebasa
    if ((b.mode === 'pass' || b.mode === 'aim') && overlapZ(b.z) && abs(G.x - b.x) < HIT_W && G.iframes <= 0) {
      G.x += Math.sign(G.x - b.x || 1) * 0.6;
      G.iframes = 0.8;
      G.shake = 0.6;
      G.speed *= 0.8;
      api.shout('¡Raspón con El Rey!', 3);
      Audio.hit();
      api.damage(5);
    }
    if (b.mode !== 'wait' && b.mode !== 'gone') {
      place(b, time, dt0, b.mode === 'leave' ? 20 : 5);
      api.dropShadow(b.x, b.z + 3.5, 1.3, 4.2);
    }
    const marked = b.mode === 'aim' || b.mode === 'swerve';
    mark.visible = marked;
    if (marked) {
      mark.position.set(b.tx, 0, -14);
      mark.material.uniforms.uAmt.value = b.mode === 'swerve' ? 1 : 0.6 + 0.4 * sin(time * 20);
    }
  },
};
