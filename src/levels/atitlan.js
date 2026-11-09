// Nivel 5: el lago de Atitlán en La Sirena, la lancha de Don Chema.
// Saliendo de Panajachel con neblina, los pueblos de la orilla norte y el Xocomil de la tarde, hasta el muelle de San Pedro.
import {seeded, sin, abs, min, max, floor, ceil, sstep, lerp, clamp, PI} from '../core/util.js';

export const S1 = 2000, S2 = 4100, S3 = 6200, LEN = 7000;
const DRAW = LEN + 320;
// Franja de agua mansa con el Xocomil: la misma cuenta con la que se pinta el agua.
export const calmOff = (D, hw) => clamp(2.6 * sin(D * 0.0061 + 0.4) + 1.1 * sin(D * 0.017 + 2), -(hw - 1.2), hw - 1.2);
// Pueblos de la orilla norte: [centro, medio largo, rótulo]
const TOWNS = [[60, 280, 'PANAJACHEL'], [S1 + 160, 260, 'SANTA CRUZ LA LAGUNA'], [S1 + 1000, 110, null], [S1 + 1560, 160, 'TZUNUNÁ'], [S2 - 380, 260, 'SAN MARCOS LA LAGUNA'], [S2 + 1250, 260, 'SAN JUAN LA LAGUNA'], [LEN + 60, 300, 'SAN PEDRO LA LAGUNA']];
const PLAT = S2 - 240;
const townK = (D) => TOWNS.reduce((k, [c, h]) => max(k, 1 - sstep(h * 0.6, h, abs(D - c))), 0);

export const META = {
  id: 'atitlan', name: 'Lago de Atitlán', short: 'Atitlán', vehicle: 'lancha', vehicleName: 'Lancha', ground: 'city', look: 'lake', stop: 5,
  next: 'Xela', nextId: null, music: [16, 17, 18, 19], forceLabel: 'Motor', sprintWord: 'acelerar', callWord: 'bocina', callChip: 'Bocina',
  stages: [
    {name: 'Saliendo de Panajachel', fact: 'El lago de Atitlán llena la caldera de un volcán antiguo y llega a 340 metros de hondo.', speed: 25, clock: 90},
    {name: 'Los pueblos del lago', fact: 'En el cerro Tzankujil, en San Marcos La Laguna, hay una plataforma para tirarse al lago.', speed: 23, clock: 96},
    {name: 'El Xocomil', fact: 'El Xocomil sopla en el lago desde media mañana. En kaqchikel, su nombre quiere decir "el viento que se llevó el pecado".', speed: 22, clock: 98},
  ],
  soft: {shout: '¡La red!', check: 'Ninguna red de pescador rota', ruin: true, bits: [[1, 0.5, 0.1], [1, 1, 1], [0.25, 0.22, 0.2]], call: ['Don Chema', '¿Le rompiste la red a un pescador? Ay, patojo, de eso come. Las redes se brincan o se rodean.']},
  boss: {id: 'xocomil', name: 'El Xocomil', cut: '¡EL XOCOMIL!', sub: 'El viento que se llevó el pecado'},
  finish: {cut: '¡DON CHEMA!', sub: 'Te esperaba en el muelle de San Pedro', arrive: 'Le devolviste la lancha a Don Chema', deck: 0},
  shop: {title: 'Tienda del Muelle', go: 'Seguir en lancha', items: [
    {id: 'cadena', name: 'Motor afinado', desc: 'La lancha corre un 6% más.', price: 60},
    {id: 'frenos', name: 'Reversa afinada', desc: 'Frenás el doble y te recuperás más rápido de los golpes.', price: 45},
    {id: 'carton', name: 'Bolsa impermeable', desc: 'El paquete recibe 30% menos daño.', price: 70},
  ]},
  share: 'Crucé el lago de Atitlán en lancha',
  note: 'Don Chema amarró La Sirena y te prestó la moto de su sobrino. El paquete sigue para <b class="text-oro">Xela</b>, en moto, pronto.',
  title: {D0: 240, D1: 820, pal: 900, speed: 14, x: (LV, D, t) => LV.center(D) + 1.3 * sin(t * 0.3)},
  palGain: [1.02, 1, 7000], leftHills: 0, burn: null, fenceOff: 0, agua: null, sunAz: 0.5,
  ambient: () => 0.3, fallText: '¡Al agua!',
  // Con el Xocomil, el agua mansa corre más y la picada frena y sacude.
  surface(dx, tr, D) {
    if (D < S2 + 60 || D > LEN - 90) return null;
    return abs(dx - calmOff(D, tr.hw)) < 1.0 ? {mul: 1.08, chip: 'Agua mansa', fast: true} : {mul: 0.94, chip: 'Agua picada', rough: 1};
  },
  // Neblina de la mañana sobre el lago, y la bruma del Xocomil.
  fogAt(D) {
    const m = 1 - sstep(260, 820, D), x = sstep(S2 - 100, S2 + 300, D) * (1 - sstep(LEN - 500, LEN - 150, D));
    return [lerp(lerp(95, 70, x), 26, m), lerp(lerp(340, 250, x), 175, m)];
  },
};

const callsCommon = [
  {D: 24, from: 'Don Chema', t: '¿Vos sos el del paquete? Llevate La Sirena. Yo me voy en la pública y te espero en el muelle de San Pedro.'},
  {D: 300, from: 'Don Beto', t: '¿En lancha? Que no se moje el paquete, ¿oíste?'},
  {D: 700, from: 'Don Chema', t: 'Los cayucos de los pescadores van despacito. Pasales lejos, que se mecen con la estela.'},
  {D: 1250, from: 'La Licenciada', t: '¿Me lo vas a traer mojado? Nombre, cuidámelo.'},
  {D: 1720, from: 'Mamá', t: 'Mijo, ¿llevás chaleco salvavidas? Ponételo, por favor.'},
  {D: S1 + 60, from: 'Don Chema', t: 'Ya vienen los pueblos. Las redes de los pescadores se brincan o se rodean, nunca se rompen.'},
  {D: S1 + 900, from: 'Don Beto', t: 'La lancha pública se cruza de muelle en muelle. No te le metás enfrente.'},
  {D: S2 + 60, from: 'Don Chema', t: 'Ya se levantó el Xocomil. Las olas brincalas de frente, y buscá el agua mansa: por ahí corrés más.'},
  {D: S2 + 900, from: 'Mamá', t: 'Ay, mijo, con este viento agarrate bien.'},
  {D: S2 + 1500, from: 'La Licenciada', t: 'Dicen que el Xocomil se lleva los pecados. Ojalá no se lleve mi paquete.'},
];
export const CALLS_DESK = [...callsCommon, {D: 130, from: 'Don Chema', t: '↑ acelera, ↓ frena: es lancha, tarda en parar. Espacio brinca las olas. B es la bocina.'}];
export const CALLS_TOUCH = [...callsCommon, {D: 130, from: 'Don Chema', t: 'Dale acelera y Freno la para, pero es lancha: tarda. Saltar brinca las olas.'}];

const center = (D) => {
  const w = sstep(80, 320, D);
  return w * (7.5 * sin(D * 0.0038 + 0.6) + 2.6 * sin(D * 0.0101 + 1.9));
};
function halfWidth(D) {
  if (D < S1 - 30) return 4.4;
  if (D < S1 + 10) return lerp(4.4, 4.2, sstep(S1 - 30, S1 + 10, D));
  if (D < S2 - 40) return 4.2;
  if (D < S2 + 10) return lerp(4.2, 4.8, sstep(S2 - 40, S2 + 10, D));
  return 4.8;
}
// Tramo del agua, sin saltos: 0 mañana, 1 pueblos, 2 Xocomil, 3 San Pedro.
const kindAt = (D) => sstep(S1 - 200, S1 + 200, D) + sstep(S2 - 150, S2 + 250, D) + sstep(LEN - 320, LEN - 70, D);
// De la orilla del carril a la orilla norte: cerca en los pueblos, lejos en el monte y con el viento.
const gapAt = (D) => {
  const base = 26 + 7 * sin(D * 0.0031 + 0.7) + 4 * sin(D * 0.0097) + 6 * sstep(S2, S2 + 400, D);
  return lerp(base, 11, townK(D));
};
const laneW = (D) => (D < S1 ? 2.2 : D < S2 ? 2.1 : 2.5);

export function buildLevel(touch) {
  const R = seeded(20261109);
  const r = (a, b) => a + R() * (b - a);
  const pick = (arr) => arr[floor(R() * arr.length)];
  const items = [], movers = [], signs = [], ramps = [], customers = [], gaps = [], tumulos = [];
  const add = (t, x, D, o = {}) => {
    const it = Object.assign({t, x, D}, o);
    items.push(it);
    return it;
  };
  const dec = (t, x, z, o = {}) => add(t, x, z, Object.assign({decor: true}, o));
  const solid = (t, x, D, w, l, h, dmg, o = {}) => add(t, x, D, Object.assign({solid: true, w, l, h, dmg}, o));
  const mover = (t, x, D, o = {}) => {
    const it = Object.assign({t, x0: x, x, D, D0: D, on: false, mover: true}, o);
    movers.push(it);
    return it;
  };
  const coins = (xf, D0, n, gap, y = 1.2) => {
    for (let i = 0; i < n; i++) add('coin', xf(D0 + i * gap), D0 + i * gap, {pick: 'coin', y, spin: 3, ph: i * 0.4, w: 0.7, l: 0.9});
  };
  const lane = (D, i) => center(D) + i * laneW(D);
  const laneCoins = (i, D0, n, gap, y) => coins((z) => lane(z, i), D0, n, gap, y);
  const cafe = (i, D) => add('cafe', lane(D, i), D, {pick: 'cafe', y: 1.25, spin: 2.2, w: 1, l: 1.1, s: 1.6});
  const tapeAt = (i, D) => add('tape', lane(D, i), D, {pick: 'tape', y: 1.3, spin: 2.4, w: 1, l: 1.1});
  const shoreX = (D) => center(D) + halfWidth(D) + gapAt(D);
  const BOATS = [[1, 1, 1], [0.92, 0.96, 1], [1, 0.96, 0.88], [0.88, 1, 0.96]];
  const SHIRTS = [[1, 0.5, 0.5], [0.55, 0.8, 1], [1, 0.9, 0.5], [0.7, 1, 0.7], [1, 0.7, 0.9], [1, 1, 1]];
  const PAINT = [[1, 0.62, 0.55], [0.62, 0.82, 1], [1, 0.86, 0.5], [0.72, 0.95, 0.68], [0.95, 0.7, 0.95], [1, 1, 1], [0.6, 0.92, 0.9], [1, 0.75, 0.45]];
  const stageV = (D) => (D < S1 ? 25 : D < S2 ? 23 : 22);
  // Algo que va para el mismo lado, más despacio; sale antes para estar donde toca.
  const traffic = (t, i, D, v, o = {}) => {
    const near = o.near || 80;
    D -= (v * near) / max(4, stageV(D) - v);
    const x = o.x !== undefined ? o.x : lane(D, i);
    return mover(t, x, D, Object.assign({kind: 'traffic', vD: v, solid: true, w: 1.25, l: 3.8, h: 9, dmg: 10, near, tint: pick(BOATS)}, o));
  };
  // Ola de lado a lado: se brinca o da el golpe.
  const ola = (D, k = 1) => {
    add('ola', center(D), D, {sx: halfWidth(D) + 1.6, sy: 0.72 * k, sz: 1.1, bob: 1});
    tumulos.push({D, used: false, ola: true});
  };
  const cayucoAt = (x, D) => solid('cayuco', x, D, 0.42, 2.0, 1.6, 7, {walk: 1.5, r: r(-0.12, 0.12), ph: R() * 3});
  const sign = (text, D, w = 5.2, y = 3.2) => {
    const x = shoreX(D) + 2.4;
    signs.push({text, x, y, D, w, h: 0.85, decor: true});
    dec('post', x, D, {sy: y / 1.25});
  };
  // Muelle de tablones desde la orilla hasta xEnd, en tramos de 6 m.
  const pier = (D, xEnd) => {
    const L = shoreX(D) + 2 - xEnd, n = max(1, ceil(L / 6));
    for (let k = 0; k < n; k++) dec('muelleS', xEnd + 6 * (k + 1), D, {});
  };

  // ── Etapa 1: saliendo de Panajachel, lago en calma ──
  const manana = [
    function publica(D) {
      const i = R() < 0.5 ? -1 : 1;
      traffic('lanchaP', i, D, r(10, 13), {near: 95});
      laneCoins(-i, D, 5, 7);
      return 66;
    },
    function cayucos(D) {
      const i = pick([-1, 0, 1]), j = i === 0 ? pick([-1, 1]) : -i;
      cayucoAt(lane(D, i) + r(-0.3, 0.3), D);
      cayucoAt(lane(D + 28, j) + r(-0.3, 0.3), D + 28);
      laneCoins(-j, D + 8, 4, 6);
      return 62;
    },
    function kayaks(D) {
      const s = R() < 0.5 ? 1 : -1;
      [0, 1].forEach((k) => mover('kayak', lane(D + k * 9, s * (k ? 0 : 1)), D + k * 9, {kind: 'weave', vD: 3, near: 70, solid: true, w: 0.4, l: 1.6, h: 1.3, dmg: 6, amp: 0.7 * (k ? -1 : 1), wv: 0.55, ph: k * 1.7, x0: lane(D + k * 9, s * (k ? 0 : 1)), walk: 1.6, nearShout: '¡Sorry!'}));
      laneCoins(-s, D, 4, 6);
      return 44;
    },
    function troncos(D) {
      const i = pick([-1, 0, 1]);
      solid('log', lane(D, i), D, 1.5, 0.45, 0.5, 6, {sx: 1.5, sz: 1.1, r: r(-0.2, 0.2), y: -0.2});
      laneCoins(i, D - 2, 3, 2, 2.1);
      if (R() < 0.6) {
        const j = i === 0 ? pick([-1, 1]) : 0;
        solid('log', lane(D + 22, j), D + 22, 1.5, 0.45, 0.5, 6, {sx: 1.5, sz: 1.1, r: r(-0.2, 0.2), y: -0.2});
      }
      return 48;
    },
    function estela(D) {
      // Dos olitas pegadas: un solo brinco pasa las dos.
      ola(D, 0.9);
      ola(D + 10, 0.9);
      coins(() => center(D), D - 1, 5, 3, 2.2);
      mover('lanchaP', center(D) - halfWidth(D) - 16, D - 40, {kind: 'traffic', vD: 26, near: 220, tint: [1, 1, 1]});
      return 46;
    },
    function boyas(D) {
      [-1, 1, 0].forEach((i, k) => solid('boyaG', lane(D + k * 22, i) + r(-0.3, 0.3), D + k * 22, 0.5, 0.5, 9, 7, {}));
      coins((z) => center(z) + 1.6 * sin((z - D) * 0.15), D - 4, 6, 9);
      return 74;
    },
  ];
  let D = 200, k1 = 0;
  while (D < S1 - 120) {
    const d = D / S1;
    const pool = d < 0.15 ? [1, 3, 0] : [0, 1, 4, 2, 5, 3, 0, 4];
    D += manana[pool[k1 % pool.length]](D) + lerp(48, 28, d);
    k1++;
  }
  cafe(1, 820);
  cafe(-1, 1620);
  tapeAt(0, 1180);

  // ── Etapa 2: los pueblos de la orilla norte ──
  const pueblos = [
    function redes(D) {
      // La red tapa dos carriles: el libre tiene monedas.
      const s = R() < 0.5 ? 1 : -1, x = center(D) - s * laneW(D) * 0.5;
      solid('redA', x, D, 2.0, 0.55, 0.45, 0, {soft: true});
      laneCoins(s, D - 6, 4, 4);
      return 40;
    },
    function cruza(D) {
      // La pública cruza de un muelle a otro: pasá por donde ya pasó.
      const s = R() < 0.5 ? 1 : -1;
      mover('lanchaP', center(D) + s * 15, D, {kind: 'drift', vx: -s * r(4.6, 5.6), solid: true, w: 3.7, l: 1.25, h: 9, dmg: 10, near: 82, r: s > 0 ? PI / 2 : -PI / 2, tint: pick(BOATS), nearShout: '¡Cuidado!'});
      laneCoins(s, D + 10, 4, 6);
      return 70;
    },
    function cayucos(D) {
      return manana[1](D);
    },
    function muelleP(D) {
      // Un muelle largo se mete al carril de la derecha.
      const c = center(D), xe = c + 1.6;
      dec('muelleXL', xe + 16, D, {});
      solid('post', (xe + c + halfWidth(D) + 1) / 2, D, (c + halfWidth(D) + 1 - xe) / 2, 1.25, 9, 9, {decor: true, hidden: true});
      dec('person', xe + 0.8, D - 0.6, {y: 0.68, r: -PI / 2, tint: pick(SHIRTS)});
      add('lancha', xe + 3, D - 3.2, {decor: true, r: PI / 2 + 0.06, y: -0.15, tint: pick(BOATS), s: 0.8});
      laneCoins(-1, D - 6, 4, 6);
      return 46;
    },
    function flotadores(D) {
      [0, 1].forEach((k) => mover('flotador', lane(D + k * 16, k ? -1 : 0.5), D + k * 16, {kind: 'crab', solid: true, w: 0.55, l: 0.55, h: 0.7, dmg: 5, amp: 0.8, wv: 0.4, ph: R() * 6, r0: 0, wobA: 0.4, wobF: 0.7, nearShout: '¡Ey!'}));
      laneCoins(1, D, 4, 6);
      return 44;
    },
    function estela(D) {
      return manana[4](D);
    },
    function publica(D) {
      return manana[0](D);
    },
  ];
  let D2 = S1 + 150, k2 = 0;
  while (D2 < S2 - 90) {
    const d = (D2 - S1) / (S2 - S1);
    // Cerca de la plataforma de San Marcos va la gente en flotador.
    const nearPlat = abs(D2 - PLAT) < 160;
    const pool = nearPlat ? [4, 2, 4] : d < 0.15 ? [0, 2, 6] : [0, 1, 2, 3, 0, 5, 6, 1, 3];
    D2 += pueblos[pool[k2 % pool.length]](D2) + lerp(36, 20, d);
    k2++;
  }
  cafe(-1, S1 + 420);
  cafe(1, S1 + 1300);
  tapeAt(1, S1 + 980);
  customers.push({x: null, i: 1, D: S1 + 560, name: 'Doña Juana', ask: 'Pará en la marca, que voy al mercado con mis tomates.', text: '¡Dios te lo pague, mijo!'});
  customers.push({x: null, i: 1, D: S1 + 1420, name: 'Kevin', ask: '¡Hey! ¿Me llevás a San Marcos? Pará en la marca dorada, please.', text: '¡Thank you, bro!'});

  // ── Etapa 3: el Xocomil ──
  const viento = [
    function olas(D) {
      // Cada ola con su brinco: caés y tenés tiempo de volver a saltar.
      ola(D);
      ola(D + 32);
      if (R() < 0.6) ola(D + 64);
      coins(() => center(D), D - 1.5, 3, 1.5, 2.2);
      return 76;
    },
    function troncos(D) {
      return manana[3](D);
    },
    function garzas(D) {
      // Garzas bajitas: no brinqués cuando pasan.
      const s = R() < 0.5 ? 1 : -1;
      mover('heron', center(D) + s * 17, D, {kind: 'heron', solid: true, w: 1.1, l: 0.7, h: 9, h0: 1.9, dmg: 6, vx: -s * 8.5, y: 2.3, r: s > 0 ? PI / 2 : -PI / 2, s: 1.25, hitY: 0.32});
      ola(D + 24);
      laneCoins(0, D + 4, 3, 5);
      return 50;
    },
    function volcado(D) {
      const i = pick([-1, 0, 1]);
      solid('cayucoV', lane(D, i), D, 0.42, 2.0, 0.42, 6, {r: r(-0.3, 0.3)});
      if (R() < 0.6) solid('cayucoV', lane(D + 20, -i || 1), D + 20, 0.42, 2.0, 0.42, 6, {r: r(-0.3, 0.3)});
      laneCoins(i, D - 2, 3, 2, 2.1);
      return 44;
    },
    function publica(D) {
      const i = R() < 0.5 ? -1 : 1;
      traffic('lanchaP', i, D, r(9, 11), {near: 90});
      ola(D + 30);
      return 60;
    },
  ];
  let D3 = S2 + 140, k3 = 0;
  while (D3 < S3 - 90) {
    const d = (D3 - S2) / (S3 - S2);
    const pool = d < 0.15 ? [0, 1, 4] : [0, 2, 1, 3, 4, 0, 2, 3];
    D3 += viento[pool[k3 % pool.length]](D3) + lerp(32, 18, d);
    k3++;
  }
  cafe(1, S2 + 520);
  cafe(-1, S2 + 1380);
  tapeAt(0, S2 + 1100);
  customers.push({x: null, i: 1, D: S2 + 760, name: 'Don Tino', ask: 'Pará en la marca, que llevo el pescado a San Juan.', text: '¡Gracias, patojo!'});

  // ── Jefe: el Xocomil, rumbo a San Pedro ──
  for (let z = S3 + 60; z < LEN - 170; z += 64) coins((q) => lane(q, (floor(z / 64) % 3) - 1), z, 4, 6);
  cafe(0, S3 + 480);

  // ── Final: la última ola sirve de rampa y al otro lado está el muelle de San Pedro ──
  add('ola', center(LEN - 5), LEN - 5, {sx: 3.4, sy: 0.92, sz: 2.2, r: PI});
  ramps.push({x: center(LEN - 7), D: LEN - 7, w: 3.6, vy: 13, last: true});
  const cE = center(LEN + 46);
  dec('muelleXL', cE + 2.6 + 16, LEN + 46, {});
  pier(LEN + 46, cE + 2.6 + 16);
  dec('chema', cE + 3.2, LEN + 44.6, {y: 0.68, decor: false});
  dec('motoXela', cE + 6.6, LEN + 46, {y: 0.68, r: 0.3});
  [[9.5, 1], [12.4, -0.8], [15.2, 0.5]].forEach(([dx, dz]) => dec('person', cE + dx, LEN + 46 + dz, {y: 0.68, r: -PI / 2 + dz, tint: pick(SHIRTS)}));
  [[-4, 0.2], [-7.5, -0.15]].forEach(([dz, a]) => add('lancha', cE + 7, LEN + 46 + dz, {decor: true, r: PI / 2 + a, y: -0.15, tint: pick(BOATS)}));
  dec('iglesiaSP', shoreX(LEN + 120) + 16, LEN + 120, {r: PI});
  [[LEN + 80, 'Café de San Pedro'], [LEN + 30, 'Clases de español']].forEach(([z, t]) => signs.push({text: t, x: shoreX(z) + 3, y: 3.6, D: z, w: 5.4, h: 0.85, decor: true}));
  [[LEN + 64, [1, 1, 1]], [LEN + 92, [0.3, 0.75, 1]]].forEach(([z, t]) => add('tuktuk', shoreX(z) + 5, z, {decor: true, r: 0.5, tint: t}));

  // ── Boyas del carril, la orilla norte, los pueblos y los botes de lejos ──
  for (let z = 30; z < LEN + 20; z += 7) {
    const c = center(z), hw = halfWidth(z);
    [-1, 1].forEach((s, k) => dec('boya', c + s * (hw + 0.45), z + k * 3.5, {tint: floor(z / 7) % 4 === 0 ? [1, 1, 1] : [1, 0.85, 0.7]}));
  }
  for (let z = -40; z < DRAW; z += r(4, 7)) {
    const sx = shoreX(z), tk = townK(z);
    if (R() < 0.7) dec('rock', sx + r(-0.6, 1.4), z, {s: r(0.35, 0.8), r: r(0, 6.28)});
    if (tk < 0.3 && R() < 0.45) dec('reed', sx - r(0.4, 2.6), z + r(-1, 1), {r: r(0, 6.28), s: r(0.8, 1.3)});
    // Monte: árboles en la orilla y pinos más arriba
    if (R() < (tk > 0.5 ? 0.35 : 0.85)) dec(R() < 0.55 ? 'arbol' : 'arbol2', sx + r(4, 13), z + r(-2, 2), {r: r(0, 6.28), s: r(0.8, 1.25)});
    if (R() < 0.7) dec('pino', sx + r(16, 40), z + r(-3, 3), {r: r(0, 6.28), s: r(0.9, 1.5), far: true});
  }
  // Pueblos: casas en la ladera, muelles con lanchas amarradas y gente
  for (const [tc, th, name] of TOWNS) {
    let hk = 0;
    for (let z = tc - th * 0.85; z < tc + th * 0.85; z += r(8.5, 11)) {
      if (z < -30 || z > DRAW - 20) continue;
      const sx = shoreX(z);
      for (let row = 0; row < 3; row++) {
        if (row && R() < 0.35) continue;
        hk++;
        const t = hk % 7 === 0 ? 'champa' : hk % 4 === 0 ? 'casaL2' : hk % 3 === 0 ? 'casaL3' : hk % 5 === 1 ? 'house2' : 'casaL';
        const x = sx + 6 + row * 9 + r(-1, 1);
        if (t === 'house2') dec(t, x + 2, z, {r: PI / 2, tint: PAINT[hk % PAINT.length], s: 0.75});
        else dec(t, x, z, {r: row ? r(-0.15, 0.15) : 0, tint: t === 'champa' ? [1, 1, 1] : PAINT[(hk * 3) % PAINT.length]});
      }
      if (hk % 3 === 1 && R() < 0.8) dec('palm', sx + r(2, 4), z + 3, {r: r(0, 6.28), s: r(0.8, 1.1)});
    }
    if (name) sign(name, tc - th * 0.5, name.length > 12 ? 9.4 : 5.6, 4.2);
    if (tc > LEN) continue;
    // Muelles del pueblo
    for (let z = tc - th * 0.6; z < tc + th * 0.6; z += r(38, 60)) {
      if (z < 40) continue;
      const sx = shoreX(z), xe = sx - r(7, 10);
      pier(z, xe);
      add('lancha', xe + 2.5, z - 2.6, {decor: true, r: PI / 2 + r(-0.15, 0.15), y: -0.15, tint: pick(BOATS)});
      if (R() < 0.6) add('lancha', xe + 2.2, z + 2.8, {decor: true, r: PI / 2 + r(-0.15, 0.15), y: -0.15, tint: pick(BOATS), s: 0.85});
      dec('person', xe + 0.8, z + r(-0.6, 0.6), {y: 0.68, r: -PI / 2 + r(-0.5, 0.5), tint: pick(SHIRTS)});
    }
  }
  // Panajachel: el muelle público y las lanchas amarradas donde arrancás
  signs.push({text: 'MUELLE PÚBLICO', x: center(40) + halfWidth(40) + 3, y: 3.4, D: 40, w: 7, h: 0.9, decor: true});
  dec('post', center(40) + halfWidth(40) + 3, 40, {sy: 2.7});
  for (let z = -16; z < 110; z += 9) [-1, 1].forEach((s) => add('lancha', center(z) + s * (halfWidth(z) + r(2.2, 3.4)), z + r(-1, 1), {decor: true, r: r(-0.2, 0.2), y: -0.15, tint: pick(BOATS)}));
  [[300, 'Kayaks Q50'], [S1 + 420, 'Hotel Los Volcanes'], [S1 + 1100, 'Comedor La Orilla'], [S2 - 520, 'Tienda del Muelle'], [S2 + 1180, 'Tejidos de San Juan'], [S2 + 1700, '¡Cuidemos el lago!'], [900, '¡Cuidemos el lago!']].forEach(([z, t]) => sign(t, z, 5.4, 3.2));
  // San Marcos: la plataforma del cerro Tzankujil, con uno en el aire
  const sp = shoreX(PLAT);
  dec('plataforma', sp + 0.6, PLAT, {});
  dec('clavado', sp - 2.4, PLAT + 0.4, {y: 3.2});
  sign('CERRO TZANKUJIL', PLAT + 30, 7.6, 3.6);
  // Botes de lejos, en medio del lago, para que no se vea vacío
  for (let z = 60; z < LEN + 200; z += r(55, 110)) {
    const x = center(z) - halfWidth(z) - r(22, 80);
    if (R() < 0.5) add('cayuco', x, z, {decor: true, r: r(-0.6, 0.6), far: true, walk: 1.2});
    else add('lanchaP', x, z, {decor: true, r: r(-0.4, 0.4), far: true, tint: pick(BOATS)});
  }

  // Encargos: el pasajero espera en la punta de un muelle.
  customers.forEach((cu) => {
    cu.x = lane(cu.D, cu.i);
    const c = center(cu.D), hw = halfWidth(cu.D), xe = c + hw + 0.9;
    pier(cu.D, xe);
    dec('person', xe + 0.6, cu.D, {y: 0.68, r: -PI / 2, tint: [0.75, 1, 1]});
  });
  items.sort((a, b) => a.D - b.D);

  // Pista: [x central, medio ancho, tramo, distancia a la orilla] cada 2 unidades
  const N = floor(DRAW / 2) + 1;
  const track = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const z = i * 2;
    track[i * 4] = center(z);
    track[i * 4 + 1] = halfWidth(z);
    track[i * 4 + 2] = kindAt(z);
    track[i * 4 + 3] = gapAt(z);
  }
  const calls = (touch ? CALLS_TOUCH : CALLS_DESK).slice().sort((a, b) => a.D - b.D).map((c) => Object.assign({done: false}, c));
  return {meta: META, items, movers, signs, surges: [], ramps, customers, gaps, tumulos, track, len: DRAW, length: LEN, calls, cursor: 0, center, halfWidth, kindAt, stageBounds: [0, S1, S2, S3, LEN], S1, S2, S3, wheels: [], burn: null};
}

// Paleta: neblina del amanecer, mañana clara, mediodía, el Xocomil gris, la tormenta del jefe y la tarde dorada en San Pedro.
const GOLD = {skyTop: '#3a62b8', skyMid: '#d8b490', skyLow: '#ffdcb0', sunDisc: '#fff0c4', sunCol: '#ffdcae', shade: '#867a9e', rim: '#ffcf8a', fog: '#f0cfac', cloudL: '#fff0dc', cloudS: '#c9a0b4',
  hill: '#7a6f9e', hill2: '#544a72', waterA: '#28507a', waterB: '#3a6f96', wet: '#58b0b0', grass: '#5a7a44', sunEl: 0.22, shadow: 2.4, shadowA: 0.42};
export const SKYKEYS = [
  {D: 0, skyTop: '#46609e', skyMid: '#a3b3d0', skyLow: '#f2d9c2', sunDisc: '#fff0d0', sunCol: '#ffe6c8', shade: '#7a86a8', rim: '#ffe0b8', fog: '#dfe2e6', cloudL: '#fff8ee', cloudS: '#b4bfd2', hill: '#7d8fb0', hill2: '#4f6283',
    sandA: '#a99f8e', sandB: '#6f685e', wet: '#5fb3b8', waterA: '#2f5f80', waterB: '#3d7896', foam: '#f6f7f2', plank: '#c9b49a', street: '#5e6068', grass: '#4b7a45', sunEl: 0.14, night: 0, shadow: 2.6, shadowA: 0.32},
  {D: 650, skyTop: '#2f6cc0', skyMid: '#86b6e2', skyLow: '#e9f1f2', fog: '#d8e4ec', sunCol: '#fff3e0', shade: '#8590b0', hill: '#5c7ea6', hill2: '#3f5f7c', waterA: '#1d5b86', waterB: '#2f7aa0', wet: '#3fb0b6', sunEl: 0.4, shadow: 1.8, shadowA: 0.38},
  {D: S1 + 200, skyTop: '#2468c8', skyMid: '#7db5ea', skyLow: '#eef4f0', sunCol: '#fff6e8', waterA: '#18578a', waterB: '#2b78a6', grass: '#4f8a42', sunEl: 0.62, shadow: 1.2},
  {D: S2 + 150, skyTop: '#3f5f96', skyMid: '#9fb2c6', skyLow: '#dfe4e6', sunDisc: '#fff6e6', sunCol: '#f0ece4', shade: '#7d86a0', fog: '#c9d2da', cloudL: '#f2f4f6', cloudS: '#8e9ab0', hill: '#64788f', hill2: '#45566a',
    waterA: '#1a4864', waterB: '#28658a', foam: '#ffffff', grass: '#4a7a46', sunEl: 0.5, shadow: 1.4, shadowA: 0.3},
  {D: S3 + 150, skyTop: '#34466e', skyMid: '#8494aa', skyLow: '#c8ced6', sunCol: '#e0e2e6', shade: '#6e7690', fog: '#b8c2cc', cloudL: '#e8eaee', cloudS: '#6c7690', hill: '#56677e', hill2: '#3a495c', waterA: '#153c55', waterB: '#22597a', sunEl: 0.42},
  Object.assign({D: LEN - 120}, GOLD),
  Object.assign({D: LEN + 400}, GOLD),
];
