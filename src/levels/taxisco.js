// Nivel 2: Taxisco y Guazacapán, a caballo. De la alborada en la feria de Taxisco a la tarde en la de Guazacapán.
import {seeded, sin, abs, min, max, floor, sstep, lerp, PI} from '../core/util.js';

// La feria de Taxisco ocupa el arranque; luego vienen los potreros.
export const FAIR = 470;
export const S1 = 2340, S2 = 4340, S3 = 6340, LEN = 7340;
const DRAW = LEN + 300;
export const FENCE_OFF = 9;
// Tramos del río: dos vados y dos puentes. La quema va al final de los cañales.
const FORDS = [[S1 + 430, S1 + 510], [S1 + 1250, S1 + 1340]];
const BRIDGES = [[S1 + 820, S1 + 940]];
const BURN = [S1 + 1490, S1 + 1800];

export const META = {
  id: 'taxisco', name: 'Taxisco y Guazacapán', short: 'Taxisco', vehicle: 'horse', vehicleName: 'Caballo', ground: 'farm', stop: 2,
  next: 'Ciudad de Guatemala', nextId: 'capital', music: [4, 5, 6, 7], forceLabel: 'Aliento', sprintWord: 'apurar a Turbo', callWord: 'relincho', callChip: 'Relincho',
  stages: [
    {name: 'La feria y los potreros', fact: 'Esta tierra era xinca antes de la Conquista. Saliendo de la feria vienen los potreros: por la tierra vas más rápido.', speed: 23, clock: 106},
    {name: 'Cañaverales y río', fact: 'En la zafra pasan tráileres de caña a toda hora. Saltá lo que caiga y no te salgás del puente.', speed: 25, clock: 82},
    {name: 'La feria de Guazacapán', fact: 'Traje típico, marimba y baile folclórico. Cuidado con los cohetillos: Turbo les tiene miedo.', speed: 27, clock: 86},
  ],
  soft: {shout: '¡La vaca, la vaca!', check: 'Ninguna vaca golpeada', keep: true},
  boss: {id: 'bull', name: 'Cariñoso', cut: '¡CARIÑOSO!', sub: 'Se salió del jaripeo'},
  finish: {cut: '¡LA CAMIONETA!', sub: 'Última salida a la capital', arrive: 'Alcanzaste la camioneta', deck: 0, rear: true},
  shop: {title: 'Talabartería de Don Chepe', go: 'Seguir galopando', items: [
    {id: 'cadena', name: 'Herraduras nuevas', desc: 'Turbo galopa un 6% más rápido.', price: 60},
    {id: 'frenos', name: 'Riendas de cuero', desc: 'Frena el doble y se recupera más rápido de los golpes.', price: 45},
    {id: 'carton', name: 'Alforjas', desc: 'El paquete recibe 30% menos daño.', price: 70},
  ]},
  share: 'Crucé Taxisco y Guazacapán',
  note: 'Turbo se queda con Don Chepe, más tranquilo que nunca. La camioneta roja arranca para la capital. Sigue <b class="text-oro">Ciudad de Guatemala</b>.',
  title: {D0: 70, D1: 1900, pal: 330, speed: 15, x: (LV, D, t) => LV.center(D) + 1.2 * sin(t * 0.3)},
  palGain: [1.08, 1.02, 6900], leftHills: 1, burn: BURN, fenceOff: FENCE_OFF,
  ambient: () => 0, loudWalls: false, fallText: '¡Al río!',
};

const callsCommon = [
  {D: S1 + 60, from: 'Don Beto', t: 'Por los cañales acortás. Si ves humo es quema: no te parés.'},
  {D: S1 + 640, from: 'La Licenciada', t: 'Si el paquete empieza a oler raro, no lo destapés. Es normal.'},
  {D: S1 + 1120, from: 'Don Chepe', t: 'Turbo le tiene miedo al agua. Mentira, le tiene miedo a todo.'},
  {D: S2 + 70, from: 'Mamá', t: 'Si pasás por la feria, traeme un algodón. Del rosado, mijo.'},
  {D: S2 + 700, from: 'La Licenciada', t: '¿Oigo marimba? Decime que no te estás parando a bailar.'},
  {D: S2 + 1460, from: 'Don Beto', t: 'En la terminal sale la última camioneta a la capital. Si la perdés, te vas a pie.'},
];
const callsStart = [
  {D: 22, from: 'Don Beto', t: 'Ya va a amanecer, patojo. La carretera está trancada por la zafra, así que Don Chepe te presta un caballo.'},
  {D: 360, from: 'Don Chepe', t: 'Turbo es noble: va para donde vos lo guiés. Nomás no lo apurés tanto, que se cansa.'},
  {D: 1040, from: 'Don Chepe', t: 'Se llama Turbo porque una vez corrió. Tratámelo bien.'},
  {D: 1400, from: 'La Licenciada', t: '¿Por qué oigo un caballo? Decime que mi paquete no va a caballo.'},
  {D: 1880, from: 'Mamá', t: 'Ponete sombrero, mijo. Ese sol de la costa no perdona.'},
];
export const CALLS_DESK = [...callsStart, {D: 210, from: 'Don Chepe', t: 'Flechas o A y D para guiarlo. Espacio para saltar cercos. ↑ lo apurás, pero se cansa.'}, ...callsCommon];
export const CALLS_TOUCH = [...callsStart, {D: 210, from: 'Don Chepe', t: 'Arrastrá el dedo para guiarlo. Saltar brinca cercos. Dale lo apura, pero se cansa.'}, ...callsCommon];

const center = (D) => {
  const w1 = sstep(FAIR - 20, FAIR + 110, D) * (1 - sstep(S1 - 140, S1 - 20, D));
  const w2 = sstep(S1 + 10, S1 + 110, D) * (1 - sstep(S2 - 120, S2 - 10, D));
  const w3 = sstep(S2 + 20, S2 + 130, D) * (1 - sstep(S3 - 70, S3 - 5, D));
  return w1 * (8.5 * sin(D * 0.0058) + 3.2 * sin(D * 0.0152 + 1)) + w2 * (4.6 * sin((D - S1) * 0.0085) + 2 * sin((D - S1) * 0.0212)) + w3 * 2.3 * sin((D - S2) * 0.0068);
};
const inSpan = (D, list, pad = 0) => list.some((s) => D > s[0] - pad && D < s[1] + pad);
const riverAt = (D) => {
  let m = 0;
  for (const s of [...FORDS, ...BRIDGES]) m = max(m, sstep(s[0] - 12, s[0] + 2, D) * (1 - sstep(s[1] - 2, s[1] + 12, D)));
  return m;
};
function halfWidth(D, gaps) {
  if (inSpan(D, BRIDGES)) {
    for (const g of gaps) if (D > g[0] && D < g[1]) return 0;
    return 3.1;
  }
  if (D < FAIR) return 6.2;
  if (D < FAIR + 40) return lerp(6.2, 5.3, sstep(FAIR, FAIR + 40, D));
  if (D < S1) return 5.3;
  if (D < S2 - 8) return 5.5;
  if (D < S2 + 40) return lerp(5.5, 6.7, sstep(S2 - 8, S2 + 40, D));
  if (D < S3) return lerp(6.7, 6, sstep(S2 + 40, S3, D));
  return lerp(6, 7.2, sstep(S3, S3 + 40, D));
}
const kindAt = (D) => (D < S1 ? 0 : inSpan(D, BRIDGES) ? 1 : D < S2 ? 2 : 3);

export function buildLevel(touch) {
  const R = seeded(20261106);
  const r = (a, b) => a + R() * (b - a);
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
  const coins = (x0, D0, n, gap, xf) => {
    for (let i = 0; i < n; i++) add('coin', xf ? xf(i, x0) : x0, D0 + i * gap, {pick: 'coin', y: 1.15, spin: 3, ph: i * 0.4, w: 0.7, l: 0.9});
  };
  const roadCoins = (off, D0, n, gap) => coins(0, D0, n, gap, (i) => center(D0 + i * gap) + off);
  const elote = (x, D) => add('elote', x, D, {pick: 'elote', y: 1.2, spin: 2, w: 1, l: 1.1});
  const tapeAt = (x, D) => add('tape', x, D, {pick: 'tape', y: 1.2, spin: 2.4, w: 1, l: 1.1});
  const COW = [[1, 1, 1], [0.86, 0.83, 0.8], [0.92, 0.72, 0.55], [0.72, 0.7, 0.7]];
  const softCow = {soft: true, h: 1.55, dmg: 0, s: 1};

  // Pedazos de feria: sirven para la de Taxisco y la de Guazacapán.
  const feria = [
    function stalls(D, d) {
      const c = center(D);
      solid('stall', c - 3.3, D, 2, 1.2, 9, 10, {tint: [1, 0.86, 0.5]});
      solid('stall', c + 3.3, D + 21, 2, 1.2, 9, 10, {tint: [0.55, 0.95, 1]});
      roadCoins(1.6, D - 6, 4, 7);
      return 40;
    },
    function people(D, d) {
      const c = center(D), n = 4 + floor(d * 3);
      for (let i = 0; i < n; i++) mover('person', c - 5 + (i * 2.3) % 10, D + i * 6.5, {kind: 'crab', solid: true, w: 0.42, l: 0.42, h: 9, dmg: 6, amp: 3.6, wv: 1.25 + (i % 3) * 0.25, ph: i * 2.1, r0: i % 2 ? 1.3 : -1.3, wobA: 0.3, wobF: 2.6, tint: [[1, 0.7, 0.7], [0.7, 1, 0.8], [0.75, 0.82, 1], [1, 0.95, 0.65]][i % 4]});
      return n * 6.5 + 8;
    },
    function giants(D, d) {
      const c = center(D);
      mover('gigante', c - 2.8, D, {kind: 'crab', solid: true, w: 1, l: 1, h: 9, dmg: 10, amp: 2.2, wv: 0.85, ph: 0, wobA: 0.2, wobF: 1.7});
      mover('gigante', c + 3, D + 24, {kind: 'crab', solid: true, w: 1, l: 1, h: 9, dmg: 10, amp: 2.2, wv: 0.85, ph: 2.4, wobA: 0.2, wobF: 1.7, tint: [0.65, 0.85, 1]});
      return 44;
    },
    function firecrackers(D, d) {
      const c = center(D);
      [[-2.6, 0], [2.4, 11], [0, 24]].forEach(([x, z]) => solid('cohete', c + x, D + z, 1.9, 0.32, 0.34, 4, {trap: 'cohete'}));
      for (let i = 0; i < 2; i++) add('coin', c + 2.4, D + 8 + i * 6, {pick: 'coin', y: 2.1, spin: 3, w: 0.9, l: 1});
      return 36;
    },
    function pinatas(D, d) {
      const c = center(D);
      [[-2.2, 0], [2, 13], [-0.2, 27]].forEach(([x, z]) => add('pinata', c + x, D + z, {pick: 'pinata', y: 3.5, w: 1.25, l: 1.3}));
      roadCoins(0, D - 6, 3, 6);
      solid('cohete', c + 1.8, D + 6, 1.9, 0.32, 0.34, 4, {trap: 'cohete'});
      return 36;
    },
    function carts(D, d) {
      const c = center(D);
      solid('cart', c + 3.1, D, 1.45, 0.95, 9, 10);
      solid('cart', c - 2.9, D + 19, 1.45, 0.95, 9, 10, {tint: [1, 0.72, 0.82]});
      if (d > 0.4) solid('barrel', c + 0.4, D + 32, 0.52, 0.52, 1, 9);
      roadCoins(-0.3, D + 4, 4, 5);
      return 42;
    },
    function tuks(D, d) {
      const c = center(D);
      mover('tuktuk', c - 2.6, D, {kind: 'traffic', solid: true, w: 0.95, l: 1.45, h: 9, dmg: 11, vD: 12, near: 170});
      if (d > 0.3) mover('moto', c + 3.2, D + 110, {kind: 'traffic', solid: true, w: 0.5, l: 1, h: 9, dmg: 13, vD: -11, near: 260});
      return 46;
    },
    function chickens(D, d) {
      const c = center(D);
      for (let i = 0; i < 7; i++) mover('chicken', c - 5.2 + i * 1.75, D + (i % 3) * 3, {kind: 'crab', solid: true, w: 0.32, l: 0.32, h: 0.55, dmg: 3, amp: 3.2, wv: 2.6, ph: i * 1.7, s: 1.3});
      return 28;
    },
    function bump(D, d) {
      const c = center(D);
      add('tumulo', c, D, {sx: 7, sz: 1});
      tumulos.push({D, used: false});
      signs.push({text: '¡AGUAS!', x: c + 5.4, y: 2.2, D: D - 24, w: 3, h: 0.9});
      add('post', c + 5.4, D - 24, {s: 0.72});
      return 24;
    },
  ];
  // ── La feria de Taxisco: puestos, gallinas y piñatas, sin apuro ──
  let DF = 160, kf = 0;
  while (DF < FAIR - 60) {
    const fn = feria[[0, 4, 7, 1, 5][kf % 5]];
    kf++;
    DF += fn(DF, 0.1) + 30;
  }

  // ── Etapa 1: los potreros ──
  const pasture = [
    function cows(D, d) {
      const c = center(D), n = 3 + floor(d * 3);
      for (let i = 0; i < n; i++) {
        const x = c + (i % 2 ? 1 : -1) * r(0.8, 3.6);
        solid('cow', x, D + i * 15, 0.52, 1.25, 1.55, 0, Object.assign({}, softCow, {r: r(-0.5, 0.5), tint: COW[i % 4]}));
      }
      roadCoins(0, D + 7, 3, 15);
      return n * 15 + 8;
    },
    function herd(D, d) {
      const c = center(D), dir = floor(D) % 2 ? 1 : -1, n = 6 + floor(d * 4);
      dec('post', c + 7.2, D - 40, {sy: 2.4});
      signs.push({text: 'Cuidado: ganado', x: c + 7.2, y: 2.9, D: D - 40, w: 5.2, h: 0.9});
      for (let i = 0; i < n; i++) {
        if (i === floor(n / 2)) continue; // el hueco por donde pasar
        mover('cow', c - dir * (13 + i * 3), D + (i % 3) * 2.6, Object.assign({kind: 'drift', vx: dir * 4.1, walk: 5, solid: true, w: 1.15, l: 0.55, r: (dir * PI) / 2, near: 88, tint: COW[i % 4]}, softCow));
      }
      return 46;
    },
    function crossFence(D, d) {
      const c = center(D);
      for (let x = -14; x <= 14; x += 4) add('xfence', c + x, D, {});
      solid('xfence', c, D, 16, 0.3, 1.12, 9, {sx: 0.001, sy: 0.001, sz: 0.001});
      for (let i = 0; i < 3; i++) add('coin', c, D - 4 + i * 4, {pick: 'coin', y: 2.3 + (i === 1 ? 0.5 : 0), spin: 3, w: 0.9, l: 1.1});
      return 34;
    },
    function gate(D, d) {
      const c = center(D);
      solid('gatefarm', c, D, 3.2, 0.25, 1.22, 9);
      roadCoins(5.6, D - 12, 4, 6);
      return 30;
    },
    function mud(D, d) {
      const c = center(D);
      [[-2.4, 0, 2.5], [2.2, 15, 2.8], [-0.4, 32, 3.2]].forEach(([x, z, k]) => add('mud', c + x, D + z, {mud: true, w: k, l: k * 0.8, sx: k, sz: k * 0.8, sy: 1}));
      roadCoins(4.2, D + 2, 5, 6);
      return 44;
    },
    function bales(D, d) {
      const c = center(D);
      solid('bale', c - 2.6, D, 1.05, 0.7, 1.06, 7);
      solid('bale', c + 2.8, D + 13, 1.05, 0.7, 1.06, 7, {r: 0.2});
      solid('bale', c - 0.3, D + 26, 1.05, 0.7, 1.06, 7, {r: -0.15});
      if (d > 0.4) solid('bale', c + 3.2, D + 38, 1.05, 0.7, 1.06, 7);
      roadCoins(1.2, D - 6, 4, 8);
      return 44;
    },
    function troughs(D, d) {
      const c = center(D);
      solid('trough', c + 2.4, D, 1.2, 0.48, 0.74, 8);
      solid('cans', c - 2.6, D + 12, 0.62, 0.62, 0.84, 7);
      solid('trough', c - 0.6, D + 24, 1.2, 0.48, 0.74, 8, {r: 0.1});
      return 34;
    },
    function truck(D, d) {
      const c = center(D);
      mover('pickup', c - 2.7, D, {kind: 'traffic', solid: true, w: 0.92, l: 2.1, h: 9, dmg: 11, vD: 10.5, near: 170, tint: [1, 1, 1]});
      if (d > 0.3) mover('pickup', c + 2.8, D + 150, {kind: 'traffic', solid: true, w: 0.92, l: 2.1, h: 9, dmg: 11, vD: -12, r: PI, near: 300, tint: [1, 0.55, 0.45]});
      roadCoins(2.7, D + 6, 5, 6);
      return 52;
    },
    function hill(D, d) {
      const c = center(D);
      add('loma', c, D, {});
      ramps.push({x: c, D, w: 2.2, vy: 13.8});
      for (let i = 0; i < 7; i++) {
        const t = 0.14 + i * 0.145;
        add('coin', center(D + 3 + 23 * t), D + 3 + 23 * t, {pick: 'coin', y: 1.1 + 13.8 * t - 13 * t * t, spin: 3, w: 1.1, l: 1.5});
      }
      solid('bale', c, D + 13, 1.05, 0.7, 1.06, 7);
      solid('cow', c + 1.4, D + 15, 0.52, 1.25, 1.55, 0, Object.assign({}, softCow, {tint: COW[2], r: 0.4}));
      return 44;
    },
    function egrets(D, d) {
      const c = center(D);
      mover('heron', c - 16, D, {kind: 'heron', solid: true, w: 1.1, l: 0.7, h: 9, h0: 1.9, dmg: 7, vx: 8, y: 3, flyH: 3, hitY: 0.85, r: -PI / 2, s: 1.3});
      mover('heron', c + 18, D + 16, {kind: 'heron', solid: true, w: 1.1, l: 0.7, h: 9, h0: 1.9, dmg: 7, vx: -8, y: 3, flyH: 3, hitY: 0.85, r: PI / 2, s: 1.3});
      solid('bale', c + 3, D - 8, 1.05, 0.7, 1.06, 7);
      return 34;
    },
  ];
  let D = FAIR + 80, k1 = 0;
  while (D < S1 - 110) {
    const d = (D - FAIR) / (S1 - FAIR);
    const pool = d < 0.18 ? [5, 0, 3, 4] : d < 0.55 ? [0, 2, 5, 8, 6, 1, 4, 7, 9] : [1, 2, 7, 8, 5, 3, 9, 0, 4, 6];
    const fn = pasture[pool[k1 % pool.length]];
    k1++;
    D += fn(D, d) + lerp(32, 15, d);
  }
  elote(center(980) - 2, 980);
  elote(center(1740) + 3, 1740);
  tapeAt(center(1410) + 2, 1410);
  customers.push({x: null, off: 7.5, D: 1150, name: 'Doña Chon', ask: 'Patojo, frená en la marca dorada. Tengo tu propina y un queso.', text: '¡Dios te bendiga!'});
  customers.push({x: null, off: -7.5, D: 1980, name: 'Don Tavo', ask: 'Pasá despacio por la marca, no me espantés las vacas.', text: '¡Gracias, muchá!'});

  // ── Etapa 2: cañaverales y río ──
  const canal = [
    function pile(D, d) {
      const c = center(D), s = floor(D) % 2 ? 1 : -1;
      solid('canepile', c + s * 2.4, D, 2.25, 0.55, 0.66, 6);
      roadCoins(-s * 3, D - 8, 4, 6);
      return 28;
    },
    function truckSame(D, d) {
      const c = center(D), s = floor(D) % 2 ? 1 : -1;
      mover('canetruck', c + s * 2.7, D, {kind: 'traffic', solid: true, w: 1.3, l: 5.3, h: 9, dmg: 13, vD: 13, near: 180});
      roadCoins(-s * 2.8, D + 4, 5, 7);
      return 58;
    },
    function truckOpp(D, d) {
      const c = center(D);
      mover('canetruck', c + 2.9, D + 150, {kind: 'traffic', solid: true, w: 1.3, l: 5.3, h: 9, dmg: 13, vD: -13, r: PI, near: 320});
      solid('canepile', c - 2.6, D + 8, 2.25, 0.55, 0.66, 6);
      return 44;
    },
    function cutters(D, d) {
      const c = center(D);
      for (let i = 0; i < 3 + floor(d * 2); i++) mover('person', c - 3.6 + i * 2.2, D + i * 7, {kind: 'crab', solid: true, w: 0.42, l: 0.42, h: 9, dmg: 7, amp: 2.8, wv: 1.1 + i * 0.2, ph: i * 1.7, r0: 1.2, wobA: 0.3, wobF: 2.4, tint: [0.75, 0.85, 1]});
      return 40;
    },
    function bales2(D, d) {
      const c = center(D);
      solid('canepile', c, D, 3.2, 0.55, 0.66, 7, {sx: 1.45});
      for (let i = 0; i < 3; i++) add('coin', c, D - 3 + i * 3, {pick: 'coin', y: 2.2, spin: 3, w: 0.9, l: 1});
      return 26;
    },
    function narrow(D, d) {
      const c = center(D);
      solid('bale', c - 3, D, 1.05, 0.7, 1.06, 7);
      solid('bale', c - 1, D, 1.05, 0.7, 1.06, 7);
      solid('bale', c + 3, D + 16, 1.05, 0.7, 1.06, 7);
      solid('bale', c + 1, D + 16, 1.05, 0.7, 1.06, 7);
      roadCoins(2.8, D - 4, 3, 5);
      roadCoins(-2.8, D + 13, 3, 5);
      return 36;
    },
  ];
  let D2 = S1 + 90, k2 = 0;
  const blocked = [...FORDS, ...BRIDGES, BURN];
  while (D2 < S2 - 90) {
    const hit = blocked.find((s) => D2 > s[0] - 48 && D2 < s[1] + 12);
    if (hit) {
      D2 = hit[1] + 18;
      continue;
    }
    const d = (D2 - S1) / (S2 - S1);
    const pool = d < 0.2 ? [0, 3, 1, 4] : [1, 3, 2, 5, 0, 4];
    let fn = canal[pool[k2 % pool.length]];
    // Ningún tráiler debe alcanzar el puente angosto.
    if ((fn === canal[1] || fn === canal[2]) && BRIDGES.some((s) => D2 > s[0] - 340 && D2 < s[1])) fn = canal[5];
    k2++;
    D2 += fn(D2, d) + lerp(30, 16, d);
  }
  // Vados: piedras y troncos que baja el río
  FORDS.forEach(([a, b], f) => {
    const m = (a + b) / 2;
    [[-2.6, a + 12], [2.8, a + 26], [0, a + 40], [-3, a + 56], [2.4, a + 66]].forEach(([x, z]) => {
      if (z < b) solid('rock', center(z) + x, z, 0.92, 0.82, 0.86, 6, {s: 0.86});
    });
    for (let i = 0; i < 3 + f; i++) mover('log', center(m) - 18 - i * 11, a + 16 + i * 16, {kind: 'drift', solid: true, vx: 6.5, w: 1.8, l: 0.45, h: 0.55, dmg: 7, near: 80, sx: 1.25, r: 0});
    roadCoins(0, a + 6, 7, 11);
    for (let z = a - 4; z < b + 4; z += 7) {
      [-1, 1].forEach((s) => {
        add('rock', center(z) + s * (5.9 + r(0, 1.2)), z, {s: r(0.8, 1.5), r: r(0, 6)});
      });
    }
  });
  // Puentes con tablas caídas
  BRIDGES.forEach(([a, b]) => {
    const g1 = a + 34, L1 = 10, g2 = a + 80, L2 = 12.5;
    gaps.push([g1, g1 + L1], [g2, g2 + L2]);
    signs.push({text: 'Puente angosto', x: center(a) + 5, y: 2.8, D: a - 26, w: 4.8, h: 0.9});
    add('post', center(a) + 5, a - 26, {sy: 2.2});
    for (let z = a + 2; z < b - 1; z += 3.4) {
      if (gaps.some((g) => z > g[0] - 2 && z < g[1] + 2)) continue;
      add('fence', center(z) - 3.3, z, {});
      add('fence', center(z) + 3.3, z, {});
    }
    [g1, g2].forEach((g, i) => {
      const L = i ? L2 : L1;
      for (let j = 0; j < 3; j++) add('coin', center(g), g - 1 + j * (L / 2 + 0.6), {pick: 'coin', y: 2.5, spin: 3, w: 0.9, l: 1.1});
    });
    roadCoins(0, a + 6, 4, 6);
    solid('crate', center(a + 66) + 1.5, a + 66, 0.72, 0.65, 1.05, 9);
  });
  // La quema: fuego a los lados y cañas ardiendo que caen
  signs.push({text: 'Quema de caña', x: center(BURN[0] - 44) + 5.2, y: 2.9, D: BURN[0] - 44, w: 4.8, h: 0.9});
  add('post', center(BURN[0] - 44) + 5.2, BURN[0] - 44, {sy: 2.4});
  for (let i = 0; i < 11; i++) {
    const z = BURN[0] + 18 + i * 25;
    mover('burncane', center(z) + (i % 3 === 0 ? -2.8 : i % 3 === 1 ? 2.6 : 0.2) + r(-0.6, 0.6), z, {kind: 'coco', solid: true, w: 0.95, l: 0.5, h: 0.75, dmg: 8, y: 14, s: 1.15});
  }
  roadCoins(-2.8, BURN[0] + 30, 5, 7);
  roadCoins(2.8, BURN[0] + 140, 5, 7);
  elote(center(S1 + 330) + 2, S1 + 330);
  elote(center(BURN[0] + 200), BURN[0] + 200);
  tapeAt(center(S1 + 1140) - 2, S1 + 1140);
  tapeAt(center(S1 + 1400), S1 + 1400);
  customers.push({x: null, off: 3.6, D: S1 + 700, name: 'El caporal', ask: 'Pasá despacito por la marca. Traés lo de la cuadrilla, ¿verdad?', text: '¡Va, muchá, gracias!'});
  add('gatefarm', center(S1 - 6) - 7.6, S1 - 6, {r: 0.3});
  add('gate', 0, S1 + 8, {s: 0.86});
  signs.push({text: 'CAÑAVERALES', x: 0, y: 4.62, D: S1 + 7.8, w: 9.2, h: 1.1});

  // ── Etapa 3: la feria ──
  let D3 = S2 + 110, k3 = 0;
  while (D3 < S3 - 90) {
    const d = (D3 - S2) / (S3 - S2);
    const pool = d < 0.18 ? [0, 3, 4, 8] : [1, 3, 2, 0, 6, 4, 5, 7, 8];
    const fn = feria[pool[k3 % pool.length]];
    k3++;
    D3 += fn(D3, d) + lerp(30, 14, d);
  }
  elote(center(S2 + 520) - 2, S2 + 520);
  elote(center(S2 + 1320) + 2, S2 + 1320);
  tapeAt(center(S2 + 920), S2 + 920);
  tapeAt(center(S2 + 1720) + 2, S2 + 1720);
  customers.push({x: null, off: 4.8, D: S2 + 640, name: 'Doña Lencha', ask: 'No pasés como loco, mijo. Frená en la marca y te doy para el algodón.', text: '¡Saludes a tu mamá!'});
  add('gate', 0, S2 + 30, {s: 0.95});
  signs.push({text: 'FERIA DE GUAZACAPÁN', x: 0, y: 5.15, D: S2 + 29.8, w: 10.4, h: 1.24});

  // ── Jefe: Cariñoso. La calle queda más limpia para poder hacerse a un lado. ──
  [[S3 + 110, 4.2], [S3 + 300, -4.4], [S3 + 490, 4.2], [S3 + 690, -4.2]].forEach(([z, x]) => solid('barrel', x, z, 0.52, 0.52, 1, 8, {tint: [1, 0.8, 0.6]}));
  for (let z = S3 + 40; z < LEN - 160; z += 58) coins(0, z, 4, 5, (i) => (floor(z / 58) % 2 ? 2.8 : -2.8));
  elote(0, S3 + 420);

  // ── Terminal y salto final ──
  add('gate', 0, LEN - 150, {s: 1.05});
  signs.push({text: 'TERMINAL DE BUSES', x: 0, y: 5.72, D: LEN - 150.2, w: 11.4, h: 1.36});
  [[LEN - 120, 7.9, 0.03], [LEN - 96, -7.9, -0.04], [LEN - 62, 8.1, 0.02], [LEN - 34, -8.2, 0.03]].forEach(([z, x, rr], i) => add('busred', x, z, {r: rr, tint: i % 2 ? [0.55, 0.8, 1] : [1, 1, 1]}));
  add('loma', 0, LEN - 7, {sx: 1.9, sz: 1.3, sy: 1});
  ramps.push({x: 0, D: LEN - 7, w: 4, vy: 15, last: true});
  for (let x = -14; x <= 14; x += 4) add('xfence', x, LEN - 1, {});
  add('busred', -4.9, LEN + 44, {r: 0, decor: false});
  // El rótulo va en la parada, a la puerta de la camioneta, donde el caballo encabritado no lo tapa.
  add('post', -1.5, LEN + 41, {sy: 2.5, decor: true});
  signs.push({text: 'A la capital', x: -1.5, y: 3.4, D: LEN + 41, w: 4.8, h: 0.95});

  // ── Decorado ──
  // Potreros
  for (let z = FAIR + 10; z < S1 - 6; z += 6.1) {
    const c = center(z), hw = 5.3;
    [-1, 1].forEach((s) => dec('wire', c + s * (hw + FENCE_OFF + 0.5), z, {sz: 1}));
  }
  for (let z = FAIR + 20; z < S1 - 12; z += 3.2) {
    const c = center(z);
    const s = R() < 0.5 ? 1 : -1;
    dec('tuft', c + s * r(6.2, 13.6), z, {r: r(0, 6.28), s: r(0.85, 1.6)});
    if (R() < 0.5) dec('tuft', c - s * r(6.2, 13.6), z + 1, {r: r(0, 6.28), s: r(0.85, 1.5)});
  }
  for (let z = FAIR + 30; z < S1 + 40; z += r(13, 24)) {
    const c = center(z);
    [-1, 1].forEach((s) => {
      if (R() < 0.75) dec('conacaste', c + s * r(20, 34), z + r(-4, 4), {r: r(0, 6.28), s: r(0.85, 1.3)});
      if (R() < 0.5) dec('conacaste', c + s * r(40, 92), z, {r: r(0, 6.28), s: r(1, 1.6)});
      if (R() < 0.6) dec('cow', c + s * r(17, 30), z + r(-6, 6), {r: r(0, 6.28), tint: COW[floor(R() * 4)]});
      if (R() < 0.32) dec('cow', c + s * r(30, 62), z + r(-6, 6), {r: r(0, 6.28), tint: COW[floor(R() * 4)]});
      if (R() < 0.18) dec('palm', c + s * r(18, 50), z, {r: r(0, 6.28), s: r(0.9, 1.2)});
    });
  }
  [[560, 1], [940, -1], [1380, 1], [1800, -1], [2180, 1]].forEach(([z, s]) => dec('ceiba', center(z) + s * r(23, 30), z, {r: r(0, 6.28), s: r(1, 1.2)}));
  [[730, 1], [1270, -1], [1670, 1], [2100, -1]].forEach(([z, s]) => dec('rancho', center(z) + s * r(21, 26), z, {r: (-s * PI) / 2 + r(-0.2, 0.2)}));
  [[720, 1, 'Leche fresca'], [1660, -1, 'Hoy: jaripeo']].forEach(([z, s, text]) => {
    const x = center(z) + s * 8.4;
    dec('post', x, z, {sy: 2.5});
    signs.push({text, x, y: 3, D: z, w: 4.8, h: 0.9, decor: true});
  });
  add('gate', 0, 56, {s: 1.05, decor: true});
  signs.push({text: 'BIENVENIDOS A TAXISCO', x: 0, y: 5.72, D: 55.8, w: 11.4, h: 1.36, decor: true});
  // Cañaverales
  const riverAll = [...FORDS, ...BRIDGES];
  for (let z = S1 + 14; z < S2 - 6; z += 4.3) {
    const inR = inSpan(z, riverAll, 16);
    const c = center(z), burn = z > BURN[0] - 6 && z < BURN[1] + 6;
    [-1, 1].forEach((s) => {
      if (inR) return;
      const tint = burn ? [0.3, 0.25, 0.24] : [r(0.86, 1), r(0.92, 1.05), r(0.8, 1)];
      add('cane', c + s * (5.5 + 2.5 + r(-0.2, 0.2)), z, {r: r(0, 6.28), sx: 1, sz: 1, sy: r(0.86, 1.1), tint});
      add('canefar', c + s * (5.5 + 6.4), z + 2, {r: r(0, 6.28), sx: 1.1, sz: 1.1, sy: r(0.95, 1.2), tint, far: true});
    });
    if (burn && floor(z) % 2 === 0) {
      const s = floor(z / 4.3) % 2 ? 1 : -1;
      add('flame', c + s * (5.5 + r(1.3, 4.6)), z, {flick: true, s: r(0.8, 1.2), r: r(0, 6.28)});
    }
  }
  for (const [a, b] of riverAll) {
    for (let z = a - 16; z < b + 18; z += 5) {
      [-1, 1].forEach((s) => {
        const c = center(z);
        if (R() < 0.6) add('reed', c + s * r(8, 18), z, {r: r(0, 6.28), s: r(0.9, 1.5)});
        if (R() < 0.24) add('conacaste', c + s * r(26, 54), z, {r: r(0, 6.28), s: r(0.9, 1.2)});
        if (R() < 0.2) add('rock', c + s * r(8, 26), z, {r: r(0, 6), s: r(0.8, 1.7)});
      });
    }
  }
  // Feria
  const house = [[1, 0.62, 0.55], [0.5, 0.85, 0.85], [1, 0.82, 0.45], [0.72, 0.58, 0.95], [0.6, 0.86, 0.55], [1, 0.58, 0.72], [0.55, 0.68, 1]];
  const stallT = [[1, 1, 1], [1, 0.82, 0.45], [0.55, 0.9, 1], [0.7, 1, 0.7], [1, 0.7, 0.9]];
  // Juegos mecánicos a la vista: la fila de casas les deja hueco.
  const rides = [
    {t: 'carousel', D: 150, s: -1}, {t: 'wheel', D: 250, s: 1}, {t: 'sillas', D: 340, s: -1}, {t: 'pulpo', D: 420, s: 1},
    {t: 'wheel', D: S2 + 340, s: 1}, {t: 'carousel', D: S2 + 620, s: -1}, {t: 'sillas', D: S2 + 900, s: 1}, {t: 'wheel', D: S2 + 1180, s: -1},
    {t: 'carousel', D: S2 + 1440, s: 1}, {t: 'pulpo', D: S2 + 1700, s: -1}, {t: 'carousel', D: S3 + 280, s: -1}, {t: 'wheel', D: S3 + 520, s: 1},
  ];
  const holeAt = (z, s) => rides.some((q) => q.s === s && abs(z - q.D) < (q.t === 'wheel' ? 15 : 12));
  let hk = 0;
  const houses = (z0, z1) => {
    for (let z = z0; z < z1; z += 12.5) {
      const c = center(z), hw = halfWidth(z, []);
      [-1, 1].forEach((s) => {
        hk++;
        if (!holeAt(z, s)) add(hk % 3 === 2 ? 'house2' : 'house', c + s * (hw + 12), z, {tint: house[hk % house.length], r: (-s * PI) / 2});
      });
    }
  };
  houses(S2 + 44, LEN + 280);
  houses(-40, FAIR + 30);
  const stallRow = (z) => {
    const c = center(z), hw = halfWidth(z, []);
    [-1, 1].forEach((s) => {
      add('stall', c + s * (hw + 3.1), z + (s > 0 ? 3 : 0), {r: PI / 2, tint: stallT[floor(z / 8.6 + s) % 5 < 0 ? 0 : floor(z / 8.6 + s) % 5]});
    });
    if (floor(z / 8.6) % 2) add('crowd', c + (floor(z) % 3 === 0 ? 1 : -1) * (hw + 0.95), z, {r: 0, tint: [1, 1, 1]});
    else add('crowd', c - (floor(z) % 3 === 0 ? 1 : -1) * (hw + 0.95), z + 4, {r: 0, tint: [1, 1, 1]});
  };
  for (let z = S2 + 48; z < LEN - 160; z += 8.6) stallRow(z);
  for (let z = 24; z < FAIR - 14; z += 8.6) stallRow(z);
  for (let z = S2 + 62; z < LEN - 150; z += 21) add('banner', center(z), z, {sy: 1});
  for (let z = 70; z < FAIR - 10; z += 21) add('banner', center(z), z, {sy: 1});
  for (let z = LEN - 140; z < LEN + 280; z += 16) {
    [-1, 1].forEach((s) => {
      add('palm', s * r(23, 44), z + r(-5, 5), {r: r(0, 6.28), s: r(0.9, 1.25)});
      if (R() < 0.6) add('conacaste', s * r(30, 70), z, {r: r(0, 6.28), s: r(0.9, 1.3)});
    });
    add('crowd', -(7.2 + 1.2), z, {r: 0});
  }
  for (let z = S2 + 80; z < LEN - 150; z += 84) {
    add('string', center(z), z + 6, {s: 1});
    add('lamp', center(z) - halfWidth(z, []) - 1.2, z, {r: 0});
  }
  for (let z = 40; z < FAIR; z += 42) {
    add('string', center(z), z + 6, {s: 1});
    add('lamp', center(z) + (floor(z / 42) % 2 ? 1 : -1) * (halfWidth(z, []) + 1.2), z, {r: floor(z / 42) % 2 ? PI : 0});
  }
  rides.forEach((q) => {
    if (q.t === 'wheel') return;
    const rot = {carousel: 0.55, sillas: 1.25, pulpo: 0.85}[q.t];
    add(q.t, center(q.D) + q.s * (halfWidth(q.D, []) + 11), q.D, {rotV: rot, s: q.t === 'carousel' ? 1.1 : 1});
  });
  add('gate', 0, 150, {s: 1.05, decor: true});
  signs.push({text: 'FERIA DE TAXISCO', x: 0, y: 5.72, D: 149.8, w: 11.4, h: 1.36, decor: true});
  [[S2 + 90, 'Churrascos La Feria', 1], [S2 + 420, 'Algodones', -1], [S2 + 760, 'Elotes locos', 1], [S2 + 1120, 'Tiro al blanco', -1], [S2 + 1540, 'Rueda de Chicago', 1], [S3 + 60, 'Hoy: jaripeo', -1], [S3 + 480, 'Talabartería Don Chepe', 1]].forEach(([z, text, s]) => {
    const c = center(z), hw = halfWidth(z, []);
    signs.push({text, x: c + s * (hw + 1.5), y: 3.75, D: z, w: 5.4, h: 0.9});
  });
  const wheels = rides.filter((q) => q.t === 'wheel').map((q) => ({x: center(q.D) + q.s * (halfWidth(q.D, []) + 15), D: q.D}));

  // Encargos: persona y su marca
  customers.forEach((c) => {
    if (c.x === null) c.x = center(c.D) + c.off;
    add('person', c.x + 0.9, c.D, {r: -1.3, tint: [0.75, 1, 1]});
  });
  items.sort((a, b) => a.D - b.D);

  // Pista: [x central, medio ancho, tipo, río] cada 2 unidades
  const N = floor(DRAW / 2) + 1;
  const track = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const z = i * 2;
    track[i * 4] = center(z);
    track[i * 4 + 1] = halfWidth(z, gaps);
    track[i * 4 + 2] = kindAt(z);
    // La feria de Taxisco se marca con -1: el suelo la pinta de adoquín y el juego la trata como calle.
    track[i * 4 + 3] = z < FAIR ? -1 : riverAt(z);
  }
  const calls = (touch ? CALLS_TOUCH : CALLS_DESK).slice().sort((a, b) => a.D - b.D).map((c) => Object.assign({done: false}, c));
  return {meta: META, items, movers, signs, surges: [], ramps, customers, gaps, tumulos, track, len: DRAW, length: LEN, calls, cursor: 0, center, halfWidth: (z) => halfWidth(z, gaps), kindAt, riverAt, stageBounds: [0, S1, S2, S3, LEN], S1, S2, S3, wheels, burn: BURN, fair: FAIR};
}

// Paleta por distancia: amanecer en los potreros, mañana en los cañales, humo en la quema y tarde en la feria.
const DAY = {sunDisc: '#fffbe6', foam: '#ffffff', night: 0};
export const SKYKEYS = [
  {D: 0, skyTop: '#0b1132', skyMid: '#38306c', skyLow: '#c06a6c', sunDisc: '#ffcf9a', sunCol: '#8e80b2', shade: '#40406e', rim: '#ff9a7a', fog: '#4c406e', cloudL: '#a87a9c', cloudS: '#383060', hill: '#2e2e52', hill2: '#1c2630',
    sandA: '#5a4038', sandB: '#735448', wet: '#4a3428', waterA: '#2a4f78', waterB: '#5a8aa0', foam: '#f4e6ee', plank: '#6c5040', street: '#76666e', grass: '#3a5a40', sunEl: -0.04, night: 0.72, shadow: 3.4, shadowA: 0.3},
  {D: FAIR - 40, skyTop: '#2a55a8', skyMid: '#f09a8c', skyLow: '#ffc98a', sunDisc: '#fff1c8', sunCol: '#ffdfb4', shade: '#8b7d9e', rim: '#ffcf8a', fog: '#f8c6a0', cloudL: '#ffe3cf', cloudS: '#b583ac', hill: '#6d6f9c', hill2: '#3f5e5c',
    sandA: '#8a5a3c', sandB: '#b27b50', wet: '#5b3b2b', waterA: '#2f6f9c', waterB: '#69b8c2', foam: '#fff4e6', plank: '#9c7148', street: '#8f7f72', grass: '#5f8f4a', sunEl: 0.09, night: 0, shadow: 3.2, shadowA: 0.42},
  {D: 1520, skyTop: '#1673d8', skyMid: '#74c2ef', skyLow: '#e6efd8', sunCol: '#fff3d6', shade: '#8488a6', rim: '#fff0c0', fog: '#d8ecdc', cloudL: '#ffffff', cloudS: '#a9c3e4', hill: '#6f93b8', hill2: '#3f7a58',
    sandA: '#9a6a42', sandB: '#c48e5c', wet: '#6a4630', waterA: '#1f7fa8', waterB: '#5cc7c0', plank: '#b0814f', street: '#9d8c7c', grass: '#5a9c47', sunEl: 0.5, shadow: 1.6, shadowA: 0.4, ...DAY},
  {D: S1 + 1380, skyTop: '#1a6cc8', skyMid: '#86c3e8', skyLow: '#f2ead0', sunCol: '#fff4da', shade: '#8488a6', rim: '#fff0c0', fog: '#efe3c4', cloudL: '#ffffff', cloudS: '#b3c5e0', hill: '#7b98b4', hill2: '#4a7c58',
    sandA: '#a06c40', sandB: '#cc9460', wet: '#6a4630', waterA: '#1f7fa8', waterB: '#5cc7c0', plank: '#b0814f', street: '#9d8c7c', grass: '#5c9a46', sunEl: 0.72, shadow: 1, shadowA: 0.42, ...DAY},
  {D: BURN[0] + 20, skyTop: '#6a5a58', skyMid: '#c4835a', skyLow: '#f0a460', sunDisc: '#ffd27a', sunCol: '#ffc48e', shade: '#6a4a58', rim: '#ff9d5a', fog: '#d98a52', cloudL: '#8f6f60', cloudS: '#4d3b38', hill: '#6e4e48', hill2: '#3a2e2c',
    sandA: '#7c4e30', sandB: '#a06c44', wet: '#4a3024', waterA: '#3f5f6c', waterB: '#6f8c80', foam: '#f4dcc4', plank: '#8c6440', street: '#857264', grass: '#58803c', sunEl: 0.5, night: 0, shadow: 1.4, shadowA: 0.46},
  {D: BURN[1] - 10, skyTop: '#6a5a58', skyMid: '#c4835a', skyLow: '#f0a460', sunDisc: '#ffd27a', sunCol: '#ffc48e', shade: '#6a4a58', rim: '#ff9d5a', fog: '#d98a52', cloudL: '#8f6f60', cloudS: '#4d3b38', hill: '#6e4e48', hill2: '#3a2e2c',
    sandA: '#7c4e30', sandB: '#a06c44', wet: '#4a3024', waterA: '#3f5f6c', waterB: '#6f8c80', foam: '#f4dcc4', plank: '#8c6440', street: '#857264', grass: '#58803c', sunEl: 0.5, night: 0, shadow: 1.4, shadowA: 0.46},
  {D: S2 + 40, skyTop: '#1f6ac8', skyMid: '#83c0e6', skyLow: '#fbe7c0', sunCol: '#fff2d2', shade: '#8a85a8', rim: '#fff0c0', fog: '#f4e2bc', cloudL: '#ffffff', cloudS: '#b5bedd', hill: '#7f92ae', hill2: '#50795a',
    sandA: '#a06c40', sandB: '#cc9460', wet: '#6a4630', waterA: '#1f7fa8', waterB: '#5cc7c0', plank: '#b0814f', street: '#a2917f', grass: '#5c9a46', sunEl: 0.62, shadow: 1.2, shadowA: 0.42, ...DAY},
  {D: S3, skyTop: '#2662bc', skyMid: '#a4bcd8', skyLow: '#ffd79a', sunDisc: '#fff0c4', sunCol: '#ffe6bb', shade: '#8a7aa4', rim: '#ffd27a', fog: '#ffd3a0', cloudL: '#fff0dc', cloudS: '#b892b4', hill: '#8a7fa4', hill2: '#56705c',
    sandA: '#9a6a42', sandB: '#c48e5c', wet: '#6a4630', waterA: '#1f7fa8', waterB: '#5cc7c0', foam: '#fff6e6', plank: '#b0814f', street: '#a08c78', grass: '#5a9a48', sunEl: 0.3, night: 0, shadow: 2.4, shadowA: 0.44},
  {D: LEN + 400, skyTop: '#2f5cac', skyMid: '#e8a080', skyLow: '#ffb86c', sunDisc: '#fff0c4', sunCol: '#ffd9a4', shade: '#80709c', rim: '#ffc06a', fog: '#ffb88a', cloudL: '#ffe0c0', cloudS: '#ac7898', hill: '#7f6a98', hill2: '#4c5c5a',
    sandA: '#94603c', sandB: '#ba8454', wet: '#6a4630', waterA: '#1f7fa8', waterB: '#5cc7c0', foam: '#fff6e6', plank: '#b0814f', street: '#987f6c', grass: '#588c46', sunEl: 0.14, night: 0, shadow: 3, shadowA: 0.46},
];
