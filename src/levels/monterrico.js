// Nivel 1: Monterrico. La pista se genera con semilla: siempre es la misma y se puede aprender.
import {seeded, sin, cos, abs, min, max, floor, sstep, lerp, PI} from '../core/util.js';

export const META = {
  id: 'monterrico', name: 'Monterrico', short: 'Monterrico', vehicle: 'bike', vehicleName: 'Bicicleta', ground: 'beach', stop: 1,
  next: 'Taxisco y Guazacapán', nextId: 'taxisco', music: [0, 1, 2, 3], forceLabel: 'Fuerza', sprintWord: 'pedalear duro', callWord: 'timbre', callChip: 'Timbre',
  stages: [
    {name: 'La playa', fact: 'Arena negra de volcán. Junto al agua está dura y vas más rápido.', speed: 21, clock: 80},
    {name: 'El manglar', fact: 'Canal de Chiquimulilla. Si te salís de la pasarela, te mojás vos y el paquete.', speed: 23, clock: 72},
    {name: 'El pueblo', fact: 'Tuc-tucs, chuchos y túmulos. Frená antes de cada túmulo o saltalo.', speed: 25, clock: 70},
  ],
  soft: {shout: '¡Las tortuguitas!', check: 'Ninguna tortuguita golpeada', keep: false},
  boss: {id: 'dog', name: 'Terremoto', cut: '¡TERREMOTO!', sub: 'El chucho de Doña Tere'},
  finish: {cut: '¡LA LANCHA!', sub: 'Última salida a La Avellana', arrive: 'Llegaste a la lancha', deck: 1.08},
  shop: {title: 'Tiendita de Doña Tere', go: 'Seguir pedaleando', items: [
    {id: 'cadena', name: 'Cadena nueva', desc: 'Pedaleás un 6% más rápido.', price: 60},
    {id: 'frenos', name: 'Frenos de verdad', desc: 'Frenás el doble y te recuperás más rápido de los golpes.', price: 45},
    {id: 'carton', name: 'Cartón extra', desc: 'El paquete recibe 30% menos daño.', price: 70},
  ]},
  share: 'Crucé Monterrico',
  note: 'La bicicleta quedó en el muelle. Del otro lado te espera un caballo con su carácter. Sigue <b class="text-oro">Taxisco y Guazacapán</b>.',
  title: {D0: 40, D1: 1130, pal: 500, speed: 15, x: (LV, D, t) => LV.shoreBase(D) + 2.1 + Math.sin(t * 0.3) * 0.7},
  palGain: [1.18, 0.92, 4400], leftHills: 0, burn: null, fenceOff: 0,
  ambient: (D, LV) => (D < LV.S1 ? 1 : D > LV.length - 300 ? 0.5 : 0.2), fallText: '¡Al agua!',
  // Ráfagas del mar: te empujan tierra adentro, a la arena suelta.
  pull: {from: 560, dir: 1, s: 0.6, chip: 'Viento del mar →', shout: '¡Viento del mar!', sfx: 'gust'},
};
export const S1 = 1500, S2 = 3000, S3 = 4500, LEN = 5400;
const DRAW = LEN + 300;

export const CALLS_DESK = [
  {D: 25, from: 'Don Beto', t: 'Patojo, ese paquete tiene que estar en Xela mañana antes de medianoche. No lo abrás.'},
  {D: 150, from: 'Don Beto', t: 'Flechas o A y D para moverte. Espacio para saltar. ↑ pedaleás duro, ↓ frenás.'},
  {D: 400, from: 'Don Beto', t: 'Pegate a la orilla: la arena mojada es dura y vas más rápido. Pero ojo con las olas.'},
  {D: 520, from: 'Don Beto', t: 'Cuando sople el viento del mar te va a sacar de la orilla. Pedaleá contra él.'},
  {D: 720, from: 'La Licenciada', t: '¿Ya mero, vos? Me dijeron que ya venías en camino.'},
  {D: 1120, from: 'Mamá', t: '¿Ya comiste, mijo? Te dejé tortillas con Doña Tere por si te da hambre.'},
];
export const CALLS_TOUCH = [
  {D: 25, from: 'Don Beto', t: 'Patojo, ese paquete tiene que estar en Xela mañana antes de medianoche. No lo abrás.'},
  {D: 150, from: 'Don Beto', t: 'Arrastrá el dedo para moverte. Con los botones saltás, pedaleás duro o frenás.'},
  {D: 400, from: 'Don Beto', t: 'Pegate a la orilla: la arena mojada es dura y vas más rápido. Pero ojo con las olas.'},
  {D: 520, from: 'Don Beto', t: 'Cuando sople el viento del mar te va a sacar de la orilla. Pedaleá contra él.'},
  {D: 720, from: 'La Licenciada', t: '¿Ya mero, vos? Me dijeron que ya venías en camino.'},
  {D: 1120, from: 'Mamá', t: '¿Ya comiste, mijo? Te dejé tortillas con Doña Tere por si te da hambre.'},
];
export const CALLS_COMMON = [
  {D: S1 + 70, from: 'Don Beto', t: 'Por el manglar llegás más rápido. Eso sí, ese paquete no se moja.'},
  {D: S1 + 520, from: 'La Licenciada', t: 'Una cosa: si el paquete se mueve solo, no te asustés. Es normal.'},
  {D: S1 + 950, from: 'Don Beto', t: 'Un caimán no te hace nada si lo saltás. Eso me dijeron, al menos.'},
  {D: S2 + 80, from: 'Mamá', t: 'Si un chucho te sigue, tirale una tortilla. Así te enseñó tu papá.'},
  {D: S2 + 560, from: 'La Licenciada', t: '¿Oíste algo adentro del paquete? No me digás. Mejor no me digás.'},
  {D: S2 + 1080, from: 'Don Beto', t: 'La última lancha a La Avellana sale ya. Si la perdés, ni volvás.'},
];

// Tramo fijo de pasarela: curvas suaves pero con carácter.
const center = (D) => {
  const w2 = sstep(S1, S1 + 90, D) * (1 - sstep(S2 - 90, S2, D));
  const w3 = sstep(S2 + 30, S2 + 120, D) * (1 - sstep(LEN - 330, LEN - 250, D));
  return w2 * (6.5 * sin((D - S1) * 0.0105) + 3.5 * sin((D - S1) * 0.0245)) + w3 * 2.6 * sin((D - S2) * 0.0072);
};
const shoreBase = (D) => {
  const s = -6 + 2.6 * sin(D * 0.0092) + 1.4 * sin(D * 0.027 + 1);
  return lerp(s, -30, sstep(S1 - 170, S1 - 60, D));
};
function halfWidth(D, gaps) {
  let hw;
  if (D < S1 - 130) hw = 15;
  else if (D < S1) hw = lerp(15, 3.3, sstep(S1 - 130, S1 - 12, D));
  else if (D < S2 - 8) hw = lerp(3.3, 2.55, sstep(S1, S2 - 200, D));
  else if (D < S2 + 30) hw = lerp(2.55, 6.6, sstep(S2 - 8, S2 + 30, D));
  else if (D < LEN - 250) hw = lerp(6.6, 5.4, sstep(S2 + 30, S3, D));
  else hw = lerp(5.4, 3.6, sstep(LEN - 250, LEN - 230, D));
  for (const g of gaps) if (D > g[0] && D < g[1]) return 0;
  return hw;
}
const kindAt = (D) => (D < S1 - 6 ? 0 : D < S2 - 2 ? 1 : D < LEN - 250 ? 2 : 1);

export function buildLevel(touch) {
  const R = seeded(20261105);
  const r = (a, b) => a + R() * (b - a);
  const items = [], movers = [], signs = [], surges = [], ramps = [], customers = [], gaps = [], tumulos = [];
  const add = (t, x, D, o = {}) => {
    const it = Object.assign({t, x, D}, o);
    items.push(it);
    return it;
  };
  const solid = (t, x, D, w, l, h, dmg, o = {}) => add(t, x, D, Object.assign({solid: true, w, l, h, dmg}, o));
  const mover = (t, x, D, o = {}) => {
    const it = Object.assign({t, x0: x, x, D, D0: D, on: false, mover: true}, o);
    movers.push(it);
    return it;
  };
  const coins = (x0, D0, n, gap, xf) => {
    for (let i = 0; i < n; i++) add('coin', xf ? xf(i, x0) : x0, D0 + i * gap, {pick: 'coin', y: 1, spin: 3, ph: i * 0.4, w: 0.7, l: 0.9});
  };
  const coco = (x, D) => add('greencoco', x, D, {pick: 'coco', y: 1, spin: 2, w: 0.9, l: 1});
  const tapeAt = (x, D) => add('tape', x, D, {pick: 'tape', y: 1, spin: 2.4, w: 0.9, l: 1});

  // ── Etapa 1: la playa ──
  let D = 140;
  let idx = 0;
  const beach = [
    function crabs(D, d) {
      const s = shoreBase(D);
      for (let i = 0; i < 3 + floor(d * 3); i++) mover('crab', s + 2 + i * 1.7, D + i * 7, {solid: true, w: 0.42, l: 0.4, h: 0.32, dmg: 5, amp: 2.4, wv: 1.3 + i * 0.1, ph: i * 1.1, kind: 'crab', s: 1.25});
      coins(s + 1.7, D - 28, 5, 6);
      return 48;
    },
    function castles(D, d) {
      const s = shoreBase(D);
      solid('castle', s + 1.5, D, 0.8, 0.8, 0.82, 9, {s: 1.15});
      solid('castle', s + 3.1, D + 15, 0.8, 0.8, 0.82, 9, {s: 1.15});
      add('person', s + 5.5, D + 3, {tint: [1, 0.74, 0.6], decor: false, r: 0.5, s: 0.74});
      add('rock', s + 6.6, D + 15, {s: 0.5});
      coins(s + 5, D + 26, 4, 5);
      return 45;
    },
    function logs(D, d) {
      const s = shoreBase(D);
      solid('log', s + 3, D, 3.6, 0.45, 0.55, 12, {sx: 3.6, sz: 1.2, sy: 1.1});
      coins(s + 3, D - 11, 3, 5);
      for (let i = 0; i < 3; i++) add('coin', s + 3, D - 3 + i * 3, {pick: 'coin', y: 2.2 + (i === 1 ? 0.3 : 0), spin: 3, w: 0.7, l: 0.9});
      return 38;
    },
    function umbrellas(D, d) {
      const s = shoreBase(D);
      const n = 4 + floor(d * 3);
      for (let i = 0; i < n; i++) {
        const x = s + 1.8 + (i % 2 ? 5.2 : 0.5) + r(-0.5, 0.5), z = D + i * 15;
        solid('umbrella', x, z, 0.5, 0.5, 9, 12, {tint: [1, 1, 1]});
        add('barrel', x + 1.2, z + 1, {s: 0.5, tint: [1, 0.7, 0.7]});
      }
      return n * 15 + 12;
    },
    function lanchas(D, d) {
      const s = shoreBase(D);
      solid('lancha', s + 3, D, 3.7, 1, 9, 16, {r: PI / 2 + 0.1});
      coins(s + 8.6, D - 12, 5, 5);
      if (d > 0.35) solid('lancha', s + 9, D + 32, 3.7, 1, 9, 16, {r: PI / 2 - 0.1, tint: [1, 0.85, 0.7]});
      return 62;
    },
    function turtles(D, d) {
      const s = shoreBase(D);
      signs.push({text: 'TORTUGARIO', x: s + 12, y: 2.2, D: D - 6, w: 5.8, h: 0.9});
      add('person', s + 11.8, D + 1, {r: -1.1});
      for (let i = 0; i < 12; i++) mover('turtle', s + 10 - (i % 4) * 1.2 + r(-0.3, 0.3), D + (i % 3) * 1.3 + r(-0.3, 0.3), {soft: true, solid: true, w: 0.42, l: 0.4, h: 0.22, dmg: 0, vx: -1.25, kind: 'turtle', r: PI / 2, s: 1.3});
      return 34;
    },
    function ramp(D, d) {
      const s = shoreBase(D);
      const x = s + 4.8;
      add('ramp', x, D, {r: 0, sz: 1.2});
      ramps.push({x, D, w: 1.75, vy: 13.2});
      const v = 21;
      for (let i = 0; i < 7; i++) {
        const t = 0.15 + i * 0.13;
        add('coin', x, D + 3 + v * t, {pick: 'coin', y: 0.9 + 13.2 * t - 13 * t * t, spin: 3, w: 1.1, l: 1.5});
      }
      solid('log', x, D + 13, 2.8, 0.45, 0.55, 12, {sx: 2.8, sz: 1.2});
      return 50;
    },
    function coconuts(D, d) {
      const s = shoreBase(D);
      for (let i = 0; i < 4 + floor(d * 2); i++) {
        const x = s + 1 + (i * 2.7) % 8, z = D + i * 12;
        mover('cocofall', x, z, {kind: 'coco', solid: true, w: 0.42, l: 0.42, h: 0.75, dmg: 8, y: 30, s: 1.25});
      }
      add('palm', s + 2, D - 6, {r: 1.6, s: 1});
      add('palm', s + 7.4, D + 22, {r: 4.1});
      return 74;
    },
  ];
  while (D < S1 - 220) {
    const d = D / S1;
    const pool = d < 0.2 ? [2, 0, 1, 3] : d < 0.5 ? [0, 1, 2, 3, 5, 6, 7, 4] : [3, 4, 5, 6, 7, 0, 2, 1];
    const fn = beach[pool[idx % pool.length]];
    idx++;
    const len = fn(D, d);
    D += len + lerp(32, 16, d);
  }
  // Olas grandes
  [290, 560, 790, 1020, 1240].forEach((d0, i) => surges.push({D: d0, half: 74, amp: 7.5 + i * 0.7, started: false, t: -1}));
  // Encargos
  customers.push({x: -6 + 11, D: 610, name: 'Don Chus', ask: 'Aquí estoy, patojo. Frená en la marca dorada y te doy tu propina.', text: '¡Gracias, patojo!'});
  customers.push({x: -6 + 11, D: 1150, name: 'Niña Rosa', ask: 'Traés mi recado, ¿verdad? Pasá despacio por la marca.', text: '¡Dios te lo pague!'});
  coco(-2, 520);
  coco(0, 1090);
  tapeAt(3, 880);
  // Vallas que llevan a la pasarela
  for (let z = S1 - 128; z < S1 - 6; z += 4.5) {
    const hw = halfWidth(z, []);
    add('fence', -hw - 0.3, z, {decor: false, r: 0.08});
    add('fence', hw + 0.3, z, {decor: false, r: -0.08});
  }
  add('gate', 0, S1 - 8, {s: 0.75});
  signs.push({text: 'EL MANGLAR', x: 0, y: 4.1, D: S1 - 8.2, w: 8.4, h: 1});

  // ── Etapa 2: el manglar ──
  let D2 = S1 + 60, k2 = 0;
  const walk = [
    function crates(D, d) {
      const c = center(D), s = k2 % 2 ? 1 : -1;
      solid('crate', c + s * 1.35, D, 0.72, 0.65, 1.05, 11);
      coins(c - s * 1.3, D - 16, 5, 6, (i) => center(D - 16 + i * 6) - s * 1.3);
      return 32;
    },
    function nets(D, d) {
      const c = center(D);
      solid('net', c, D, 1.1, 0.8, 0.34, 6, {s: 1.05});
      return 24;
    },
    function caimans(D, d) {
      const c = center(D);
      solid('caiman', c, D, 2.6, 0.5, 0.42, 13, {s: 1.1, tint: [0.95, 1, 0.92]});
      add('coin', c, D - 3, {pick: 'coin', y: 2.1, spin: 3, w: 0.8, l: 1});
      add('coin', c, D + 1, {pick: 'coin', y: 2.3, spin: 3, w: 0.8, l: 1});
      return 34;
    },
    function gap(D, d) {
      const c = center(D), L = lerp(9, 13, d);
      gaps.push([D, D + L]);
      for (let i = 0; i < 3; i++) add('coin', center(D + 2 + i * 4), D + 2 + i * (L / 3), {pick: 'coin', y: 2, spin: 3, w: 0.8, l: 1});
      add('post', c - 2.9, D - 1, {});
      add('post', c + 2.9, D - 1, {});
      add('post', center(D + L) - 2.9, D + L + 1, {});
      add('post', center(D + L) + 2.9, D + L + 1, {});
      coins(c, D - 22, 3, 6, (i) => center(D - 22 + i * 6));
      return L + 34;
    },
    function ramped(D, d) {
      const c = center(D), L = lerp(16, 22, d);
      add('ramp', c, D, {sx: 1.65, sz: 1.2});
      ramps.push({x: c, D, w: 2.8, vy: 13});
      gaps.push([D + 4, D + 4 + L]);
      for (let i = 0; i < 5; i++) {
        const t = 0.12 + i * 0.17;
        add('coin', center(D + 3 + 23 * t), D + 3 + 23 * t, {pick: 'coin', y: 0.9 + 13 * t - 13 * t * t, spin: 3, w: 1, l: 1.5});
      }
      return L + 46;
    },
    function herons(D, d) {
      const c = center(D);
      mover('heron', c - 18, D, {kind: 'heron', solid: true, w: 1.1, l: 0.7, h: 9, h0: 1.9, dmg: 8, vx: 8.5, y: 2.5, r: -PI / 2, s: 1.3});
      solid('net', c, D + 2, 1.1, 0.8, 0.34, 6);
      return 30;
    },
    function narrow(D, d) {
      const c = center(D);
      solid('barrel', c - 1.5, D, 0.5, 0.5, 1, 10);
      solid('barrel', c + 1.4, D + 9, 0.5, 0.5, 1, 10, {tint: [1, 0.8, 0.5]});
      solid('barrel', c - 1.3, D + 18, 0.5, 0.5, 1, 10, {tint: [0.8, 1, 0.8]});
      coins(c, D - 8, 6, 5.5, (i) => center(D - 8 + i * 5.5));
      return 40;
    },
  ];
  while (D2 < S2 - 170) {
    const d = (D2 - S1) / (S2 - S1);
    const pool = d < 0.2 ? [1, 0, 3, 6] : [0, 2, 3, 6, 4, 1, 5, 2];
    const fn = walk[pool[k2 % pool.length]];
    k2++;
    D2 += fn(D2, d) + lerp(30, 14, d);
  }
  coco(center(S1 + 420), S1 + 420);
  coco(center(S1 + 980), S1 + 980);
  tapeAt(center(S1 + 730), S1 + 730);
  customers.push({x: null, off: 3.2, D: S1 + 640, name: 'El pescador', ask: 'Pasá despacito por la marca, que te tengo unos quetzales.', text: '¡Saludes a su mamá!'});

  // ── Etapa 3: el pueblo ──
  let D3 = S2 + 95, k3 = 0;
  const town = [
    function tum(D, d) {
      const c = center(D);
      add('tumulo', c, D, {sx: 7, sz: 1, solidless: true});
      tumulos.push({D, used: false});
      signs.push({text: '¡AGUAS!', x: c + 5, y: 2, D: D - 22, w: 3, h: 0.9});
      add('post', c + 5, D - 22, {s: 0.7});
      return 26;
    },
    function tuks(D, d) {
      const c = center(D);
      mover('tuktuk', c - 2.3, D, {kind: 'traffic', solid: true, w: 0.95, l: 1.45, h: 9, dmg: 15, vD: 11, tint: [1, 1, 1]});
      if (d > 0.3) mover('tuktuk', c + 2.2, D + 32, {kind: 'traffic', solid: true, w: 0.95, l: 1.45, h: 9, dmg: 15, vD: 13, tint: [0.3, 0.75, 1]});
      return 58;
    },
    function motos(D, d) {
      const c = center(D);
      mover('moto', c + 3, D + 90, {kind: 'traffic', solid: true, w: 0.5, l: 1, h: 9, dmg: 15, vD: -11, r: 0, near: 240});
      coins(c - 2.6, D + 10, 6, 5);
      return 46;
    },
    function holes(D, d) {
      const c = center(D);
      // Tres hoyos con espacio para saltarlos uno por uno.
      [[-2.6, 0], [2.4, 26], [0, 52]].forEach(([x, z]) => solid('pothole', c + x, D + z, 1.05, 0.95, 0.1, 5, {sz: 0.9, sx: 1.15}));
      return 66;
    },
    function carts(D, d) {
      const c = center(D);
      solid('cart', c + 3, D, 1.4, 0.9, 9, 14);
      add('person', c + 5.2, D + 1.2, {r: -1.1});
      solid('cart', c - 2.8, D + 24, 1.4, 0.9, 9, 14, {tint: [1, 0.72, 0.82]});
      coins(c, D + 6, 5, 5);
      return 44;
    },
    function chickens(D, d) {
      const c = center(D);
      for (let i = 0; i < 6; i++) mover('chicken', c - 5 + i * 1.9, D + (i % 3) * 3, {kind: 'crab', solid: true, soft: false, w: 0.32, l: 0.32, h: 0.55, dmg: 3, amp: 3.3, wv: 2.6, ph: i * 1.7, s: 1.25});
      return 26;
    },
  ];
  while (D3 < S3 - 80) {
    const d = (D3 - S2) / (S3 - S2);
    const pool = d < 0.2 ? [0, 3, 1, 4] : [1, 0, 2, 3, 5, 4, 0, 1];
    const fn = town[pool[k3 % pool.length]];
    k3++;
    D3 += fn(D3, d) + lerp(30, 15, d);
  }
  coco(center(S2 + 520), S2 + 520);
  tapeAt(center(S2 + 960), S2 + 960);
  customers.push({x: null, off: 4.6, D: S2 + 740, name: 'Doña Lupita', ask: 'No pasés como loco, mijo. Frená en la marca y te doy algo.', text: '¡Va, mijo, gracias!'});

  // ── Jefe: Terremoto ──
  const tortillas = [];
  [S3 + 120, S3 + 300, S3 + 470, S3 + 620, S3 + 720].forEach((z, i) => {
    const it = add('tortilla', center(z) + [2.5, -2.5, 0, 2.2, -2][i], z, {pick: 'tortilla', y: 1.1, spin: 2.8, w: 1.2, l: 1.4});
    tortillas.push(it);
  });
  [[S3 + 60, 2.2], [S3 + 200, -2.4], [S3 + 390, 1.8], [S3 + 550, -2]].forEach(([z, x]) => solid('barrel', center(z) + x, z, 0.5, 0.5, 1, 9, {tint: [1, 0.8, 0.6]}));
  solid('pothole', center(S3 + 260), S3 + 260, 1.05, 0.95, 0.1, 5);
  add('tumulo', center(S3 + 430), S3 + 430, {sx: 7, sz: 1});
  tumulos.push({D: S3 + 430, used: false});

  // ── Muelle y lancha final ──
  const PIER = LEN - 250;
  add('gate', 0, PIER - 8, {s: 0.72});
  signs.push({text: 'MUELLE', x: 0, y: 3.92, D: PIER - 8.2, w: 8, h: 0.96});
  for (let z = PIER + 5; z < LEN - 2; z += 9) {
    add('post', -4, z, {});
    add('post', 4, z, {});
    if (floor(z) % 2 === 0) add('lantern', -3.9, z, {decor: false});
  }
  [[PIER + 60, 1.7, 'crate'], [PIER + 118, -1.7, 'barrel'], [PIER + 172, 1.5, 'net']].forEach(([z, x, t]) => {
    if (t === 'crate') solid(t, x, z, 0.72, 0.65, 1.05, 9);
    else if (t === 'barrel') solid(t, x, z, 0.5, 0.5, 1, 9);
    else solid(t, x, z, 1.1, 0.8, 0.34, 6);
  });
  add('ramp', 0, LEN - 7, {sx: 2, sz: 1.3});
  ramps.push({x: 0, D: LEN - 7, w: 3.6, vy: 14.5, last: true});
  add('ferry', 0, LEN + 27, {});
  signs.push({text: 'Lanchas a La Avellana', x: 0, y: 4.2, D: LEN + 23, w: 7.4, h: 0.9});

  // ── Decorado ──
  const dec = (t, x, z, o = {}) => add(t, x, z, Object.assign({decor: true}, o));
  // Playa
  for (let z = -40; z < S1 - 120; z += r(9, 18)) {
    dec('palm', r(17, 34), z, {r: r(0, 6.28), s: r(0.85, 1.25)});
    if (R() < 0.5) dec('palm', r(38, 80), z + r(0, 8), {r: r(0, 6.28), s: r(0.9, 1.4)});
    if (R() < 0.18) dec('lancha', r(15.5, 24), z + 3, {r: r(1, 2.2), tint: [r(0.7, 1), r(0.7, 1), r(0.8, 1)]});
    if (R() < 0.26) dec('rock', r(17, 44), z, {s: r(0.7, 1.9)});
    if (R() < 0.2) dec('umbrella', r(15.5, 24), z + 5, {});
    if (R() < 0.2) dec('person', r(16, 22), z + 2, {r: r(-2, 2), s: 1});
  }
  [[120, 'Agua de coco Q5'], [640, 'Ceviches El Pelícano'], [1040, 'Hay tamales']].forEach(([z, text]) => {
    dec('post', 16.6, z, {sy: 2.6});
    signs.push({text, x: 16.6, y: 3, D: z, w: 5.6, h: 0.9, decor: true});
  });
  // Manglar
  for (let z = S1 + 8; z < S2 - 14; z += r(5, 8.5)) {
    const c = center(z);
    [-1, 1].forEach((s) => {
      if (R() < 0.82) {
        const off = r(7.5, 15);
        add('mangrove', c + s * off, z + r(-2, 2), {r: r(0, 6.28), s: r(0.85, 1.35)});
      }
      if (R() < 0.4) add('mangrove', c + s * r(22, 62), z, {r: r(0, 6.28), s: r(1.1, 1.8)});
      if (R() < 0.4) add('reed', c + s * r(4.2, 7), z, {r: r(0, 6.28), s: r(0.8, 1.3)});
    });
  }
  for (let z = S1 + 15; z < S2; z += 30) {
    const inGap = gaps.some((g) => z > g[0] - 3 && z < g[1] + 3);
    if (!inGap) add('lantern', center(z) - halfWidth(z, []) - 0.25, z, {});
  }
  // Pueblo
  const hc = [[1, 0.62, 0.55], [0.5, 0.85, 0.85], [1, 0.82, 0.45], [0.72, 0.58, 0.95], [0.6, 0.86, 0.55], [1, 0.58, 0.72], [0.55, 0.68, 1]];
  const sn = ['Tienda La Bendición', 'Comedor Doña Tere', 'Shucos El Gordo', 'Pinchazos 24 horas', 'Tortillería Lupita', 'Salón Yesenia'];
  let hk = 0;
  for (let z = S2 + 10; z < PIER - 20; z += 12.5) {
    const c = center(z), hw = 7.2;
    [-1, 1].forEach((s) => {
      const t = hk % 3 === 2 ? 'house2' : 'house';
      add(t, c + s * (hw + 5.4), z, {tint: hc[hk % hc.length], r: (-s * PI) / 2});
      if (hk % 4 === 0) signs.push({text: sn[(hk / 4) % sn.length | 0], x: c + s * (hw + 0.5), y: 3.5, D: z, w: 5.6, h: 0.9});
      if (hk % 7 === 3) add('palm', c + s * (hw + 15), z, {r: hk, s: 0.9});
      hk++;
    });
  }
  for (let z = S2 + 20; z < PIER - 12; z += 40) {
    const c = center(z);
    add('lamp', c - 7, z, {r: 0});
    add('lamp', c + 7, z + 20, {r: PI});
    add('string', c, z + 8, {s: 1});
  }
  add('gate', 0, S2 + 24, {s: 0.85});
  signs.push({text: 'BIENVENIDOS AL PUEBLO', x: 0, y: 4.62, D: S2 + 23.8, w: 9.4, h: 1.12});
  // Lanchas a los lados del muelle
  for (let z = PIER + 15; z < LEN + 40; z += 34) {
    add('lancha', z % 3 < 1.5 ? -9 : 9, z, {r: r(-0.2, 0.2), y: -0.15, tint: [r(0.7, 1), r(0.7, 1), 1]});
  }
  add('fence', -6.6, PIER - 12, {r: PI / 2});
  add('fence', 6.6, PIER - 12, {r: PI / 2});

  // Encargos: persona y su marca
  customers.forEach((c) => {
    if (c.x === null) c.x = center(c.D) + c.off;
    add('person', c.x + 0.9, c.D, {r: -1.3, tint: [0.75, 1, 1]});
  });
  items.sort((a, b) => a.D - b.D);

  // Pista como arreglo: [x central, medio ancho, tipo, orilla] cada 2 unidades
  const N = floor(DRAW / 2) + 1;
  const track = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const z = i * 2;
    track[i * 4] = center(z);
    track[i * 4 + 1] = halfWidth(z, gaps);
    track[i * 4 + 2] = kindAt(z);
    track[i * 4 + 3] = shoreBase(z);
  }
  const calls = (touch ? CALLS_TOUCH : CALLS_DESK).concat(CALLS_COMMON).map((c) => Object.assign({done: false}, c));
  const stageBounds = [0, S1, S2, S3, LEN];
  return {meta: META, items, movers, signs, surges, ramps, customers, gaps, tumulos, tortillas, track, len: DRAW, length: LEN, calls, cursor: 0, center, shoreBase, halfWidth: (z) => halfWidth(z, gaps), kindAt, stageBounds, S1, S2, S3, PIER};
}

// Paleta por distancia: de tarde dorada a noche en el muelle.
export const SKYKEYS = [
  {D: 0, skyTop: '#1f63c4', skyMid: '#f2824f', skyLow: '#ffa64f', sunDisc: '#fff0c4', sunCol: '#ffeccb', shade: '#6a5a9c', rim: '#ffd27a', fog: '#ffac69', cloudL: '#ffdcb8', cloudS: '#a0648e', hill: '#7f6496', hill2: '#34414e',
    sandA: '#241c2b', sandB: '#43364a', wet: '#594457', waterA: '#0c6a86', waterB: '#2fc0b2', foam: '#fff6e6', plank: '#b38450', street: '#6d6159', grass: '#3a5c3b', sunEl: 0.15, night: 0, shadow: 3.2, shadowA: 0.46},
  {D: 1450, skyTop: '#2b2a7a', skyMid: '#e8496a', skyLow: '#ff9440', sunDisc: '#ffcf7d', sunCol: '#ffc48e', shade: '#5b4890', rim: '#ff9d5a', fog: '#f0835c', cloudL: '#ffc99c', cloudS: '#74427f', hill: '#5c3f80', hill2: '#26263f',
    sandA: '#1a1422', sandB: '#33273a', wet: '#6a3f55', waterA: '#173f73', waterB: '#b5586a', foam: '#ffe7d0', plank: '#a7734a', street: '#5d4f50', grass: '#2c4638', sunEl: 0.05, night: 0.12, shadow: 4.5, shadowA: 0.5},
  {D: 2900, skyTop: '#10164a', skyMid: '#41307f', skyLow: '#c44c74', sunDisc: '#ff8f7a', sunCol: '#8f7cc8', shade: '#2f2c70', rim: '#c79aff', fog: '#5f3a78', cloudL: '#8a5f9e', cloudS: '#332a68', hill: '#2c2560', hill2: '#141a34',
    sandA: '#141024', sandB: '#27203a', wet: '#3d2e55', waterA: '#0b2a50', waterB: '#2d5f7a', foam: '#d9d3ee', plank: '#8d6a56', street: '#3e384c', grass: '#1d3a38', sunEl: -0.03, night: 0.7, shadow: 1.6, shadowA: 0.45},
  {D: 4400, skyTop: '#060a22', skyMid: '#141a48', skyLow: '#2d2664', sunDisc: '#ff8f7a', sunCol: '#5f72b4', shade: '#1b214e', rim: '#8fb4ff', fog: '#1a1948', cloudL: '#3a3c7a', cloudS: '#181a44', hill: '#16183e', hill2: '#0b0d24',
    sandA: '#0e0c1c', sandB: '#1c1a2e', wet: '#262444', waterA: '#071a38', waterB: '#16395a', foam: '#c3cbe8', plank: '#7a6058', street: '#363244', grass: '#132a2c', sunEl: -0.12, night: 1, shadow: 0.25, shadowA: 0.42},
  {D: 6000, skyTop: '#060a22', skyMid: '#141a48', skyLow: '#2d2664', sunDisc: '#ff8f7a', sunCol: '#5f72b4', shade: '#1b214e', rim: '#8fb4ff', fog: '#1a1948', cloudL: '#3a3c7a', cloudS: '#181a44', hill: '#16183e', hill2: '#0b0d24',
    sandA: '#0e0c1c', sandB: '#1c1a2e', wet: '#262444', waterA: '#071a38', waterB: '#16395a', foam: '#c3cbe8', plank: '#7a6058', street: '#363244', grass: '#132a2c', sunEl: -0.12, night: 1, shadow: 0.25, shadowA: 0.42},
];
