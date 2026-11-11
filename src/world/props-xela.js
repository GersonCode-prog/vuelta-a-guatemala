// Objetos de Xela: ovejas y pastora de la cumbre, escarcha, casas de adobe, milpa y cipreses;
// los edificios de piedra gris del centro, el Teatro, la catedral y el palacio del parque,
// charcos, gente con paraguas, faroles, la sheca, La Licenciada y el Brayan.
import {GeoB, hex} from '../core/geo.js';
import {TAU, cos, sin, floor, abs} from '../core/util.js';

const X = {
  stone: hex('#b3b0a8'), stoneL: hex('#d6d3ca'), stoneD: hex('#85827b'), stoneDD: hex('#5e5b55'), cream: hex('#efe6d2'),
  wood: hex('#6b3f22'), woodD: hex('#3e2414'), iron: hex('#1e1a1c'), ink: hex('#17100e'), white: hex('#fbf8f0'),
  tile: hex('#b8553a'), tileD: hex('#8e3f2c'), adobe: hex('#b98b62'), adobeD: hex('#8f6646'), adobeL: hex('#d9b48e'),
  lit: hex('#ffd27a'), glass: hex('#33404e'), lamp: hex('#ffe6a8'),
  pine: hex('#2c6a44'), cyp: hex('#1f5236'), cypD: hex('#143a26'), trunk: hex('#6e4c36'), corn: hex('#7aa64a'), cornD: hex('#4f7a32'), tassel: hex('#e8c86a'),
  wool: hex('#f4efe4'), woolD: hex('#d6cdbb'), face: hex('#2a2224'), hoof: hex('#1a1416'),
  corte: hex('#2a3f8f'), huipil: hex('#7a2a8e'), huipil2: hex('#d8263c'), perraje: hex('#e05a2a'), skin: hex('#a86a44'), skinL: hex('#d9a27a'), hair: hex('#1e1614'),
  frost: hex('#e9f3ff'), frostD: hex('#bcd0ea'), puddle: hex('#26303e'), puddleL: hex('#5a6b80'), shine: hex('#fff2cf'),
  bread: hex('#8a5428'), breadL: hex('#c08446'), breadD: hex('#5e3418'), sesame: hex('#f3e3b8'), cup: hex('#fff3d6'), choco: hex('#4a2414'),
  red: hex('#e3262f'), oro: hex('#ffc91f'), turq: hex('#12b5b0'), blue: hex('#1b62c9'), green: hex('#2bae56'), pink: hex('#ff5d7d'), navy: hex('#25335e'),
  jacket: hex('#2b2f3a'), jeans: hex('#3a5a8a'), suit: hex('#3d2c5a'), blouse: hex('#fff6ea'), folder: hex('#ffc91f'),
};

// ── La cumbre ──
// Oveja de lana gruesa, cara negra. Mira a -z; el cuadro B mueve las patas.
function oveja(step) {
  const b = new GeoB();
  [[0, 0.64, 0.02, 0.36, 0.3, 0.46], [0.16, 0.72, -0.22, 0.2, 0.2, 0.2], [-0.16, 0.72, -0.2, 0.2, 0.2, 0.2], [0.17, 0.7, 0.24, 0.2, 0.2, 0.2], [-0.15, 0.71, 0.26, 0.2, 0.2, 0.2], [0, 0.86, 0.02, 0.24, 0.16, 0.34]].forEach(([x, y, z, rx, ry, rz], i) =>
    b.sph([x, y, z], [rx, ry, rz], i % 2 ? X.woolD : X.wool, 0, 6, 8));
  b.sph([0, 0.74, -0.56], [0.12, 0.14, 0.17], X.face, 0, 6, 8);
  b.sph([0, 0.86, -0.5], [0.12, 0.07, 0.1], X.wool, 0, 4, 6);
  [-1, 1].forEach((s) => {
    b.sph([s * 0.14, 0.8, -0.5], [0.08, 0.03, 0.04], X.face, 0, 4, 5);
    b.sph([s * 0.055, 0.78, -0.68], 0.022, X.white, 0.3, 3, 4);
  });
  const sw = step ? 0.09 : -0.09;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => {
    const o = (i === 0 || i === 3 ? 1 : -1) * sw;
    b.tube([sx * 0.15, 0.42, sz * 0.26], [sx * 0.15, 0.04, sz * 0.26 + o], 0.045, 0.04, X.face, 5);
    b.sph([sx * 0.15, 0.03, sz * 0.26 + o], [0.05, 0.03, 0.06], X.hoof, 0, 3, 5);
  });
  b.sph([0, 0.7, 0.5], 0.09, X.wool, 0, 4, 5);
  return b.build();
}
// Pastora con corte, huipil, perraje naranja y su vara. Mira a -z.
function pastora() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 0.82, 0], 0.3, 0.24, (ta) => (ta < 0.12 ? X.navy : X.corte), 9);
  b.tube([0, 0.82, 0], [0, 1.36, 0], 0.24, 0.2, X.huipil, 9);
  b.tube([0, 1.0, 0], [0, 1.06, 0], 0.245, 0.245, X.oro, 9);
  b.tube([0, 1.18, 0.02], [0, 1.38, 0.04], 0.27, 0.23, X.perraje, 9);
  b.sph([0, 1.56, 0], [0.14, 0.16, 0.15], X.skin, 0, 6, 8);
  b.sph([0, 1.62, 0.03], [0.15, 0.13, 0.15], X.hair, 0, 5, 7);
  b.box(0, 1.73, 0.02, 0.15, 0.03, 0.15, X.huipil2);
  b.curve([[0, 1.55, 0.13], [0, 1.3, 0.2], [0.02, 1.05, 0.2]], () => 0.035, X.hair, 4);
  b.tube([0.3, 1.22, -0.1], [0.36, 0.95, -0.2], 0.05, 0.045, X.huipil, 5);
  b.tube([0.4, 1.75, -0.24], [0.34, 0, -0.18], 0.025, 0.025, X.wood, 5);
  return b.build();
}
// Escarcha en el asfalto: parches blancos con brillitos. Pintada, sin luz propia.
function escarcha() {
  const b = new GeoB();
  b.painted = true;
  [[0, 0, 1, 1], [0.5, 0.45, 0.6, 0.55], [-0.45, -0.5, 0.65, 0.5], [0.3, -0.62, 0.5, 0.4], [-0.55, 0.5, 0.5, 0.45]].forEach(([x, z, rx, rz], i) => {
    const pts = [];
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * TAU, r = 1 + 0.14 * sin(a * 3 + i) + 0.08 * sin(a * 5 + i * 2);
      pts.push([x + cos(a) * rx * r, 0.02 + i * 0.002, z + sin(a) * rz * r]);
    }
    b.loft([pts.map((q) => [q[0] * 0.3 + x * 0.7, q[1], q[2] * 0.3 + z * 0.7]), pts], i % 2 ? X.frostD : X.frost, 0.12);
  });
  for (let i = 0; i < 16; i++) {
    const a = i * 2.39, r = 0.15 + ((i * 37) % 70) / 100;
    b.box(cos(a) * r, 0.03, sin(a) * r * 1.1, 0.025, 0.004, 0.025, X.white, 1.4);
  }
  return b.build();
}
// Casa de adobe con techo de teja, puerta de madera y una ventanita. Frente a +z.
function adobe() {
  const b = new GeoB(), hx = 3.4, hz = 2.6, h = 2.5;
  b.box(0, h / 2, 0, hx, h / 2, hz, X.adobe);
  b.box(0, 0.35, hz + 0.02, hx + 0.02, 0.35, 0.03, X.adobeD);
  for (let i = 0; i < 6; i++) b.box(-hx + 0.6 + i * 1.15, 1.2 + (i % 2) * 0.5, hz + 0.02, 0.36, 0.08, 0.02, X.adobeL);
  const rw = hx + 0.55, rz = hz + 0.7, top = h + 1.5;
  const ring = [[-rw, h - 0.1, -rz], [rw, h - 0.1, -rz], [rw, h - 0.1, rz], [-rw, h - 0.1, rz]].map((q) => b.vert(q, X.tile));
  const r0 = b.vert([-rw, top, 0], X.tileD), r1 = b.vert([rw, top, 0], X.tileD);
  const ref = [0, h + 0.3, 0];
  b.tri(ring[0], ring[1], r1, ref);
  b.tri(ring[0], r1, r0, ref);
  b.tri(ring[3], ring[2], r1, ref);
  b.tri(ring[3], r1, r0, ref);
  b.tri(ring[0], ring[3], r0, ref);
  b.tri(ring[1], ring[2], r1, ref);
  b.box(-1.2, 0.95, hz + 0.04, 0.5, 0.95, 0.04, X.wood);
  b.box(-1.2, 0.95, hz + 0.07, 0.02, 0.85, 0.02, X.woodD);
  b.box(1.4, 1.5, hz + 0.04, 0.42, 0.36, 0.04, X.woodD);
  b.box(1.4, 1.5, hz + 0.06, 0.36, 0.3, 0.02, X.lit, 1.1);
  // Corredor con horcones
  [-1, 1].forEach((s) => b.tube([s * (hx - 0.2), 0, hz + 1.3], [s * (hx - 0.2), h - 0.1, hz + 1.3], 0.08, 0.08, X.woodD, 5));
  return b.build();
}
// Mata de milpa: tallos, hojas y espiga. Ligera: van por cientos.
function milpa() {
  const b = new GeoB();
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4, r = 0.25 + (i % 2) * 0.2, x = cos(a) * r, z = sin(a) * r, h = 1.7 + (i % 3) * 0.25;
    b.tube([x, 0, z], [x * 1.1, h, z * 1.1], 0.035, 0.022, X.cornD, 4);
    for (let k = 0; k < 3; k++) {
      const y = 0.5 + k * 0.42, la = a + k * 2.1;
      b.leaf([[x, y, z], [x + cos(la) * 0.35, y + 0.22, z + sin(la) * 0.35], [x + cos(la) * 0.62, y + 0.05, z + sin(la) * 0.62]], [-sin(la), 0, cos(la)], 0.06, k % 2 ? X.corn : X.cornD);
    }
    b.tube([x * 1.1, h, z * 1.1], [x * 1.1, h + 0.28, z * 1.1], 0.02, 0.005, X.tassel, 3);
  }
  return b.build();
}
// Ciprés: cono alto, oscuro.
function cipres() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 1.2, 0], 0.2, 0.16, X.trunk, 6);
  [[0.9, 3.0, 1.15], [2.6, 4.3, 0.95], [4.6, 3.7, 0.7], [6.6, 2.6, 0.42]].forEach(([y, h, r], i) => b.tube([0, y, 0], [0, y + h, 0], r, 0.04, i % 2 ? X.cypD : X.cyp, 9));
  return b.build();
}

// ── El centro de Xela: piedra gris, cornisas, pilastras y balcones de hierro. Fachada a +z, 9.2 de ancho. ──
function neo(kind) {
  const b = new GeoB(), hx = 4.6, hz = 4.4, H = kind ? 8.2 : 7.2, lit = kind === 1;
  b.box(0, H / 2, 0, hx, H / 2, hz, X.stone);
  b.box(0, 0.45, hz + 0.04, hx + 0.02, 0.45, 0.06, X.stoneD);
  b.box(0, 3.7, hz + 0.08, hx + 0.04, 0.12, 0.1, X.stoneL);
  b.box(0, H - 0.18, hz + 0.14, hx + 0.12, 0.2, 0.18, X.stoneL);
  b.box(0, H + 0.06, hz + 0.08, hx + 0.08, 0.06, 0.12, X.stoneD);
  // Pretil con balaustres
  b.box(0, H + 0.62, hz - 0.12, hx, 0.08, 0.12, X.stoneL);
  b.box(0, H + 0.14, hz - 0.12, hx, 0.04, 0.12, X.stoneL);
  for (let i = 0; i < 14; i++) b.tube([-hx + 0.4 + i * 0.63, H + 0.16, hz - 0.12], [-hx + 0.4 + i * 0.63, H + 0.56, hz - 0.12], 0.07, 0.07, X.stone, 5);
  const xs = [-3.05, 0, 3.05];
  // Pilastras o columnas entre los vanos
  [-hx + 0.28, -1.52, 1.52, hx - 0.28].forEach((x) => {
    if (kind === 1 && abs(x) < 2) {
      b.tube([x, 0.9, hz + 0.32], [x, 3.55, hz + 0.32], 0.2, 0.18, X.stoneL, 10);
      b.box(x, 3.6, hz + 0.32, 0.26, 0.06, 0.26, X.stoneL);
    } else b.box(x, H / 2, hz + 0.1, 0.2, H / 2 - 0.1, 0.07, X.stoneL);
  });
  // Planta baja: puertas de arco
  xs.forEach((x, i) => {
    const w = i === 1 ? 0.78 : 0.58, h = i === 1 ? 2.3 : 1.7, y0 = i === 1 ? 0 : 0.9;
    b.box(x, y0 + h / 2, hz + 0.05, w + 0.12, h / 2, 0.04, X.stoneL);
    b.tube([x, y0 + h, hz + 0.03], [x, y0 + h, hz + 0.09], w + 0.12, w + 0.12, X.stoneL, 14);
    b.box(x, y0 + h / 2, hz + 0.08, w, h / 2, 0.03, i === 1 ? X.wood : lit ? X.lit : X.glass, i !== 1 && lit ? 1.1 : 0);
    b.tube([x, y0 + h, hz + 0.08], [x, y0 + h, hz + 0.11], w, w, i === 1 ? X.woodD : lit ? X.lit : X.glass, 14, i !== 1 && lit ? 1.1 : 0);
    if (i !== 1) for (let k = -2; k <= 2; k++) b.box(x + k * 0.22, y0 + h / 2 + 0.2, hz + 0.14, 0.014, h / 2 + 0.2, 0.014, X.iron);
  });
  // Planta alta: ventanas altas con frontón y balcón
  xs.forEach((x, i) => {
    const y = 5.6 + (kind ? 0.4 : 0), on = (kind + i) % 2 === 0;
    b.box(x, y, hz + 0.06, 0.62, 1.05, 0.04, X.stoneL);
    b.box(x, y, hz + 0.09, 0.5, 0.92, 0.03, on ? X.lit : X.glass, on ? 1.2 : 0);
    b.box(x, y, hz + 0.12, 0.02, 0.92, 0.02, X.woodD);
    const t0 = b.vert([x - 0.78, y + 1.12, hz + 0.16], X.stoneL), t1 = b.vert([x + 0.78, y + 1.12, hz + 0.16], X.stoneL), t2 = b.vert([x, y + 1.55, hz + 0.16], X.stoneL);
    b.tri(t0, t1, t2, [x, y + 1.3, hz - 1]);
    b.box(x, y + 1.1, hz + 0.12, 0.8, 0.05, 0.08, X.stoneL);
    b.box(x, y - 1.12, hz + 0.42, 0.78, 0.05, 0.36, X.stoneD);
    for (let k = -4; k <= 4; k++) b.box(x + k * 0.18, y - 0.82, hz + 0.76, 0.012, 0.28, 0.012, X.iron);
    b.box(x, y - 0.55, hz + 0.76, 0.76, 0.025, 0.02, X.iron);
  });
  return b.build();
}
// Teatro Municipal: escalinata, seis columnas y frontón. Fachada a +z.
function teatro() {
  const b = new GeoB(), hx = 9, hz = 7, H = 11;
  b.box(0, H / 2, -1, hx, H / 2, hz, X.cream);
  for (let i = 0; i < 4; i++) b.box(0, 0.18 + i * 0.36, hz + 2.6 - i * 0.45, hx - 1.5, 0.18 + i * 0.36, 0.5 + i * 0.1, X.stoneL);
  b.box(0, 1.5, hz + 1.6, hx - 1.4, 0.1, 1.4, X.stoneL);
  for (let i = 0; i < 6; i++) {
    const x = -6.25 + i * 2.5;
    b.tube([x, 1.6, hz + 2.2], [x, 8.4, hz + 2.2], 0.42, 0.36, X.white, 12);
    b.box(x, 8.5, hz + 2.2, 0.55, 0.12, 0.55, X.stoneL);
    b.box(x, 1.7, hz + 2.2, 0.55, 0.12, 0.55, X.stoneL);
  }
  b.box(0, 8.9, hz + 1.5, hx - 1.2, 0.35, 1.3, X.cream);
  const p0 = b.vert([-hx + 1, 9.25, hz + 2.7], X.cream), p1 = b.vert([hx - 1, 9.25, hz + 2.7], X.cream), p2 = b.vert([0, 11.6, hz + 2.7], X.cream);
  b.tri(p0, p1, p2, [0, 10, 0]);
  const q0 = b.vert([-hx + 1, 9.25, hz + 0.2], X.stoneL), q1 = b.vert([0, 11.6, hz + 0.2], X.stoneL), q2 = b.vert([hx - 1, 9.25, hz + 0.2], X.stoneL);
  b.tri(p0, p2, q1, [0, 9, hz - 3]);
  b.tri(p0, q1, q0, [0, 9, hz - 3]);
  b.tri(p1, q2, q1, [0, 9, hz - 3]);
  b.tri(p1, q1, p2, [0, 9, hz - 3]);
  b.box(0, 9.9, hz + 2.75, 1.0, 0.35, 0.03, X.oro);
  [-3.75, 0, 3.75].forEach((x, i) => {
    b.box(x, 3.4, hz + 0.05, i === 1 ? 1.0 : 0.75, i === 1 ? 1.8 : 1.4, 0.06, X.wood);
    b.box(x, 6.6, hz + 0.05, 0.7, 0.95, 0.06, X.lit, 1.3);
  });
  return b.build();
}
// La fachada vieja de la catedral, con la iglesia nueva y su cúpula detrás. Fachada a +z.
function catedralX() {
  const b = new GeoB(), w = 7.5;
  b.box(0, 7, -9, 6.5, 7, 9, X.stone);
  b.tube([0, 14, -9], [0, 14.5, -9], 4.6, 4.6, X.stoneL, 16);
  b.sph([0, 14.5, -9], [4.4, 4.8, 4.4], (a) => (a < 0.5 ? X.stoneD : X.stone), 0, 8, 16);
  b.tube([0, 19, -9], [0, 21.5, -9], 0.7, 0.5, X.stoneL, 8);
  b.tube([0, 21.5, -9], [0, 23.2, -9], 0.06, 0.06, X.ink, 4);
  b.box(0, 22.8, -9, 0.5, 0.06, 0.06, X.ink);
  // La fachada colonial: tres cuerpos de columnas y nichos
  b.box(0, 8, 0, w, 8, 0.7, X.cream);
  b.box(0, 0.4, 0.8, w + 0.3, 0.4, 0.2, X.stoneD);
  [3.2, 7.4, 11.6].forEach((y, k) => {
    b.box(0, y + 2.1, 0.9, w + 0.1, 0.18, 0.25, X.stoneL);
    [-5.6, -2.2, 2.2, 5.6].forEach((x) => b.tube([x, y - 2.0 + (k ? 0.1 : 0), 1.0], [x, y + 1.9, 1.0], 0.34 - k * 0.04, 0.3 - k * 0.04, X.white, 10));
    [-3.9, 3.9].forEach((x) => {
      b.box(x, y, 0.78, 0.65, 1.1, 0.1, X.stoneD);
      b.tube([x, y + 1.1, 0.78], [x, y + 1.1, 0.88], 0.65, 0.65, X.stoneD, 12);
      b.sph([x, y - 0.1, 0.9], [0.28, 0.75, 0.2], X.white, 0, 5, 7);
    });
  });
  b.box(0, 2.0, 0.78, 1.25, 2.0, 0.1, X.woodD);
  b.tube([0, 4.0, 0.76], [0, 4.0, 0.88], 1.25, 1.25, X.woodD, 14);
  b.box(0, 7.4, 0.9, 1.0, 1.0, 0.08, X.lit, 0.9);
  const g0 = b.vert([-w, 16, 0.72], X.cream), g1 = b.vert([w, 16, 0.72], X.cream), g2 = b.vert([0, 19.2, 0.72], X.cream);
  b.tri(g0, g1, g2, [0, 17, -1]);
  const h0 = b.vert([-w, 16, -0.7], X.cream), h1 = b.vert([0, 19.2, -0.7], X.cream), h2 = b.vert([w, 16, -0.7], X.cream);
  b.tri(g0, g2, h1, [0, 16, 0]);
  b.tri(g0, h1, h0, [0, 16, 0]);
  b.tri(g1, h2, h1, [0, 16, 0]);
  b.tri(g1, h1, g2, [0, 16, 0]);
  b.tube([0, 19.2, 0.6], [0, 21, 0.6], 0.06, 0.06, X.ink, 4);
  b.box(0, 20.5, 0.6, 0.45, 0.06, 0.06, X.ink);
  return b.build();
}
// Palacio Municipal: dos pisos y un pórtico de columnas al centro. Fachada a +z.
function palacioX() {
  const b = new GeoB(), hx = 14, hz = 5, H = 9;
  b.box(0, H / 2, 0, hx, H / 2, hz, X.stone);
  b.box(0, 0.5, hz + 0.05, hx + 0.05, 0.5, 0.08, X.stoneD);
  b.box(0, 4.6, hz + 0.1, hx + 0.05, 0.14, 0.1, X.stoneL);
  b.box(0, H - 0.15, hz + 0.2, hx + 0.15, 0.2, 0.22, X.stoneL);
  for (let i = 0; i < 11; i++) {
    const x = -12.5 + i * 2.5;
    if (abs(x) < 4) continue;
    b.box(x, 2.5, hz + 0.07, 0.5, 1.2, 0.04, X.lit, 1.0);
    b.box(x, 6.6, hz + 0.07, 0.5, 1.0, 0.04, X.lit, 1.0);
    b.box(x, 7.75, hz + 0.12, 0.65, 0.08, 0.08, X.stoneL);
  }
  for (let i = 0; i < 6; i++) {
    const x = -3.75 + i * 1.5;
    b.tube([x, 1.0, hz + 1.6], [x, 7.9, hz + 1.6], 0.3, 0.26, X.white, 10);
  }
  b.box(0, 8.2, hz + 1.2, 4.6, 0.3, 1.0, X.stoneL);
  const p0 = b.vert([-4.6, 8.5, hz + 2.2], X.stoneL), p1 = b.vert([4.6, 8.5, hz + 2.2], X.stoneL), p2 = b.vert([0, 10.4, hz + 2.2], X.stoneL);
  b.tri(p0, p1, p2, [0, 9, 0]);
  const q0 = b.vert([-4.6, 8.5, hz], X.stoneL), q1 = b.vert([0, 10.4, hz], X.stoneL), q2 = b.vert([4.6, 8.5, hz], X.stoneL);
  b.tri(p0, p2, q1, [0, 8, hz - 2]);
  b.tri(p0, q1, q0, [0, 8, hz - 2]);
  b.tri(p1, q2, q1, [0, 8, hz - 2]);
  b.tri(p1, q1, p2, [0, 8, hz - 2]);
  b.box(0, 9.2, hz + 2.25, 0.7, 0.35, 0.03, X.white);
  b.tube([0, 10.4, hz + 1], [0, 13, hz + 1], 0.04, 0.04, X.ink, 4);
  b.box(0.5, 12.6, hz + 1, 0.45, 0.32, 0.02, X.blue);
  b.box(0.5, 12.6, hz + 1.01, 0.15, 0.32, 0.02, X.white);
  return b.build();
}
// Farol de hierro con globo de luz
function faroX() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 0.5, 0], 0.16, 0.12, X.iron, 7);
  b.tube([0, 0.5, 0], [0, 3.6, 0], 0.07, 0.055, X.iron, 6);
  [-1, 1].forEach((s) => b.curve([[0, 3.3, 0], [s * 0.35, 3.5, 0], [s * 0.5, 3.75, 0]], () => 0.03, X.iron, 4));
  b.sph([0, 3.95, 0], 0.26, X.lamp, 3.4, 6, 8);
  [-0.5, 0.5].forEach((x) => b.sph([x, 3.92, 0], 0.17, X.lamp, 3.2, 5, 7));
  b.tube([0, 4.2, 0], [0, 4.36, 0], 0.05, 0.02, X.iron, 5);
  return b.build();
}
// Charco: agua oscura con orilla clara y el reflejo de un farol.
function charco() {
  const b = new GeoB();
  b.painted = true;
  const edge = [], mid = [], core = [];
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * TAU, r = 1 + 0.12 * sin(a * 3 + 1) + 0.07 * sin(a * 5);
    edge.push([cos(a) * r, 0.015, sin(a) * r]);
    mid.push([cos(a) * r * 0.86, 0.018, sin(a) * r * 0.86]);
    core.push([cos(a) * r * 0.2, 0.02, sin(a) * r * 0.2]);
  }
  b.loft([mid, edge], X.puddleL, 0.05, false);
  b.loft([core, mid], X.puddle, 0, true);
  b.box(0.25, 0.024, -0.1, 0.05, 0.003, 0.5, X.shine, 0.8);
  b.box(-0.3, 0.024, 0.2, 0.03, 0.003, 0.28, X.shine, 0.5);
  return b.build();
}
// Gente con paraguas, caminando. Mira a -z; B es el otro paso.
function paraguas(step) {
  const b = new GeoB();
  const sw = step ? 0.1 : -0.1;
  [-1, 1].forEach((s) => b.tube([s * 0.1, 0.78, 0], [s * 0.1, 0, s * sw], 0.08, 0.07, X.jeans, 6));
  b.tube([0, 0.76, 0], [0, 1.36, 0], 0.21, 0.23, X.jacket, 8);
  b.sph([0, 1.56, 0], 0.16, X.skinL, 0, 6, 8);
  b.sph([0, 1.62, 0.03], [0.165, 0.12, 0.165], X.hair, 0, 5, 7);
  b.tube([0.22, 1.3, 0], [0.3, 1.6, -0.06], 0.055, 0.05, X.jacket, 5);
  b.tube([0.3, 1.6, -0.06], [0.28, 2.3, -0.08], 0.018, 0.018, X.iron, 4);
  const rings = [];
  for (const [r, y] of [[0.03, 2.5], [0.75, 2.28], [0.92, 2.12]]) {
    const o = [];
    for (let i = 0; i < 16; i++) o.push([0.28 + cos((i / 16) * TAU) * r, y, -0.08 + sin((i / 16) * TAU) * r]);
    rings.push(o);
  }
  b.loft(rings, (ta, tb) => (floor(tb * 8) % 2 ? X.white : X.red));
  return b.build();
}
// Sheca: pan de Xela, redondo y moreno, con su humito.
function sheca() {
  const b = new GeoB();
  b.sph([0, 0, 0], [0.42, 0.26, 0.42], (a) => (a < 0.25 ? X.breadL : a < 0.6 ? X.bread : X.breadD), 0.15, 7, 12);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39, r = 0.08 + (i % 4) * 0.07;
    b.sph([cos(a) * r, 0.23 + 0.02 * (1 - r), sin(a) * r], [0.03, 0.012, 0.018], X.sesame, 0.3, 3, 4);
  }
  [[0.0, 0.48, 0.04, 0.1], [0.07, 0.64, -0.02, 0.08], [-0.03, 0.78, 0.02, 0.07]].forEach(([x, y, z, r]) => b.sph([x, y, z], r, X.white, 0.3, 4, 6));
  return b.build();
}
// ── La llegada al parque ──
// La Licenciada: lentes, moño, saco morado y su folder. Mira a +z, saluda.
function licenciada() {
  const b = new GeoB();
  [-1, 1].forEach((s) => {
    b.tube([s * 0.1, 0, 0], [s * 0.1, 0.62, 0], 0.06, 0.075, X.skinL, 6);
    b.box(s * 0.1, 0.03, 0.04, 0.06, 0.03, 0.11, X.ink);
  });
  b.tube([0, 0.5, 0], [0, 0.95, 0], 0.26, 0.2, X.suit, 9);
  b.tube([0, 0.92, 0], [0, 1.42, 0], 0.21, 0.24, X.suit, 9);
  b.box(0, 1.25, 0.2, 0.08, 0.16, 0.02, X.blouse);
  b.sph([0, 1.64, 0], [0.15, 0.17, 0.15], X.skinL, 0, 6, 8);
  b.sph([0, 1.7, -0.03], [0.16, 0.14, 0.15], X.hair, 0, 5, 7);
  b.sph([0, 1.84, -0.1], 0.09, X.hair, 0, 5, 6);
  [-1, 1].forEach((s) => {
    b.sph([s * 0.06, 1.66, 0.145], [0.045, 0.035, 0.01], X.white, 0.4, 4, 6);
    b.box(s * 0.06, 1.66, 0.15, 0.05, 0.004, 0.006, X.ink);
  });
  b.box(0, 1.66, 0.152, 0.02, 0.006, 0.006, X.ink);
  b.box(0, 1.57, 0.15, 0.04, 0.008, 0.006, X.red);
  b.tube([-0.25, 1.38, 0], [-0.3, 0.95, 0.12], 0.06, 0.05, X.suit, 5);
  b.box(-0.3, 0.98, 0.18, 0.03, 0.2, 0.16, X.folder);
  b.tube([0.25, 1.38, 0], [0.45, 1.95, 0], 0.06, 0.05, X.suit, 5);
  b.sph([0.47, 2.0, 0], 0.06, X.skinL, 0, 4, 5);
  return b.build();
}
// El Brayan: chumpa, gorra para atrás y una bolsa de shecas.
function brayan() {
  const b = new GeoB();
  [-1, 1].forEach((s) => {
    b.tube([s * 0.11, 0, 0], [s * 0.11, 0.84, 0], 0.08, 0.095, X.jeans, 6);
    b.box(s * 0.11, 0.04, 0.05, 0.08, 0.04, 0.13, X.white);
  });
  b.tube([0, 0.82, 0], [0, 1.45, 0], 0.24, 0.26, X.red, 9);
  b.box(0, 1.15, 0.24, 0.02, 0.28, 0.02, X.oro);
  b.sph([0, 1.66, 0], 0.16, X.skin, 0, 6, 8);
  b.sph([0, 1.74, 0.02], [0.17, 0.09, 0.17], X.ink, 0, 5, 7);
  b.box(0, 1.73, -0.2, 0.1, 0.02, 0.08, X.ink);
  [-1, 1].forEach((s) => b.box(s * 0.06, 1.68, 0.15, 0.02, 0.025, 0.01, X.ink));
  b.tube([-0.27, 1.4, 0], [-0.4, 0.95, 0.1], 0.07, 0.06, X.red, 5);
  b.box(-0.42, 0.85, 0.12, 0.13, 0.15, 0.08, X.white);
  b.box(-0.42, 0.92, 0.2, 0.08, 0.04, 0.01, X.oro);
  b.tube([0.27, 1.4, 0], [0.42, 1.98, 0.05], 0.07, 0.06, X.red, 5);
  b.sph([0.43, 2.03, 0.05], 0.065, X.skin, 0, 4, 5);
  return b.build();
}
// Taza de chocolate en la mesita del parque
function mesita() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 0.72, 0], 0.05, 0.05, X.iron, 5);
  b.tube([0, 0.72, 0], [0, 0.76, 0], 0.42, 0.42, X.white, 12);
  b.tube([0.12, 0.76, 0.05], [0.12, 0.88, 0.05], 0.07, 0.08, X.cup, 8);
  b.tube([0.12, 0.88, 0.05], [0.12, 0.885, 0.05], 0.07, 0.07, X.choco, 8);
  b.sph([-0.12, 0.82, -0.05], [0.13, 0.07, 0.13], X.bread, 0, 5, 8);
  b.sph([-0.16, 0.8, 0.12], [0.11, 0.06, 0.11], X.breadD, 0, 5, 8);
  return b.build();
}

// nombre → modelo, cupo, sombra [rx,rz], sin contorno
export const XELA_SPEC = {
  oveja: [() => oveja(0), 24, [0.42, 0.55]], ovejaB: [() => oveja(1), 24, [0.42, 0.55]], pastora: [pastora, 8, [0.4, 0.35]], escarcha: [escarcha, 16, null, true],
  adobe: [adobe, 40, null], milpa: [milpa, 150, null, true], cipres: [cipres, 120, [1.2, 1.2]],
  neoA: [() => neo(0), 90, null], neoB: [() => neo(1), 60, null], teatro: [teatro, 2, null], catedralX: [catedralX, 2, null], palacioX: [palacioX, 2, null],
  faroX: [faroX, 60, null], charco: [charco, 16, null, true], paraguas: [() => paraguas(0), 24, [0.45, 0.4]], paraguasB: [() => paraguas(1), 24, [0.45, 0.4]],
  sheca: [sheca, 12, [0.3, 0.3]], licenciada: [licenciada, 2, [0.45, 0.4]], brayan: [brayan, 2, [0.45, 0.4]], mesita: [mesita, 4, [0.45, 0.45]],
};
// Para el que quiera pintar con los mismos colores (el jefe).
export const XELA_COL = X;
