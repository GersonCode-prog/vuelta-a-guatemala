// Objetos del lago de Atitlán: lanchas, cayucos, kayaks, boyas, redes de pescador, muelles, olas,
// casas y árboles de la orilla, la plataforma de San Marcos, Don Chema y el cafecito de San Pedro.
import {GeoB, hex, mixC} from '../core/geo.js';
import {TAU, PI, cos, sin, floor, lerp} from '../core/util.js';

const L = {
  hull: hex('#fbfaf6'), blue: hex('#1b62c9'), blueD: hex('#164c9a'), red: hex('#e3262f'), redD: hex('#a8182a'), turq: hex('#12a5b8'), oro: hex('#ffc91f'),
  ink: hex('#17100e'), wood: hex('#8a5a33'), woodD: hex('#5a3820'), woodL: hex('#b8854f'), rope: hex('#e8dcc0'), gray: hex('#8e939c'), grayD: hex('#3c4048'),
  skin: hex('#a86a44'), skinL: hex('#d9a27a'), hair: hex('#1e1614'), straw: hex('#e0bf6a'), strawD: hex('#b8913c'), shirt: hex('#f3efe6'), navy: hex('#25335e'),
  canopy: hex('#1f86c8'), orange: hex('#ff7a1a'), yellow: hex('#ffd23a'), green: hex('#2bae56'), leaf: hex('#2f7a3e'), leafD: hex('#1f5a2e'), leafL: hex('#4f9a4a'), trunk: hex('#6d4a33'),
  foam: hex('#f4f8f6'), wave: hex('#4fa8c4'), waveD: hex('#1f6688'), stone: hex('#8d8a84'), stoneD: hex('#5e5b57'), corte: hex('#2a3f8f'), huipil: hex('#7a2a8e'),
  cup: hex('#d8262c'), coffee: hex('#3a2014'), white: hex('#fff6e6'), wall: hex('#fbf3e4'), tin: hex('#9aa3ad'), tinR: hex('#b8553a'), thatch: hex('#c9a45a'), thatchD: hex('#9a7a3c'),
};
const SHIRTS = [hex('#ff8a8a'), hex('#8cc8ff'), hex('#ffe08a'), hex('#9ae89a'), hex('#ffb0d8'), hex('#fff6e6'), hex('#ffb35c')];

// ── Cascos: secciones de proa (-z) a popa (+z), [z, medio ancho, cubierta, quilla] ──
// La sección es una V con pantoque, cubierta plana arriba y dos franjas: la de color y la pintura del fondo.
const SEC = [[1, 1, 0], [1, 0.86, 0], [0.995, 0.84, 1], [0.98, 0.7, 1], [0.975, 0.68, 0], [0.93, 0.48, 0], [0.92, 0.46, 2], [0.75, 0.26, 2], [0.45, 0.09, 2], [0, 0, 2]];
function hullRing(z, w, top, bot) {
  const pts = [], cls = [];
  for (const [xn, yn, c] of SEC) {
    pts.push([xn * w, bot + yn * (top - bot), z]);
    cls.push(c);
  }
  for (let i = SEC.length - 2; i >= 0; i--) {
    const [xn, yn, c] = SEC[i];
    pts.push([-xn * w, bot + yn * (top - bot), z]);
    cls.push(c);
  }
  for (const xn of [-0.5, 0, 0.5]) {
    pts.push([xn * w, top, z]);
    cls.push(0);
  }
  return {pts, cls};
}
// pal: [costado, franja, fondo]
export function hullInto(b, secs, pal) {
  const rings = secs.map(([z, w, top, bot]) => hullRing(z, w, top, bot));
  const cls = rings[0].cls, N = cls.length;
  b.loft(rings.map((r) => r.pts), (ta, tb) => pal[cls[Math.round(tb * N) % N]]);
}
// Piso adentro del casco, en franjas entre secciones.
export function deckInto(b, secs, inset, dy, col, from = 0, to = secs.length - 1) {
  for (let i = from; i < to; i++) {
    const [z0, w0, t0] = secs[i], [z1, w1, t1] = secs[i + 1];
    const a = b.vert([-w0 * inset, t0 + dy, z0], col), c = b.vert([w0 * inset, t0 + dy, z0], col);
    const d = b.vert([w1 * inset, t1 + dy, z1], col), e = b.vert([-w1 * inset, t1 + dy, z1], col);
    const ref = [0, (t0 + t1) / 2 + dy - 1, (z0 + z1) / 2];
    b.tri(a, c, d, ref);
    b.tri(a, d, e, ref);
  }
}
// Borda redondeada que sigue el contorno.
export function railInto(b, secs, r, col, dy = 0.03, k = 0.97) {
  [-1, 1].forEach((s) => b.curve(secs.map(([z, w, top]) => [s * w * k, top + dy, z]), () => r, col, 5));
}
// Persona sentada vista de lejos: tronco, cabeza y sombrero opcional.
function sitter(b, x, y, z, shirt, hat) {
  b.tube([x, y, z], [x, y + 0.5, z + 0.04], 0.17, 0.15, shirt, 7);
  b.sph([x, y + 0.66, z], 0.13, L.skin, 0, 5, 7);
  if (hat) b.tube([x, y + 0.76, z], [x, y + 0.8, z], 0.24, 0.14, L.straw, 9);
  else b.sph([x, y + 0.72, z + 0.02], [0.13, 0.08, 0.13], L.hair, 0, 4, 6);
}

// ── La lancha pública: larga, con toldo azul y pasajeros ──
const PUB = [[-3.7, 0.04, 0.95, 0.5], [-3.2, 0.5, 0.9, 0.0], [-2.4, 0.95, 0.84, -0.22], [-1.2, 1.18, 0.78, -0.34], [0.4, 1.25, 0.74, -0.38], [2.2, 1.22, 0.72, -0.38], [3.9, 1.12, 0.72, -0.34]];
function lanchaP() {
  const b = new GeoB();
  hullInto(b, PUB, [L.hull, L.blue, L.redD]);
  deckInto(b, PUB, 0.9, 0.012, L.gray, 1);
  railInto(b, PUB, 0.05, L.blueD);
  // Toldo sobre postes
  [-1, 1].forEach((s) => [-1.6, 0.6, 2.8].forEach((z) => b.tube([s * 1.0, 0.75, z], [s * 0.98, 2.05, z], 0.035, 0.035, L.white, 5)));
  b.box(0, 2.08, 0.6, 1.12, 0.05, 2.5, L.canopy);
  b.box(0, 2.0, 0.6, 1.14, 0.06, 2.52, L.white);
  for (let i = 0; i < 13; i++) [-1, 1].forEach((s) => b.box(s * 1.15, 1.92, -1.8 + i * 0.4, 0.012, 0.07, 0.11, i % 2 ? L.oro : L.red));
  // Bancas con pasajeros
  [-1.2, 0.0, 1.2, 2.4].forEach((z, k) => {
    b.box(0, 0.9, z, 1.0, 0.04, 0.16, L.woodL);
    [-0.55, 0.05, 0.6].forEach((x, j) => {
      if ((k * 3 + j) % 4 !== 3) sitter(b, x, 0.94, z + 0.05, SHIRTS[(k * 3 + j) % SHIRTS.length], (k + j) % 3 === 0);
    });
  });
  // El lanchero atrás, con el motor
  sitter(b, 0.35, 0.86, 3.5, L.shirt, true);
  b.sph([0, 1.15, 4.2], [0.3, 0.38, 0.36], L.grayD, 0, 6, 8);
  b.box(0, 1.2, 4.2, 0.31, 0.05, 0.37, L.white);
  b.tube([0, 0.9, 4.25], [0, -0.3, 4.3], 0.07, 0.06, L.gray, 6);
  return b.build();
}
// ── Cayuco de pescador: tronco ahuecado, el pescador rema con el sombrero puesto ──
function cayuco(phase) {
  const b = new GeoB();
  const S = [[-1.9, 0.03, 0.42, 0.2], [-1.5, 0.26, 0.36, -0.04], [-0.6, 0.4, 0.32, -0.14], [0.6, 0.4, 0.32, -0.14], [1.5, 0.28, 0.34, -0.06], [1.9, 0.05, 0.4, 0.15]];
  hullInto(b, S, [L.wood, L.woodD, L.woodD]);
  deckInto(b, S, 0.8, 0.005, L.woodD, 1, 4);
  railInto(b, S, 0.035, L.woodD, 0.0, 0.92);
  // Pescador sentado, de huipil o camisa, con su sombrero
  const x = 0, y = 0.36, z = 0.5;
  b.tube([x, y, z], [x, y + 0.5, z + 0.05], 0.17, 0.14, L.shirt, 7);
  b.box(x, y + 0.24, z + 0.02, 0.172, 0.04, 0.15, L.red);
  b.sph([x, y + 0.66, z], 0.13, L.skin, 0, 5, 7);
  b.tube([x, y + 0.76, z], [x, y + 0.81, z], 0.27, 0.15, L.straw, 10);
  b.tube([x, y + 0.81, z], [x, y + 0.9, z], 0.14, 0.11, L.strawD, 8);
  // Remo: cambia de lado entre los dos cuadros
  const s = phase ? 1 : -1;
  b.tube([x + s * 0.14, y + 0.42, z - 0.1], [x + s * 0.55, y + 0.85, z - 0.35], 0.035, 0.035, L.skin, 4);
  b.tube([x + s * 0.5, y + 1.0, z - 0.3], [x + s * 0.72, y - 0.35, z + 0.25], 0.03, 0.03, L.woodL, 4);
  b.box(x + s * 0.74, y - 0.42, z + 0.3, 0.03, 0.2, 0.1, L.woodL);
  // Red enrollada adelante
  b.sph([0, 0.4, -0.9], [0.24, 0.1, 0.3], L.rope, 0, 4, 7);
  return b.build();
}
function cayucoVolcado() {
  const b = new GeoB();
  const S = [[-1.9, 0.03, 0.08, -0.25], [-1.5, 0.26, 0.12, -0.32], [-0.6, 0.4, 0.2, -0.3], [0.6, 0.4, 0.2, -0.3], [1.5, 0.28, 0.12, -0.3], [1.9, 0.05, 0.08, -0.25]];
  // Boca abajo: la quilla arriba.
  const rings = S.map(([z, w, top, bot]) => hullRing(z, w, top, bot).pts.map((p) => [p[0], top + bot - p[1] + 0.05, p[2]]));
  b.loft(rings, L.woodD);
  b.sph([0.6, 0.15, 0.4], [0.3, 0.08, 0.4], L.rope, 0, 4, 6);
  return b.build();
}
// ── Kayak de turista, con el remo doble ──
function kayak(phase) {
  const b = new GeoB();
  const S = [[-1.6, 0.03, 0.3, 0.16], [-1.1, 0.24, 0.28, -0.04], [0, 0.34, 0.26, -0.1], [1.0, 0.28, 0.26, -0.06], [1.6, 0.04, 0.28, 0.14]];
  hullInto(b, S, [L.yellow, L.ink, L.yellow]);
  b.tube([0, 0.26, 0.1], [0, 0.3, 0.1], 0.25, 0.25, L.ink, 10);
  const y = 0.24, z = 0.1;
  b.tube([0, y, z], [0, y + 0.48, z + 0.03], 0.16, 0.13, L.orange, 7);
  b.sph([0, y + 0.62, z], 0.12, L.skinL, 0, 5, 7);
  b.tube([0, y + 0.7, z], [0, y + 0.78, z - 0.05], 0.14, 0.09, L.white, 7);
  const s = phase ? 1 : -1;
  b.tube([-0.95, y + 0.55 + s * 0.28, z - 0.25], [0.95, y + 0.55 - s * 0.28, z - 0.25], 0.025, 0.025, L.ink, 4);
  [-1, 1].forEach((k) => b.box(k * 1.0, y + 0.55 - k * s * 0.3, z - 0.25, 0.06, 0.12, 0.02, L.red));
  [-1, 1].forEach((k) => b.tube([k * 0.14, y + 0.4, z - 0.05], [k * 0.38, y + 0.55 - k * s * 0.1, z - 0.25], 0.03, 0.03, L.skinL, 4));
  return b.build();
}
// ── Boyas: las chiquitas marcan el carril, la grande se pone en medio ──
function boya() {
  const b = new GeoB();
  b.sph([0, 0.12, 0], [0.22, 0.2, 0.22], (a) => (a > 0.42 && a < 0.6 ? L.white : L.orange), 0, 5, 7);
  b.tube([0, 0.3, 0], [0, 0.42, 0], 0.025, 0.02, L.ink, 4);
  return b.build();
}
// Cono o cilindro en franjas: el tubo solo tiene dos anillos, así que cada franja es su propio tramo.
function bands(b, y0, y1, r0, r1, n, colA, colB, seg = 10) {
  for (let i = 0; i < n; i++) {
    const a = i / n, c = (i + 1) / n;
    b.tube([0, lerp(y0, y1, a), 0], [0, lerp(y0, y1, c), 0], lerp(r0, r1, a), lerp(r0, r1, c), i % 2 ? colB : colA, seg);
  }
}
function boyaG() {
  const b = new GeoB();
  bands(b, -0.2, 1.0, 0.5, 0.42, 4, L.red, L.white);
  b.tube([0, 1.0, 0], [0, 1.55, 0], 0.32, 0.04, L.red, 9);
  b.sph([0, 1.6, 0], 0.09, L.oro, 1.6, 4, 5);
  b.tube([0, 0.05, 0], [0, 0.12, 0], 0.56, 0.56, L.ink, 10);
  return b.build();
}
// ── Red de pescador: corchos sobre una pita, con la red oscura debajo del agua ──
function redP(len) {
  const b = new GeoB(), n = Math.round(len / 0.36);
  b.curve(Array.from({length: 9}, (_, i) => [-len / 2 + (len * i) / 8, 0.1 + 0.025 * sin(i * 1.7), 0.03 * sin(i * 2.3)]), () => 0.02, L.rope, 4);
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + (len * i) / n;
    b.sph([x, 0.12, 0.03 * sin(i * 0.9)], [0.16, 0.12, 0.16], i % 2 === 0 ? L.orange : L.white, 0, 4, 6);
  }
  // En las puntas, la boya alta con su banderita negra, como las marcan los pescadores
  [-1, 1].forEach((s) => {
    const x = s * (len / 2 + 0.1);
    b.sph([x, 0.18, 0], 0.22, L.orange, 0, 5, 7);
    b.tube([x, 0.3, 0], [x, 1.5, 0], 0.025, 0.02, L.woodD, 4);
    b.box(x + 0.18, 1.36, 0, 0.18, 0.12, 0.01, L.ink);
  });
  return b.build();
}
function redMalla(len) {
  // La malla se ve bajo el agua: un cuadriculado oscuro y aplastado.
  const b = new GeoB();
  b.painted = true;
  const cols = Math.round(len / 0.4);
  for (let i = 0; i <= cols; i++) b.box(-len / 2 + (len * i) / cols, 0.02, 0.6, 0.012, 0.004, 0.6, L.ink);
  for (let j = 0; j <= 3; j++) b.box(0, 0.02, j * 0.4, len / 2, 0.004, 0.012, L.ink);
  return b.build();
}
function red(len) {
  // Corchos con contorno, y la malla pintada debajo del agua.
  return mergeGeo(redP(len), redMalla(len));
}
function mergeGeo(a, m) {
  const b = new GeoB();
  for (const g of [a, m]) {
    const P = g.attributes.position.array, C = g.attributes.aCol.array, F = g.attributes.aFlat.array, I = g.index.array, base = b.n;
    for (let i = 0; i < P.length / 3; i++) {
      b.flat = F[i];
      b.vert([P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], [C[i * 3], C[i * 3 + 1], C[i * 3 + 2]]);
    }
    for (let i = 0; i < I.length; i++) b.i.push(I[i] + base);
  }
  b.flat = 0;
  const g = b.build();
  const n = g.attributes.normal, f = g.attributes.aFlat;
  for (let i = 0; i < n.count; i++) if (f.getX(i) < -0.5) n.setXYZ(i, 0, 1, 0);
  return g;
}
// ── Ola: cresta de lado a lado (ancho 2, se escala), rompe hacia +z ──
export function olaInto(b, x0 = -1, x1 = 1) {
  // Perfil (z, y): espalda larga hacia -z, la cresta y el labio que cae hacia +z, hacia el que viene.
  const P = [[-1.8, 0], [-1.25, 0.24], [-0.75, 0.52], [-0.35, 0.8], [-0.05, 0.97], [0.2, 1.02], [0.4, 0.93], [0.48, 0.78], [0.38, 0.66], [0.28, 0.46], [0.2, 0.2], [0.17, 0]];
  const N = 18, rings = [], crest = [];
  for (let k = 0; k <= N; k++) {
    const x = lerp(x0, x1, k / N), hk = 0.84 + 0.12 * sin(k * 1.3 + 0.4) + 0.05 * sin(k * 3.7), zk = 0.1 * sin(k * 0.9);
    rings.push(P.map(([z, y]) => [x, y * hk, z + zk * y]).concat([[x, -0.05, 0.17], [x, -0.05, -1.8]]));
    crest.push([x, hk, zk]);
  }
  // Espalda clara, cara de la ola más oscura y la cresta blanca
  b.loft(rings, (ta, tb, q) => (q[1] > 0.8 ? L.foam : q[2] > 0.12 && q[1] > 0.04 ? L.waveD : L.wave), 0, true);
  crest.forEach(([x, hk, zk], k) => {
    b.sph([x, 0.98 * hk, 0.22 + zk], [0.17, 0.12, 0.2], L.foam, 0, 3, 6);
    if (k % 2) b.sph([x + 0.03, 0.8 * hk, 0.46 + zk], [0.1, 0.09, 0.1], L.foam, 0, 3, 5);
  });
}
function ola() {
  const b = new GeoB();
  olaInto(b);
  return b.build();
}
// ── Muelles de tablones sobre postes: de la orilla (x=0) hacia el agua (-x) ──
function muelle(len) {
  const b = new GeoB(), w = 1.2;
  b.box(-len / 2, 0.62, 0, len / 2, 0.06, w, L.woodL);
  for (let i = 0; i <= len / 0.5; i++) b.box(-i * 0.5, 0.685, 0, 0.012, 0.004, w, L.woodD);
  for (let x = 0; x <= len; x += 2) [-1, 1].forEach((s) => b.tube([-x, -0.6, s * (w - 0.1)], [-x, 0.95, s * (w - 0.1)], 0.09, 0.08, L.woodD, 6));
  [-1, 1].forEach((s) => b.box(-len / 2, 0.95, s * (w - 0.1), len / 2, 0.03, 0.03, L.woodD));
  b.tube([-len + 0.3, 0.7, -0.9], [-len + 0.3, 1.05, -0.9], 0.07, 0.07, L.ink, 6);
  return b.build();
}
// ── Casas de la orilla: block, lámina y colores fuertes. Fachada hacia -x (al lago). ──
function casaLago(kind) {
  const b = new GeoB(), hx = 3.2, hz = 3.6, H = kind === 1 ? 5.6 : 3.2;
  b.box(0, H / 2, 0, hx, H / 2, hz, L.wall);
  b.box(-hx - 0.02, 0.45, 0, 0.04, 0.45, hz + 0.02, mixC(L.wall, L.stone, 0.5));
  const win = (y, z) => {
    b.box(-hx - 0.03, y, z, 0.03, 0.42, 0.42, L.white);
    b.box(-hx - 0.05, y, z, 0.03, 0.34, 0.34, L.blueD);
    b.box(-hx - 0.07, y, z, 0.01, 0.34, 0.02, L.white);
  };
  b.box(-hx - 0.04, 1.05, -1.4, 0.04, 1.05, 0.55, L.woodD);
  win(1.6, 1.3);
  if (kind === 1) {
    // Dos pisos con balcón
    win(4.2, -1.4);
    win(4.2, 1.3);
    b.box(-hx - 0.7, 3.0, 0, 0.7, 0.06, hz, L.woodL);
    b.box(-hx - 1.36, 3.45, 0, 0.04, 0.4, hz, L.woodD);
    for (let z = -hz; z <= hz; z += 0.6) b.tube([-hx - 1.36, 3.0, z], [-hx - 1.36, 3.85, z], 0.03, 0.03, L.woodD, 4);
  }
  // Techo de lámina a un agua, más alto atrás
  const t0 = H + 0.1, t1 = H + 1.0, rx = hx + 0.5, rz = hz + 0.4;
  const v = [[-rx, t0, -rz], [-rx, t0, rz], [rx, t1, rz], [rx, t1, -rz]].map((q) => b.vert(q, kind === 2 ? L.tinR : L.tin));
  const ref = [0, H - 1, 0];
  b.tri(v[0], v[1], v[2], ref);
  b.tri(v[0], v[2], v[3], ref);
  const u = [[-rx, t0 - 0.06, -rz], [-rx, t0 - 0.06, rz], [rx, t1 - 0.06, rz], [rx, t1 - 0.06, -rz]].map((q) => b.vert(q, kind === 2 ? L.tinR : L.tin));
  b.tri(u[0], u[2], u[1], [0, H + 3, 0]);
  b.tri(u[0], u[3], u[2], [0, H + 3, 0]);
  return b.build();
}
// Champa de palma para los hoteles y los comedores.
function champa() {
  const b = new GeoB();
  [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].forEach(([x, z]) => b.tube([x, 0, z], [x, 2.3, z], 0.1, 0.09, L.woodD, 5));
  bands(b, 2.2, 3.9, 2.9, 0.12, 4, L.thatch, L.thatchD, 12);
  b.box(0, 0.75, 0, 0.9, 0.05, 0.55, L.woodL);
  return b.build();
}
// Árboles de la orilla: aguacate de copa redonda y otro más alto.
function arbol(kind) {
  const b = new GeoB();
  const H = kind ? 5.2 : 3.6;
  b.tube([0, 0, 0], [0.15, H, 0.05], 0.22, 0.13, L.trunk, 6);
  const C = kind ? [[0, H + 1.2, 0, 2.0, 1.7], [1.2, H + 0.3, 0.4, 1.4, 1.2], [-1.1, H + 0.5, -0.3, 1.5, 1.2], [0.2, H + 2.4, -0.2, 1.3, 1.1]] : [[0, H + 0.9, 0, 2.4, 1.9], [1.5, H + 0.4, 0.5, 1.5, 1.3], [-1.4, H + 0.5, -0.4, 1.6, 1.3]];
  C.forEach(([x, y, z, r, h], i) => b.sph([x, y, z], [r, h, r], (a) => (a < 0.38 ? (i % 2 ? L.leafL : L.leaf) : L.leafD), 0, 6, 9));
  return b.build();
}
// ── Plataforma del cerro Tzankujil, con uno a punto de tirarse ──
function plataforma() {
  const b = new GeoB(), H = 6.2;
  [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(([x, z]) => b.tube([x, 0, z], [x, H, z], 0.1, 0.09, L.woodD, 6));
  for (let y = 1.2; y < H; y += 1.5) [-1, 1].forEach((s) => b.box(s * 0.9, y, 0, 0.04, 0.04, 0.95, L.wood));
  b.box(-0.6, H, 0, 1.6, 0.08, 1.0, L.woodL);
  [-1, 1].forEach((s) => b.box(0.3, H + 0.45, s * 0.98, 0.7, 0.03, 0.03, L.woodD));
  // Escalera
  for (let y = 0.4; y < H; y += 0.45) b.box(1.1, y, 0, 0.03, 0.03, 0.35, L.woodL);
  // Peñas abajo
  b.sph([0.4, 0.2, 0.2], [2.2, 1.0, 1.9], (a, c) => (floor(a * 5 + c * 7) % 2 ? L.stone : L.stoneD), 0, 5, 7);
  // El que se va a tirar, en la orilla de la tabla
  const x = -2.0, y = H + 0.08;
  [-1, 1].forEach((s) => b.tube([x, y, s * 0.1], [x, y + 0.75, s * 0.09], 0.07, 0.08, L.skinL, 5));
  b.tube([x, y + 0.75, 0], [x, y + 0.9, 0], 0.16, 0.17, L.red, 7);
  b.tube([x, y + 0.9, 0], [x, y + 1.35, 0], 0.17, 0.15, L.skinL, 7);
  b.sph([x, y + 1.55, 0], 0.15, L.skinL, 0, 5, 7);
  [-1, 1].forEach((s) => b.tube([x, y + 1.3, s * 0.16], [x - 0.1, y + 1.9, s * 0.22], 0.05, 0.04, L.skinL, 4));
  return b.build();
}
// Uno que va en el aire, de clavado.
function clavado() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 0.5, 0.05], 0.15, 0.16, L.skinL, 7);
  b.tube([0, 0.5, 0.05], [0, 0.66, 0.06], 0.16, 0.16, L.blue, 7);
  [-1, 1].forEach((s) => b.tube([s * 0.08, 0.66, 0.06], [s * 0.1, 1.35, 0.1], 0.07, 0.06, L.skinL, 5));
  b.sph([0, -0.18, 0], 0.14, L.skinL, 0, 5, 7);
  [-1, 1].forEach((s) => b.tube([s * 0.1, 0.05, 0], [s * 0.04, -0.45, 0], 0.045, 0.04, L.skinL, 4));
  return b.build();
}
// Gringo en su flotador, a la deriva.
function flotador() {
  const b = new GeoB();
  b.hoop(0.12, 0, 0.42, 0.13, (L.red), 18, 6);
  const g = b.build();
  // El aro de hoop queda en el plano YZ: se acuesta girándolo un cuarto de vuelta sobre z.
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i) - 0.12, z = P.getZ(i);
    P.setXYZ(i, y, 0.12 - x, z);
  }
  const b2 = new GeoB();
  for (let i = 0; i < P.count; i++) b2.vert([P.getX(i), P.getY(i), P.getZ(i)], (i % 24) < 12 ? L.red : L.white);
  b2.i = Array.from(g.index.array);
  b2.tube([0, -0.2, 0], [0, 0.42, 0], 0.17, 0.15, L.skinL, 7);
  b2.sph([0, 0.58, 0], 0.14, L.skinL, 0, 5, 7);
  b2.tube([0, 0.66, 0], [0, 0.72, 0.02], 0.2, 0.12, L.straw, 8);
  [-1, 1].forEach((s) => b2.tube([s * 0.14, 0.34, 0], [s * 0.42, 0.2, -0.05], 0.05, 0.045, L.skinL, 4));
  return b2.build();
}
// ── Don Chema, el lanchero: sombrero, bigote y la mano arriba ──
function chema() {
  const b = new GeoB();
  [-1, 1].forEach((s) => b.tube([s * 0.12, 0, 0], [s * 0.11, 0.84, 0], 0.08, 0.1, L.navy, 6));
  // Mira hacia +z, hacia el que llega.
  b.tube([0, 0.82, 0], [0, 1.45, 0], 0.22, 0.24, L.shirt, 8);
  b.box(0, 1.2, 0.23, 0.02, 0.24, 0.01, L.blue);
  b.sph([0, 1.66, 0], 0.17, L.skin, 0, 6, 8);
  b.box(0, 1.6, 0.165, 0.07, 0.016, 0.012, L.hair);
  [-1, 1].forEach((s) => b.box(s * 0.06, 1.7, 0.16, 0.02, 0.025, 0.01, L.ink));
  b.tube([0, 1.78, 0], [0, 1.83, 0], 0.33, 0.17, L.straw, 12);
  b.tube([0, 1.83, 0], [0, 1.96, 0], 0.17, 0.13, L.strawD, 9);
  b.tube([-0.26, 1.38, 0], [-0.36, 0.92, 0], 0.065, 0.055, L.shirt, 5);
  b.tube([0.26, 1.38, 0], [0.48, 1.95, 0], 0.065, 0.055, L.shirt, 5);
  b.sph([0.5, 2.0, 0], 0.06, L.skin, 0, 4, 5);
  return b.build();
}
// ── Cafecito de San Pedro: pocillo de peltre con su humito ──
function cafe() {
  const b = new GeoB();
  b.tube([0, -0.22, 0], [0, 0.18, 0], 0.27, 0.3, L.cup, 12, 0.12);
  b.tube([0, 0.16, 0], [0, 0.2, 0], 0.3, 0.3, L.white, 12, 0.12);
  b.tube([0, 0.18, 0], [0, 0.185, 0], 0.27, 0.27, L.coffee, 12);
  b.curve([[0.28, 0.08, 0], [0.45, 0.05, 0], [0.47, -0.1, 0], [0.29, -0.14, 0]], () => 0.035, L.cup, 5);
  [[0.0, 0.42, 0.04, 0.12], [0.08, 0.62, -0.02, 0.1], [-0.04, 0.8, 0.02, 0.08]].forEach(([x, y, z, r]) => b.sph([x, y, z], r, L.white, 0.3, 4, 6));
  return b.build();
}
// ── Iglesia de San Pedro: blanca, con su torre ──
function iglesia() {
  const b = new GeoB(), w = 4.4, h = 7.5, d = 9;
  b.box(0, h / 2, 0, w, h / 2, d, L.white);
  b.box(0, h + 1.2, 0, w * 0.7, 1.2, 0.4 + d, L.white);
  b.box(0, h - 0.2, -d - 0.05, w + 0.15, 0.2, 0.08, L.oro);
  b.box(0, 2.0, -d - 0.06, 1.0, 2.0, 0.06, L.woodD);
  b.box(0, h + 1.2, -d - 0.45, 0.7, 0.7, 0.04, L.oro);
  b.box(w - 0.6, h + 3.0, -d + 0.8, 1.0, 3.0, 1.0, L.white);
  b.tube([w - 0.6, h + 6.0, -d + 0.8], [w - 0.6, h + 7.4, -d + 0.8], 1.05, 0.05, L.tinR, 4);
  b.box(w - 0.6, h + 4.6, -d - 0.25, 0.4, 0.6, 0.06, L.ink);
  b.tube([0, h + 2.4, -d - 0.1], [0, h + 3.5, -d - 0.1], 0.06, 0.06, L.ink, 4);
  b.box(0, h + 3.1, -d - 0.1, 0.3, 0.06, 0.06, L.ink);
  return b.build();
}
// La moto que sigue para Xela, parada en el muelle.
function motoXela() {
  const b = new GeoB();
  [-0.72, 0.72].forEach((z) => {
    b.tube([-0.06, 0.32, z], [0.06, 0.32, z], 0.32, 0.32, L.ink, 12);
    b.tube([-0.07, 0.32, z], [0.07, 0.32, z], 0.15, 0.15, L.gray, 8);
  });
  b.tube([0, 0.4, 0.7], [0, 0.82, 0.05], 0.06, 0.06, L.grayD, 5);
  b.sph([0, 0.78, -0.05], [0.2, 0.18, 0.42], L.red, 0, 6, 8);
  b.box(0, 0.92, 0.35, 0.16, 0.05, 0.32, L.ink);
  b.tube([0, 0.82, -0.5], [0, 0.36, -0.72], 0.04, 0.04, L.gray, 5);
  b.tube([-0.32, 1.1, -0.5], [0.32, 1.1, -0.5], 0.025, 0.025, L.ink, 4);
  b.tube([0, 0.84, -0.5], [0, 1.1, -0.5], 0.03, 0.03, L.gray, 4);
  b.sph([0, 0.95, -0.62], 0.09, L.white, 1.2, 4, 5);
  b.box(0, 1.08, 0.82, 0.22, 0.2, 0.18, L.oro);
  return b.build();
}

// nombre → modelo, cupo, sombra [rx,rz], sin contorno
export const ATITLAN_SPEC = {
  lanchaP: [lanchaP, 14, null], cayuco: [() => cayuco(0), 18, null], cayucoB: [() => cayuco(1), 18, null], cayucoV: [cayucoVolcado, 8, null],
  kayak: [() => kayak(0), 12, null], kayakB: [() => kayak(1), 12, null], boya: [boya, 130, null, true], boyaG: [boyaG, 16, null],
  redA: [() => red(4.6), 10, null], redB: [() => red(2.4), 10, null], ola: [ola, 16, null], muelleL: [() => muelle(12), 14, null], muelleS: [() => muelle(6), 40, null], muelleXL: [() => muelle(16), 6, null],
  casaL: [() => casaLago(0), 70, null], casaL2: [() => casaLago(1), 40, null], casaL3: [() => casaLago(2), 50, null], champa: [champa, 20, null],
  arbol: [() => arbol(0), 110, null], arbol2: [() => arbol(1), 90, null], plataforma: [plataforma, 2, null], clavado: [clavado, 4, null], flotador: [flotador, 12, null],
  chema: [chema, 2, [0.5, 0.4]], cafe: [cafe, 12, [0.25, 0.25]], iglesiaSP: [iglesia, 2, null], motoXela: [motoXela, 2, null],
};
