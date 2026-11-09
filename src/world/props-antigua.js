// Objetos de Antigua: casas de un piso, el Arco de Santa Catalina, La Merced, alfombras de aserrín,
// cucuruchos, la banda, pinos de la bajada, turistas y chocobananos.
import {GeoB, hex, mixC} from '../core/geo.js';
import {TAU, PI, cos, sin, floor, lerp, sqrt, max} from '../core/util.js';

const A = {
  wall: hex('#fbf3e4'), zoc: hex('#cdb99a'), trim: hex('#fff8ec'), tile: hex('#b8553a'), tileD: hex('#8e3f2c'),
  wood: hex('#6b3f22'), woodD: hex('#3e2414'), woodL: hex('#a8743f'), iron: hex('#1e1a1c'), ink: hex('#17100e'),
  ochre: hex('#f0b12c'), ochreD: hex('#c7861a'), merced: hex('#f6c640'), white: hex('#fff6e6'),
  purple: hex('#5b2a86'), purpleD: hex('#3a1858'), purpleL: hex('#8a55b8'), gold: hex('#e9b52e'), goldD: hex('#a8721a'),
  skin: hex('#b9784f'), skinL: hex('#e2b08a'), hair: hex('#2a1c18'), navy: hex('#25335e'), black: hex('#1c1a20'),
  pine: hex('#2c6a44'), pineD: hex('#1c4a33'), trunk: hex('#6e4c36'), leaf: hex('#2f8a44'), leafD: hex('#1f6a36'),
  bugan: hex('#d6338a'), buganL: hex('#f26aaa'), stone: hex('#b9b3a6'), stoneD: hex('#868073'), water: hex('#63c8e4'),
  banana: hex('#ffd84a'), choco: hex('#5a2e1a'), cooler: hex('#f4f2ee'), red: hex('#e3262f'), blue: hex('#1b62c9'), yellow: hex('#ffc91f'),
  green: hex('#2bae56'), orange: hex('#ff7a1a'), pink: hex('#ff5d7d'), khaki: hex('#c9b48a'), straw: hex('#e0bf6a'), lamp: hex('#fff1c4'),
  corte: hex('#2a3f8f'), huipil: hex('#d8263c'), pack: hex('#3d6b8a'), berry: hex('#d81e3a'),
};
// Colores del aserrín teñido
const SAW = {purple: hex('#6a2c9a'), yellow: hex('#ffd23a'), red: hex('#e43a3a'), green: hex('#36a84e'), white: hex('#fff6e6'), blue: hex('#2f6ad8'), orange: hex('#ff8a2a'), pink: hex('#ff6aa6')};

// ── Casas de un piso, con reja en las ventanas. Fachada hacia +z, 9.2 de ancho. ──
function casa(kind) {
  const b = new GeoB(), hx = 4.6, hz = 4.4, H = kind === 2 ? 5.0 : 4.3;
  b.box(0, H / 2, 0, hx, H / 2, hz, A.wall);
  b.box(0, 0.42, hz + 0.03, hx + 0.02, 0.42, 0.04, A.zoc);
  [-1, 1].forEach((s) => b.box(s * (hx - 0.2), H / 2, hz + 0.06, 0.2, H / 2, 0.06, A.trim));
  b.box(0, H - 0.12, hz + 0.1, hx + 0.08, 0.14, 0.12, A.trim);
  b.box(0, H + 0.05, hz + 0.16, hx + 0.12, 0.06, 0.2, A.trim);
  // Techo de teja: se asoma el alero.
  b.box(0, H + 0.36, hz - 0.7, hx + 0.2, 0.3, 0.8, A.tile);
  b.box(0, H + 0.13, hz + 0.32, hx + 0.24, 0.06, 0.28, A.tileD);
  const door = (x, w, h) => {
    b.box(x, h / 2 + 0.06, hz + 0.04, w + 0.2, h / 2 + 0.12, 0.04, A.trim);
    b.box(x, h / 2, hz + 0.07, w, h / 2, 0.03, A.wood);
    b.box(x, h / 2, hz + 0.1, 0.015, h / 2 - 0.05, 0.02, A.woodD);
    [-1, 1].forEach((s) => [0.28, 0.68].forEach((f) => b.box(x + s * w * 0.5, h * f, hz + 0.1, w * 0.36, h * 0.14, 0.015, A.woodD)));
  };
  const win = (x, y) => {
    b.box(x, y, hz + 0.03, 0.62, 0.85, 0.03, A.trim);
    b.box(x, y, hz + 0.06, 0.5, 0.72, 0.02, A.woodD);
    b.box(x, y - 0.95, hz + 0.3, 0.74, 0.05, 0.3, A.trim);
    for (let k = -3; k <= 3; k++) b.box(x + k * 0.16, y, hz + 0.56, 0.014, 0.86, 0.014, A.iron);
    b.box(x, y + 0.88, hz + 0.4, 0.7, 0.035, 0.17, A.iron);
    b.box(x, y - 0.86, hz + 0.52, 0.68, 0.02, 0.06, A.iron);
    b.box(x, y + 0.3, hz + 0.56, 0.64, 0.012, 0.012, A.iron);
  };
  if (kind === 0) {
    door(-2.4, 0.72, 2.7);
    win(0.6, 2.2);
    win(2.9, 2.2);
  } else if (kind === 1) {
    // Portón grande de casona
    door(0, 1.3, 3.2);
    b.box(0, 3.62, hz + 0.08, 0.5, 0.18, 0.05, A.trim);
    win(-3.0, 2.2);
    win(3.0, 2.2);
  } else {
    door(2.8, 0.75, 2.8);
    win(-2.6, 2.4);
    win(-0.2, 2.4);
    // Nicho con macetas sobre la puerta
    b.box(2.8, 3.85, hz + 0.05, 0.42, 0.42, 0.05, A.trim);
    b.box(2.8, 3.85, hz + 0.08, 0.3, 0.3, 0.03, A.ochreD);
  }
  return b.build();
}
// Buganvilia que se derrama sobre el muro
function bugan() {
  const b = new GeoB();
  [[0, 0, 0, 0.8], [0.7, -0.3, 0.1, 0.6], [-0.6, -0.2, 0.15, 0.65], [0.2, -0.8, 0.25, 0.5], [-0.3, -1.3, 0.3, 0.42], [0.5, -1.6, 0.3, 0.36], [1.2, -0.7, 0.2, 0.45]].forEach(([x, y, z, r], i) =>
    b.sph([x, y, z], [r, r * 0.85, r * 0.7], i % 3 === 2 ? A.leafD : i % 2 ? A.bugan : A.buganL, 0, 5, 7));
  return b.build();
}
// ── El Arco de Santa Catalina: atraviesa la calle; el hueco mide 10.4 m. ──
function arco() {
  const b = new GeoB(), Y = A.ochre, YD = A.ochreD, W = A.trim;
  const ow = 5.2, spring = 6.0, rise = 2.6, top = 10.2, hz = 1.6, outer = 8.4;
  [-1, 1].forEach((s) => {
    const px = s * (ow + (outer - ow) / 2), pw = (outer - ow) / 2;
    b.box(px, top / 2, 0, pw, top / 2, hz, Y);
    b.box(px, 0.55, 0, pw + 0.06, 0.55, hz + 0.06, YD);
    [-1, 1].forEach((f) => {
      b.box(s * (ow + 0.28), spring / 2, f * (hz + 0.03), 0.28, spring / 2, 0.05, W);
      b.box(s * (outer - 0.3), top / 2, f * (hz + 0.03), 0.3, top / 2, 0.05, W);
      b.box(px, spring + 0.1, f * (hz + 0.06), pw + 0.05, 0.14, 0.08, W);
    });
  });
  // Relleno sobre el medio punto, en rebanadas, con el borde del arco en blanco.
  const N = 16;
  for (let i = 0; i < N; i++) {
    const x0 = -ow + (2 * ow * i) / N, x1 = -ow + (2 * ow * (i + 1)) / N, xm = (x0 + x1) / 2, u = xm / ow;
    const ya = spring + rise * sqrt(max(0, 1 - u * u));
    b.box(xm, (ya + top) / 2, 0, (x1 - x0) / 2 + 0.01, (top - ya) / 2, hz, Y);
    [-1, 1].forEach((f) => b.box(xm, ya + 0.2, f * (hz + 0.03), (x1 - x0) / 2 + 0.02, 0.22, 0.05, W));
  }
  b.box(0, top - 0.1, 0, outer + 0.15, 0.18, hz + 0.15, W);
  // Pasillo de arriba con ventanitas
  b.box(0, top + 1.05, 0, outer - 0.3, 0.85, hz - 0.12, Y);
  for (let k = -3; k <= 3; k++) [-1, 1].forEach((f) => {
    b.box(k * 2.0, top + 1.1, f * (hz - 0.1), 0.34, 0.44, 0.04, A.woodD);
    b.box(k * 2.0, top + 1.62, f * (hz - 0.1), 0.42, 0.06, 0.05, W);
  });
  b.box(0, top + 1.95, 0, outer - 0.1, 0.1, hz, W);
  // Torre del reloj al centro
  b.box(0, top + 3.15, 0, 1.25, 1.12, 1.15, Y);
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => b.box(sx * 1.18, top + 3.15, sz * 1.08, 0.1, 1.12, 0.1, W)));
  [-1, 1].forEach((f) => {
    b.tube([0, top + 3.2, f * 1.14], [0, top + 3.2, f * 1.2], 0.74, 0.74, W, 20);
    b.tube([0, top + 3.2, f * 1.2], [0, top + 3.2, f * 1.22], 0.58, 0.58, hex('#fffdf4'), 20);
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * TAU;
      b.box(cos(a) * 0.5, top + 3.2 + sin(a) * 0.5, f * 1.24, 0.025, 0.025, 0.01, A.ink);
    }
    b.box(0, top + 3.36, f * 1.25, 0.03, 0.17, 0.01, A.ink);
    b.box(0.13, top + 3.2, f * 1.25, 0.14, 0.025, 0.01, A.ink);
  });
  b.box(0, top + 4.3, 0, 1.42, 0.12, 1.32, W);
  b.sph([0, top + 4.42, 0], [0.95, 0.9, 0.9], Y, 0, 6, 10);
  b.tube([0, top + 5.25, 0], [0, top + 5.85, 0], 0.26, 0.18, W, 8);
  b.sph([0, top + 6.0, 0], 0.17, YD, 0, 4, 6);
  return b.build();
}
// ── La Merced: fachada amarilla con su ataurique blanco. De frente a +z, 20 m de ancho. ──
function merced() {
  const b = new GeoB(), Y = A.merced, W = A.trim;
  b.box(0, 7, -2, 9.4, 7, 2, Y);
  [-1, 1].forEach((s) => {
    b.box(s * 8.7, 9.2, -1.6, 1.7, 9.2, 2.3, Y);
    b.box(s * 8.7, 18.6, -1.6, 1.85, 0.25, 2.45, W);
    b.box(s * 8.7, 19.6, -1.6, 1.3, 0.8, 1.9, Y);
    b.box(s * 8.7, 19.6, 0.32, 0.55, 0.62, 0.04, A.woodD);
    b.sph([s * 8.7, 20.5, -1.6], [1.15, 1.0, 1.15], Y, 0, 6, 8);
    b.tube([s * 8.7, 21.3, -1.6], [s * 8.7, 22.1, -1.6], 0.12, 0.07, W, 6);
    for (let y = 1.2; y < 18; y += 3.4) b.box(s * 8.7, y, 0.72, 1.75, 0.12, 0.06, W);
  });
  [4.7, 9.5, 14.0].forEach((y) => b.box(0, y, 0.06, 7.1, 0.16, 0.18, W));
  b.box(0, 14.9, -1.6, 6.2, 0.9, 1.6, Y);
  b.box(0, 16.2, -1.6, 4.0, 0.55, 1.4, Y);
  b.box(0, 17.1, -1.6, 2.0, 0.5, 1.2, Y);
  b.box(0, 17.75, -1.6, 0.25, 0.4, 0.25, W);
  // Columnas y el ataurique: cuadritos blancos en rejilla.
  for (let k = -2; k <= 2; k++) {
    const x = k * 2.85;
    b.box(x, 7.1, 0.1, 0.26, 6.9, 0.12, W);
    if (k === 2) continue;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 9; j++) {
      const px = x + 0.6 + i * 0.55, py = 1.2 + j * 1.45 + (i % 2) * 0.72;
      if (py > 13.4 || (k >= -1 && k <= 0 && py < 5.4 && abs1(px) < 1.9)) continue;
      b.box(px, py, 0.06, 0.11, 0.11, 0.05, W);
    }
  }
  // Puerta en arco y óculo
  b.box(0, 2.3, 0.04, 1.5, 2.3, 0.06, A.woodD);
  for (let i = 0; i < 8; i++) {
    const u = (i + 0.5) / 8 * 2 - 1, y = 4.6 + 0.9 * sqrt(1 - u * u);
    b.box(u * 1.5, (4.6 + y) / 2, 0.04, 0.19, (y - 4.6) / 2, 0.06, A.woodD);
    b.box(u * 1.55, y + 0.12, 0.08, 0.2, 0.14, 0.06, W);
  }
  b.tube([0, 11.2, 0.04], [0, 11.2, 0.14], 0.95, 0.95, W, 18);
  b.tube([0, 11.2, 0.14], [0, 11.2, 0.16], 0.72, 0.72, A.woodD, 18);
  return b.build();
}
const abs1 = (v) => (v < 0 ? -v : v);
// ── Fuente de las Sirenas ──
function fuente() {
  const b = new GeoB(), S = A.stone, SD = A.stoneD, Wt = A.water;
  b.tube([0, 0, 0], [0, 0.75, 0], 3.4, 3.3, S, 8);
  b.tube([0, 0.75, 0], [0, 0.86, 0], 3.48, 3.48, A.trim, 8);
  b.tube([0, 0.62, 0], [0, 0.64, 0], 3.06, 3.06, Wt, 8, 0.5);
  b.tube([0, 0.6, 0], [0, 2.6, 0], 0.56, 0.42, SD, 8);
  b.tube([0, 2.6, 0], [0, 2.82, 0], 1.5, 1.62, S, 8);
  b.tube([0, 2.78, 0], [0, 2.8, 0], 1.36, 1.36, Wt, 8, 0.5);
  b.tube([0, 2.82, 0], [0, 4.1, 0], 0.3, 0.22, SD, 8);
  b.tube([0, 4.1, 0], [0, 4.26, 0], 0.8, 0.86, S, 8);
  b.sph([0, 4.62, 0], [0.3, 0.42, 0.3], S, 0, 5, 6);
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 + 0.4, x = cos(a), z = sin(a);
    b.sph([x * 0.98, 3.25, z * 0.98], [0.2, 0.42, 0.2], S, 0, 5, 6);
    b.sph([x * 0.98, 3.76, z * 0.98], 0.13, S, 0, 4, 5);
    b.curve([[x * 1.05, 3.6, z * 1.05], [x * 1.7, 3.45, z * 1.7], [x * 2.25, 1.5, z * 2.25], [x * 2.35, 0.66, z * 2.35]], () => 0.045, Wt, 4, 0.9);
  }
  return b.build();
}
// ── Alfombras de aserrín: medidas de 1 por 1 (se escalan con sx y sz). Pintadas, sin luz propia. ──
function alfombra(k) {
  const b = new GeoB();
  b.painted = true;
  const P = [[SAW.purple, SAW.yellow, SAW.red, SAW.white, SAW.green], [SAW.green, SAW.white, SAW.purple, SAW.yellow, SAW.pink], [SAW.red, SAW.blue, SAW.yellow, SAW.orange, SAW.white]][k];
  const [bord, field, m1, m2, m3] = P;
  const y = 0.03;
  b.box(0, y, 0, 1, y, 1, bord);
  b.box(0, 0.062, 0, 0.84, 0.004, 0.92, field);
  for (let i = -6; i <= 6; i++) [-1, 1].forEach((s) => b.box(s * 0.92, 0.068, i * 0.145, 0.035, 0.004, 0.04, m2));
  const disc = (x, z, r, c, h = 0.07, n = 12) => b.tube([x, h, z], [x, h + 0.004, z], r, r, c, n);
  if (k === 0) {
    // Flores en cuadrícula con hojas
    for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j += 2) {
      const x = j * 0.42, z = i * 0.36;
      [[0.12, 0], [-0.12, 0], [0, 0.11], [0, -0.11]].forEach(([dx, dz]) => disc(x + dx, z + dz, 0.09, m1, 0.07, 8));
      disc(x, z, 0.06, m2, 0.076, 8);
      b.box(x + 0.16, 0.072, z + 0.14, 0.05, 0.004, 0.02, m3);
    }
    for (let i = -2; i <= 2; i++) disc(0, i * 0.36, 0.05, m1, 0.07, 6);
  } else if (k === 1) {
    // Rombos al centro y triángulos en los lados
    for (let i = -2; i <= 2; i++) {
      disc(0, i * 0.36, 0.26, m1, 0.07, 4);
      disc(0, i * 0.36, 0.15, m2, 0.076, 4);
      disc(0, i * 0.36, 0.06, m3, 0.082, 4);
      [-1, 1].forEach((s) => disc(s * 0.6, i * 0.36 + 0.18, 0.12, m1, 0.07, 4));
    }
  } else {
    // Soles con rayos
    for (let i = -1; i <= 1; i++) {
      const z = i * 0.6;
      for (let r = 0; r < 12; r++) {
        const a = (r / 12) * TAU;
        b.box(cos(a) * 0.36, 0.07, z + sin(a) * 0.33, 0.05, 0.004, 0.05, m2);
      }
      disc(0, z, 0.28, m1, 0.074, 16);
      disc(0, z, 0.19, m3, 0.078, 16);
      disc(0, z, 0.09, m1, 0.082, 12);
    }
    [-1, 1].forEach((s) => [-0.3, 0.3].forEach((z) => disc(s * 0.62, z, 0.08, m2, 0.07, 6)));
  }
  return b.build();
}
// ── Cucuruchos: túnica morada, cordón y cuello blanco. Caminan hacia -z. ──
function cucu(b, x, z) {
  b.tube([x, 0, z], [x, 1.36, z], 0.33, 0.21, A.purple, 8);
  b.tube([x, 0.96, z], [x, 1.02, z], 0.262, 0.262, A.white, 8);
  b.tube([x, 1.36, z], [x, 1.43, z], 0.24, 0.19, A.white, 8);
  b.sph([x, 1.58, z], [0.15, 0.17, 0.15], A.skin, 0, 5, 7);
  b.sph([x, 1.66, z + 0.03], [0.17, 0.13, 0.17], A.purpleD, 0, 5, 7);
  [-1, 1].forEach((s) => b.tube([x + s * 0.2, 1.26, z], [x + s * 0.07, 1.06, z - 0.27], 0.065, 0.05, A.purple, 5));
  b.sph([x, 1.05, z - 0.3], 0.065, A.white, 0, 4, 5);
}
function cucus() {
  const b = new GeoB();
  for (let r = 0; r < 3; r++) [-1, 1].forEach((s) => cucu(b, s * 0.72, -1.5 + r * 1.5));
  return b.build();
}
// El anda en hombros: flores, faroles y la tela morada al centro.
function anda() {
  const b = new GeoB();
  for (let i = 0; i < 5; i++) [-1, 1].forEach((s) => cucu(b, s * 0.98, -2 + i));
  b.box(0, 1.94, 0, 1.45, 0.18, 2.6, A.wood);
  b.box(0, 2.15, 0, 1.52, 0.05, 2.68, A.gold);
  [-1, 1].forEach((s) => {
    b.box(s * 1.48, 1.94, 0, 0.04, 0.17, 2.62, A.gold);
    b.box(0, 1.94, s * 2.62, 1.46, 0.17, 0.04, A.gold);
  });
  for (let i = -5; i <= 5; i++) [-1, 1].forEach((s) => b.sph([s * 1.24, 2.32, i * 0.47], 0.21, i % 2 ? A.white : A.purpleL, 0, 4, 6));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    b.tube([sx * 1.32, 2.2, sz * 2.4], [sx * 1.32, 3.35, sz * 2.4], 0.045, 0.045, A.gold, 5);
    b.box(sx * 1.32, 3.56, sz * 2.4, 0.16, 0.22, 0.16, A.lamp, 1.6);
    b.box(sx * 1.32, 3.82, sz * 2.4, 0.2, 0.04, 0.2, A.gold);
  });
  b.box(0, 2.9, 0, 0.92, 0.75, 1.45, A.purpleD);
  b.box(0, 3.7, 0, 0.72, 0.1, 1.25, A.gold);
  b.tube([0, 3.8, 0], [0, 4.95, 0], 0.52, 0.24, A.purple, 8);
  b.sph([0, 5.15, 0], [0.32, 0.38, 0.32], A.gold, 0.3, 5, 7);
  return b.build();
}
// La banda que va atrás: tubas, trompetas y el bombo.
function banda() {
  const b = new GeoB();
  const musico = (x, z, inst) => {
    [-1, 1].forEach((s) => b.tube([x + s * 0.09, 0, z], [x + s * 0.09, 0.86, z], 0.08, 0.09, A.black, 5));
    b.tube([x, 0.86, z], [x, 1.45, z], 0.23, 0.26, A.navy, 8);
    b.box(x, 1.2, z - 0.24, 0.05, 0.22, 0.02, A.white);
    b.sph([x, 1.62, z], 0.15, A.skin, 0, 5, 7);
    b.tube([x, 1.73, z], [x, 1.8, z], 0.17, 0.16, A.black, 8);
    b.box(x, 1.74, z - 0.17, 0.15, 0.015, 0.06, A.black);
    if (inst === 0) {
      b.tube([x + 0.16, 1.55, z + 0.02], [x + 0.18, 2.1, z + 0.08], 0.12, 0.34, A.gold, 10, 0.2);
      b.sph([x + 0.05, 1.22, z - 0.16], [0.22, 0.3, 0.13], A.gold, 0.2, 5, 6);
    } else if (inst === 1) {
      b.tube([x, 1.6, z - 0.14], [x, 1.57, z - 0.72], 0.03, 0.1, A.gold, 6, 0.2);
      [-1, 1].forEach((s) => b.tube([x + s * 0.2, 1.3, z], [x + s * 0.06, 1.52, z - 0.3], 0.05, 0.045, A.navy, 4));
    } else {
      b.tube([x - 0.36, 1.12, z - 0.24], [x + 0.36, 1.12, z - 0.24], 0.36, 0.36, A.white, 12);
      [-1, 1].forEach((s) => b.tube([x + s * 0.36, 1.12, z - 0.24], [x + s * 0.39, 1.12, z - 0.24], 0.37, 0.37, A.red, 12));
    }
  };
  [[-0.7, -1.2, 0], [0.7, -1.2, 1], [-0.7, 0.2, 1], [0.7, 0.2, 0], [-0.7, 1.6, 2], [0.7, 1.6, 1]].forEach(([x, z, k]) => musico(x, z, k));
  return b.build();
}
// ── La bajada: pinos ──
function pino() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 2.4, 0], 0.24, 0.16, A.trunk, 6);
  [[1.5, 2.2, 1.7], [2.8, 1.85, 1.55], [4.0, 1.45, 1.35], [5.1, 1.05, 1.15], [6.0, 0.62, 0.95]].forEach(([y, r, h], i) =>
    b.tube([0, y - 0.45, 0], [0, y + h, 0], r, 0.03, (ta) => (ta < 0.25 ? (i % 2 ? A.pineD : mixC(A.pineD, A.ink, 0.15)) : i % 2 ? A.pine : mixC(A.pine, A.leaf, 0.3)), 9));
  return b.build();
}
// Venta de fresas a la orilla de la carretera
function fresas() {
  const b = new GeoB();
  b.box(0, 0.8, 0, 1.2, 0.05, 0.55, A.woodL);
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => b.tube([sx * 1.1, 0, sz * 0.48], [sx * 1.1, 2.2, sz * 0.48], 0.04, 0.04, A.wood, 4)));
  b.box(0, 2.25, 0, 1.4, 0.05, 0.75, A.red);
  b.box(0, 2.32, 0, 1.25, 0.03, 0.62, A.white);
  for (let i = -2; i <= 2; i++) {
    b.tube([i * 0.44, 0.85, 0.05], [i * 0.44, 1.05, 0.05], 0.17, 0.2, A.straw, 8);
    for (let k = 0; k < 4; k++) b.sph([i * 0.44 + (k % 2 ? 0.07 : -0.07), 1.1, 0.05 + (k > 1 ? 0.07 : -0.07)], 0.07, A.berry, 0, 4, 5);
  }
  return b.build();
}
// ── Gente ──
function turista() {
  const b = new GeoB();
  [-1, 1].forEach((s) => {
    b.tube([s * 0.1, 0.06, 0], [s * 0.1, 0.56, 0], 0.065, 0.07, A.skinL, 6);
    b.tube([s * 0.1, 0.5, 0], [s * 0.1, 0.86, 0], 0.11, 0.11, A.khaki, 6);
    b.box(s * 0.1, 0.05, -0.04, 0.07, 0.05, 0.13, A.white);
  });
  b.tube([0, 0.84, 0], [0, 1.42, 0], 0.21, 0.23, A.white, 8);
  b.box(0, 1.15, 0.25, 0.17, 0.24, 0.1, A.pack);
  b.sph([0, 1.6, 0], [0.13, 0.15, 0.13], A.skinL, 0, 5, 7);
  b.tube([0, 1.7, 0], [0, 1.72, 0], 0.3, 0.3, A.straw, 12);
  b.tube([0, 1.72, 0], [0, 1.86, 0], 0.15, 0.13, A.straw, 10);
  [-1, 1].forEach((s) => b.tube([s * 0.21, 1.36, 0], [s * 0.09, 1.57, -0.25], 0.05, 0.045, A.skinL, 5));
  b.box(0, 1.6, -0.3, 0.12, 0.075, 0.05, A.black);
  b.tube([0, 1.6, -0.35], [0, 1.6, -0.43], 0.035, 0.035, A.black, 6);
  return b.build();
}
function ventera() {
  const b = new GeoB();
  b.tube([0, 0, 0], [0, 0.95, 0], 0.31, 0.24, (ta) => (floor(ta * 6) % 2 ? A.corte : mixC(A.corte, A.white, 0.25)), 8);
  b.tube([0, 0.92, 0], [0, 1.0, 0], 0.25, 0.25, A.yellow, 8);
  b.tube([0, 1.0, 0], [0, 1.42, 0], 0.25, 0.22, (ta) => (ta > 0.55 && ta < 0.75 ? A.yellow : ta > 0.3 && ta < 0.4 ? A.green : A.huipil), 8);
  b.sph([0, 1.57, 0], [0.13, 0.15, 0.13], A.skin, 0, 5, 7);
  b.sph([0, 1.6, 0.04], [0.14, 0.14, 0.14], A.hair, 0, 5, 7);
  b.tube([0, 1.72, 0], [0, 1.9, 0], 0.32, 0.4, A.straw, 10);
  [[0.15, 1.97, 0.05, A.orange], [-0.12, 1.98, -0.08, A.berry], [0, 2.0, 0.15, A.banana], [-0.15, 1.96, 0.14, A.green]].forEach(([x, y, z, c]) => b.sph([x, y, z], 0.12, c, 0, 4, 6));
  b.tube([0.22, 1.32, 0], [0.3, 1.82, 0.02], 0.055, 0.05, A.skin, 5);
  b.tube([-0.22, 1.32, 0], [-0.3, 0.95, 0.05], 0.055, 0.05, A.skin, 5);
  return b.build();
}
function lalo() {
  const b = new GeoB(), shirt = hex('#8ec7e8');
  [-0.16, 0.16].forEach((x) => b.tube([x, 0, 0], [x, 0.86, 0], 0.11, 0.13, A.khaki, 6));
  b.sph([0, 1.25, 0], [0.4, 0.5, 0.36], shirt, 0, 7, 9);
  b.sph([0, 1.92, 0], 0.22, A.skin, 0, 7, 8);
  b.box(0, 1.86, 0.21, 0.13, 0.03, 0.02, A.hair);
  b.tube([0, 2.06, 0], [0, 2.09, 0], 0.46, 0.46, A.straw, 14);
  b.tube([0, 2.09, 0], [0, 2.32, 0], 0.22, 0.2, A.straw, 10);
  b.tube([0, 2.12, 0], [0, 2.16, 0], 0.225, 0.225, A.red, 10);
  b.tube([-0.38, 1.55, 0], [-0.52, 1.05, 0.1], 0.08, 0.07, shirt, 5);
  b.tube([0.38, 1.55, 0], [0.6, 2.1, 0.15], 0.08, 0.07, shirt, 5);
  b.tube([0.64, 2.12, 0.18], [0.64, 2.3, 0.18], 0.015, 0.015, A.woodL, 4);
  b.curve([[0.64, 2.3, 0.18], [0.65, 2.48, 0.2], [0.62, 2.66, 0.22]], (t) => 0.065 * (1 - 0.3 * t), (ta) => (ta < 0.7 ? A.choco : A.banana), 7);
  return b.build();
}
// ── Chocobananos ──
function chocoban() {
  const b = new GeoB();
  b.tube([0, -0.32, 0], [0, 0.02, 0], 0.022, 0.022, A.woodL, 5, 0.3);
  b.curve([[0, 0, 0], [0.03, 0.24, 0], [0.01, 0.46, 0.02], [-0.04, 0.64, 0.04]], (t) => 0.085 * (1 - 0.32 * t), (ta) => (ta < 0.68 ? A.choco : A.banana), 8, 0.3);
  const SP = [A.red, A.green, A.blue, A.yellow, A.white];
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4, y = 0.05 + i * 0.034, r = 0.085 - i * 0.002;
    b.box(cos(a) * r, y, sin(a) * r, 0.014, 0.014, 0.014, SP[i % 5], 0.5);
  }
  return b.build();
}
// Carretón de chocobananos con sombrilla
function carChoco() {
  const b = new GeoB();
  b.box(0, 0.98, -0.35, 0.62, 0.4, 0.46, A.cooler);
  b.box(0, 1.0, 0.12, 0.63, 0.12, 0.012, A.red);
  b.box(0, 0.82, 0.12, 0.63, 0.06, 0.012, A.blue);
  b.box(0, 1.41, -0.35, 0.65, 0.045, 0.49, A.blue);
  [-1, 1].forEach((s) => b.tube([s * 0.62, 0.3, -0.35], [s * 0.72, 0.3, -0.35], 0.3, 0.3, A.ink, 10));
  b.tube([-0.05, 0.3, 0.95], [0.05, 0.3, 0.95], 0.32, 0.32, A.ink, 10);
  b.tube([0, 0.6, 0.1], [0, 0.42, 0.95], 0.04, 0.04, A.iron, 4);
  b.tube([0, 0.62, 0.1], [0, 1.15, 0.72], 0.035, 0.035, A.iron, 4);
  b.box(0, 1.16, 0.74, 0.16, 0.05, 0.12, A.black);
  b.tube([0, 1.45, -0.35], [0, 2.45, -0.35], 0.03, 0.03, A.white, 4);
  const rings = [];
  for (const [r, y] of [[0.03, 2.78], [1.2, 2.42], [1.32, 2.32]]) {
    const o = [];
    for (let i = 0; i < 16; i++) o.push([cos((i / 16) * TAU) * r, y, -0.35 + sin((i / 16) * TAU) * r]);
    rings.push(o);
  }
  b.loft(rings, (a, tb) => [A.red, A.yellow, A.green, A.blue][floor(tb * 8) % 4]);
  for (let i = 0; i < 5; i++) {
    const x = -0.4 + i * 0.2;
    b.tube([x, 1.45, -0.6], [x, 1.62, -0.6], 0.012, 0.012, A.woodL, 4);
    b.curve([[x, 1.62, -0.6], [x + 0.01, 1.8, -0.6], [x - 0.01, 1.96, -0.58]], (t) => 0.05 * (1 - 0.3 * t), (ta) => (ta < 0.68 ? A.choco : A.banana), 6);
  }
  return b.build();
}
// Cortinas moradas de Cuaresma colgadas de las fachadas (de frente a +z)
function cortina() {
  const b = new GeoB();
  b.curve([[-2.2, 3.6, 0.1], [-1.1, 3.0, 0.22], [0, 3.55, 0.12], [1.1, 3.0, 0.22], [2.2, 3.6, 0.1]], () => 0.12, A.purple, 6);
  b.curve([[-2.2, 3.62, 0.08], [-1.1, 3.12, 0.16], [0, 3.6, 0.1], [1.1, 3.12, 0.16], [2.2, 3.62, 0.08]], () => 0.05, A.white, 5);
  [-1, 1].forEach((s) => {
    b.box(s * 2.25, 2.4, 0.1, 0.22, 1.25, 0.05, A.purple);
    b.box(s * 2.25, 1.12, 0.12, 0.23, 0.05, 0.05, A.white);
  });
  b.box(0, 3.75, 0.08, 2.4, 0.06, 0.06, A.white);
  return b.build();
}
// Farol colonial de pared, con su brazo de hierro (apagado de día)
function farolPared() {
  const b = new GeoB();
  b.box(0, 0, 0.03, 0.12, 0.2, 0.03, A.iron);
  b.curve([[0, 0.12, 0.04], [0, 0.22, 0.3], [0, 0.12, 0.55]], () => 0.025, A.iron, 4);
  b.tube([0, -0.05, 0.55], [0, 0.12, 0.55], 0.012, 0.012, A.iron, 4);
  b.tube([0, -0.5, 0.55], [0, -0.05, 0.55], 0.14, 0.17, A.iron, 4);
  b.tube([0, -0.46, 0.55], [0, -0.09, 0.55], 0.125, 0.155, hex('#ffe9b0'), 4, 0.35);
  b.tube([0, -0.05, 0.55], [0, 0.06, 0.55], 0.2, 0.03, A.iron, 4);
  b.tube([0, -0.58, 0.55], [0, -0.5, 0.55], 0.06, 0.14, A.iron, 4);
  return b.build();
}
function banca() {
  const b = new GeoB();
  b.box(0, 0.45, 0, 0.95, 0.05, 0.22, A.woodL);
  b.box(0, 0.78, 0.2, 0.95, 0.16, 0.03, A.woodL);
  [-1, 1].forEach((s) => b.box(s * 0.8, 0.4, 0.04, 0.05, 0.4, 0.22, A.iron));
  return b.build();
}
// Rótulo de "Bienvenidos" sobre la carretera (de lado a lado, 11 m)
function portal() {
  const b = new GeoB();
  [-1, 1].forEach((s) => {
    b.box(s * 6.0, 2.6, 0, 0.42, 2.6, 0.42, A.stone);
    b.box(s * 6.0, 5.3, 0, 0.55, 0.12, 0.55, A.trim);
    b.box(s * 6.0, 5.55, 0, 0.3, 0.2, 0.3, A.ochre);
  });
  b.box(0, 6.2, 0, 6.4, 0.6, 0.18, A.ochre);
  b.box(0, 6.86, 0, 6.6, 0.07, 0.24, A.trim);
  return b.build();
}

export const ANTIGUA_SPEC = {
  casaA: [() => casa(0), 110, null], casaB: [() => casa(1), 60, null], casaC: [() => casa(2), 70, null], bugan: [bugan, 40, null], farolp: [farolPared, 70, null],
  arco: [arco, 2, null], merced: [merced, 2, null], fuente: [fuente, 2, [3.3, 3.3]], alfA: [() => alfombra(0), 14, null, true], alfB: [() => alfombra(1), 14, null, true], alfC: [() => alfombra(2), 14, null, true],
  cucus: [cucus, 16, [1.4, 2.2]], anda: [anda, 6, [1.6, 2.8]], banda: [banda, 6, [1.3, 2]], pino: [pino, 160, [2.2, 2.2]], fresas: [fresas, 10, [1.2, 0.6]],
  turista: [turista, 30, [0.4, 0.35]], ventera: [ventera, 20, [0.4, 0.35]], lalo: [lalo, 2, [0.5, 0.4]], chocoban: [chocoban, 14, [0.2, 0.2]], carchoco: [carChoco, 14, [1, 1.2]],
  cortina: [cortina, 30, null], banca: [banca, 20, [1, 0.3]], portal: [portal, 2, null],
};
