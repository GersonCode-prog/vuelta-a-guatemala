// Nivel 6: de San Pedro a Xela en La Chilera, la moto del Brayan. La última parada.
// La subida fría a la Cumbre de Alaska, con neblina, escarcha y ovejas; Cuatro Caminos al atardecer,
// con camionetas que salen sin avisar; y Xela de noche, con lluvia, charcos y El Cadejo.
import {seeded, sin, abs, min, max, floor, sstep, lerp, PI} from '../core/util.js';

export const S1 = 2000, S2 = 4100, S3 = 6200, LEN = 7000;
const DRAW = LEN + 320;
// La cumbre, el entronque, Salcajá y el Teatro.
const CUMBRE = 1080, CUATRO = S1 + 320, SALCAJA = S1 + 1350, TEATRO = S2 + 1210;
// Calles que cruzan en el centro de Xela, cada cuadra.
const CROSS = [];
for (let z = S2 + 130; z < LEN - 150; z += 118) if (abs(z - TEATRO) > 46) CROSS.push(z);
const nearCross = (D, a = 6, b = 16) => CROSS.some((c) => D > c - a && D < c + b) || (D > CUATRO - 14 && D < CUATRO + 22);
// Donde llueve: de la entrada a Xela hasta un poco antes del jefe.
export const rainAt = (D) => sstep(S2 - 120, S2 + 120, D) * (1 - sstep(S3 - 420, S3 - 160, D));

export const META = {
  id: 'xela', name: 'Quetzaltenango', short: 'Xela', vehicle: 'moto', vehicleName: 'Moto', ground: 'city', look: 'xela', stop: 6,
  next: null, nextId: null, music: [20, 21, 22, 23], forceLabel: 'Motor', sprintWord: 'acelerar', callWord: 'pito', callChip: 'Pito',
  stages: [
    {name: 'La Cumbre de Alaska', fact: 'En la Cumbre de Alaska, la Interamericana pasa de los 3,000 metros. Es el tramo más frío y más nublado del camino a Xela.', speed: 26, clock: 92},
    {name: 'Cuatro Caminos', fact: 'En Cuatro Caminos salen los caminos a Xela, a Totonicapán y a Huehuetenango. De ahí a Xela es pura bajada.', speed: 23, clock: 102},
    {name: 'Xela de noche', fact: 'Xelajú viene del k\'iche\' xe laju\' noj: "bajo los diez cerros", por las montañas que rodean el valle.', speed: 22, clock: 104},
  ],
  soft: {shout: '¡Me mojaste!', check: 'No mojaste a nadie con los charcos', ruin: true, tint: [0.55, 0.6, 0.7], bits: [[0.62, 0.7, 0.82], [0.85, 0.9, 0.98], [0.36, 0.4, 0.46]], call: ['Brayan', '¿Mojaste a la señora de la parada? Ay, patojo... Los charcos se rodean o se brincan.']},
  boss: {id: 'cadejo', name: 'El Cadejo', cut: '¡EL CADEJO!', sub: 'Sale de noche a los que andan tarde'},
  finish: {cut: '¡LA LICENCIADA!', sub: 'Por fin, su paquete', arrive: 'Le entregaste el paquete a La Licenciada', deck: 0},
  shop: {title: 'Repuestos La Cumbre', go: 'Seguir en moto', items: [
    {id: 'cadena', name: 'Cadena nueva', desc: 'La moto corre un 6% más.', price: 60},
    {id: 'frenos', name: 'Frenos de disco', desc: 'Frenás el doble y te recuperás más rápido de los golpes.', price: 45},
    {id: 'carton', name: 'Pulpo nuevo', desc: 'El paquete va bien amarrado: recibe 30% menos daño.', price: 70},
  ]},
  share: 'Entregué el paquete en Xela',
  resTitle: '¡Paquete entregado!',
  note: 'La Licenciada abrió el paquete: era la masa madre de las shecas de su abuela. Por eso se movía, por eso olía raro. El Brayan te invitó a un chocolate. <b class="text-oro">¡Cruzaste Guatemala!</b>',
  title: {D0: TEATRO - 170, D1: TEATRO + 150, pal: TEATRO - 60, speed: 13, x: (LV, D, t) => LV.center(D) + 1.2 * sin(t * 0.3)},
  palGain: [1.02, 1, 7000], leftHills: 0, burn: null, fenceOff: 0, agua: [0.3, 0.17, 0.44],
  ambient: () => 0, fallText: '¡Aaay!',
  rainAt,
  // Neblina en la cumbre; en Xela, la lluvia acorta la vista.
  fogAt(D) {
    const k = sstep(430, 700, D) * (1 - sstep(1450, 1700, D)), r = rainAt(D);
    let a = lerp(92, 16, k), b = lerp(330, 125, k);
    a = lerp(a, 44, r);
    b = lerp(b, 215, r);
    return [a, b];
  },
};

const callsCommon = [
  {D: 24, from: 'Brayan', t: '¿Vos sos el del paquete? Mi tío Chema me contó. Llevate a La Chilera, pero me la cuidás. Te espero en el parque de Xela.'},
  {D: 300, from: 'Don Beto', t: 'Subiendo a la cumbre hace un frío que pela. Despacio en las curvas, patojo.'},
  {D: 640, from: 'Brayan', t: 'Arriba cae helada. Si ves escarcha en el asfalto, no le metás timón, que la moto se resbala.'},
  {D: 1180, from: 'La Licenciada', t: '¿Ya va para Xela? Antes de medianoche, ¿verdad? Es importantísimo.'},
  {D: 1560, from: 'Mamá', t: 'Mijo, ¿llevás chumpa? Allá arriba hace un frío...'},
  {D: 1840, from: 'Brayan', t: 'Si cruzan ovejas, pitales y pasá por donde ya pasaron. No tienen apuro.'},
  {D: S1 + 60, from: 'Brayan', t: 'Ya en Cuatro Caminos: las camionetas se paran donde quieren y salen sin avisar. Ojo con el ayudante.'},
  {D: S1 + 880, from: 'Don Beto', t: 'Por ahí venden de todo. No te parés a comprar, que vas tarde.'},
  {D: S1 + 1520, from: 'La Licenciada', t: 'Si el paquete ya huele raro, es buena señal. Créame.'},
  {D: S2 + 60, from: 'Brayan', t: 'Ya estás en Xela. Está lloviendo: no les tirés agua de los charcos a los que esperan bus.'},
  {D: S2 + 860, from: 'Mamá', t: 'Mijo, ya es tarde. Dicen que de noche sale el Cadejo a los que andan en la calle...'},
  {D: S2 + 1560, from: 'La Licenciada', t: 'Ya casi es medianoche. Lo espero en el parque, frente a la catedral.'},
];
export const CALLS_DESK = [...callsCommon, {D: 130, from: 'Brayan', t: '↑ acelera, ↓ frena hasta parar. Espacio brinca, que es moto de montaña. B es el pito.'}];
export const CALLS_TOUCH = [...callsCommon, {D: 130, from: 'Brayan', t: 'Dale acelera y Freno la para del todo. Saltar la hace brincar, que es moto de montaña.'}];

const center = (D) => {
  const w1 = sstep(60, 260, D) * (1 - sstep(S1 - 260, S1 - 60, D));
  const w2 = sstep(S1 + 420, S1 + 700, D) * (1 - sstep(S2 - 320, S2 - 80, D));
  const w3 = sstep(S2 + 80, S2 + 300, D) * (1 - sstep(LEN - 260, LEN - 90, D));
  return w1 * (8.8 * sin(D * 0.0044) + 3.4 * sin(D * 0.0119 + 1.1)) + w2 * 4.2 * sin((D - S1) * 0.0024) + w3 * 2.4 * sin((D - S2) * 0.0031);
};
function halfWidth(D) {
  if (D < S1 - 30) return 4.4;
  if (D < S1 + 10) return lerp(4.4, 4.9, sstep(S1 - 30, S1 + 10, D));
  if (D < S2 - 40) return 4.9;
  if (D < S2 + 10) return lerp(4.9, 4.2, sstep(S2 - 40, S2 + 10, D));
  if (D < LEN - 40) return 4.2;
  return lerp(4.2, 4.6, sstep(LEN - 40, LEN, D));
}
// Tramo: 0 la cumbre, 1 el entronque, 2 la ciudad, 3 el parque. Lo mojado de la lluvia va en los decimales (hasta .4).
const kindAt = (D) => (D < S1 ? 0 : D < S2 ? 1 + 0.4 * rainAt(D) : D < LEN - 40 ? 2 + 0.4 * rainAt(D) : 3);
// Cuarto canal: en la cumbre, cuánta helada hay en el monte; en el pueblo, paso de cebra (0.5) o la calle que cruza (1).
const xwAt = (D) => {
  if (D < S1) return 0.9 * sstep(480, 760, D) * (1 - sstep(1500, 1760, D));
  if (D > CUATRO - 8 && D < CUATRO + 14) return 1;
  if (D > CUATRO - 12 && D < CUATRO - 8) return 0.5;
  for (const c of CROSS) {
    if (D > c - 0.5 && D < c + 10.5) return 1;
    if (D > c - 4 && D <= c - 0.5) return 0.5;
  }
  return 0;
};
const laneW = (D) => (D < S1 ? 2.1 : D < S2 ? 2.3 : 2.0);

export function buildLevel(touch) {
  const R = seeded(20261110);
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
  const sheca = (i, D) => add('sheca', lane(D, i), D, {pick: 'sheca', y: 1.25, spin: 2.2, w: 1, l: 1.1});
  const tapeAt = (i, D) => add('tape', lane(D, i), D, {pick: 'tape', y: 1.3, spin: 2.4, w: 1, l: 1.1});
  const CARS = [[0.95, 0.2, 0.2], [0.25, 0.42, 0.9], [0.86, 0.86, 0.88], [0.22, 0.22, 0.26], [1, 1, 1], [0.3, 0.7, 0.45], [1, 0.82, 0.25]];
  const SHIRTS = [[1, 0.5, 0.5], [0.55, 0.8, 1], [1, 0.9, 0.5], [0.7, 1, 0.7], [1, 0.7, 0.9], [1, 1, 1]];
  const PAST = [[1, 0.8, 0.55], [0.7, 0.85, 1], [1, 0.7, 0.6], [0.78, 0.95, 0.72], [1, 0.92, 0.6], [0.95, 0.78, 0.92], [1, 1, 1], [0.7, 0.92, 0.9]];
  const STONE = [[1, 1, 1], [1.04, 1.02, 0.97], [0.95, 0.96, 1], [1.06, 1.0, 0.92]];
  const stageV = (D) => (D < S1 ? 26 : D < S2 ? 23 : 22);
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

  // ── Etapa 1: la subida a la Cumbre de Alaska ──
  const cumbre = [
    function camion(D) {
      const i = R() < 0.5 ? -1 : 1;
      traffic(R() < 0.5 ? 'cabezal' : 'van', i, D, r(11, 13), {near: 90});
      laneCoins(-i, D, 5, 7);
      return 62;
    },
    function ovejas(D) {
      // El rebaño cruza de un lado: pasá por el otro, o por donde ya pasaron.
      // Salen de la orilla cuando te ven: al llegar vos, van por el centro y tu lado libre es el otro.
      const s = R() < 0.5 ? 1 : -1, c = center(D), hw = halfWidth(D), v = r(1.3, 1.6);
      for (let k = 0; k < 3; k++) {
        const x = c + s * (hw + 4.3 - k * 2.4);
        mover('oveja', x, D + r(-1.5, 1.5), {kind: 'drift', vx: -s * v, near: 75, solid: true, w: 0.5, l: 0.6, h: 1.1, dmg: 6, r: s > 0 ? PI / 2 : -PI / 2, walk: 4, nearShout: '¡Beee!'});
      }
      mover('pastora', c + s * (hw + 6.4), D + 2, {kind: 'drift', vx: -s * v, near: 75, solid: true, w: 0.4, l: 0.4, h: 9, dmg: 6, r: s > 0 ? PI / 2 : -PI / 2, nearShout: '¡Con cuidado, mijo!'});
      laneCoins(-s, D - 6, 4, 5);
      return 58;
    },
    function escarcha(D) {
      // Dos carriles con escarcha: el tercero está seco y tiene monedas.
      const i = pick([-1, 0, 1]), others = [-1, 0, 1].filter((k) => k !== i);
      others.forEach((k, n) => add('escarcha', lane(D + n * 9, k) + r(-0.25, 0.25), D + n * 9, {ice: true, w: 1.2, l: 2.9, sx: 1.35, sz: 3.1, r: r(-0.15, 0.15)}));
      laneCoins(i, D - 4, 5, 5);
      return 52;
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
      traffic('pickup', i, D, r(12, 14), {near: 80, tint: pick([[1, 1, 1], [0.9, 0.5, 0.45], [0.7, 0.9, 0.7]])});
      laneCoins(-i, D + 4, 4, 6);
      return 50;
    },
    function camioneta(D) {
      const i = R() < 0.5 ? -1 : 1;
      traffic('busred', i, D, r(14, 16), {near: 90, l: 5, w: 1.3});
      laneCoins(-i, D + 6, 5, 7);
      return 66;
    },
    function motos(D) {
      [[-1, 0, 1], [1, 16, -1]].forEach(([i, z, s]) => {
        const Dm = D + z - (12 * 60) / 14;
        mover('moto', lane(Dm, i), Dm, {kind: 'weave', vD: 12, near: 60, solid: true, w: 0.5, l: 1, h: 1.6, dmg: 8, amp: 0.8 * s, wv: 1.3, ph: z, x0: lane(D + z, i), tint: pick(CARS)});
      });
      laneCoins(0, D + 4, 4, 6);
      return 44;
    },
  ];
  let D = 200, k1 = 0;
  while (D < S1 - 140) {
    const d = D / S1, frosty = D > 560 && D < 1620;
    // En la helada hay escarcha y ovejas; abajo, tráfico.
    const pool = d < 0.12 ? [0, 4, 3] : frosty ? [2, 1, 0, 2, 6, 1, 3, 2, 5] : [0, 3, 4, 1, 5, 6, 0, 3];
    D += cumbre[pool[k1 % pool.length]](D) + lerp(46, 26, d);
    k1++;
  }
  // Túmulo a la entrada de Cuatro Caminos
  add('tumulo', center(S1 - 70), S1 - 70, {sx: 4.4, sz: 1});
  tumulos.push({D: S1 - 70, used: false});
  sign('Cuidado: túmulo', 1, S1 - 100, 4.6);
  sheca(1, 820);
  sheca(-1, 1620);
  tapeAt(0, 1180);

  // ── Etapa 2: Cuatro Caminos y la bajada por Salcajá ──
  const cuatro = [
    function sale(D) {
      // Camioneta parada en la orilla: cuando te acercás, el ayudante grita y se te mete.
      const s = R() < 0.5 ? 1 : -1, c = center(D), hw = halfWidth(D);
      const x0 = c + s * (hw + 0.2), xT = lane(D, s * 0.85);
      mover('busred', x0, D, {kind: 'merge', xT, trig: r(30, 38), vD: 0, vMax: r(5, 7), solid: true, w: 1.3, l: 5, h: 9, dmg: 12, near: 160, tint: [1, 1, 1]});
      dec('person', c + s * (hw + 1.0), D - 6, {r: s > 0 ? -PI / 2 : PI / 2, tint: pick(SHIRTS)});
      laneCoins(-s, D - 8, 5, 5);
      return 72;
    },
    function venteras(D) {
      mover('ventera', center(D) + r(-1, 1), D, {kind: 'crab', solid: true, w: 0.42, l: 0.42, h: 9, dmg: 6, amp: 2.4, wv: 0.55, ph: R() * 6, r0: PI / 2, wobA: 0.12, wobF: 2.4, nearShout: '¡Con permiso!'});
      laneCoins(R() < 0.5 ? -1 : 1, D + 8, 4, 6);
      return 30;
    },
    function micro(D) {
      const i = R() < 0.5 ? -1 : 1;
      traffic(R() < 0.5 ? 'van' : 'pickup', i, D, r(9, 11), {near: 80});
      laneCoins(-i, D + 2, 5, 6);
      return 46;
    },
    function puesto(D) {
      // Un puesto que se come el carril de la orilla
      const s = R() < 0.5 ? 1 : -1, c = center(D), hw = halfWidth(D);
      solid('stall', c + s * (hw - 1.2), D, 1.1, 1.8, 9, 8, {r: s > 0 ? -PI / 2 : PI / 2, tint: pick(SHIRTS)});
      dec('crowd', c + s * (hw + 1.6), D, {r: 0});
      laneCoins(-s, D - 6, 5, 5);
      return 36;
    },
    function motos(D) {
      return cumbre[6](D);
    },
    function tumulo(D) {
      add('tumulo', center(D), D, {sx: 4.6, sz: 1});
      tumulos.push({D, used: false});
      sign('Cuidado: túmulo', 1, D - 28, 4.6);
      return 28;
    },
  ];
  let D2 = S1 + 150, k2 = 0;
  while (D2 < S2 - 90) {
    if (nearCross(D2, 10, 30)) {
      D2 += 6;
      continue;
    }
    const d = (D2 - S1) / (S2 - S1);
    const pool = d < 0.12 ? [2, 1, 0] : [0, 2, 1, 3, 4, 0, 2, 5, 1, 3];
    D2 += cuatro[pool[k2 % pool.length]](D2) + lerp(36, 20, d);
    k2++;
  }
  // En el entronque, una camioneta cruza de lado a lado: pasá por donde ya pasó.
  {
    const s = 1, Dc = CUATRO + 3;
    mover('busred', center(Dc) + s * 17, Dc, {kind: 'drift', vx: -s * 6.2, solid: true, w: 5, l: 1.3, h: 9, dmg: 12, near: 95, r: s > 0 ? PI / 2 : -PI / 2, tint: [1, 1, 1], nearShout: '¡Xela, Xela, Xela!'});
  }
  sheca(-1, S1 + 420);
  sheca(1, S1 + 1300);
  tapeAt(1, S1 + 980);
  customers.push({x: null, i: 1, D: S1 + 560, name: 'Doña Cata', ask: 'Pará en la marca, mijo, que le mando estos tamales a mi hija.', text: '¡Dios te lo pague!'});
  customers.push({x: null, i: 1, D: S1 + 1440, name: 'Don Lencho', ask: 'Pará en la marca, que llevo el pan para la tienda de Salcajá.', text: '¡Gracias, patojo!'});

  // ── Etapa 3: Xela de noche, con lluvia ──
  const noche = [
    function charco(D) {
      // Charco en el carril de la orilla, con alguien esperando bus.
      const s = R() < 0.5 ? 1 : -1, c = center(D), hw = halfWidth(D);
      solid('charco', lane(D, s) + s * 0.25, D, 1.25, 2.0, 0.1, 0, {soft: true, sx: 1.35, sz: 2.2, r: r(-0.2, 0.2)});
      dec(R() < 0.6 ? 'paraguas' : 'person', c + s * (hw + 0.9), D + 1, {r: s > 0 ? -PI / 2 : PI / 2, tint: pick(SHIRTS)});
      laneCoins(-s, D - 5, 4, 5);
      return 36;
    },
    function charcos(D) {
      // Dos charcos en zigzag
      const s = R() < 0.5 ? 1 : -1, c = center(D), hw = halfWidth(D);
      [0, 1].forEach((k) => {
        const Dk = D + k * 22, sk = k ? -s : s;
        solid('charco', lane(Dk, sk) + sk * 0.2, Dk, 1.2, 1.9, 0.1, 0, {soft: true, sx: 1.3, sz: 2.1, r: r(-0.2, 0.2)});
        dec('paraguas', center(Dk) + sk * (hw + 0.9), Dk + 1, {r: sk > 0 ? -PI / 2 : PI / 2, tint: pick(SHIRTS)});
      });
      coins((z) => c + 0, D + 4, 4, 4);
      return 52;
    },
    function cruzan(D) {
      [0, 1].forEach((k) => mover('paraguas', center(D + k * 1.6) + (k ? 0.6 : -0.4), D + k * 1.6, {kind: 'crab', solid: true, w: 0.45, l: 0.45, h: 9, dmg: 6, amp: 2.3, wv: 0.5, ph: k * 2 + R() * 2, r0: PI / 2, wobA: 0.1, wobF: 2, walk: 3, tint: pick(SHIRTS), nearShout: '¡Ey, cuidado!'}));
      laneCoins(R() < 0.5 ? -1 : 1, D + 6, 4, 6);
      return 34;
    },
    function parqueados(D) {
      const s = R() < 0.5 ? 1 : -1;
      parked('car', lane(D, s) + s * 0.25, D);
      parked('car', lane(D + 30, -s) - s * 0.25, D + 30);
      coins((z) => lane(z, -s), D - 4, 4, 6);
      return 44;
    },
    function taxi(D) {
      const i = R() < 0.5 ? -1 : 1;
      traffic('car', i, D, r(9, 11), {tint: pick([[1, 1, 1], [0.95, 0.85, 0.3], [0.86, 0.86, 0.88]])});
      laneCoins(-i, D + 2, 5, 6);
      return 40;
    },
    function tumulo(D) {
      return cuatro[5](D);
    },
  ];
  let D3 = S2 + 140, k3 = 0;
  while (D3 < S3 - 90) {
    if (nearCross(D3, 8, 16)) {
      D3 += 6;
      continue;
    }
    const d = (D3 - S2) / (S3 - S2), wet = rainAt(D3) > 0.4;
    const pool = d < 0.12 ? [0, 2, 3] : wet ? [0, 2, 1, 4, 0, 3, 5, 1, 2] : [2, 4, 3, 5, 2];
    D3 += noche[pool[k3 % pool.length]](D3) + lerp(32, 18, d);
    k3++;
  }
  sheca(1, S2 + 520);
  sheca(-1, S2 + 1380);
  tapeAt(0, S2 + 1100);
  customers.push({x: null, i: 1, D: S2 + 760, name: 'Ana Lucía', ask: '¡Hola! Pará en la marca, porfa, que se me fue la última camioneta.', text: '¡Mil gracias!'});

  // ── Jefe: El Cadejo, camino al parque ──
  for (let z = S3 + 60; z < LEN - 170; z += 64) coins((q) => lane(q, (floor(z / 64) % 3) - 1), z, 4, 6);
  sheca(0, S3 + 480);

  // ── Final: la rampa de la banqueta y el Parque Centroamérica ──
  add('ramp', center(LEN - 7), LEN - 7, {sx: 2.3, sy: 1, sz: 1.2});
  ramps.push({x: center(LEN - 7), D: LEN - 7, w: 3.6, vy: 13, last: true});
  const cP = center(LEN + 40);
  // Te esperan a la izquierda de donde para la moto, viéndote llegar.
  dec('licenciada', cP - 6.4, LEN + 26, {decor: false, r: 0.9});
  dec('brayan', cP - 7.9, LEN + 27.6, {decor: false, r: 0.7});
  dec('mesita', cP - 9.2, LEN + 25.2, {});
  dec('catedralX', cP - 26, LEN + 70, {r: PI / 2});
  dec('palacioX', cP + 4, LEN + 128, {});
  for (let z = LEN + 12; z < LEN + 110; z += 12) [-1, 1].forEach((s) => dec('faroX', cP + s * 8.4, z, {}));
  for (let z = LEN + 20; z < LEN + 110; z += 15) [-1, 1].forEach((s) => dec(z % 2 ? 'cipres' : 'jacaranda', cP + s * 13.5, z + 5, {r: r(0, 6.28), s: r(0.85, 1.1)}));
  [-1, 1].forEach((s) => [LEN + 26, LEN + 50, LEN + 74].forEach((z) => s < 0 && z < LEN + 30 ? 0 : dec('banca', cP + s * 7.2, z, {r: s > 0 ? -PI / 2 : PI / 2})));
  signs.push({text: 'PARQUE CENTROAMÉRICA', x: center(LEN - 60) + 5.8, y: 3.0, D: LEN - 60, w: 7.4, h: 0.85, decor: true});
  signs.push({text: 'Pasaje Enríquez', x: center(LEN - 20) + 9, y: 3.4, D: LEN - 20, w: 5.2, h: 0.85, decor: true});

  // ── Decorado de la cumbre: pinos, cipreses, milpa, adobe y ovejas pastando ──
  const frostK = (z) => sstep(480, 760, z) * (1 - sstep(1500, 1760, z));
  for (let z = -20; z < S1 - 20; z += r(6, 10)) {
    const c = center(z), hw = halfWidth(z), fk = frostK(z), ft = [1 + 0.3 * fk, 1 + 0.32 * fk, 1 + 0.4 * fk];
    [-1, 1].forEach((s) => {
      for (let k = 0; k < 2; k++) {
        const off = hw + (k ? r(10, 32) : r(3.4, 8));
        if (R() < 0.82) dec(R() < 0.55 ? 'pino' : 'cipres', c + s * off, z + r(-3, 3), {r: r(0, 6.28), s: r(0.75, 1.3), far: k > 0, tint: ft});
      }
    });
  }
  for (let z = 40; z < S1 - 60; z += 5) {
    const c = center(z), hw = halfWidth(z);
    dec('railing', c - hw - 0.45, z, {});
    if (floor(z / 5) % 3 === 0) dec('railing', c + hw + 0.45, z, {});
  }
  // Milpas y casitas de adobe donde se abre el monte
  for (let z = 260; z < S1 - 120; z += r(150, 260)) {
    if (abs(z - CUMBRE) < 120) continue;
    const s = R() < 0.6 ? 1 : -1, c = center(z), hw = halfWidth(z);
    dec('adobe', c + s * (hw + 7.5), z, {r: s > 0 ? -PI / 2 : PI / 2, tint: pick([[1, 1, 1], [1.05, 0.98, 0.92], [0.95, 0.95, 1]])});
    for (let m = 0; m < 10; m++) dec('milpa', c + s * (hw + 3.2 + (m % 3) * 1.5), z + 6 + floor(m / 3) * 1.6, {r: r(0, 6.28), s: r(0.85, 1.1), tint: frostK(z) > 0.3 ? [1.2, 1.15, 1.1] : [1, 1, 1]});
    if (R() < 0.6) [0, 1, 2].forEach((k) => dec('oveja', c - s * (hw + 4 + k * 1.6), z + k * 2.4, {r: r(0, 6.28)}));
  }
  [[320, 'Curva peligrosa'], [560, 'Neblina: despacio'], [CUMBRE - 60, 'CUMBRE DE ALASKA'], [CUMBRE - 20, '3,015 metros'], [1420, 'Cuidado: escarcha'], [1800, 'A Cuatro Caminos']].forEach(([z, t]) => sign(t, 1, z, t.length > 12 ? 5.6 : 4.6));
  for (let z = 1980 - 900; z < S1 - 200; z += r(260, 420)) {
    const c = center(z), hw = halfWidth(z);
    dec('stall', c + hw + 3.2, z, {r: -PI / 2, tint: [1, 0.95, 0.85]});
    dec('ventera', c + hw + 2.0, z + 1.8, {r: -PI / 2});
    signs.push({text: 'Atol de elote', x: c + hw + 3.0, y: 3.1, D: z - 0.2, w: 3.8, h: 0.8, decor: true});
  }

  // ── Cuatro Caminos: puestos, camionetas paradas, casas y rótulos ──
  const TOWN = [[CUATRO, 360], [SALCAJA, 300], [S2 - 140, 220]];
  const inTown = (z) => TOWN.some(([c, h]) => abs(z - c) < h);
  for (let z = S1 - 20; z < S2 - 40; z += r(9, 12)) {
    const c = center(z), hw = halfWidth(z);
    if (z > CUATRO - 16 && z < CUATRO + 24) continue;
    [-1, 1].forEach((s) => {
      if (inTown(z)) {
        const t = R() < 0.35 ? 'house2' : R() < 0.5 ? 'house' : R() < 0.5 ? 'bldC' : 'adobe';
        const x = c + s * (hw + (t === 'adobe' ? 5.6 : t === 'bldC' ? 7.6 : 7.4));
        dec(t, x, z, {r: s > 0 ? -PI / 2 : PI / 2, tint: pick(PAST), s: t === 'house' || t === 'house2' ? 0.8 : 1});
      } else {
        if (R() < 0.6) dec(R() < 0.5 ? 'cipres' : 'pino', c + s * (hw + r(4, 12)), z, {r: r(0, 6.28), s: r(0.8, 1.2)});
        if (R() < 0.5) dec('milpa', c + s * (hw + r(2.6, 6)), z + r(-2, 2), {r: r(0, 6.28)});
      }
    });
  }
  // Puestos del mercado del entronque
  for (let z = CUATRO - 140; z < CUATRO + 150; z += r(9, 14)) {
    if (z > CUATRO - 18 && z < CUATRO + 26) continue;
    const s = R() < 0.5 ? 1 : -1, c = center(z), hw = halfWidth(z);
    dec('stall', c + s * (hw + 2.4), z, {r: s > 0 ? -PI / 2 : PI / 2, tint: pick(SHIRTS)});
    if (R() < 0.5) dec('crowd', c + s * (hw + 1.0), z + 2, {r: 0});
  }
  // La calle que cruza en el entronque, con camionetas paradas
  [-1, 1].forEach((s) => {
    for (let k = 1; k <= 3; k++) dec('house2', center(CUATRO) + s * (halfWidth(CUATRO) + 4 + k * 11), CUATRO - 8, {r: PI, tint: pick(PAST), s: 0.8});
    dec('busred', center(CUATRO) + s * (halfWidth(CUATRO) + 12), CUATRO + 4, {r: s > 0 ? PI / 2 : -PI / 2, tint: [1, 1, 1]});
  });
  signs.push({text: 'CUATRO CAMINOS', x: center(CUATRO - 60) + halfWidth(CUATRO - 60) + 1.8, y: 3.4, D: CUATRO - 60, w: 7.6, h: 0.9, decor: true});
  dec('post', center(CUATRO - 60) + halfWidth(CUATRO - 60) + 1.8, CUATRO - 60, {sy: 2.7});
  [[CUATRO - 40, 'A Xela', 1], [CUATRO - 40, 'A Totonicapán', -1], [CUATRO + 40, 'A Huehuetenango', -1], [SALCAJA - 80, 'SALCAJÁ', 1], [SALCAJA + 40, 'Tejidos de Salcajá', -1], [S2 - 260, 'QUETZALTENANGO', 1]].forEach(([z, t, s]) => sign(t, s, z, t.length > 12 ? 6.2 : 4.6, t === t.toUpperCase() ? 3.2 : 2.6));
  const SH2 = ['Pinchazos 24 horas', 'Comedor La Cumbre', 'Tortillería Lupita', 'Pan de Xela', 'Ferretería El Clavo', 'Farmacia La Bendición'];
  let sk2 = 0;
  for (let z = S1 + 80; z < S2 - 80; z += r(110, 170)) {
    if (!inTown(z) || (z > CUATRO - 30 && z < CUATRO + 34)) continue;
    const s = R() < 0.5 ? 1 : -1;
    signs.push({text: SH2[sk2++ % SH2.length], x: center(z) + s * (halfWidth(z) + 2.0), y: 3.2, D: z, w: 5, h: 0.85, decor: true});
  }
  for (let z = S1 + 200; z < S2 - 200; z += r(160, 260)) {
    if (z > CUATRO - 40 && z < CUATRO + 40) continue;
    const s = R() < 0.5 ? 1 : -1;
    dec('parada', center(z) + s * (halfWidth(z) + 1.6), z, {r: s > 0 ? -PI / 2 : PI / 2});
    dec('person', center(z) + s * (halfWidth(z) + 1.2), z + 1.2, {r: s > 0 ? -PI / 2 : PI / 2, tint: pick(SHIRTS)});
  }
  dec('portal', center(S2 - 120), S2 - 120, {over: true});
  signs.push({text: 'BIENVENIDOS A XELA', x: center(S2 - 120), y: 6.2, D: S2 - 120.25, w: 11, h: 1.1, decor: true});

  // ── Xela: piedra gris y casas de colores, faroles y gente bajo la lluvia ──
  const inPlaza = (z) => z > LEN - 60;
  const nearTeatro = (z) => abs(z - TEATRO) < 30;
  let hk = 0;
  for (let z = S2 - 20; z < LEN - 50; ) {
    if (nearCross(z, 5, 15) || nearCross(z + 9.2, 5, 15) || inPlaza(z + 9.2)) {
      z += 4;
      continue;
    }
    const c = center(z), hw = halfWidth(z);
    [-1, 1].forEach((s) => {
      if (s > 0 && nearTeatro(z)) return;
      hk++;
      const stoneB = hk % 3 !== 1, t = stoneB ? (hk % 4 === 0 ? 'neoB' : 'neoA') : hk % 5 === 0 ? 'casaB' : 'casaA';
      dec(t, c + s * (hw + 1.8 + 4.4), z + 4.6, {r: (-s * PI) / 2, tint: stoneB ? STONE[hk % STONE.length] : PAST[(hk * 3) % PAST.length]});
    });
    z += 9.4;
  }
  CROSS.forEach((cz) => {
    if (cz > LEN - 80) return;
    const c = center(cz), hw = halfWidth(cz);
    [-1, 1].forEach((s) => {
      for (let k = 1; k <= 3; k++) {
        const x = c + s * (hw + 1.8 + 4.6 + k * 9.4);
        hk++;
        dec(hk % 2 ? 'neoA' : 'casaC', x, cz - 6.2, {r: PI, tint: hk % 2 ? STONE[hk % 4] : PAST[(hk * 5) % PAST.length]});
        hk++;
        dec(hk % 3 ? 'neoA' : 'casaA', x, cz + 16.2, {r: 0, tint: hk % 3 ? STONE[hk % 4] : PAST[(hk * 5) % PAST.length]});
      }
    });
  });
  // Faroles: uno cada 18 m en cada banqueta (el suelo pinta su charco de luz en el mismo lugar)
  for (let z = Math.ceil((S2 - 9) / 18) * 18 + 9; z < LEN - 40; z += 18) {
    if (CROSS.some((c) => z > c - 1.5 && z < c + 11.5)) continue;
    const c = center(z), hw = halfWidth(z);
    [-1, 1].forEach((s) => dec('faroX', c + s * (hw + 1.4), z, {}));
  }
  dec('teatro', center(TEATRO) + halfWidth(TEATRO) + 13, TEATRO, {r: -PI / 2});
  signs.push({text: 'TEATRO MUNICIPAL', x: center(TEATRO - 34) + halfWidth(TEATRO - 34) + 2, y: 3.0, D: TEATRO - 34, w: 6.6, h: 0.85, decor: true});
  for (let z = TEATRO - 12; z < TEATRO + 14; z += 6) dec('paraguas', center(z) + halfWidth(z) + r(2.5, 7), z, {r: -PI / 2 + r(-0.6, 0.6), tint: pick(SHIRTS)});
  const SH3 = ['Panadería La Sheca', 'Chocolate Doña Pancha', 'Escuela de español', 'Hotel Los Altos', 'Café El Frío', 'Shucos El Volcán', 'Farmacia La Bendición', 'Tostadas Doña Mary'];
  let sk3 = 0;
  for (let z = S2 + 60; z < LEN - 80; z += r(70, 120)) {
    if (nearCross(z, 4, 14) || nearTeatro(z)) continue;
    const s = sk3 % 2 ? 1 : -1;
    signs.push({text: SH3[sk3++ % SH3.length], x: center(z) + s * (halfWidth(z) + 1.9), y: 3.4, D: z, w: 5, h: 0.85, decor: true});
  }
  for (let z = S2 + 40; z < LEN - 200; z += r(40, 80)) {
    if (nearCross(z, 3, 12)) continue;
    const c = center(z), hw = halfWidth(z), s = R() < 0.5 ? 1 : -1;
    dec(rainAt(z) > 0.3 ? 'paraguas' : 'turista', c + s * (hw + 0.85), z, {r: s > 0 ? -PI / 2 + 0.5 : PI / 2 - 0.5, tint: pick(SHIRTS)});
  }

  // Encargos: el pasajero espera en la banqueta.
  customers.forEach((cu) => {
    cu.x = lane(cu.D, cu.i);
    const hw = halfWidth(cu.D), c = center(cu.D);
    add(cu.D > S2 ? 'paraguas' : 'person', c + hw + 1.0, cu.D, {decor: true, r: -1.3, tint: [0.75, 1, 1]});
  });
  items.sort((a, b) => a.D - b.D);

  // Pista: [x central, medio ancho, tipo, helada o esquina] cada 2 unidades
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

// Paleta: tarde fría y neblina en la cumbre, sol dorado en Cuatro Caminos, atardecer en Salcajá,
// noche de lluvia en Xela y luna clara para El Cadejo.
const NIGHT = {skyTop: '#0a1430', skyMid: '#18264c', skyLow: '#34406a', sunDisc: '#c8d0e0', sunCol: '#8a96bc', shade: '#2a3050', rim: '#9aa8d8', fog: '#232c48', cloudL: '#5a6488', cloudS: '#1c2440',
  hill: '#1c2744', hill2: '#10182c', sandA: '#767882', sandB: '#4c4e57', street: '#3c3f48', plank: '#6c6e78', grass: '#2e4434', foam: '#dfe2ea', wet: '#e8b830', sunEl: 0.2, night: 1, shadow: 1.6, shadowA: 0.24};
export const SKYKEYS = [
  {D: 0, skyTop: '#4a6fa8', skyMid: '#9db6d2', skyLow: '#e2e6e4', sunDisc: '#fff3da', sunCol: '#fff0d8', shade: '#7b86a6', rim: '#ffe6c4', fog: '#d3dae0', cloudL: '#ffffff', cloudS: '#aab6c8', hill: '#5f7a94', hill2: '#3f5568',
    sandA: '#b4ada0', sandB: '#7d776c', wet: '#f2c230', waterA: '#3c4c5c', waterB: '#5a6c7e', foam: '#f4f2ee', plank: '#c4bdb0', street: '#55585f', grass: '#4d7447', sunEl: 0.3, night: 0, shadow: 2.0, shadowA: 0.36},
  {D: 650, fog: '#dde2e6', skyLow: '#e8eaea', skyMid: '#b9c6d4', sunCol: '#efece6', shade: '#8a93ab', grass: '#5f7f62', shadowA: 0.2},
  {D: 1450, fog: '#dde2e6', skyLow: '#e8eaea', skyMid: '#b9c6d4', sunCol: '#efece6', shade: '#8a93ab', grass: '#5f7f62', shadowA: 0.2},
  {D: S1 - 150, skyTop: '#3d63ac', skyMid: '#d6b894', skyLow: '#ffdcae', sunDisc: '#fff0c4', sunCol: '#ffdcae', shade: '#857a9e', rim: '#ffcf8a', fog: '#eecba6', cloudL: '#fff0dc', cloudS: '#c9a0b4', hill: '#7a6f9e', hill2: '#544a72',
    sandA: '#c2b39c', sandB: '#8a7662', street: '#5e5a5c', grass: '#5a7a44', sunEl: 0.2, shadow: 2.4, shadowA: 0.42},
  {D: S1 + 1150, skyTop: '#2c2f78', skyMid: '#e06a7e', skyLow: '#ffae5c', sunDisc: '#ffd07e', sunCol: '#ffbe8e', shade: '#5e4a8c', rim: '#ff9d5a', fog: '#ec9a78', cloudL: '#ffc8a0', cloudS: '#7a4a86', hill: '#5a4a86', hill2: '#2e2a4e',
    sandA: '#b8a090', sandB: '#7a6070', street: '#6a5a62', grass: '#4a6a44', sunEl: 0.06, shadow: 3.2, shadowA: 0.46},
  {D: S2 - 150, skyTop: '#1b1f48', skyMid: '#5a4078', skyLow: '#b46e72', sunDisc: '#ffd0a0', sunCol: '#c08aa0', shade: '#3e3866', rim: '#e08a7a', fog: '#6a5878', cloudL: '#c48aa0', cloudS: '#3e2e5e', hill: '#3a3466', hill2: '#221e40',
    sandA: '#9a8a90', sandB: '#5e5260', street: '#4a4450', sunEl: 0.02, night: 0.45, shadow: 2.4, shadowA: 0.3},
  {D: S2 + 260, skyTop: '#0c1222', skyMid: '#1a2234', skyLow: '#323a4c', sunDisc: '#c8d0e0', sunCol: '#7a84a0', shade: '#2c3048', rim: '#9aa8d0', fog: '#252c3c', cloudL: '#4a5468', cloudS: '#1a2030', hill: '#1e2638', hill2: '#121826',
    sandA: '#787a82', sandB: '#4e5058', street: '#3a3d45', plank: '#6e7078', grass: '#2e4434', foam: '#d8dce4', wet: '#e8b830', sunEl: 0.2, night: 0.85, shadow: 1.6, shadowA: 0.24},
  Object.assign({D: S3 - 80}, NIGHT),
  Object.assign({D: LEN + 400}, NIGHT),
];
