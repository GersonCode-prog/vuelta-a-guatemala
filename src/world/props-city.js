// Objetos de la Ciudad de Guatemala: tráfico, semáforos, edificios, pasarelas y el centro de noche.
import {GeoB, hex, mixC} from '../core/geo.js';
import {TAU, cos, sin, floor, lerp, seeded} from '../core/util.js';

const C = {
  ink: hex('#1a1416'), tire: hex('#1a1416'), glass: hex('#27343f'), glassL: hex('#4a6b84'), metal: hex('#c8c6c0'), metalD: hex('#5d5c5a'),
  body: hex('#ece6dc'), red: hex('#e3262f'), oro: hex('#ffc91f'), turq: hex('#12b5b0'), white: hex('#fff3d6'), blue: hex('#1b62c9'), green: hex('#2bae56'), pink: hex('#ff5d7d'), purple: hex('#7a3fb0'),
  orange: hex('#ff7a1a'), concrete: hex('#c9c3b7'), concreteD: hex('#8e887e'), wall: hex('#f2e9dc'), wallD: hex('#cdbfae'), roll: hex('#9aa3ad'), rebar: hex('#6a4a3a'),
  leaf: hex('#3f9a48'), leafD: hex('#26763f'), trunk: hex('#6e5444'), jaca: hex('#a47ae0'), jacaD: hex('#7d55bd'), stone: hex('#a9b892'), stoneD: hex('#7f906c'),
  lit: hex('#ffd98a'), litW: hex('#fff1c4'), skin: hex('#b9784f'), navy: hex('#25335e'), wood: hex('#7a4a2a'), woodL: hex('#a8743f'), tile: hex('#b8553a'), tail: hex('#ff3030'), rust: hex('#b5462e'),
};
function wheels(b, xs, zs, r = 0.36, w = 0.11) {
  xs.forEach((x) => zs.forEach((z) => {
    b.tube([x - w, r, z], [x + w, r, z], r, r, C.tire, 10);
    b.tube([x + (x > 0 ? w : -w), r, z], [x + (x > 0 ? w + 0.01 : -w - 0.01), r, z], r * 0.55, r * 0.55, C.metal, 8);
  }));
}
// Carros: el frente mira a -z; desde el bus se les ve la cola.
function carModel(suv) {
  const b = new GeoB();
  const h0 = suv ? 0.78 : 0.62, hb = suv ? 0.42 : 0.34, cab = suv ? 0.44 : 0.33, cz = suv ? 0.3 : 0.15, cl = suv ? 1.5 : 1.05;
  b.box(0, h0, 0, 0.95, hb, 2.15, C.body);
  const cy = h0 + hb + cab;
  b.box(0, cy, cz, 0.84, cab, cl, C.body);
  b.box(0, cy + 0.02, cz - cl - 0.006, 0.74, cab * 0.78, 0.02, C.glass);
  b.box(0, cy + 0.02, cz + cl + 0.006, 0.74, cab * 0.78, 0.02, C.glass);
  [-1, 1].forEach((s) => {
    b.box(s * 0.846, cy + 0.04, cz, 0.012, cab * 0.7, cl * 0.88, C.glass);
    b.box(s * 0.62, h0 + 0.1, -2.16, 0.22, 0.09, 0.02, C.litW, 2.2);
    b.box(s * 0.66, h0 + 0.12, 2.16, 0.2, 0.09, 0.02, C.tail, 1.8);
  });
  b.box(0, h0 - hb + 0.12, 2.18, 0.98, 0.08, 0.03, C.metalD);
  b.box(0, h0 - hb + 0.12, -2.18, 0.98, 0.08, 0.03, C.metalD);
  b.box(0, h0 + 0.06, 2.17, 0.27, 0.08, 0.01, C.white);
  wheels(b, [-0.9, 0.9], [-1.35, 1.35], suv ? 0.4 : 0.35);
  return b.build();
}
const car = () => carModel(false);
const suv = () => carModel(true);
// Microbús de ruta
function van() {
  const b = new GeoB();
  b.box(0, 1.35, 0.1, 1.0, 1.0, 2.45, C.body);
  b.box(0, 0.75, -2.55, 0.98, 0.42, 0.25, C.body);
  b.box(0, 1.75, -2.36, 0.88, 0.5, 0.02, C.glass);
  b.box(0, 1.85, 2.56, 0.84, 0.42, 0.02, C.glass);
  [-1, 1].forEach((s) => {
    b.box(s * 1.006, 1.85, 0.1, 0.012, 0.36, 2.2, C.glass);
    b.box(s * 0.7, 0.8, 2.56, 0.16, 0.12, 0.02, C.tail, 1.8);
    b.box(s * 0.66, 0.85, -2.81, 0.2, 0.1, 0.02, C.litW, 2);
  });
  b.box(0, 1.2, 2.555, 1.0, 0.06, 0.02, C.oro);
  b.box(0, 2.42, 0.1, 0.9, 0.06, 2.3, C.white);
  wheels(b, [-0.95, 0.95], [-1.65, 1.75], 0.38);
  return b.build();
}
// Cabezal con contenedor: no se puede saltar.
function cabezal() {
  const b = new GeoB();
  b.box(0, 1.55, -5.1, 1.18, 1.1, 1.05, C.red);
  b.box(0, 2.1, -6.16, 1.02, 0.42, 0.02, C.glass);
  b.box(0, 0.75, -6.2, 1.16, 0.3, 0.12, C.metal);
  [-1, 1].forEach((s) => b.tube([s * 1.05, 1.4, -4.05], [s * 1.05, 3.6, -4.05], 0.08, 0.08, C.metal, 6));
  b.box(0, 2.35, 2.2, 1.25, 1.65, 6.1, C.body);
  for (let z = -3.4; z < 8; z += 0.7) [-1, 1].forEach((s) => b.box(s * 1.26, 2.35, z, 0.02, 1.55, 0.05, mixC(C.body, C.ink, 0.3)));
  b.box(0, 2.35, 8.32, 1.2, 1.6, 0.02, mixC(C.body, C.ink, 0.15));
  [-0.9, 0.9].forEach((x) => b.box(x, 0.85, 8.36, 0.18, 0.1, 0.02, C.tail, 1.8));
  b.box(0, 0.62, 8.2, 1.24, 0.1, 0.1, C.oro);
  wheels(b, [-1.05, 1.05], [-5.2, -3.6, 5.2, 6.6], 0.5, 0.18);
  return b.build();
}
function cone() {
  const b = new GeoB();
  b.box(0, 0.03, 0, 0.3, 0.03, 0.3, C.ink);
  b.tube([0, 0.06, 0], [0, 0.32, 0], 0.26, 0.19, C.orange, 10);
  b.tube([0, 0.32, 0], [0, 0.46, 0], 0.19, 0.14, C.white, 10);
  b.tube([0, 0.46, 0], [0, 0.82, 0], 0.14, 0.035, C.orange, 10);
  return b.build();
}
function barrera() {
  const b = new GeoB();
  [-1.3, 1.3].forEach((x) => [[-0.35, 0.35]].forEach(([z0, z1]) => {
    b.tube([x, 0, z0], [x, 1.25, 0], 0.04, 0.04, C.metalD, 4);
    b.tube([x, 0, z1], [x, 1.25, 0], 0.04, 0.04, C.metalD, 4);
  }));
  [0.95, 0.55].forEach((y) => {
    for (let i = 0; i < 8; i++) b.box(-1.4 + 0.175 + i * 0.35, y, 0, 0.175, 0.13, 0.03, i % 2 ? C.white : C.orange);
  });
  b.sph([-1.3, 1.32, 0], 0.08, C.oro, 2.4, 4, 5);
  b.sph([1.3, 1.32, 0], 0.08, C.oro, 2.4, 4, 5);
  return b.build();
}
function triangulo() {
  const b = new GeoB();
  b.curve([[-0.32, 0.03, 0], [0, 0.58, -0.1], [0.32, 0.03, 0], [-0.32, 0.03, 0]], () => 0.035, C.tail, 4, 1.2);
  return b.build();
}
// Semáforo de brazo: la caja cuelga sobre la calle, mirando al que viene.
function semaforo() {
  const b = new GeoB(), box = hex('#20301f'), lens = hex('#262626');
  b.tube([0, 0, 0], [0, 7.3, 0], 0.15, 0.11, C.metalD, 8);
  b.tube([0, 6.95, 0], [-5.3, 6.95, 0], 0.085, 0.07, C.metalD, 6);
  b.tube([0, 6.1, 0], [-1.8, 6.95, 0], 0.04, 0.04, C.metalD, 4);
  b.box(-5.0, 6.45, 0, 0.34, 0.86, 0.26, box);
  b.box(-5.0, 6.45, -0.27, 0.44, 0.94, 0.02, C.ink);
  [6.97, 6.45, 5.93].forEach((y) => {
    b.tube([-5.0, y, 0.26], [-5.0, y, 0.3], 0.2, 0.2, lens, 10);
    b.box(-5.0, y + 0.2, 0.42, 0.22, 0.025, 0.14, C.ink);
  });
  b.box(0, 3.3, 0.2, 0.2, 0.52, 0.16, box);
  [3.62, 3.3, 2.98].forEach((y) => b.tube([0, y, 0.36], [0, y, 0.38], 0.115, 0.115, lens, 8));
  return b.build();
}
function bulb() {
  const b = new GeoB();
  b.sph([0, 0, 0], 0.23, [1, 1, 1], 3.2, 6, 8);
  return b.build();
}
// Faroles: el de avenida y el colonial del centro.
function lampCity() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 8.6, 0], 0.13, 0.09, C.metalD, 7);
  b.curve([[0, 8.4, 0], [-0.6, 8.9, 0], [-2.6, 9.0, 0]], () => 0.06, C.metalD, 5);
  b.box(-2.75, 8.88, 0, 0.42, 0.1, 0.2, C.metalD);
  b.box(-2.75, 8.76, 0, 0.36, 0.04, 0.16, hex('#e6e9ec'));
  return b.build();
}
function farol() {
  const b = new GeoB(), g = hex('#24352c');
  b.tube([0, 0, 0], [0, 0.5, 0], 0.2, 0.16, g, 8);
  b.tube([0, 0.5, 0], [0, 3.9, 0], 0.08, 0.07, g, 6);
  b.tube([0, 3.9, 0], [0, 4.0, 0], 0.22, 0.22, g, 8);
  b.tube([0, 4.0, 0], [0, 4.55, 0], 0.17, 0.25, C.litW, 8, 2.3);
  b.tube([0, 4.55, 0], [0, 4.8, 0], 0.3, 0.05, g, 8);
  return b.build();
}
// Pasarela peatonal sobre la Roosevelt: alta, para que la cámara pase debajo.
function pasarela() {
  const b = new GeoB(), y = 8.3;
  b.box(-4.5, y, 0, 18.5, 0.3, 1.25, C.concrete);
  b.box(-4.5, y - 0.33, 0, 18.5, 0.04, 1.2, C.concreteD);
  [-1, 1].forEach((s) => b.box(-4.5, y + 0.7, s * 1.2, 18.5, 0.045, 0.045, C.oro));
  for (let x = -22.5; x <= 13.5; x += 1.5) [-1, 1].forEach((s) => b.tube([x, y + 0.3, s * 1.2], [x, y + 0.72, s * 1.2], 0.025, 0.025, C.metalD, 4));
  [-7.4, 9.0].forEach((x) => b.box(x, y / 2, 0, 0.36, y / 2, 0.36, C.concreteD));
  [[14.4, 1], [-23.6, -1]].forEach(([x]) => {
    b.box(x, y / 2, 0, 1.3, y / 2 + 0.3, 1.4, C.concrete);
    b.box(x, y + 0.9, 0, 1.45, 0.12, 1.55, C.red);
    for (let k = 0; k < 5; k++) b.box(x, 1 + k * 1.6, 1.42, 1.1, 0.06, 0.02, C.concreteD);
  });
  return b.build();
}
// Paso a desnivel del Periférico
function overpass() {
  const b = new GeoB(), y = 8.8;
  b.box(0, y, 0, 32, 0.7, 5.4, C.concrete);
  b.box(0, y - 0.74, 0, 32, 0.06, 5.5, C.concreteD);
  [-1, 1].forEach((s) => b.box(0, y + 0.95, s * 5.25, 32, 0.25, 0.15, C.concrete));
  [-6.2, 8.6, -21, 22].forEach((x) => [-3.2, 3.2].forEach((z) => b.box(x, (y - 0.7) / 2, z, 0.55, (y - 0.7) / 2, 0.55, C.concreteD)));
  for (let x = -31; x <= 31; x += 4) b.box(x, y + 0.2, 5.42, 1.6, 0.18, 0.02, x % 8 ? C.oro : C.ink);
  return b.build();
}
// Rótulo verde de carretera: el texto va en el atlas.
function gantry() {
  const b = new GeoB();
  [-6.6, 8.4].forEach((x) => b.tube([x, 0, 0], [x, 7.9, 0], 0.16, 0.14, C.metalD, 7));
  b.box(0.9, 7.75, 0, 7.6, 0.12, 0.12, C.metalD);
  b.box(0.9, 7.35, -0.05, 7.6, 0.1, 0.1, C.metalD);
  return b.build();
}
function jersey() {
  const b = new GeoB();
  b.box(0, 0.2, 0, 0.34, 0.2, 2, C.concrete);
  b.box(0, 0.62, 0, 0.17, 0.25, 2, C.concrete);
  b.box(0, 0.89, 0, 0.13, 0.03, 2, C.concreteD);
  b.box(0, 0.06, 1.98, 0.35, 0.06, 0.02, C.oro);
  return b.build();
}
function railing() {
  const b = new GeoB();
  b.box(0, 0.38, 0, 0.24, 0.38, 2, C.concrete);
  b.box(0, 1.08, 0, 0.06, 0.05, 2, C.metal);
  [-1.6, 0, 1.6].forEach((z) => b.tube([0, 0.74, z], [0, 1.08, z], 0.04, 0.04, C.metal, 4));
  return b.build();
}
// ── Edificios: la fachada mira a +z; los costados también llevan ventanas ──
function windowsOn(b, face, hx, hz, floors, cols, y0, dy, col, glow = 0, step = 1.9) {
  for (let f = 0; f < floors; f++) {
    const y = y0 + f * dy;
    for (let i = 0; i < cols; i++) {
      const u = (i - (cols - 1) / 2) * step;
      if (face === 'z') {
        b.box(u, y, hz + 0.02, 0.62, 0.72, 0.03, col, glow);
        b.box(u, y - 0.8, hz + 0.08, 0.72, 0.05, 0.08, C.wallD);
      } else {
        const s = face === '+x' ? 1 : -1;
        b.box(s * (hx + 0.02), y, u, 0.03, 0.72, 0.62, col, glow);
      }
    }
  }
}
function tinacos(b, H, pts) {
  pts.forEach(([x, z]) => {
    b.tube([x, H, z], [x, H + 0.4, z], 0.15, 0.15, C.metalD, 5);
    b.tube([x, H + 0.4, z], [x, H + 1.7, z], 0.58, 0.58, C.ink, 10);
    b.tube([x, H + 1.7, z], [x, H + 1.95, z], 0.58, 0.25, C.ink, 10);
  });
}
function bldA() {
  const b = new GeoB(), hx = 5, hz = 4.8, H = 12.8;
  b.box(0, H / 2, 0, hx, H / 2, hz, C.wall);
  windowsOn(b, 'z', hx, hz, 3, 5, 4.6, 3.2, C.glass);
  windowsOn(b, '+x', hx, hz, 3, 4, 4.6, 3.2, C.glass, 0, 2.1);
  windowsOn(b, '-x', hx, hz, 3, 4, 4.6, 3.2, C.glass, 0, 2.1);
  b.box(-1.7, 1.4, hz + 0.02, 2.5, 1.4, 0.03, C.roll);
  for (let k = 0; k < 8; k++) b.box(-1.7, 0.2 + k * 0.34, hz + 0.06, 2.5, 0.012, 0.012, C.metalD);
  b.box(3.0, 1.25, hz + 0.02, 1.3, 1.25, 0.03, C.glassL);
  b.box(0, 3.0, hz + 0.75, hx, 0.06, 0.75, mixC(C.red, C.wall, 0.15));
  b.box(0, H + 0.3, 0, hx + 0.08, 0.3, hz + 0.08, C.wallD);
  tinacos(b, H + 0.6, [[-2.6, -1.6], [1.8, 1.4]]);
  b.tube([3.6, H + 0.6, -3], [3.6, H + 4.4, -3], 0.05, 0.03, C.metalD, 4);
  return b.build();
}
function bldB() {
  const b = new GeoB(), hx = 6, hz = 6, H = 30;
  b.box(0, H / 2, 0, hx, H / 2, hz, C.glassL);
  for (let y = 3.2; y < H; y += 3.2) b.box(0, y, 0, hx + 0.06, 0.13, hz + 0.06, C.white);
  for (let i = -2; i <= 2; i++) {
    b.box(i * 2.4, H / 2, hz + 0.05, 0.07, H / 2, 0.05, C.white);
    b.box(hx + 0.05, H / 2, i * 2.4, 0.05, H / 2, 0.07, C.white);
    b.box(-hx - 0.05, H / 2, i * 2.4, 0.05, H / 2, 0.07, C.white);
  }
  b.box(0, 1.6, hz + 0.3, hx, 1.6, 0.3, C.concreteD);
  b.box(0, H + 0.8, 0, hx - 1.2, 0.8, hz - 1.2, C.concrete);
  b.tube([2, H + 1.6, 1], [2, H + 7, 1], 0.07, 0.04, C.metalD, 4);
  b.sph([2, H + 7.1, 1], 0.16, C.tail, 2.5, 4, 5);
  return b.build();
}
// Casa de dos pisos con varillas para el tercero: las de toda la ciudad.
function bldC() {
  const b = new GeoB(), hx = 4.2, hz = 4.6, H = 6.4;
  b.box(0, H / 2, 0, hx, H / 2, hz, C.wall);
  b.box(0, 0.35, hz + 0.02, hx + 0.02, 0.35, 0.03, C.wallD);
  b.box(-1.2, 1.35, hz + 0.03, 2.2, 1.3, 0.03, C.roll);
  for (let k = 0; k < 7; k++) b.box(-1.2, 0.25 + k * 0.33, hz + 0.065, 2.2, 0.012, 0.012, C.metalD);
  b.box(2.5, 1.1, hz + 0.03, 0.75, 1.1, 0.03, C.wood);
  b.box(0, 3.0, hz + 0.04, hx, 0.4, 0.04, mixC(C.oro, C.wall, 0.25));
  windowsOn(b, 'z', hx, hz, 1, 3, 4.75, 3, C.glass, 0, 2.5);
  for (let i = -1; i <= 1; i++) for (let k = -2; k <= 2; k++) b.box(i * 2.5 + k * 0.14, 4.75, hz + 0.1, 0.012, 0.72, 0.012, C.ink);
  windowsOn(b, '+x', hx, hz, 2, 2, 1.5, 3.2, C.glass, 0, 3.4);
  windowsOn(b, '-x', hx, hz, 2, 2, 1.5, 3.2, C.glass, 0, 3.4);
  b.box(0, H + 0.12, 0, hx + 0.05, 0.12, hz + 0.05, C.wallD);
  for (const x of [-3.9, -1.3, 1.3, 3.9]) for (const z of [-4.3, 0, 4.3]) b.tube([x, H + 0.2, z], [x + 0.05, H + 1.5, z], 0.03, 0.025, C.rebar, 4);
  tinacos(b, H + 0.24, [[1.5, -2]]);
  return b.build();
}
// Fachadas coloniales de la zona 1, con las ventanas prendidas de noche.
function colonial(two) {
  const b = new GeoB(), hx = 4.6, hz = 4.4, H = two ? 7.8 : 4.6;
  b.box(0, H / 2, 0, hx, H / 2, hz, C.wall);
  b.box(0, 0.4, hz + 0.03, hx + 0.03, 0.4, 0.04, C.wallD);
  b.box(0, H - 0.1, hz + 0.2, hx + 0.15, 0.18, 0.22, C.wallD);
  b.box(0, H + 0.25, 0.6, hx + 0.3, 0.25, hz - 0.6, C.tile);
  b.box(-1.9, 1.5, hz + 0.04, 0.95, 1.5, 0.05, C.wood);
  b.box(-1.9, 3.08, hz + 0.06, 1.1, 0.1, 0.06, C.wallD);
  [1.4, 3.2].forEach((x) => {
    b.box(x, 1.8, hz + 0.03, 0.55, 0.85, 0.03, C.lit, 1.3);
    for (let k = -1; k <= 1; k++) b.box(x + k * 0.22, 1.8, hz + 0.08, 0.014, 0.85, 0.014, C.ink);
  });
  if (two) {
    [-2.2, 0.6, 3.0].forEach((x, i) => {
      b.box(x, 5.4, hz + 0.03, 0.55, 0.95, 0.03, i === 1 ? C.wood : C.lit, i === 1 ? 0 : 1.2);
      b.box(x, 4.38, hz + 0.45, 0.85, 0.06, 0.45, C.wood);
      for (let k = -3; k <= 3; k++) b.box(x + k * 0.25, 4.72, hz + 0.88, 0.016, 0.3, 0.016, C.ink);
      b.box(x, 5.02, hz + 0.88, 0.85, 0.025, 0.025, C.ink);
    });
  }
  return b.build();
}
const colA = () => colonial(true);
const colB = () => colonial(false);
// Palacio Nacional: piedra verde, tres pisos y cuerpo central.
function palacio() {
  const b = new GeoB(), W = 26, H = 15, Dp = 8;
  b.box(0, H / 2, 0, W, H / 2, Dp, C.stone);
  for (let f = 0; f < 3; f++) for (let i = -9; i <= 9; i++) {
    if (Math.abs(i) < 2) continue;
    b.box(i * 2.6, 2.6 + f * 4.4, Dp + 0.03, 0.62, 1.25, 0.04, C.lit, 1.1);
    b.box(i * 2.6, 3.95 + f * 4.4, Dp + 0.1, 0.78, 0.12, 0.1, C.stoneD);
  }
  for (let i = -2; i <= 2; i++) b.box(i * 2.2, 4.5, Dp + 1.6, 0.42, 4.5, 0.42, C.stoneD);
  b.box(0, 9.3, Dp + 1.6, 5.4, 0.4, 0.8, C.stoneD);
  b.box(0, 3.6, Dp + 0.05, 4.2, 3.6, 0.05, C.lit, 0.8);
  b.box(0, H + 0.25, 0, W + 0.3, 0.25, Dp + 0.3, C.stoneD);
  b.box(0, H + 3, 0, 7, 3, Dp - 1.5, C.stone);
  for (let i = -2; i <= 2; i++) b.box(i * 2.6, H + 3, Dp - 1.45, 0.6, 1.3, 0.04, C.lit, 1.2);
  b.box(0, H + 6.3, 0, 7.4, 0.3, Dp - 1.2, C.stoneD);
  b.box(0, H + 7.4, 0, 2.2, 1.1, 2.2, C.stone);
  b.tube([0, H + 8.5, 0], [0, H + 11.5, 0], 0.06, 0.05, C.metalD, 4);
  b.box(0.65, H + 11, 0, 0.6, 0.38, 0.02, C.white);
  b.box(0.65, H + 11, 0.01, 0.2, 0.38, 0.02, hex('#4aa3df'));
  return b.build();
}
function catedral() {
  const b = new GeoB(), W = 9, H = 13, Dp = 10;
  b.box(0, H / 2, 0, W, H / 2, Dp, C.wall);
  [-1, 1].forEach((s) => {
    const x = s * (W + 2.4);
    b.box(x, 9.5, Dp - 2.4, 2.4, 9.5, 2.4, C.wall);
    b.box(x, 20.6, Dp - 2.4, 1.8, 1.6, 1.8, C.wallD);
    b.box(x, 20.6, Dp - 0.58, 0.7, 1.0, 0.02, C.lit, 1.4);
    b.sph([x, 23.2, Dp - 2.4], [1.4, 1.7, 1.4], C.wallD, 0, 6, 8);
    b.tube([x, 24.8, Dp - 2.4], [x, 26.4, Dp - 2.4], 0.07, 0.07, C.ink, 4);
    b.box(x, 26, Dp - 2.4, 0.45, 0.06, 0.06, C.ink);
  });
  b.sph([0, H + 2.5, -2], [5.5, 5, 5.5], C.wallD, 0, 7, 10);
  b.box(0, 4.2, Dp + 0.05, 2.2, 4.2, 0.05, C.wood);
  b.box(0, 9.6, Dp + 0.05, 1.2, 1.2, 0.05, C.lit, 1.3);
  b.box(0, H + 0.3, Dp - 0.2, W + 0.2, 0.3, 0.4, C.wallD);
  return b.build();
}
// Torre del Reformador: de hierro, se ve de lejos.
function torre() {
  const b = new GeoB(), H = 40;
  const w = (y) => lerp(6, 0.8, Math.pow(y / H, 0.8));
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const y = (k * H) / 8;
      pts.push([sx * w(y), y, sz * w(y)]);
    }
    b.curve(pts, () => 0.28, C.rust, 5);
  }
  for (let k = 0; k < 8; k++) {
    const y0 = (k * H) / 8, y1 = ((k + 1) * H) / 8, a = w(y0), c = w(y1);
    for (const [ax, az, bx, bz] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) {
      b.tube([ax * a, y0, az * a], [bx * c, y1, bz * c], 0.1, 0.1, C.rust, 4);
      b.tube([bx * a, y0, bz * a], [ax * c, y1, az * c], 0.1, 0.1, C.rust, 4);
    }
  }
  b.box(0, H, 0, 1.5, 0.35, 1.5, C.rust);
  b.tube([0, H, 0], [0, H + 7, 0], 0.2, 0.06, C.rust, 5);
  b.sph([0, H + 7.2, 0], 0.35, C.tail, 3, 4, 5);
  return b.build();
}
// Casitas en la ladera, como las que se ven desde el Periférico.
function colonia() {
  const b = new GeoB(), R = seeded(5), cols = [C.wall, hex('#f4b6a0'), hex('#a8d4e6'), hex('#f2d27a'), hex('#bfe0b0'), hex('#e9b4d6'), hex('#d8c8f0')];
  for (let i = 0; i < 14; i++) {
    const x = -12 + R() * 24, y = (x + 12) * 0.32 + R() * 1.2, z = -5 + R() * 10, w = 1.4 + R() * 1.4, h = 1.2 + R() * 1.5;
    b.box(x, y + h, z, w, h, 1.3 + R(), cols[i % cols.length]);
    b.box(x, y + 2 * h + 0.08, z, w + 0.15, 0.08, 1.5 + R() * 0.4, R() < 0.5 ? C.metalD : C.tile);
    b.box(x + w * 0.4, y + h * 1.2, z + 1.32, 0.3, 0.3, 0.02, C.glass);
  }
  return b.build();
}
function jacaranda() {
  const b = new GeoB();
  b.curve([[0, 0, 0], [0.2, 1.8, 0], [0.1, 3.4, 0.2]], (t) => lerp(0.26, 0.16, t), C.trunk, 7);
  [[0, 4.3, 0, 2.3, 1.2], [1.5, 3.9, 0.6, 1.5, 0.9], [-1.4, 4.0, -0.5, 1.6, 0.95], [0.3, 3.8, -1.5, 1.4, 0.8], [-0.4, 4.9, 0.9, 1.3, 0.75]].forEach(([x, y, z, r, h], i) =>
    b.sph([x, y, z], [r, h, r], (ta) => (ta < 0.45 ? (i % 2 ? C.jaca : mixC(C.jaca, C.white, 0.2)) : C.jacaD), 0, 6, 9));
  return b.build();
}
function parada() {
  const b = new GeoB();
  [-1.5, 1.5].forEach((x) => b.tube([x, 0, -0.6], [x, 2.6, -0.6], 0.06, 0.06, C.metalD, 5));
  b.box(0, 2.68, -0.1, 1.85, 0.08, 1.0, C.blue);
  b.box(0, 0.5, -0.4, 1.4, 0.05, 0.25, C.metalD);
  b.box(0, 1.45, -0.94, 1.6, 0.9, 0.02, C.glassL);
  b.tube([2.3, 0, 0.2], [2.3, 2.9, 0.2], 0.04, 0.04, C.metalD, 4);
  b.box(2.3, 3.0, 0.2, 0.32, 0.32, 0.02, C.blue);
  b.box(2.3, 3.0, 0.22, 0.2, 0.06, 0.01, C.white);
  return b.build();
}
// Valla publicitaria: tablero de colores; el texto va en el atlas.
function valla() {
  const b = new GeoB();
  [-3, 3].forEach((x) => b.tube([x, 0, 0], [x, 6, 0], 0.18, 0.15, C.metalD, 6));
  b.box(0, 7.6, 0, 4.4, 1.9, 0.12, C.white);
  b.box(-1.6, 8.1, 0.13, 2.6, 1.3, 0.02, C.oro);
  b.sph([2.4, 8.0, 0.14], [1.3, 1.3, 0.05], C.red, 0, 6, 10);
  b.box(0, 5.62, 0.4, 4.4, 0.05, 0.4, C.metalD);
  return b.build();
}
// El shuco: chorizo, guacamole y repollo. Da cinco segundos.
function shuco() {
  const b = new GeoB();
  b.sph([0, 0, 0], [0.66, 0.21, 0.26], hex('#e3b071'), 0.25, 6, 10);
  b.tube([-0.66, 0.14, 0], [0.66, 0.14, 0], 0.095, 0.095, hex('#c4472e'), 8, 0.25);
  b.sph([0, 0.24, 0], [0.52, 0.07, 0.17], hex('#7cbf4a'), 0.25, 4, 8);
  b.curve([[-0.48, 0.3, 0], [-0.2, 0.33, 0.06], [0.12, 0.3, -0.06], [0.44, 0.33, 0.03]], () => 0.026, C.oro, 4, 0.4);
  return b.build();
}
// Don Chus, el chofer, esperando con su shuco.
function chus() {
  const b = new GeoB(), shirt = hex('#e8e2d0');
  [-0.17, 0.17].forEach((x) => b.tube([x, 0, 0], [x, 0.85, 0], 0.12, 0.14, C.navy, 6));
  b.sph([0, 1.25, 0], [0.42, 0.52, 0.38], shirt, 0, 7, 9);
  b.box(0, 1.25, 0.37, 0.05, 0.4, 0.02, C.red);
  b.sph([0, 1.92, 0], 0.22, C.skin, 0, 7, 8);
  b.box(0, 1.86, 0.22, 0.12, 0.025, 0.02, C.ink);
  b.tube([0, 2.08, 0], [0, 2.18, 0], 0.24, 0.24, C.red, 10);
  b.box(0, 2.1, 0.22, 0.2, 0.025, 0.12, C.red);
  b.tube([-0.4, 1.55, 0], [-0.55, 1.05, 0.1], 0.08, 0.07, shirt, 5);
  b.tube([0.4, 1.55, 0], [0.62, 2.1, 0.15], 0.08, 0.07, shirt, 5);
  b.sph([0.66, 2.2, 0.2], [0.24, 0.08, 0.09], hex('#e3b071'), 0, 4, 7);
  return b.build();
}
// Patrulla de la PMT en moto, con su agente.
function copMoto() {
  const b = new GeoB(), uni = hex('#1f2f5e');
  b.tube([-0.07, 0.34, -0.78], [0.07, 0.34, -0.78], 0.34, 0.34, C.tire, 10);
  b.tube([-0.07, 0.34, 0.8], [0.07, 0.34, 0.8], 0.34, 0.34, C.tire, 10);
  b.box(0, 0.78, 0, 0.22, 0.24, 0.72, C.white);
  b.box(0, 0.86, -0.72, 0.26, 0.3, 0.12, C.blue);
  b.box(0, 1.12, -0.78, 0.22, 0.14, 0.02, C.glassL);
  b.box(0, 0.98, 0.55, 0.28, 0.18, 0.3, C.white);
  b.tube([0, 1.0, 0.1], [0, 1.62, 0.04], 0.21, 0.24, uni, 8);
  b.sph([0, 1.86, 0.02], 0.2, C.white, 0, 6, 8);
  [-1, 1].forEach((s) => {
    b.tube([s * 0.22, 1.5, 0.02], [s * 0.3, 1.2, -0.5], 0.06, 0.05, uni, 5);
    b.tube([s * 0.12, 1.02, 0.1], [s * 0.2, 0.7, -0.3], 0.08, 0.07, uni, 5);
  });
  b.box(0, 1.28, 0.62, 0.3, 0.05, 0.08, C.ink);
  return b.build();
}
// Alcantarilla sin tapadera: brocal de concreto y el hoyo negro.
function alcantarilla() {
  const b = new GeoB();
  b.tube([0, 0.0, 0], [0, 0.07, 0], 0.98, 0.92, C.concreteD, 18);
  // El hoyo va pintado (sin filo de luz) para que se vea negro desde la cámara baja.
  b.flat = -1;
  b.tube([0, 0.07, 0], [0, 0.075, 0], 0.74, 0.74, hex('#0c0909'), 18);
  b.flat = 0;
  b.curve(Array.from({length: 25}, (_, i) => [cos((i / 24) * TAU) * 0.84, 0.08, sin((i / 24) * TAU) * 0.84]), () => 0.075, C.concrete, 5);
  return b.build();
}
export const CITY_SPEC = {
  car: [car, 34, [1, 2.2]], suv: [suv, 24, [1, 2.2]], van: [van, 16, [1.05, 2.6]], cabezal: [cabezal, 10, [1.25, 7]], cone: [cone, 70, [0.3, 0.3]], barrera: [barrera, 20, [1.4, 0.4]], triangulo: [triangulo, 8, null, true],
  semaforo: [semaforo, 14, null], bulb: [bulb, 40, null, true], lampc: [lampCity, 60, null], farol: [farol, 60, null], pasarela: [pasarela, 6, null], overpass: [overpass, 4, null], gantry: [gantry, 8, null],
  jersey: [jersey, 130, null], railing: [railing, 140, null], bldA: [bldA, 50, null], bldB: [bldB, 24, null], bldC: [bldC, 50, null], colA: [colA, 60, null], colB: [colB, 50, null],
  palacio: [palacio, 2, null], catedral: [catedral, 2, null], torre: [torre, 2, null], colonia: [colonia, 30, null], jacaranda: [jacaranda, 60, [2, 2]], parada: [parada, 12, [1.8, 1]], valla: [valla, 14, null],
  shuco: [shuco, 14, [0.4, 0.3]], alcantarilla: [alcantarilla, 26, null, true], chus: [chus, 2, [0.5, 0.4]], copmoto: [copMoto, 2, [0.4, 1]],
};
