// Tráfico con más detalle: carrocerías redondeadas, cabina con vidrios inclinados, llantas con rin,
// focos, parrilla, espejos, puertas y placas. Mismo estilo de caricatura, mismas medidas de choque.
// El frente mira a -z. El color de la carrocería (K.body) se tiñe con el color de cada carro.
import {GeoB, hex, mixC} from '../core/geo.js';
import {TAU, cos, sin, abs, lerp, sign, pow} from '../core/util.js';

const K = {
  body: hex('#ece6dc'), ink: hex('#1a1416'), tire: hex('#1a1416'), plastic: hex('#2a2628'), glass: hex('#27343f'), glassL: hex('#3d5468'),
  metal: hex('#c8c6c0'), metalD: hex('#6a6866'), chrome: hex('#e2e0da'), lamp: hex('#fff1c4'), tail: hex('#ff3030'), amber: hex('#ffab1f'), white: hex('#fff6e6'),
  red: hex('#e3262f'), redD: hex('#a81c26'), oro: hex('#ffc91f'), turq: hex('#12b5b0'), cream: hex('#fff3d6'), blue: hex('#1b62c9'), pink: hex('#ff5d7d'),
  straw: hex('#d4b265'), sack: hex('#d8cdb4'), sackD: hex('#b3a688'), wood: hex('#8a5a33'), rust: hex('#b5462e'), tarp: hex('#2f6aa8'),
};
const LINE = mixC(K.body, K.ink, 0.5);

// Sección redondeada (superelipse) en el plano XY, a la altura z.
function se(z, w, y0, y1, e = 0.42, n = 18) {
  const o = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, c = cos(a), s = sin(a);
    o.push([w * sign(c) * pow(abs(c), e), (y0 + y1) / 2 + ((y1 - y0) / 2) * sign(s) * pow(abs(s), e), z]);
  }
  return o;
}
// Carrocería: une secciones [z, medio ancho, piso, techo, redondez] de trompa a cola.
function shell(b, secs, col) {
  b.loft(secs.map(([z, w, y0, y1, e]) => se(z, w, y0, y1, e)), col);
}
// Rectángulo de esquinas redondas en el plano XZ, a la altura y.
function rr(y, w, z0, z1, r, k = 3) {
  const o = [], cs = [[w - r, z1 - r, 0], [-(w - r), z1 - r, 1], [-(w - r), z0 + r, 2], [w - r, z0 + r, 3]];
  for (const [cx, cz, q] of cs) for (let i = 0; i <= k; i++) {
    const t = ((q + i / k) * TAU) / 4;
    o.push([cx + r * cos(t), y, cz + r * sin(t)]);
  }
  return o;
}
function quad(b, p, col, ref, glow = 0) {
  b.flat = 1;
  const v = p.map((q) => b.vert(q, col, glow));
  b.flat = 0;
  b.tri(v[0], v[1], v[2], ref);
  b.tri(v[0], v[2], v[3], ref);
}
// Cabina: se angosta hacia el techo; parabrisas y vidrio de atrás inclinados, ventanas a los lados.
// g: {belt, roof, wb, wt, zf0, zf1, zr1, zr0, wins: [[de, a], ...] (fracciones del largo)}
function cabin(b, g, col) {
  const top = g.roof - 0.05;
  b.loft([rr(g.belt, g.wb, g.zf0, g.zr0, 0.12), rr(top, g.wt, g.zf1, g.zr1, 0.14), rr(g.roof, g.wt - 0.07, g.zf1 + 0.1, g.zr1 - 0.1, 0.12)], col);
  const at = (u) => ({y: lerp(g.belt, top, u), w: lerp(g.wb, g.wt, u), zf: lerp(g.zf0, g.zf1, u), zr: lerp(g.zr0, g.zr1, u)});
  const lo = at(0.13), hi = at(0.88), ref = [0, (g.belt + top) / 2, (g.zf0 + g.zr0) / 2], e = 0.016;
  // Parabrisas y vidrio trasero
  quad(b, [[-(lo.w - 0.1), lo.y, lo.zf - e], [lo.w - 0.1, lo.y, lo.zf - e], [hi.w - 0.1, hi.y, hi.zf - e], [-(hi.w - 0.1), hi.y, hi.zf - e]], K.glass, ref);
  quad(b, [[-(lo.w - 0.1), lo.y, lo.zr + e], [lo.w - 0.1, lo.y, lo.zr + e], [hi.w - 0.1, hi.y, hi.zr + e], [-(hi.w - 0.1), hi.y, hi.zr + e]], K.glass, ref);
  // Brillo del parabrisas
  quad(b, [[-(hi.w - 0.2), hi.y - 0.02, hi.zf - e * 1.6], [-(hi.w - 0.42), hi.y - 0.02, hi.zf - e * 1.6], [-(lo.w - 0.5), lerp(lo.y, hi.y, 0.45), lerp(lo.zf, hi.zf, 0.45) - e * 1.6], [-(lo.w - 0.28), lerp(lo.y, hi.y, 0.45), lerp(lo.zf, hi.zf, 0.45) - e * 1.6]], K.glassL, ref);
  [-1, 1].forEach((s) => (g.wins || [[0.07, 0.47], [0.53, 0.93]]).forEach(([fa, fb]) => {
    const z = (q, f) => lerp(q.zf, q.zr, f);
    quad(b, [[s * (lo.w + e), lo.y, z(lo, fa)], [s * (lo.w + e), lo.y, z(lo, fb)], [s * (hi.w + e), hi.y, z(hi, fb)], [s * (hi.w + e), hi.y, z(hi, fa)]], K.glass, ref);
  }));
}
// Llanta con rin, tuercas y el hueco oscuro del guardafango. bw: medio ancho de la carrocería.
function wheel(b, s, bw, z, r, w = 0.11, dual = false) {
  const x = s * (bw - w + 0.02);
  b.tube([s * (bw - 0.3), r, z], [s * (bw + 0.004), r, z], r + 0.085, r + 0.085, K.ink, 14);
  b.tube([x - w * (dual ? 2 : 1), r, z], [x + w, r, z], r, r, K.tire, 14);
  const xo = x + s * w;
  b.tube([xo, r, z], [xo + s * 0.012, r, z], r * 0.64, r * 0.6, K.metal, 12);
  b.tube([xo + s * 0.012, r, z], [xo + s * 0.03, r, z], r * 0.24, r * 0.2, K.metalD, 8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    b.box(xo + s * 0.016, r + cos(a) * r * 0.42, z + sin(a) * r * 0.42, 0.006, r * 0.09, r * 0.09, K.metalD);
  }
}
const wheels = (b, bw, zs, r, w, dual) => [-1, 1].forEach((s) => zs.forEach((z) => wheel(b, s, bw, z, r, w, dual)));
// Línea de puerta y manija en el costado
function door(b, s, x, z, y0, y1) {
  b.box(s * x, (y0 + y1) / 2, z, 0.005, (y1 - y0) / 2, 0.012, LINE);
}
const handle = (b, s, x, y, z) => b.box(s * (x + 0.006), y, z, 0.008, 0.02, 0.07, K.metalD);
function mirror(b, s, x, y, z, big = 1) {
  b.tube([s * (x - 0.04), y - 0.03, z], [s * (x + 0.1 * big), y, z - 0.02], 0.018, 0.018, K.plastic, 4);
  b.box(s * (x + 0.13 * big), y + 0.02 * big, z - 0.02, 0.05 * big, 0.05 * big, 0.022, K.body);
  b.box(s * (x + 0.13 * big), y + 0.02 * big, z + 0.004, 0.042 * big, 0.04 * big, 0.004, K.glassL);
}
const plate = (b, y, z) => b.box(0, y, z, 0.25, 0.075, 0.012, K.white);

// ── Carro y camioneta agrícola (SUV) ──
function carModel(suv) {
  const b = new GeoB(), up = suv ? 0.18 : 0, r = suv ? 0.42 : 0.35;
  const skirt = 0.3 + up * 0.6, col = (ta, tb, q) => (q[1] < skirt + 0.1 ? K.plastic : K.body);
  shell(b, [[-2.15, 0.76, 0.36 + up, 0.68 + up, 0.6], [-2.02, 0.9, skirt, 0.8 + up], [-1.25, 0.95, skirt, 0.86 + up], [-0.6, 0.95, skirt, 0.92 + up],
    [1.3, 0.95, skirt, 0.94 + up], [1.98, 0.92, skirt, 0.9 + up], [2.15, 0.78, 0.38 + up, 0.76 + up, 0.6]], col);
  const belt = 0.9 + up;
  cabin(b, suv ? {belt, roof: 1.62 + up, wb: 0.85, wt: 0.74, zf0: -0.85, zf1: -0.35, zr1: 1.78, zr0: 2.0, wins: [[0.06, 0.36], [0.4, 0.68], [0.72, 0.95]]}
    : {belt, roof: 1.45, wb: 0.84, wt: 0.7, zf0: -0.8, zf1: -0.22, zr1: 0.98, zr0: 1.6}, K.body);
  [-1, 1].forEach((s) => {
    // Focos, pidevías y calaveras
    b.box(s * 0.6, 0.66 + up, -2.11, 0.2, 0.075, 0.05, K.lamp, 2.2);
    b.box(s * 0.84, 0.64 + up, -2.03, 0.05, 0.05, 0.08, K.amber, 1.2);
    b.box(s * 0.62, 0.72 + up, 2.11, 0.2, 0.08, 0.05, K.tail, 1.8);
    b.box(s * 0.84, 0.72 + up, 2.02, 0.05, 0.07, 0.1, K.tail, 1.4);
    [-0.78, 0.36, suv ? 1.5 : 1.36].forEach((z) => door(b, s, 0.953, z, skirt + 0.14, belt - 0.02));
    handle(b, s, 0.953, belt - 0.14, 0.18);
    handle(b, s, 0.953, belt - 0.14, 1.2);
    mirror(b, s, 0.86, belt + 0.1, -0.62);
    if (suv) b.tube([s * 0.6, 1.63 + up, -0.2], [s * 0.6, 1.63 + up, 1.7], 0.025, 0.025, K.plastic, 4);
  });
  // Parrilla, defensas y placas
  b.box(0, 0.6 + up, -2.14, 0.34, 0.09, 0.03, K.plastic);
  for (let i = -1; i <= 1; i++) b.box(0, 0.6 + up + i * 0.05, -2.175, 0.32, 0.008, 0.006, K.metal);
  b.box(0, 0.42 + up, -2.14, 0.8, 0.07, 0.06, K.plastic);
  b.box(0, 0.44 + up, 2.14, 0.82, 0.07, 0.06, K.plastic);
  plate(b, 0.44 + up, -2.205);
  plate(b, 0.6 + up, 2.185);
  wheels(b, 0.95, [-1.35, 1.35], r);
  return b.build();
}
// ── Microbús de ruta: trompa chata, puerta corrediza, franja y parrilla ──
function van() {
  const b = new GeoB(), col = (ta, tb, q) => (q[1] < 0.5 ? K.plastic : K.body);
  shell(b, [[-2.8, 0.86, 0.46, 1.05, 0.6], [-2.66, 0.97, 0.36, 1.26, 0.34], [-2.2, 1.0, 0.34, 1.34, 0.3], [2.4, 1.0, 0.34, 1.34, 0.3], [2.56, 0.94, 0.4, 1.3, 0.4]], col);
  cabin(b, {belt: 1.3, roof: 2.46, wb: 0.97, wt: 0.9, zf0: -2.62, zf1: -2.12, zr1: 2.44, zr0: 2.54, wins: [[0.04, 0.2], [0.24, 0.46], [0.5, 0.72], [0.76, 0.96]]}, K.body);
  [-1, 1].forEach((s) => {
    b.box(s * 0.66, 0.86, -2.76, 0.2, 0.085, 0.05, K.lamp, 2.1);
    b.box(s * 0.9, 0.84, -2.68, 0.04, 0.06, 0.08, K.amber, 1.2);
    b.box(s * 0.74, 0.9, 2.55, 0.12, 0.2, 0.03, K.tail, 1.8);
    b.box(s * 1.004, 1.06, -0.1, 0.006, 0.05, 2.45, K.oro);
    b.box(s * 1.004, 0.96, -0.1, 0.006, 0.03, 2.45, K.red);
    [-1.75, -0.55, 0.75].forEach((z) => door(b, s, 1.003, z, 0.5, 1.3));
    handle(b, s, 1.003, 1.16, -0.7);
    mirror(b, s, 0.96, 1.72, -2.3, 1.3);
    b.tube([s * 0.72, 2.5, -1.6], [s * 0.72, 2.5, 2.2], 0.025, 0.025, K.metalD, 4);
  });
  [-1.4, 0.3, 2.0].forEach((z) => b.tube([-0.72, 2.5, z], [0.72, 2.5, z], 0.02, 0.02, K.metalD, 4));
  b.box(0.1, 2.62, 0.9, 0.5, 0.11, 0.6, K.tarp);
  b.sph([-0.3, 2.62, -0.6], [0.3, 0.14, 0.36], K.sack, 0, 4, 6);
  b.box(0, 0.62, -2.79, 0.42, 0.08, 0.03, K.plastic);
  b.box(0, 0.46, -2.76, 0.86, 0.08, 0.07, K.plastic);
  b.box(0, 0.46, 2.56, 0.9, 0.08, 0.06, K.plastic);
  // Rótulo de ruta en el parabrisas
  b.box(0, 2.28, -2.2, 0.5, 0.07, 0.012, K.oro, 0.5);
  plate(b, 0.47, -2.835);
  plate(b, 0.72, 2.6);
  wheels(b, 1.0, [-1.7, 1.75], 0.38);
  return b.build();
}
// ── Picop blanco, con costales y toneles en la palangana ──
function pickup() {
  const b = new GeoB(), col = (ta, tb, q) => (q[1] < 0.5 ? K.plastic : K.body);
  shell(b, [[-2.0, 0.7, 0.44, 0.76, 0.6], [-1.86, 0.84, 0.38, 0.92], [-1.0, 0.86, 0.38, 1.0], [0.45, 0.86, 0.38, 1.0, 0.3], [1.9, 0.86, 0.38, 1.0, 0.3], [2.0, 0.82, 0.42, 0.98, 0.4]], col);
  cabin(b, {belt: 0.98, roof: 1.52, wb: 0.8, wt: 0.68, zf0: -1.0, zf1: -0.52, zr1: 0.3, zr0: 0.44, wins: [[0.1, 0.9]]}, K.body);
  // Palangana: el fondo oscuro, la baranda y la carga
  b.box(0, 1.005, 1.2, 0.74, 0.006, 0.7, K.plastic);
  [-1, 1].forEach((s) => {
    b.tube([s * 0.8, 1.0, 0.55], [s * 0.8, 1.34, 0.55], 0.03, 0.03, K.plastic, 5);
    b.box(s * 0.56, 0.74, -1.96, 0.18, 0.075, 0.05, K.lamp, 2.1);
    b.box(s * 0.76, 0.72, -1.9, 0.04, 0.05, 0.07, K.amber, 1.2);
    b.box(s * 0.76, 0.78, 1.99, 0.07, 0.16, 0.03, K.tail, 1.7);
    [-0.98, 0.42].forEach((z) => door(b, s, 0.863, z, 0.52, 0.98));
    handle(b, s, 0.863, 0.86, 0.22);
    mirror(b, s, 0.8, 1.1, -0.82);
  });
  b.tube([-0.8, 1.34, 0.55], [0.8, 1.34, 0.55], 0.03, 0.03, K.plastic, 5);
  [[-0.36, 0.95], [0.34, 1.0], [0, 1.45]].forEach(([x, z], i) => b.sph([x, 1.16, z], [0.3, 0.17, 0.4], i % 2 ? K.sackD : K.sack, 0, 5, 7));
  b.sph([-0.1, 1.42, 1.1], [0.28, 0.15, 0.38], K.sack, 0, 5, 7);
  [-0.42, 0.42].forEach((x) => b.tube([x, 1.0, 1.75], [x, 1.46, 1.75], 0.16, 0.16, K.blue, 8));
  b.box(0, 0.68, -1.99, 0.3, 0.08, 0.03, K.plastic);
  for (let i = -1; i <= 1; i++) b.box(0, 0.68 + i * 0.045, -2.022, 0.28, 0.008, 0.006, K.metal);
  b.box(0, 0.5, -1.98, 0.74, 0.07, 0.06, K.metalD);
  b.box(0, 0.5, 2.02, 0.8, 0.06, 0.06, K.metal);
  b.box(0, 0.86, 2.004, 0.3, 0.012, 0.006, LINE);
  plate(b, 0.5, -2.045);
  plate(b, 0.66, 2.01);
  wheels(b, 0.86, [-1.25, 1.2], 0.37);
  return b.build();
}
// ── Cabezal de trompa con su contenedor: no se puede saltar ──
function cabezal() {
  const b = new GeoB();
  shell(b, [[-6.28, 0.92, 0.6, 1.25, 0.6], [-6.12, 1.1, 0.52, 1.72, 0.36], [-5.25, 1.15, 0.5, 1.82, 0.32], [-4.05, 1.18, 0.5, 1.82, 0.3]], (ta, tb, q) => (q[1] < 0.62 ? K.plastic : K.red));
  cabin(b, {belt: 1.82, roof: 3.0, wb: 1.13, wt: 1.04, zf0: -5.32, zf1: -5.02, zr1: -4.1, zr0: -4.06, wins: [[0.12, 0.74]]}, K.red);
  // Visera, parrilla cromada, focos y defensa
  b.box(0, 2.92, -5.2, 1.0, 0.03, 0.14, K.redD);
  b.box(0, 1.2, -6.27, 0.56, 0.42, 0.03, K.chrome);
  for (let i = -3; i <= 3; i++) b.box(i * 0.15, 1.2, -6.3, 0.02, 0.38, 0.01, K.metalD);
  b.box(0, 0.62, -6.3, 1.16, 0.13, 0.08, K.chrome);
  [-1, 1].forEach((s) => {
    b.box(s * 0.84, 1.22, -6.2, 0.16, 0.12, 0.05, K.lamp, 2.2);
    b.box(s * 0.84, 0.98, -6.2, 0.1, 0.05, 0.05, K.amber, 1.4);
    // Escapes con su tapa, espejos de brazo, estribo y tanque
    b.tube([s * 1.02, 1.5, -3.98], [s * 1.02, 3.55, -3.98], 0.085, 0.085, K.chrome, 7);
    b.tube([s * 1.02, 3.55, -3.98], [s * 1.02, 3.75, -3.94], 0.07, 0.06, K.metalD, 6);
    mirror(b, s, 1.1, 2.36, -5.1, 1.7);
    b.box(s * 1.14, 0.72, -4.7, 0.08, 0.03, 0.4, K.metal);
    b.tube([s * 0.92, 0.82, -3.85], [s * 0.92, 0.82, -2.75], 0.3, 0.3, K.chrome, 10);
    door(b, s, 1.183, -5.22, 0.72, 1.82);
    door(b, s, 1.183, -4.2, 0.72, 1.82);
    handle(b, s, 1.183, 1.6, -4.36);
  });
  for (let k = -2; k <= 2; k++) b.box(k * 0.36, 3.04, -4.95, 0.05, 0.03, 0.05, K.amber, 1.6);
  // Chasís y contenedor acanalado con sus puertas
  const cont = K.body, rib = mixC(K.body, K.ink, 0.28), frame = mixC(K.body, K.ink, 0.5);
  b.box(0, 0.86, 2.2, 0.5, 0.13, 6.15, K.plastic);
  b.box(0, 2.52, 2.2, 1.25, 1.5, 6.1, cont);
  for (let z = -3.55; z < 8.1; z += 0.5) [-1, 1].forEach((s) => b.box(s * 1.262, 2.52, z, 0.02, 1.36, 0.07, rib));
  [1.04, 4.0].forEach((y) => b.box(0, y, 2.2, 1.275, 0.06, 6.12, frame));
  [-3.88, 8.28].forEach((z) => [-1, 1].forEach((s) => b.box(s * 1.24, 2.52, z, 0.045, 1.5, 0.045, frame)));
  [-1, 1].forEach((s) => b.box(s * 1.268, 3.1, 1.2, 0.006, 0.36, 1.6, K.turq));
  b.box(0, 2.52, 8.315, 0.012, 1.42, 0.012, frame);
  [-0.9, -0.34, 0.34, 0.9].forEach((x) => {
    b.tube([x, 1.16, 8.34], [x, 3.88, 8.34], 0.028, 0.028, K.metal, 5);
    b.box(x, 2.2, 8.36, 0.08, 0.03, 0.02, K.metalD);
  });
  [1.5, 2.52, 3.5].forEach((y) => [-1, 1].forEach((s) => b.box(s * 1.16, y, 8.33, 0.05, 0.08, 0.02, K.metalD)));
  // Defensa trasera a rayas, calaveras y loderas
  for (let i = 0; i < 8; i++) b.box(-1.085 + i * 0.31, 0.66, 8.26, 0.155, 0.09, 0.05, i % 2 ? K.white : K.red, 0.3);
  [-0.94, 0.94].forEach((x) => {
    b.box(x, 0.9, 8.33, 0.17, 0.07, 0.02, K.tail, 1.8);
    b.box(x, 0.42, 7.3, 0.2, 0.3, 0.02, K.plastic);
  });
  for (let z = -3; z < 8; z += 2.2) [-1, 1].forEach((s) => b.box(s * 1.275, 1.04, z, 0.012, 0.035, 0.07, K.amber, 1.4));
  wheels(b, 1.16, [-5.45], 0.5, 0.16);
  wheels(b, 1.2, [-3.45, -2.4, 5.5, 6.55], 0.5, 0.13, true);
  return b.build();
}
// ── Camioneta parrillera: trompa de bus escolar, franjas, ventanas, parrilla cargada y escalera ──
function busRed() {
  const b = new GeoB();
  // Carrocería de techo redondo; el techo va turquesa
  shell(b, [[-4.48, 1.1, 0.95, 2.9, 0.4], [-4.3, 1.25, 0.86, 3.04, 0.34], [4.9, 1.25, 0.86, 3.04, 0.34], [5.07, 1.14, 0.95, 2.92, 0.4]], (ta, tb, q) => (q[1] > 2.82 ? K.turq : q[1] < 0.98 ? K.redD : K.red));
  [-1, 1].forEach((s) => {
    b.box(s * 1.256, 2.7, 0.3, 0.006, 0.06, 4.62, K.cream);
    b.box(s * 1.256, 1.3, 0.3, 0.006, 0.075, 4.62, K.oro);
    b.box(s * 1.256, 1.14, 0.3, 0.006, 0.035, 4.62, K.turq);
    b.box(s * 1.256, 1.0, 0.3, 0.008, 0.03, 4.62, K.metalD);
    // Ventanas corredizas
    for (let i = 0; i < 8; i++) {
      const z = -3.3 + i * 1.04;
      if (s > 0 && i === 0) continue;
      b.box(s * 1.258, 2.16, z, 0.008, 0.37, 0.44, K.glass);
      b.box(s * 1.268, 2.16, z, 0.004, 0.012, 0.44, K.metal);
    }
    // Trompa: focos redondos con aro, pidevías
    b.tube([s * 0.72, 1.36, -5.9], [s * 0.72, 1.36, -6.0], 0.19, 0.19, K.chrome, 10);
    b.tube([s * 0.72, 1.36, -6.0], [s * 0.72, 1.36, -6.02], 0.15, 0.15, K.lamp, 10, 2.4);
    b.box(s * 0.98, 1.2, -5.9, 0.05, 0.06, 0.06, K.amber, 1.4);
    mirror(b, s, 1.12, 2.3, -4.6, 2);
    // Atrás: calaveras y luces altas
    b.tube([s * 0.78, 1.3, 5.06], [s * 0.78, 1.3, 5.1], 0.13, 0.13, K.tail, 8, 2);
    b.box(s * 0.9, 2.84, 5.06, 0.1, 0.05, 0.02, K.amber, 1.3);
    b.box(s * 0.62, 3.0, -4.38, 0.07, 0.04, 0.03, K.amber, 1.5);
    // Baranda de la parrilla
    b.tube([s * 1.08, 3.38, -3.9], [s * 1.08, 3.38, 4.7], 0.03, 0.03, K.metal, 5);
    for (let z = -3.9; z <= 4.71; z += 1.72) b.tube([s * 1.08, 3.0, z], [s * 1.08, 3.38, z], 0.025, 0.025, K.metal, 4);
  });
  // Puerta de adelante, del lado derecho
  b.box(1.258, 1.75, -3.55, 0.008, 0.78, 0.36, K.glass);
  b.box(1.268, 1.75, -3.55, 0.004, 0.78, 0.012, K.metal);
  // Trompa
  shell(b, [[-6.0, 0.86, 0.95, 1.56, 0.6], [-5.86, 1.02, 0.86, 1.74, 0.38], [-4.4, 1.1, 0.86, 1.84, 0.34]], (ta, tb, q) => (q[1] < 0.98 ? K.redD : K.red));
  b.box(0, 1.34, -6.0, 0.44, 0.2, 0.03, K.chrome);
  for (let i = -3; i <= 3; i++) b.box(i * 0.12, 1.34, -6.03, 0.016, 0.17, 0.01, K.metalD);
  b.box(0, 1.0, -6.02, 1.14, 0.1, 0.09, K.chrome);
  b.box(0, 1.84, -5.2, 0.03, 0.012, 0.7, K.oro);
  // Parabrisas de dos hojas y el rótulo de destino
  [-1, 1].forEach((s) => b.box(s * 0.53, 2.2, -4.5, 0.5, 0.42, 0.02, K.glass));
  b.box(-0.7, 2.42, -4.515, 0.16, 0.14, 0.012, K.glassL);
  b.box(0, 2.82, -4.46, 0.74, 0.1, 0.03, K.oro, 0.5);
  // Atrás: puerta de emergencia, vidrio, escalera y defensa
  b.box(0, 2.3, 5.08, 0.98, 0.42, 0.02, K.glass);
  b.box(0, 1.62, 5.085, 0.42, 0.012, 0.01, K.redD);
  [-0.42, 0.42].forEach((x) => b.box(x, 1.5, 5.085, 0.012, 0.5, 0.01, K.redD));
  [0.88, 1.12].forEach((x) => b.tube([x, 1.0, 5.14], [x, 3.4, 5.14], 0.022, 0.022, K.metal, 4));
  for (let y = 1.2; y < 3.3; y += 0.36) b.tube([0.88, y, 5.14], [1.12, y, 5.14], 0.018, 0.018, K.metal, 4);
  for (let i = 0; i < 8; i++) b.box(-1.05 + i * 0.3, 0.98, 5.1, 0.15, 0.085, 0.05, i % 2 ? K.white : K.red, 0.3);
  plate(b, 1.3, 5.11);
  // La carga: canastos, costales, una lona amarrada y una llanta de repuesto
  [[-0.5, -3.1, K.straw], [0.45, -2.2, K.oro]].forEach(([x, z, c]) => {
    b.tube([x, 3.1, z], [x, 3.52, z], 0.34, 0.42, c, 9);
    b.tube([x, 3.52, z], [x, 3.56, z], 0.44, 0.44, K.wood, 9);
  });
  [[-0.35, -0.9], [0.4, -0.5], [0, 0.3]].forEach(([x, z], i) => b.sph([x, 3.3 + (i === 2 ? 0.22 : 0), z], [0.42, 0.2, 0.52], i % 2 ? K.sackD : K.sack, 0, 5, 7));
  b.box(0, 3.36, 2.1, 0.8, 0.26, 0.9, K.tarp);
  [1.6, 2.6].forEach((z) => b.box(0, 3.365, z, 0.81, 0.265, 0.02, K.oro));
  b.tube([-0.3, 3.2, 3.9], [-0.3, 3.36, 3.9], 0.46, 0.46, K.tire, 12);
  b.tube([0.55, 3.1, 3.7], [0.55, 3.6, 3.7], 0.17, 0.17, K.pink, 8);
  wheels(b, 1.25, [-3.9], 0.52, 0.15);
  wheels(b, 1.25, [3.3], 0.52, 0.13, true);
  return b.build();
}

// nombre → modelo, cupo, sombra [rx,rz]
export const AUTOS_SPEC = {
  car: [() => carModel(false), 34, [1, 2.2]], suv: [() => carModel(true), 24, [1, 2.2]], van: [van, 16, [1.05, 2.6]], cabezal: [cabezal, 10, [1.25, 7]],
  pickup: [pickup, 10, [0.9, 2]], busred: [busRed, 10, [1.3, 5]],
};
