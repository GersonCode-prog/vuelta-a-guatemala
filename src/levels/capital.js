// Nivel 3: la Ciudad de Guatemala en la camioneta de Don Chus.
// Calzada Roosevelt de día, el Periférico al atardecer y la zona 1 de noche.
import {seeded, sin, abs, min, max, floor, sstep, lerp, PI} from '../core/util.js';

export const S1 = 2100, S2 = 4300, S3 = 6300, LEN = 7300;
const DRAW = LEN + 320;
// Puente El Incienso, en el Periférico.
const BRIDGE = [S1 + 980, S1 + 1240];
// Semáforos: distancia de la línea y plan. Solo en la Roosevelt y en la zona 1.
const LIGHTS = [
  [330, 'go'], [690, 'turn'], [1050, 'red'], [1430, 'turn'], [1790, 'go'],
  [S2 + 290, 'red'], [S2 + 640, 'turn'], [S2 + 980, 'go'], [S2 + 1320, 'turn'], [S2 + 1660, 'red'],
];

export const META = {
  id: 'capital', name: 'Ciudad de Guatemala', short: 'la capital', vehicle: 'bus', vehicleName: 'Camioneta', ground: 'city', stop: 3,
  next: 'Antigua', nextId: 'antigua', music: [8, 9, 10, 11], forceLabel: 'Motor', sprintWord: 'acelerar', callWord: 'pito', callChip: 'Pito',
  stages: [
    {name: 'Calzada Roosevelt', fact: 'Pasarse un semáforo en rojo cuesta Q200 de multa en la vida real. Aquí, además, te sigue la PMT.', speed: 25, clock: 100},
    {name: 'El Periférico', fact: 'Se empezó a planificar en 1952. El Puente El Incienso completó la conexión.', speed: 29, clock: 86},
    {name: 'La zona 1 de noche', fact: 'El Centro Histórico: el Palacio Nacional, la Catedral y sus calles angostas.', speed: 24, clock: 112},
  ],
  soft: {shout: '', check: 'Ninguna multa', keep: true},
  boss: {id: 'rival', name: 'El Rey', cut: '¡EL REY DEL CAMINO!', sub: 'Te quiere ganar el pasaje'},
  finish: {cut: '¡DON CHUS!', sub: 'Te esperaba con su shuco', arrive: 'Le devolviste la camioneta a Don Chus', deck: 0},
  shop: {title: 'Pinchazos Don Memo', go: 'Seguir manejando', items: [
    {id: 'cadena', name: 'Motor afinado', desc: 'La camioneta corre un 6% más.', price: 60},
    {id: 'frenos', name: 'Frenos de aire', desc: 'Frenás el doble y te recuperás más rápido de los golpes.', price: 45},
    {id: 'carton', name: 'Lazo nuevo en la parrilla', desc: 'El paquete recibe 30% menos daño.', price: 70},
  ]},
  share: 'Crucé la capital',
  note: 'Don Chus recuperó su camioneta, con un espejo menos. El paquete sigue para <b class="text-oro">Antigua</b>, en tuc-tuc.',
  title: {D0: 60, D1: 1900, pal: 300, speed: 15, x: (LV, D, t) => LV.center(D) + 3.6 + 0.5 * sin(t * 0.3)},
  palGain: [1.04, 1, 7000], leftHills: 1, burn: null, fenceOff: 0,
  ambient: () => 0.32, fallText: '¡Aaay!',
  // La Chusita está desalineada: de vez en cuando se va para la derecha, contra la banqueta.
  pull: {from: 440, dir: 1, s: 0.55, chip: 'La Chusita jala →', shout: '¡Jala para la derecha!', sfx: 'squeak'},
};

const callsCommon = [
  {D: 26, from: 'Don Chus', t: 'Patojo, agarrame el timón un ratito. Voy por un shuco y te espero en el centro.'},
  {D: 250, from: 'Don Beto', t: '¿Cómo que vas manejando la camioneta? Respetá los semáforos, que la PMT no perdona.'},
  {D: 380, from: 'Don Chus', t: 'Se me olvidaba: la Chusita jala para la derecha. Desde el 98 no le hago la alineación.'},
  {D: 980, from: 'La Licenciada', t: '¿Ya vas por la capital? Que no se me arrugue el paquete en el tráfico.'},
  {D: 1560, from: 'Mamá', t: 'Mijo, ¿ya comiste? En la capital venden shucos en cada esquina.'},
  {D: S1 + 80, from: 'Don Chus', t: 'En el Periférico no hay semáforos. Ojo con los cabezales y los hoyos.'},
  {D: BRIDGE[0] - 120, from: 'Don Beto', t: 'Ahí viene el Puente El Incienso. No te asomés para abajo, que da vértigo.'},
  {D: S1 + 1720, from: 'La Licenciada', t: 'Ya está oscureciendo. ¿Mi paquete trae luz? Es broma. ¿O no?'},
  {D: S2 + 80, from: 'Don Chus', t: 'Ya en la zona 1, despacio. Te espero frente al Palacio con tu shuco.'},
  {D: S2 + 1080, from: 'Mamá', t: 'No te quedés hasta tarde en el centro, mijo. Mañana madrugás.'},
];
export const CALLS_DESK = [...callsCommon, {D: 130, from: 'Don Chus', t: '↑ acelera, ↓ frena hasta parar. Espacio salta: sí, la camioneta salta. B es el pito.'}];
export const CALLS_TOUCH = [...callsCommon, {D: 130, from: 'Don Chus', t: 'Dale acelera y Freno la para del todo. Saltar... sí, la camioneta salta.'}];

const center = (D) => {
  const w1 = sstep(80, 260, D) * (1 - sstep(S1 - 160, S1 - 30, D));
  const w2 = sstep(S1 + 40, S1 + 220, D) * (1 - sstep(S2 - 160, S2 - 20, D));
  const w3 = sstep(S2 + 60, S2 + 220, D) * (1 - sstep(S3 - 140, S3 - 30, D));
  return w1 * 3.2 * sin(D * 0.0046) + w2 * (7 * sin((D - S1) * 0.0031) + 2.4 * sin((D - S1) * 0.0093)) + w3 * 1.6 * sin((D - S2) * 0.006);
};
function halfWidth(D) {
  if (D < S2) return 5.6;
  if (D < S3 - 40) return 3.9;
  return lerp(3.9, 5.6, sstep(S3 - 40, S3 + 10, D));
}
const inBridge = (D) => D > BRIDGE[0] && D < BRIDGE[1];
const kindAt = (D) => (D < S1 ? 0 : D < S2 ? (inBridge(D) ? 2 : 1) : 3);
// Canal del cruce: 0 calle, .5 paso de cebra, 1 la calle que atraviesa.
const xwAt = (D) => {
  for (const [L] of LIGHTS) {
    const u = D - L;
    if (u < -0.5 || u > 22.5) continue;
    return u < 3.5 || u > 18.5 ? 0.5 : 1;
  }
  return 0;
};
const nearLight = (D, a = 8, b = 26) => LIGHTS.some(([L]) => D > L - a && D < L + b);

export function buildLevel(touch) {
  const R = seeded(20261107);
  const r = (a, b) => a + R() * (b - a);
  const pick = (arr) => arr[floor(R() * arr.length)];
  const items = [], movers = [], signs = [], ramps = [], customers = [], gaps = [], tumulos = [], lights = [];
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
  const lane = (D, i) => center(D) + i * (D >= S2 && D < S3 - 20 ? 1.95 : 3.6);
  const laneCoins = (i, D0, n, gap) => coins((z) => lane(z, i), D0, n, gap);
  const shuco = (i, D) => add('shuco', lane(D, i), D, {pick: 'shuco', y: 1.3, spin: 2.2, w: 1, l: 1.1});
  const tapeAt = (i, D) => add('tape', lane(D, i), D, {pick: 'tape', y: 1.3, spin: 2.4, w: 1, l: 1.1});
  const CARS = [[0.95, 0.2, 0.2], [0.25, 0.42, 0.9], [0.86, 0.86, 0.88], [0.22, 0.22, 0.26], [1, 1, 1], [0.3, 0.7, 0.45], [1, 0.82, 0.25], [0.6, 0.3, 0.75]];
  const carT = () => pick(CARS);
  // Carro que va en tu misma dirección, más despacio. Frena en los rojos.
  // Sale un poco antes para que esté donde toca cuando el jugador llega a la velocidad de la etapa.
  const stageV = (D) => (D < S1 ? 25 : D < S2 ? 29 : 24);
  const traffic = (t, i, D, v, o = {}) => {
    const big = t === 'van' || t === 'suv', huge = t === 'cabezal', near = o.near || 70;
    D -= (v * near) / max(4, stageV(D) - v);
    return mover(t, lane(D, i), D, Object.assign({kind: 'traffic', vD: v, vD0: v, city: true, solid: true, w: huge ? 1.25 : big ? 1.0 : 0.95, l: huge ? 7 : big ? 2.5 : 2.15, h: huge ? 9 : t === 'van' ? 2.4 : t === 'suv' ? 1.75 : 1.45, dmg: huge ? 14 : 10, near: 70, tint: huge ? [1, 1, 1] : carT()}, o));
  };
  const parked = (t, x, D, o = {}) => solid(t, x, D, t === 'busred' ? 1.3 : 0.95, t === 'busred' ? 5 : 2.15, t === 'busred' ? 9 : 1.45, t === 'busred' ? 13 : 10, Object.assign({tint: carT()}, o));
  // Alcantarilla sin tapadera. (El R() de más deja igual el resto del sorteo del nivel.)
  const bache = (x, D) => {
    R();
    solid('alcantarilla', x, D, 1.05, 0.9, 0.28, 4, {bump: true, r: r(0, 6.28), s: 1.15});
  };

  // ── Etapa 1: la Calzada Roosevelt ──
  const avenida = [
    function cars2(D) {
      const a = floor(R() * 3) - 1, b = a === 1 ? -1 : a + 1;
      traffic(R() < 0.5 ? 'car' : 'suv', a, D, r(8, 11));
      traffic('car', b, D + 18, r(9, 12));
      laneCoins(-a - b === 0 ? 0 : -a - b, D - 4, 4, 6);
      return 44;
    },
    function busStop(D) {
      parked('busred', lane(D, 1), D, {tint: pick([[1, 1, 1], [0.55, 0.8, 1], [0.6, 1, 0.6]])});
      dec('parada', center(D) + 5.6 + 1.9, D - 8, {r: -PI / 2});
      dec('crowd', center(D) + 5.6 + 1.3, D - 2, {r: 0});
      traffic('car', 0, D + 30, r(9, 12));
      laneCoins(-1, D - 6, 5, 6);
      return 56;
    },
    function obras(D) {
      const i = floor(R() * 3) - 1;
      solid('barrera', lane(D, i), D, 1.4, 0.35, 1.2, 8);
      for (let k = 1; k < 7; k++) solid('cone', lane(D + k * 5.6, i) + (k % 2 ? 0.7 : -0.7), D + k * 5.6, 0.32, 0.32, 0.82, 4);
      signs.push({text: 'Hombres trabajando', x: center(D) + 5.6 + 1.6, y: 2.6, D: D - 30, w: 5.2, h: 0.9});
      dec('post', center(D) + 5.6 + 1.6, D - 30, {sy: 2.2});
      laneCoins(i === 0 ? 1 : 0, D + 4, 5, 6);
      return 50;
    },
    function hoyos(D) {
      // Tres, con espacio para saltar una por una.
      [[-1, 0], [1, 30], [0, 60]].forEach(([i, z]) => bache(lane(D + z, i) + r(-0.4, 0.4), D + z));
      laneCoins(0, D + 6, 3, 6);
      return 66;
    },
    function motos(D) {
      [[-1, 0, 1], [1, 14, -1]].forEach(([i, z, s]) => {
        const Dm = D + z - (11 * 60) / 14;
        mover('moto', lane(Dm, i), Dm, {kind: 'weave', vD: 11, near: 60, solid: true, w: 0.5, l: 1, h: 1.6, dmg: 8, amp: 1.0 * s, wv: 1.4, ph: z, x0: lane(D + z, i), tint: carT()});
      });
      laneCoins(0, D + 4, 5, 6);
      return 40;
    },
    function micro(D) {
      traffic('van', 0, D, r(7, 9));
      traffic('suv', -1, D + 12, r(9, 11));
      laneCoins(1, D - 2, 5, 6);
      return 46;
    },
    function slalom(D) {
      [-1, 1, 0, -1].forEach((i, k) => {
        for (let j = -1; j <= 1; j++) solid('cone', lane(D + k * 14, i) + j * 0.85, D + k * 14, 0.32, 0.32, 0.82, 4);
      });
      return 60;
    },
  ];
  let D = 170, k1 = 0;
  while (D < S1 - 90) {
    if (nearLight(D, 60, 34)) {
      D += 8;
      continue;
    }
    const d = D / S1;
    const pool = d < 0.2 ? [0, 3, 2, 4] : [0, 1, 2, 4, 5, 3, 6];
    D += avenida[pool[k1 % pool.length]](D) + lerp(42, 24, d);
    k1++;
  }
  shuco(1, 560);
  shuco(-1, 1640);
  tapeAt(0, 1240);
  customers.push({x: null, i: 1, D: 870, name: 'Doña Mari', ask: 'Patojo, pará en la marca dorada, que voy para el Trébol.', text: '¡Gracias, mijo!'});
  customers.push({x: null, i: 1, D: 1590, name: 'Don Polo', ask: 'Frená en la parada, que llevo los tamales para la oficina.', text: '¡Ahí está tu pasaje!'});

  // ── Etapa 2: el Periférico ──
  const periferico = [
    function cabezal(D) {
      traffic('cabezal', 1, D, 13, {near: 90});
      traffic('car', 0, D + 26, r(16, 18), {near: 90});
      laneCoins(-1, D, 6, 7);
      return 66;
    },
    function cierre(D) {
      solid('barrera', lane(D, -1), D, 1.4, 0.35, 1.2, 8);
      for (let k = 1; k < 11; k++) solid('cone', lane(D + k * 6, -1) + lerp(0.2, 1.3, k / 10), D + k * 6, 0.32, 0.32, 0.82, 4);
      add('triangulo', lane(D - 14, -1), D - 14, {});
      laneCoins(1, D + 10, 6, 7);
      return 72;
    },
    function averiado(D) {
      const i = floor(R() * 3) - 1;
      parked(R() < 0.5 ? 'car' : 'van', lane(D, i), D, {r: r(-0.15, 0.15)});
      add('triangulo', lane(D + 12, i), D + 12, {});
      solid('cone', lane(D - 6, i), D - 6, 0.32, 0.32, 0.82, 4);
      laneCoins(i === 1 ? 0 : 1, D - 8, 5, 6);
      return 44;
    },
    function hoyos(D) {
      [[0, 0], [-1, 34], [1, 68]].forEach(([i, z]) => bache(lane(D + z, i) + r(-0.4, 0.4), D + z));
      return 74;
    },
    function rampa(D) {
      const c = lane(D, 0);
      add('ramp', c, D, {s: 1});
      ramps.push({x: c, D, w: 1.7, vy: 12.5});
      parked('cabezal', lane(D + 18, 0), D + 18, {tint: [0.55, 0.8, 1]});
      for (let i = 0; i < 6; i++) {
        const t = 0.12 + i * 0.15;
        add('coin', c, D + 3 + 30 * t, {pick: 'coin', y: 1.2 + 12.5 * t * 0.86 - 9 * t * t, spin: 3, w: 1.1, l: 1.5});
      }
      return 72;
    },
    function trafico3(D) {
      traffic('car', -1, D, r(16, 19), {near: 90});
      traffic('suv', 1, D + 22, r(15, 17), {near: 90});
      traffic('car', 0, D + 48, r(16, 19), {near: 90});
      return 76;
    },
  ];
  let D2 = S1 + 120, k2 = 0;
  while (D2 < S2 - 100) {
    if (D2 > BRIDGE[0] - 50 && D2 < BRIDGE[1] + 10) {
      D2 = BRIDGE[1] + 12;
      continue;
    }
    const d = (D2 - S1) / (S2 - S1);
    const pool = d < 0.2 ? [0, 3, 2] : [0, 1, 4, 3, 5, 2];
    D2 += periferico[pool[k2 % pool.length]](D2) + lerp(54, 32, d);
    k2++;
  }
  // En el puente, solo tráfico.
  traffic('car', 1, BRIDGE[0] + 30, 17, {near: 90});
  traffic('van', -1, BRIDGE[0] + 120, 15, {near: 90});
  laneCoins(0, BRIDGE[0] + 20, 8, 9);
  shuco(0, S1 + 640);
  shuco(1, S1 + 1560);
  tapeAt(-1, S1 + 1840);
  customers.push({x: null, i: 1, D: S1 + 760, name: 'Doña Rosa', ask: 'Pará en el hombro, mijo, que voy al mercado con mi canasto.', text: '¡Dios te lo pague!'});

  // ── Etapa 3: la zona 1 de noche ──
  const centro = [
    function parqueado(D) {
      const s = R() < 0.5 ? 1 : -1;
      parked(R() < 0.6 ? 'car' : 'suv', lane(D, s), D);
      parked('car', lane(D + 26, -s), D + 26);
      coins((z) => lane(z, -s), D - 4, 4, 6);
      return 40;
    },
    function tumulo(D) {
      add('tumulo', center(D), D, {sx: 4.4, sz: 1});
      tumulos.push({D, used: false});
      signs.push({text: 'Cuidado: túmulo', x: center(D) + halfWidth(D) + 0.9, y: 2.4, D: D - 26, w: 4.6, h: 0.85});
      dec('post', center(D) + halfWidth(D) + 0.9, D - 26, {sy: 2});
      return 26;
    },
    function peatones(D) {
      for (let i = 0; i < 3; i++) mover('person', center(D) - 2.6 + i * 2.6, D + i * 6, {kind: 'crab', solid: true, w: 0.42, l: 0.42, h: 9, dmg: 6, amp: 2.2, wv: 1.1 + i * 0.25, ph: i * 2, r0: i % 2 ? 1.3 : -1.3, wobA: 0.3, wobF: 2.6, tint: [[1, 0.7, 0.7], [0.7, 1, 0.8], [0.75, 0.82, 1]][i]});
      return 30;
    },
    function moto(D) {
      mover('moto', lane(D, 1), D - 36, {kind: 'weave', vD: 9, near: 60, solid: true, w: 0.5, l: 1, h: 1.6, dmg: 8, amp: 1.1, wv: 1.3, ph: D, x0: lane(D, 1), tint: carT()});
      coins((z) => lane(z, -1), D + 2, 4, 6);
      return 36;
    },
    function taxi(D) {
      const s = R() < 0.5 ? 1 : -1;
      traffic('car', s, D, r(8, 10), {tint: [1, 0.85, 0.3]});
      coins((z) => lane(z, -s), D + 4, 5, 6);
      return 40;
    },
    function carreta(D) {
      const s = R() < 0.5 ? 1 : -1;
      solid('cart', lane(D, s), D, 1.45, 0.95, 9, 9);
      dec('crowd', center(D) + s * (halfWidth(D) + 1.2), D + 3, {r: 0});
      coins((z) => lane(z, -s), D - 2, 4, 6);
      return 34;
    },
  ];
  let D3 = S2 + 140, k3 = 0;
  while (D3 < S3 - 90) {
    if (nearLight(D3, 50, 30)) {
      D3 += 8;
      continue;
    }
    const d = (D3 - S2) / (S3 - S2);
    D3 += centro[[0, 1, 2, 4, 3, 5][k3 % 6]](D3) + lerp(30, 16, d);
    k3++;
  }
  shuco(-1, S2 + 520);
  shuco(1, S2 + 1440);
  tapeAt(-1, S2 + 1180);
  customers.push({x: null, i: 1, D: S2 + 840, name: 'Doña Lety', ask: 'Pará en la marca, que voy a la Catedral y ya es tarde.', text: '¡Gracias, mijo!'});
  customers.push({x: null, i: 1, D: S2 + 1500, name: 'El licenciado', ask: 'Frená en la parada, que se me hace tarde para el turno.', text: '¡Buena onda, vos!'});

  // ── Jefe: El Rey del Camino. Calle ancha de tres carriles, limpia. ──
  for (let z = S3 + 60; z < LEN - 170; z += 64) coins((q) => lane(q, floor(z / 64) % 3 - 1), z, 4, 6);
  shuco(0, S3 + 480);

  // ── Final: rampa de una obra y el Palacio ──
  solid('barrera', center(LEN - 60) - 4.2, LEN - 60, 1.4, 0.35, 1.2, 6);
  solid('barrera', center(LEN - 60) + 4.2, LEN - 60, 1.4, 0.35, 1.2, 6);
  signs.push({text: 'Hombres trabajando', x: center(LEN - 90) + 6.4, y: 2.6, D: LEN - 90, w: 5.2, h: 0.9});
  add('ramp', center(LEN - 7), LEN - 7, {sx: 2.3, sy: 1, sz: 1.2});
  ramps.push({x: center(LEN - 7), D: LEN - 7, w: 3.6, vy: 13.5, last: true});
  add('palacio', 0, LEN + 92, {decor: true});
  add('catedral', -44, LEN + 70, {r: 0.35, decor: true});
  add('chus', center(LEN + 34) - 3.4, LEN + 34, {decor: false});
  for (let z = LEN + 20; z < LEN + 80; z += 9) [-1, 1].forEach((s) => add('farol', center(z) + s * 7.2, z, {decor: true}));

  // ── Semáforos y cruces ──
  LIGHTS.forEach(([Dl, plan]) => {
    const c = center(Dl), hw = halfWidth(Dl), px = c + hw + 1.4;
    dec('semaforo', px, Dl - 1.6, {r: 0});
    const big = dec('bulb', px - 5.0, Dl - 1.95, {y: 5.93, tint: [0.3, 1, 0.5]});
    const small = dec('bulb', px, Dl - 1.98, {y: 3.3, s: 0.5, tint: [0.3, 1, 0.5]});
    const cross = [1, -1].map((dir, k) => mover('car', c - dir * (k ? 30 : 16), Dl + (dir > 0 ? 8.5 : 14), {kind: 'cross', dir, v: 12, solid: true, w: 2.2, l: 0.95, h: 1.45, dmg: 10, near: 280, tint: carT(), r: dir > 0 ? -PI / 2 : PI / 2}));
    lights.push({D: Dl, plan, phase: 'g', t: 0, bulbs: [big, small], cross});
    // Carros esperando en la calle que cruza (decorado)
    [-1, 1].forEach((s) => dec('car', c + s * (hw + 10), Dl + (s > 0 ? 14 : 8.5), {r: s > 0 ? PI / 2 : -PI / 2, tint: carT()}));
  });
  const copItems = [
    mover('copmoto', 0, 0, {kind: 'deco', gone: true}),
    mover('bulb', 0, 0, {kind: 'deco', gone: true, y: 1.42, s: 0.45}),
    mover('bulb', 0, 0, {kind: 'deco', gone: true, y: 1.42, s: 0.45}),
  ];

  // ── Decorado ──
  const PAST = [[1, 0.82, 0.72], [0.78, 0.9, 1], [1, 0.95, 0.7], [0.82, 1, 0.82], [1, 0.8, 0.9], [0.9, 0.84, 1], [1, 1, 1]];
  const SHOPS = ['Shucos El Volcán', 'Farmacia La Bendición', 'Pollo Frito Doña Tina', 'Ferretería El Clavo', 'Licuados Mary', 'Taller El Pistón', 'Pinchazos Don Memo', 'Panadería La Espiga', 'Salón Yesenia', 'Tortillería Lupita', 'Hay tamales'];
  const NIGHT = ['Hotel Colonial', 'Café La Sexta', 'Shucos', 'Farmacia La Bendición', 'Licuados Mary', 'Panadería La Espiga', 'Pollo Frito Doña Tina'];
  let shopK = 0, bk = 0;
  // Roosevelt: edificios a la derecha, camellón con jacarandas y la vía de regreso a la izquierda.
  for (let z = -30; z < S1 + 30; ) {
    const c = center(z), hw = 5.6;
    const t = bk % 7 === 3 ? 'bldB' : bk % 3 === 1 ? 'bldC' : 'bldA', half = t === 'bldB' ? 6 : t === 'bldC' ? 4.2 : 5, depth = t === 'bldB' ? 6 : t === 'bldC' ? 4.6 : 4.8;
    if (nearLight(z, 6, 24) || nearLight(z + half * 2, 6, 24)) {
      z += 4;
      continue;
    }
    bk++;
    dec(t, c + hw + 3.2 + depth, z + half, {r: -PI / 2, tint: PAST[bk % PAST.length]});
    if (bk % 2 === 0) {
      const tt = (bk / 2) % 4 === 1 ? 'bldB' : 'bldA', dd = tt === 'bldB' ? 6 : 4.8;
      dec(tt, c - hw - 3.3 - 11.1 - 3.2 - dd, z + half, {r: PI / 2, tint: PAST[(bk + 3) % PAST.length]});
    }
    if (t !== 'bldB' && bk % 2) {
      signs.push({text: SHOPS[shopK++ % SHOPS.length], x: c + hw + 3.6, y: 3.7, D: z + half, w: 5.2, h: 0.88, decor: true});
    }
    z += half * 2 + r(0.6, 2.2);
  }
  for (let z = -20; z < S1 + 20; z += 22) {
    if (nearLight(z, 4, 22)) continue;
    const c = center(z);
    dec(floor(z / 22) % 3 === 2 ? 'palm' : 'jacaranda', c - 5.6 - 1.75, z, {r: r(0, 6.28), s: r(0.9, 1.15)});
  }
  for (let z = 10; z < S1; z += 36) {
    if (nearLight(z, 6, 24)) continue;
    const c = center(z);
    dec('lampc', c + 5.6 + 0.9, z, {r: 0});
    dec('lampc', c - 5.6 - 1.75, z + 18, {r: PI});
  }
  [520, 1240, 1660].forEach((z) => dec('pasarela', center(z), z, {over: true}));
  [[120, 'CALZADA ROOSEVELT'], [S1 - 300, 'El Trébol']].forEach(([z, text]) => {
    dec('gantry', center(z), z, {over: true});
    signs.push({text, x: center(z) + 0.9, y: 6.95, D: z - 0.2, w: text.length > 10 ? 7.4 : 5, h: 1.15, decor: true});
  });
  // Periférico: muro en medio, taludes con casitas, pasos a desnivel y el puente.
  for (let z = S1 - 10; z < S2 + 10; z += 4) {
    const c = center(z), hw = 5.6;
    if (inBridge(z)) {
      [-1, 1].forEach((s) => dec('railing', c + s * (hw + 0.45), z, {}));
      continue;
    }
    dec('jersey', c - hw - 0.55, z, {});
  }
  for (let z = S1 + 20; z < S2 + 40; z += r(46, 80)) {
    const c = center(z);
    [-1, 1].forEach((s) => {
      if (R() < 0.85) dec('colonia', c + s * r(46, 90), z, {r: s > 0 ? PI : 0, s: r(0.9, 1.4), far: true});
      if (R() < 0.6 && !inBridge(z)) dec('conacaste', c + s * r(16, 30), z + r(-8, 8), {r: r(0, 6.28), s: r(0.8, 1.2)});
      if (R() < 0.4 && !inBridge(z)) dec('jacaranda', c + s * r(14, 26), z + r(-8, 8), {r: r(0, 6.28), s: r(0.9, 1.2)});
    });
  }
  [S1 + 420, S1 + 1620].forEach((z) => dec('overpass', center(z), z, {over: true}));
  [[S1 + 30, 'ANILLO PERIFÉRICO'], [BRIDGE[0] - 70, 'PUENTE EL INCIENSO'], [S2 - 170, 'ZONA 1 · CENTRO']].forEach(([z, text]) => {
    dec('gantry', center(z), z, {over: true});
    signs.push({text, x: center(z) + 0.9, y: 6.95, D: z - 0.2, w: 7.4, h: 1.15, decor: true});
  });
  [[S1 + 280, 'Respete el semáforo'], [S1 + 860, 'Pollo Frito Doña Tina'], [S1 + 1460, 'Licuados Mary'], [S1 + 1900, 'Respete el semáforo']].forEach(([z, text]) => {
    dec('valla', center(z) + 5.6 + 9, z, {r: -0.35});
    signs.push({text, x: center(z) + 5.6 + 9, y: 7.6, D: z - 0.3, w: 7.4, h: 1.1, decor: true});
  });
  // Copas de árboles que asoman desde el fondo del barranco
  for (let z = BRIDGE[0] - 10; z < BRIDGE[1] + 10; z += r(7, 12)) {
    const c = center(z);
    [-1, 1].forEach((s) => {
      if (R() < 0.8) dec(R() < 0.6 ? 'conacaste' : 'jacaranda', c + s * r(9, 46), z, {y: -r(2.6, 3.6), r: r(0, 6.28), s: r(0.9, 1.4)});
    });
  }
  for (let z = BRIDGE[0] + 10; z < BRIDGE[1]; z += 40) [-1, 1].forEach((s) => dec('lampc', center(z) + s * (5.6 + 0.7), z + (s > 0 ? 0 : 20), {r: s > 0 ? 0 : PI}));
  dec('torre', center(S2 - 420) + 74, S2 - 420, {s: 1.15, far: true});
  // Zona 1: fachadas coloniales pegadas a la banqueta, faroles y ventas de shucos.
  let ck = 0;
  for (let z = S2 - 20; z < LEN + 60; ) {
    if (nearLight(z, 6, 24) || nearLight(z + 9.2, 6, 24)) {
      z += 4;
      continue;
    }
    const c = center(z), hw = halfWidth(z);
    [-1, 1].forEach((s) => {
      ck++;
      dec(ck % 3 === 0 ? 'colB' : 'colA', c + s * (hw + 2.4 + 4.4), z + 4.6, {r: (-s * PI) / 2, tint: PAST[ck % PAST.length]});
    });
    if (ck % 4 === 0) signs.push({text: NIGHT[(ck / 4) % NIGHT.length], x: c + (ck % 8 ? 1 : -1) * (hw + 2.6), y: 3.6, D: z + 4.6, w: 5, h: 0.85, decor: true});
    z += 9.4;
  }
  for (let z = S2; z < LEN; z += 18) {
    if (nearLight(z, 4, 22)) continue;
    const c = center(z), hw = halfWidth(z);
    [-1, 1].forEach((s) => dec('farol', c + s * (hw + 0.7), z + (s > 0 ? 0 : 9), {}));
  }
  for (let z = S2 + 60; z < LEN - 200; z += r(70, 120)) {
    const c = center(z), s = R() < 0.5 ? 1 : -1;
    dec('cart', c + s * (halfWidth(z) + 1.3), z, {r: PI / 2});
    dec('crowd', c + s * (halfWidth(z) + 1.0), z + 4, {r: 0});
  }

  // Encargos: pasajeros en la parada
  customers.forEach((cu) => {
    cu.x = lane(cu.D, cu.i);
    const hw = halfWidth(cu.D), c = center(cu.D);
    dec('parada', c + hw + 1.9, cu.D + 3, {r: -PI / 2});
    add('person', c + hw + 1.1, cu.D, {r: -1.3, tint: [0.75, 1, 1]});
  });
  items.sort((a, b) => a.D - b.D);

  // Pista: [x central, medio ancho, tipo, cruce] cada 2 unidades
  const N = floor(DRAW / 2) + 1;
  const track = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const z = i * 2;
    track[i * 4] = center(z);
    track[i * 4 + 1] = halfWidth(z);
    track[i * 4 + 2] = kindAt(z);
    track[i * 4 + 3] = xwAt(z);
  }
  const calls = (touch ? CALLS_TOUCH : CALLS_DESK).slice().sort((a, b) => a.D - b.D).map((c) => Object.assign({done: false}, c));
  return {meta: META, items, movers, signs, surges: [], ramps, customers, gaps, tumulos, track, len: DRAW, length: LEN, calls, cursor: 0, center, halfWidth, kindAt, stageBounds: [0, S1, S2, S3, LEN], S1, S2, S3, wheels: [], burn: null, lights, copItems};
}

// Paleta: mediodía en la Roosevelt, atardecer en el Periférico y noche en la zona 1.
const NIGHT_KEY = {skyTop: '#060a22', skyMid: '#161c4c', skyLow: '#3a2c62', sunDisc: '#ff8f7a', sunCol: '#7c88c6', shade: '#272b5a', rim: '#8fb4ff', fog: '#1e1c4a', cloudL: '#3c3e7c', cloudS: '#181a44', hill: '#16183e', hill2: '#0b0d24',
  sandA: '#6c6676', sandB: '#8c8696', wet: '#d6aa2a', waterA: '#1a1c2c', waterB: '#262a3e', foam: '#d8d6e4', plank: '#5a5460', street: '#3c3c4e', grass: '#2e4a3a', sunEl: -0.1, night: 1, shadow: 1.6, shadowA: 0.36};
export const SKYKEYS = [
  {D: 0, skyTop: '#2a6ccc', skyMid: '#8cc2ea', skyLow: '#e6edf0', sunDisc: '#fffbe6', sunCol: '#fff4de', shade: '#8a8eac', rim: '#fff0c8', fog: '#cddbe4', cloudL: '#ffffff', cloudS: '#a9bcd8', hill: '#6f86a6', hill2: '#55687a',
    sandA: '#c4bcb0', sandB: '#ddd6ca', wet: '#f2c230', waterA: '#2e4a36', waterB: '#4a6a48', foam: '#f4f2ee', plank: '#9a8f84', street: '#5c5c66', grass: '#5a9a4a', sunEl: 0.62, night: 0, shadow: 1.1, shadowA: 0.42},
  {D: S1 - 200, skyTop: '#2a64c0', skyMid: '#9cc0e0', skyLow: '#f2e8d8', sunCol: '#fff0d4', shade: '#8a88a8', fog: '#dcd8d0', sunEl: 0.42, shadow: 1.6},
  {D: S1 + 300, skyTop: '#2c5cb0', skyMid: '#e9b48c', skyLow: '#ffd08e', sunDisc: '#fff0c4', sunCol: '#ffdcae', shade: '#86749c', rim: '#ffd27a', fog: '#f2c69c', cloudL: '#fff0dc', cloudS: '#b892b4', hill: '#8a7aa0', hill2: '#5a5a6e', street: '#62606a', grass: '#5a8e48', sunEl: 0.2, shadow: 2.6, shadowA: 0.44},
  {D: S2 - 260, skyTop: '#24286e', skyMid: '#e0567a', skyLow: '#ff9e4a', sunDisc: '#ffcf7d', sunCol: '#ffb78a', shade: '#5e4a8c', rim: '#ff9d5a', fog: '#e8836a', cloudL: '#ffc29c', cloudS: '#74427f', hill: '#5c3f80', hill2: '#2c2a4a', street: '#5a5260', grass: '#4a6e44', waterA: '#2a2a3a', waterB: '#3e3e52', sunEl: 0.05, shadow: 3.4, shadowA: 0.46},
  Object.assign({D: S2 + 40}, NIGHT_KEY),
  Object.assign({D: LEN + 400}, NIGHT_KEY),
];
