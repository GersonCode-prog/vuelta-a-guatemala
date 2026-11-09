// Nivel 4: Antigua Guatemala en el tuc-tuc de Don Lalo.
// La bajada con neblina entre pinos, las calles empedradas y la procesión con alfombras de aserrín.
import {seeded, sin, abs, min, max, floor, sstep, lerp, PI} from '../core/util.js';

export const S1 = 2000, S2 = 4100, S3 = 6200, LEN = 7000;
const DRAW = LEN + 320;
// El arco va en la calle del jefe, con el volcán detrás.
const ARCO = S3 + 420, MERCED = S3 + 620;
// Esquinas: cada cuadra, la calle que cruza.
const CROSS = [];
for (let z = S1 + 120; z < LEN - 140; z += 118) if (abs(z - ARCO) > 40 && abs(z - MERCED) > 40) CROSS.push(z);
const nearCross = (D, a = 6, b = 16) => CROSS.some((c) => D > c - a && D < c + b);

export const META = {
  id: 'antigua', name: 'Antigua Guatemala', short: 'Antigua', vehicle: 'tuk', vehicleName: 'Tuc-tuc', ground: 'city', look: 'colonial', stop: 4,
  next: 'Atitlán', nextId: 'atitlan', music: [12, 13, 14, 15], forceLabel: 'Motor', sprintWord: 'acelerar', callWord: 'pito', callChip: 'Pito',
  stages: [
    {name: 'La bajada a Antigua', fact: 'Antigua fue la capital del Reino de Guatemala hasta los terremotos de Santa Marta, en 1773.', speed: 25, clock: 96},
    {name: 'Las calles empedradas', fact: 'El Arco de Santa Catalina se hizo en el siglo XVII para que las monjas cruzaran la calle sin que las vieran.', speed: 22, clock: 104},
    {name: 'La procesión', fact: 'Las alfombras de aserrín se hacen de madrugada. Pisarlas antes de que pase la procesión es un pecado chapín.', speed: 21, clock: 106},
  ],
  soft: {shout: '¡La alfombra!', check: 'Ninguna alfombra pisada', ruin: true},
  boss: {id: 'choco', name: 'Doña Choco', cut: '¡DOÑA CHOCO!', sub: 'Dice que le debés unos chocobananos'},
  finish: {cut: '¡DON LALO!', sub: 'Te esperaba con un chocobanano', arrive: 'Le devolviste el tuc-tuc a Don Lalo', deck: 0},
  shop: {title: 'Taller La Merced', go: 'Seguir en tuc-tuc', items: [
    {id: 'cadena', name: 'Motor afinado', desc: 'El tuc-tuc corre un 6% más.', price: 60},
    {id: 'frenos', name: 'Frenos nuevos', desc: 'Frenás el doble y te recuperás más rápido de los golpes.', price: 45},
    {id: 'carton', name: 'Canasta amarrada', desc: 'El paquete recibe 30% menos daño.', price: 70},
  ]},
  share: 'Crucé Antigua en tuc-tuc',
  note: 'Don Lalo recuperó su tuc-tuc, con aserrín hasta en el asiento. El paquete sigue para <b class="text-oro">Atitlán</b>, en lancha.',
  title: {D0: ARCO - 150, D1: ARCO + 260, pal: S3 + 160, speed: 14, x: (LV, D, t) => LV.center(D) + 1.3 * sin(t * 0.3)},
  palGain: [1.02, 1, 7000], leftHills: 1, burn: null, fenceOff: 0, agua: [0.02, 0.21, 0.52],
  ambient: () => 0, fallText: '¡Aaay!',
  // Las lajas lisas del centro corren más que el empedrado.
  surface(dx, tr, D) {
    if (D < S1 || tr.kind > 1.5) return null;
    return abs(dx) < 0.95 ? {mul: 1.08, chip: 'Lajas lisas', fast: true} : {mul: 0.95, chip: 'Empedrado', rough: 1};
  },
  // Neblina en la bajada: se cierra entre los 500 y los 1300 m.
  fogAt(D) {
    const k = sstep(420, 600, D) * (1 - sstep(1250, 1450, D));
    return [lerp(90, 14, k), lerp(330, 120, k)];
  },
};

const callsCommon = [
  {D: 24, from: 'Don Lalo', t: 'Vos sos el del paquete, ¿verdad? Llevate a La Bendecida, pero me la cuidás. Te espero en el Parque Central.'},
  {D: 280, from: 'Don Beto', t: 'Bajando a Antigua hay neblina en la mañana. Despacio en las curvas, patojo.'},
  {D: 660, from: 'Don Lalo', t: 'Si ves piedras en la carretera es derrumbe. Pasate al otro carril.'},
  {D: 1250, from: 'La Licenciada', t: '¿Antigua? Qué bonito. Igual lo quiero para hoy, eh.'},
  {D: 1760, from: 'Mamá', t: 'Mijo, en Antigua comete un chocobanano. Pero no manchés el paquete.'},
  {D: S1 + 60, from: 'Don Lalo', t: 'Ya en el empedrado: las lajas del centro son lisas. Por ahí corrés más.'},
  {D: S1 + 900, from: 'Don Beto', t: 'Los turistas se paran en media calle a tomar fotos. Paciencia, o pitá.'},
  {D: S2 + 60, from: 'Don Lalo', t: 'Hay procesión. No pisés las alfombras: la gente se tarda toda la noche en hacerlas.'},
  {D: S2 + 900, from: 'Mamá', t: 'Si pasa la procesión, esperá con respeto, mijo.'},
  {D: S2 + 1500, from: 'La Licenciada', t: '¿Me vas a entregar el paquete oliendo a incienso? Bueno, mientras llegue.'},
];
export const CALLS_DESK = [...callsCommon, {D: 130, from: 'Don Lalo', t: '↑ acelera, ↓ frena hasta parar. Espacio salta: el tuc-tuc es liviano. B es el pito.'}];
export const CALLS_TOUCH = [...callsCommon, {D: 130, from: 'Don Lalo', t: 'Dale acelera y Freno lo para del todo. Saltar... el tuc-tuc es liviano, brinca.'}];

const center = (D) => {
  const w1 = sstep(60, 260, D) * (1 - sstep(S1 - 260, S1 - 60, D));
  return w1 * (8.5 * sin(D * 0.0045) + 3.2 * sin(D * 0.0117 + 1.3));
};
function halfWidth(D) {
  if (D < S1 - 30) return 4.4;
  if (D < S1 + 10) return lerp(4.4, 3.9, sstep(S1 - 30, S1 + 10, D));
  if (D < S3 - 40) return 3.9;
  if (D < S3 + 10) return lerp(3.9, 4.6, sstep(S3 - 40, S3 + 10, D));
  return 4.6;
}
const kindAt = (D) => (D < S1 ? 0 : D < LEN - 40 ? 1 : 2);
const xwAt = (D) => (CROSS.some((c) => D > c - 0.5 && D < c + 10.5) ? 1 : 0);
const laneW = (D) => (D < S1 ? 2.1 : D < S3 ? 1.95 : 2.6);

export function buildLevel(touch) {
  const R = seeded(20261108);
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
  const laneCoins = (i, D0, n, gap) => coins((z) => lane(z, i), D0, n, gap);
  const choco = (i, D) => add('chocoban', lane(D, i), D, {pick: 'choco', y: 1.2, spin: 2.2, w: 1, l: 1.1});
  const tapeAt = (i, D) => add('tape', lane(D, i), D, {pick: 'tape', y: 1.3, spin: 2.4, w: 1, l: 1.1});
  const CARS = [[0.95, 0.2, 0.2], [0.25, 0.42, 0.9], [0.86, 0.86, 0.88], [0.22, 0.22, 0.26], [1, 1, 1], [0.3, 0.7, 0.45], [1, 0.82, 0.25]];
  const SHIRTS = [[1, 0.5, 0.5], [0.55, 0.8, 1], [1, 0.9, 0.5], [0.7, 1, 0.7], [1, 0.7, 0.9], [1, 1, 1]];
  const stageV = (D) => (D < S1 ? 25 : D < S2 ? 22 : 21);
  // Algo que va en tu misma dirección, más despacio; sale antes para estar donde toca.
  const traffic = (t, i, D, v, o = {}) => {
    const big = t === 'van' || t === 'pickup', huge = t === 'cabezal' || t === 'busred', near = o.near || 70;
    D -= (v * near) / max(4, stageV(D) - v);
    const x = o.x !== undefined ? o.x : lane(D, i);
    return mover(t, x, D, Object.assign({kind: 'traffic', vD: v, solid: true, w: huge ? 1.25 : big ? 1.0 : 0.95, l: huge ? 6 : big ? 2.5 : 2.15, h: huge ? 9 : 2.4, dmg: huge ? 12 : 9, near, tint: huge ? [1, 1, 1] : pick(CARS)}, o));
  };
  const parked = (t, x, D, o = {}) => solid(t, x, D, 0.95, t === 'pickup' ? 2.5 : 2.15, 1.45, 9, Object.assign({tint: pick(CARS)}, o));
  const sign = (text, s, D, w = 4.6, y = 2.5) => {
    const x = center(D) + s * (halfWidth(D) + 1.5);
    signs.push({text, x, y, D, w, h: 0.85});
    dec('post', x, D, {sy: y / 1.25});
  };

  // ── Etapa 1: la bajada entre pinos, con neblina ──
  const bajada = [
    function camion(D) {
      const i = R() < 0.5 ? -1 : 1;
      traffic(R() < 0.5 ? 'cabezal' : 'van', i, D, r(10, 12), {near: 90});
      laneCoins(-i, D, 5, 7);
      return 62;
    },
    function derrumbe(D) {
      const i = R() < 0.5 ? -1 : 1;
      for (let k = 0; k < 3; k++) solid('rock', lane(D + k * 2.4, i) + r(-0.45, 0.45), D + k * 2.4, 0.95, 0.85, 1.1, 8, {s: r(0.85, 1.2), r: r(0, 6.28)});
      solid('cone', lane(D - 10, i) - 0.5 * i, D - 10, 0.32, 0.32, 0.82, 4);
      solid('cone', lane(D - 17, i) - 0.2 * i, D - 17, 0.32, 0.32, 0.82, 4);
      sign('Derrumbe', i, D - 46, 3.6);
      laneCoins(-i, D - 6, 4, 6);
      return 48;
    },
    function picop(D) {
      const i = R() < 0.5 ? -1 : 1;
      parked('pickup', lane(D, i), D, {r: r(-0.08, 0.08), tint: [1, 1, 1]});
      add('triangulo', lane(D + 13, i), D + 13, {});
      laneCoins(-i, D - 4, 4, 6);
      return 42;
    },
    function piedras(D) {
      [-1, 1, -1].forEach((i, k) => solid('rock', lane(D + k * 26, i) + r(-0.3, 0.3), D + k * 26, 0.9, 0.8, 1.0, 6, {s: 0.9, r: r(0, 6.28)}));
      laneCoins(1, D + 4, 3, 6);
      return 72;
    },
    function motos(D) {
      [[-1, 0, 1], [1, 16, -1]].forEach(([i, z, s]) => {
        const Dm = D + z - (12 * 60) / 12;
        mover('moto', lane(Dm, i), Dm, {kind: 'weave', vD: 12, near: 60, solid: true, w: 0.5, l: 1, h: 1.6, dmg: 8, amp: 0.8 * s, wv: 1.3, ph: z, x0: lane(D + z, i), tint: pick(CARS)});
      });
      laneCoins(0, D + 4, 4, 6);
      return 44;
    },
    function camioneta(D) {
      const i = R() < 0.5 ? -1 : 1;
      traffic('busred', i, D, r(13, 15), {near: 90, l: 5, w: 1.3});
      laneCoins(-i, D + 6, 5, 7);
      return 66;
    },
  ];
  let D = 190, k1 = 0;
  while (D < S1 - 140) {
    const d = D / S1;
    const pool = d < 0.15 ? [0, 3, 2] : [0, 1, 4, 2, 5, 3, 1];
    D += bajada[pool[k1 % pool.length]](D) + lerp(46, 26, d);
    k1++;
  }
  // Túmulo a la entrada del pueblo
  add('tumulo', center(S1 - 70), S1 - 70, {sx: 4.4, sz: 1});
  tumulos.push({D: S1 - 70, used: false});
  sign('Cuidado: túmulo', 1, S1 - 100, 4.6);
  choco(1, 820);
  choco(-1, 1620);
  tapeAt(0, 1180);

  // ── Etapa 2: calles empedradas ──
  const calles = [
    function turistas(D) {
      const i = R() < 0.5 ? -1 : 1;
      [0, 1].forEach((k) => mover('turista', lane(D + k * 1.4, i) + (k ? 0.45 : -0.35), D + k * 1.4, {kind: 'crab', solid: true, w: 0.42, l: 0.42, h: 9, dmg: 6, amp: 0.35, wv: 0.7, ph: k * 2, r0: i > 0 ? -PI / 2 : PI / 2, wobA: 0.25, wobF: 1.2, tint: pick(SHIRTS), nearShout: '¡Perdón!'}));
      laneCoins(-i, D - 4, 4, 6);
      return 34;
    },
    function carreton(D) {
      const s = R() < 0.5 ? 1 : -1;
      solid('carchoco', lane(D, s) + s * 0.35, D, 1.0, 1.0, 9, 8, {r: s > 0 ? -PI / 2 : PI / 2});
      dec('ventera', center(D) + s * (halfWidth(D) + 0.9), D + 1.6, {r: s > 0 ? -PI / 2 : PI / 2});
      laneCoins(-s, D - 6, 4, 6);
      return 32;
    },
    function tuk(D) {
      const i = R() < 0.5 ? -1 : 1;
      traffic('tuktuk', i, D, r(8, 10), {w: 0.85, l: 1.45, h: 9, dmg: 9, tint: pick([[1, 1, 1], [0.3, 0.75, 1], [0.4, 1, 0.5], [1, 0.85, 0.3]])});
      laneCoins(-i, D + 2, 5, 6);
      return 38;
    },
    function parqueados(D) {
      const s = R() < 0.5 ? 1 : -1;
      parked('car', lane(D, s) + s * 0.25, D);
      parked('car', lane(D + 30, -s) - s * 0.25, D + 30);
      coins((z) => lane(z, -s), D - 4, 4, 6);
      return 44;
    },
    function ventera(D) {
      mover('ventera', center(D), D, {kind: 'crab', solid: true, w: 0.42, l: 0.42, h: 9, dmg: 6, amp: 2.2, wv: 0.55, ph: R() * 6, r0: PI / 2, wobA: 0.12, wobF: 2.4, nearShout: '¡Con permiso!'});
      laneCoins(R() < 0.5 ? -1 : 1, D + 8, 4, 6);
      return 30;
    },
    function tumulo(D) {
      add('tumulo', center(D), D, {sx: 4.0, sz: 1});
      tumulos.push({D, used: false});
      sign('Cuidado: túmulo', 1, D - 28, 4.6);
      return 28;
    },
  ];
  let D2 = S1 + 150, k2 = 0;
  while (D2 < S2 - 90) {
    if (nearCross(D2, 8, 16)) {
      D2 += 6;
      continue;
    }
    const d = (D2 - S1) / (S2 - S1);
    const pool = d < 0.15 ? [0, 2, 3] : [0, 2, 1, 3, 4, 2, 0, 5];
    D2 += calles[pool[k2 % pool.length]](D2) + lerp(34, 18, d);
    k2++;
  }
  choco(-1, S1 + 420);
  choco(1, S1 + 1300);
  tapeAt(1, S1 + 980);
  customers.push({x: null, i: 1, D: S1 + 560, name: 'Jessica', ask: '¡Hola! ¿Me llevás al Arco? Pará en la marca dorada, please.', text: '¡Thank you, mijo!'});
  customers.push({x: null, i: 1, D: S1 + 1420, name: 'Doña Toya', ask: 'Pará en la marca, que voy al mercado con mis güisquiles.', text: '¡Dios te lo pague!'});

  // ── Etapa 3: la procesión y las alfombras ──
  const ALF = ['alfA', 'alfB', 'alfC'];
  const alfombra = (x, D, w, l) => solid(pick(ALF), x, D, w, l, 0.1, 0, {soft: true, sx: w, sz: l, r: 0});
  const proce = [
    function alfCentro(D) {
      alfombra(center(D), D, 1.75, 3.6);
      [-1, 1].forEach((s) => coins((z) => center(z) + s * 2.85, D - 4, 3, 4));
      return 40;
    },
    function alfLado(D) {
      const s = R() < 0.5 ? 1 : -1;
      alfombra(center(D) + s * 1.55, D, 1.3, 3.2);
      laneCoins(-s, D - 5, 4, 5);
      return 36;
    },
    function alfSlalom(D) {
      const s = R() < 0.5 ? 1 : -1;
      alfombra(center(D) + s * 1.55, D, 1.3, 3.0);
      alfombra(center(D + 24) - s * 1.55, D + 24, 1.3, 3.0);
      return 54;
    },
    function procesion(D) {
      const v = 2.6, near = 200;
      const pr = (t, z, o) => traffic(t, 0, D + z, v, Object.assign({x: center(D + z), near, nearShout: '¡Con permiso!', tint: [1, 1, 1]}, o));
      pr('cucus', 0, {w: 1.1, l: 2.2, h: 9, dmg: 6, smoke: true});
      pr('anda', 9, {w: 1.6, l: 2.8, h: 9, dmg: 8});
      pr('cucus', 18, {w: 1.1, l: 2.2, h: 9, dmg: 6});
      pr('banda', 26, {w: 1.25, l: 2.0, h: 9, dmg: 6});
      return 50;
    },
    function turistas(D) {
      return calles[0](D);
    },
  ];
  let D3 = S2 + 140, k3 = 0;
  while (D3 < S3 - 90) {
    if (nearCross(D3, 8, 16)) {
      D3 += 6;
      continue;
    }
    const d = (D3 - S2) / (S3 - S2);
    const pool = d < 0.15 ? [1, 0, 3] : [0, 3, 1, 2, 4, 3, 0, 2];
    D3 += proce[pool[k3 % pool.length]](D3) + lerp(30, 16, d);
    k3++;
  }
  choco(1, S2 + 520);
  choco(-1, S2 + 1380);
  tapeAt(0, S2 + 1100);
  customers.push({x: null, i: 1, D: S2 + 760, name: 'Don Chepito', ask: 'Pará en la marca, que llevo las flores para el anda.', text: '¡Gracias, patojo!'});

  // ── Jefa: Doña Choco en la Calle del Arco ──
  for (let z = S3 + 60; z < LEN - 170; z += 64) coins((q) => lane(q, (floor(z / 64) % 3) - 1), z, 4, 6);
  choco(0, S3 + 480);

  // ── Final: la tarima de tablones sobre la alfombra grande y el Parque Central ──
  add('ramp', center(LEN - 7), LEN - 7, {sx: 2.3, sy: 1, sz: 1.2});
  ramps.push({x: center(LEN - 7), D: LEN - 7, w: 3.6, vy: 13, last: true});
  dec('alfA', center(LEN + 8), LEN + 8, {sx: 3.4, sz: 6});
  dec('fuente', center(LEN + 62), LEN + 62, {});
  dec('catedral', -46, LEN + 76, {r: 0.35});
  dec('palacio', 6, LEN + 118, {});
  dec('lalo', center(LEN + 34) - 3.4, LEN + 34, {decor: false});
  add('tuktuk', center(LEN + 40) + 4.2, LEN + 40, {decor: true, r: 0.6, tint: [0.3, 0.75, 1]});
  for (let z = LEN + 16; z < LEN + 100; z += 10) [-1, 1].forEach((s) => dec('farol', center(z) + s * 8.2, z, {}));
  for (let z = LEN + 20; z < LEN + 100; z += 16) [-1, 1].forEach((s) => dec('jacaranda', center(z) + s * 13, z + 6, {r: r(0, 6.28), s: r(0.9, 1.15)}));
  [-1, 1].forEach((s) => [LEN + 30, LEN + 54, LEN + 78].forEach((z) => dec('banca', center(z) + s * 7.4, z, {r: s > 0 ? -PI / 2 : PI / 2})));
  signs.push({text: 'PARQUE CENTRAL', x: center(LEN - 60) + 5.8, y: 3.0, D: LEN - 60, w: 5.2, h: 0.85, decor: true});

  // ── Decorado de la bajada: pinos, barandas, ventas de fresas y rótulos ──
  for (let z = -20; z < S1 - 20; z += r(6, 10)) {
    const c = center(z), hw = halfWidth(z);
    [-1, 1].forEach((s) => {
      for (let k = 0; k < 2; k++) {
        const off = hw + (k ? r(9, 30) : r(3.2, 8));
        if (R() < 0.85) dec('pino', c + s * off, z + r(-3, 3), {r: r(0, 6.28), s: r(0.75, 1.35), far: k > 0});
      }
    });
  }
  for (let z = 40; z < S1 - 60; z += 5) {
    const c = center(z), hw = halfWidth(z);
    dec('railing', c - hw - 0.45, z, {});
    if (floor(z / 5) % 2 === 0) dec('railing', c + hw + 0.45, z, {});
  }
  [[300, 'Neblina: despacio'], [900, 'Curva peligrosa'], [1400, 'Antigua 8 km'], [1700, 'Curva peligrosa']].forEach(([z, t]) => sign(t, 1, z, t.length > 12 ? 5.4 : 4.6));
  for (let z = 520; z < S1 - 200; z += r(240, 380)) {
    const c = center(z), hw = halfWidth(z);
    dec('fresas', c + hw + 2.6, z, {r: -PI / 2});
    dec('ventera', c + hw + 2.2, z + 1.8, {r: -PI / 2});
    signs.push({text: 'Fresas Q10', x: c + hw + 2.6, y: 2.9, D: z - 0.2, w: 3.4, h: 0.8, decor: true});
  }
  dec('portal', center(S1 - 120), S1 - 120, {over: true});
  signs.push({text: 'LA ANTIGUA GUATEMALA', x: center(S1 - 120), y: 6.2, D: S1 - 120.25, w: 11.4, h: 1.1, decor: true});

  // ── El pueblo: casas de colores pegadas a la banqueta ──
  const PAST = [[1, 0.78, 0.45], [0.62, 0.82, 1], [1, 0.62, 0.5], [0.72, 0.95, 0.68], [1, 0.9, 0.55], [0.95, 0.7, 0.9], [1, 1, 1], [0.6, 0.9, 0.9]];
  const SHOPS = ['Tejidos Típicos', 'Café La Ceiba', 'Jade y Plata', 'Posada El Portal', 'Helados Doña Rosa', 'Dulces Típicos', 'Artesanías Chapinas', 'Hotel Las Bugambilias', 'Chocobananos Doña Choco'];
  const inPlaza = (z) => z > LEN - 60;
  const nearMark = (z) => abs(z - ARCO) < 7 || (z > MERCED - 16 && z < MERCED + 16);
  let hk = 0, shopK = 0;
  for (let z = S1 - 20; z < LEN - 50; ) {
    if (nearCross(z, 5, 15) || nearCross(z + 9.2, 5, 15) || nearMark(z) || nearMark(z + 9.2) || inPlaza(z + 9.2)) {
      z += 4;
      continue;
    }
    const c = center(z), hw = halfWidth(z);
    [-1, 1].forEach((s) => {
      hk++;
      const t = hk % 5 === 0 ? 'casaB' : hk % 3 === 0 ? 'casaC' : 'casaA';
      dec(t, c + s * (hw + 1.8 + 4.4), z + 4.6, {r: (-s * PI) / 2, tint: PAST[(hk * 3) % PAST.length]});
      if (hk % 4 === 1) dec('bugan', c + s * (hw + 2.0), z + (hk % 8 === 1 ? 1.2 : 8.2), {y: 4.6, r: s > 0 ? PI : 0, s: r(0.8, 1.15)});
      if (z > S2 && z < S3 && hk % 3 === 1) dec('cortina', c + s * (hw + 1.75), z + 4.6, {r: (-s * PI) / 2});
    });
    if (hk % 6 === 0) signs.push({text: SHOPS[shopK++ % SHOPS.length], x: c + (hk % 12 ? 1 : -1) * (hw + 1.9), y: 3.5, D: z + 4.6, w: 5, h: 0.85, decor: true});
    z += 9.4;
  }
  // Faroles de pared, gente en la banqueta y la gente que mira la procesión
  for (let z = S1 + 10; z < LEN - 60; z += 18) {
    if (nearCross(z, 4, 14) || nearMark(z) || nearMark(z + 9)) continue;
    const c = center(z), hw = halfWidth(z);
    [-1, 1].forEach((s) => dec('farolp', c + s * (hw + 1.76), z + (s > 0 ? 0 : 9), {y: 3.1, r: (-s * PI) / 2}));
  }
  // Las calles que cruzan también tienen sus casas, para que no se vea vacío en las esquinas.
  CROSS.forEach((cz) => {
    if (cz > LEN - 80) return;
    const c = center(cz), hw = halfWidth(cz);
    [-1, 1].forEach((s) => {
      for (let k = 1; k <= 3; k++) {
        const x = c + s * (hw + 1.8 + 4.6 + k * 9.4);
        hk++;
        dec(hk % 4 === 0 ? 'casaC' : 'casaA', x, cz - 6.2, {r: PI, tint: PAST[(hk * 5) % PAST.length]});
        hk++;
        dec(hk % 3 === 0 ? 'casaB' : 'casaA', x, cz + 16.2, {r: 0, tint: PAST[(hk * 5) % PAST.length]});
      }
    });
  });
  for (let z = S1 + 40; z < LEN - 200; z += r(34, 70)) {
    if (nearCross(z, 3, 12)) continue;
    const c = center(z), hw = halfWidth(z), s = R() < 0.5 ? 1 : -1;
    if (z > S2 && z < S3) dec('crowd', c + s * (hw + 1.0), z, {r: 0});
    else dec(R() < 0.6 ? 'turista' : 'ventera', c + s * (hw + 0.8), z, {r: s > 0 ? -PI / 2 + 0.5 : PI / 2 - 0.5, tint: pick(SHIRTS)});
  }
  for (let z = S2 + 200; z < S3 - 100; z += 300) {
    const c = center(z);
    signs.push({text: 'Silencio: procesión', x: c - halfWidth(z) - 1.4, y: 2.6, D: z, w: 5.4, h: 0.85, decor: true});
    dec('post', c - halfWidth(z) - 1.4, z, {sy: 2.1});
  }
  // El Arco, La Merced y la Calle del Arco
  dec('arco', center(ARCO), ARCO, {over: true});
  dec('merced', center(MERCED) + halfWidth(MERCED) + 15, MERCED, {r: -PI / 2});
  for (let z = MERCED - 14; z < MERCED + 15; z += 7) dec('turista', center(z) + halfWidth(z) + r(2, 9), z, {r: -PI / 2 + r(-0.6, 0.6), tint: pick(SHIRTS)});
  signs.push({text: 'Calle del Arco', x: center(S3 + 40) + halfWidth(S3 + 40) + 1.5, y: 2.6, D: S3 + 40, w: 4.4, h: 0.85, decor: true});
  dec('post', center(S3 + 40) + halfWidth(S3 + 40) + 1.5, S3 + 40, {sy: 2.1});

  // Encargos: el pasajero espera en la banqueta.
  customers.forEach((cu) => {
    cu.x = lane(cu.D, cu.i);
    const hw = halfWidth(cu.D), c = center(cu.D);
    add('turista', c + hw + 1.0, cu.D, {r: -1.3, tint: [0.75, 1, 1]});
  });
  items.sort((a, b) => a.D - b.D);

  // Pista: [x central, medio ancho, tipo, esquina] cada 2 unidades
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
  return {meta: META, items, movers, signs, surges: [], ramps, customers, gaps, tumulos, track, len: DRAW, length: LEN, calls, cursor: 0, center, halfWidth, kindAt, stageBounds: [0, S1, S2, S3, LEN], S1, S2, S3, wheels: [], burn: null};
}

// Paleta: madrugada con neblina, mañana clara en el empedrado, tarde dorada de procesión y atardecer en el arco.
const SUNSET = {skyTop: '#2c2f78', skyMid: '#e06a7e', skyLow: '#ffae5c', sunDisc: '#ffd07e', sunCol: '#ffbe8e', shade: '#5e4a8c', rim: '#ff9d5a', fog: '#ec9a78', cloudL: '#ffc8a0', cloudS: '#7a4a86',
  hill: '#5a4a86', hill2: '#2e2a4e', sandA: '#b8a090', sandB: '#7a6070', plank: '#d6b49e', street: '#6a5a62', grass: '#4a6a44', sunEl: 0.08, night: 0, shadow: 3.2, shadowA: 0.46};
export const SKYKEYS = [
  {D: 0, skyTop: '#5f86b8', skyMid: '#a8c0d8', skyLow: '#e4e6e6', sunDisc: '#fff3d6', sunCol: '#ffe9cc', shade: '#7e8aa8', rim: '#ffe6c0', fog: '#d7dde2', cloudL: '#ffffff', cloudS: '#b6c2d4', hill: '#6f8aa2', hill2: '#4d6378',
    sandA: '#b9b2a6', sandB: '#8c857a', wet: '#f2c230', waterA: '#3a4a5a', waterB: '#56687a', foam: '#f4f2ee', plank: '#c9c0b0', street: '#5e6068', grass: '#4f7a48', sunEl: 0.18, night: 0, shadow: 2.4, shadowA: 0.36},
  {D: 700, fog: '#dfe3e6', skyLow: '#e8eaea', sunCol: '#f2ece2', shade: '#8a94ae', shadowA: 0.22},
  {D: 1300, fog: '#dfe3e6', skyLow: '#e8eaea', sunCol: '#f2ece2', shade: '#8a94ae', shadowA: 0.22},
  {D: S1 - 200, skyTop: '#2f72c8', skyMid: '#8fc0e8', skyLow: '#eef2f0', sunCol: '#fff2da', shade: '#8a8eac', fog: '#dce6ea', hill: '#5f7fa6', hill2: '#4a6a5a', grass: '#5d9a4c', sunEl: 0.45, shadow: 1.6, shadowA: 0.4},
  {D: S1 + 300, skyTop: '#2a6cd0', skyMid: '#86bdea', skyLow: '#f3efe2', sunCol: '#fff2da', shade: '#8c86a8', fog: '#e8e2d6', sandA: '#c7bba6', sandB: '#8f8070', plank: '#d8cdb8', street: '#6a6660', sunEl: 0.6, shadow: 1.1, shadowA: 0.42},
  {D: S2 + 200, skyTop: '#3a5cb0', skyMid: '#d6b48c', skyLow: '#ffdcae', sunDisc: '#fff0c4', sunCol: '#ffd9a8', shade: '#866f9a', rim: '#ffcf80', fog: '#efc8a4', cloudL: '#fff0dc', cloudS: '#c79ab6', hill: '#7a6a9a', hill2: '#544a6e',
    sandA: '#c9b49a', sandB: '#8a7262', plank: '#dcc8ae', sunEl: 0.26, shadow: 2.4, shadowA: 0.44},
  Object.assign({D: S3 + 300}, SUNSET),
  Object.assign({D: LEN + 400}, SUNSET),
];
