// El juego: estados, física del vehículo, choques, jefe y flujo del nivel.
import * as T from 'three';
import {PI, abs, sin, cos, min, max, floor, ceil, sqrt, exp, clamp, lerp, damp, sstep, rnd, pick, store, TEST, COARSE, REDUCED, $} from './core/util.js';
import {initGfx, resize, renderFrame, adaptQuality, U, P, VIEW, CAM_Z, camera, cutCam, scene, renderer, celUni} from './core/gfx.js';
import {VS_MARK, FS_MARK} from './core/shaders.js';
import {Audio} from './core/audio.js';
import {UI, anime} from './core/ui.js';
import {buildProps, syncProps, dropShadow, setShadowLen, drawSignAtlas} from './world/props.js';
import {buildGround, setTrackTexture} from './world/ground.js';
import {buildFx, fx, tick, burst, updateFx, syncFx, clearFx, clearTicks} from './world/fx.js';
import {buildBike, updateBike, resetScarf, kickPackage, BIKE, buildDog, updateDog, DOG, drawLabel} from './vehicles/bicycle.js';
import {buildLevel, META, SKYKEYS, S1, S2, S3, LEN} from './levels/monterrico.js';

const WET_W = 3.35;
export const G = {state: 'boot', dist: 0, speed: 0, x: 0, y: 0, vy: 0, vx: 0, steer: 0, clock: 80, pkg: 100, q: 0, racha: 1, rachaT: 0, force: 1, stage: 0, hits: 0, turtles: 0, nears: 0, tricks: 0, encargos: 0, iframes: 0, shake: 0, lines: 0, ts: 1, hitstop: 0, callT: 0, phT: 0, phGap: 1, air: false, trick: 0, trickOn: false, trickCool: 0, sink: 0, spin: 0, hard: false, soft: false, inWater: false, camBlend: 1, camX: 0, wet: 0, fT: 0, impactT: 0, impactInv: false, impactCool: 0, up: {frenos: 0, carton: 0, cadena: 0}, auto: false, god: false, fov: 60, cutT: 0, flashT: 0, onRamp: false, attract: 0, sprint: false, brake: false, deadReason: '', snap: null, bestRun: false, time: 0};
export const IN = {left: false, right: false, up: false, down: false, jump: 0, stick: 0, stickOn: false, mouse: false, touchId: null, startX: 0, pedalBtn: false, brakeBtn: false};
const SET = {flash: store.get('flash', !REDUCED)};
let LV = null;
const BOSS = {on: false, mode: 'off', side: 1, z: 0.7, x: 0, x0: 0, xEnd: 0, t: 0, next: 3, hunger: 0, aim: 0, eatT: 0, hitDone: false};
let markMesh, markU;

// ── Pista ──
function trackAt(D) {
  const tr = LV.track, f = clamp(D, 0, LV.len - 2) / 2, i = floor(f), u = f - i, o = i * 4;
  return {
    cx: lerp(tr[o], tr[o + 4], u), hw: lerp(tr[o + 1], tr[o + 5], u), kind: u < 0.5 ? tr[o + 2] : tr[o + 6], base: lerp(tr[o + 3], tr[o + 7], u),
  };
}
function shoreAt(D, base, t) {
  let s = base + 0.6 * sin(t * 0.7 + D * 0.05) + 0.35 * sin(t * 1.3 - D * 0.11);
  const a = U.uSurge0.value, b = U.uSurge1.value;
  const ka = (D - a.x) / a.y, kb = (D - b.x) / b.y;
  s += a.z * exp(-ka * ka) + b.z * exp(-kb * kb);
  return s;
}
// ── Paleta según la hora ──
const palKeys = ['skyTop', 'skyMid', 'skyLow', 'sunDisc', 'sunCol', 'shade', 'rim', 'fog', 'cloudL', 'cloudS', 'hill', 'hill2', 'sandA', 'sandB', 'wet', 'waterA', 'waterB', 'foam', 'plank', 'street', 'grass'];
const palCols = SKYKEYS.map((k) => palKeys.map((n) => new T.Color().setStyle(k[n])));
const uName = (n) => 'u' + n[0].toUpperCase() + n.slice(1);
function updatePalette(D) {
  let i = 0;
  while (i < SKYKEYS.length - 2 && D > SKYKEYS[i + 1].D) i++;
  const A = SKYKEYS[i], B = SKYKEYS[i + 1], t = sstep(A.D, B.D, D);
  palKeys.forEach((n, j) => {
    U[uName(n)].value.copy(palCols[i][j]).lerp(palCols[i + 1][j], t);
  });
  const gain = lerp(1.18, 0.92, clamp(D / 4400));
  U.uSunCol.value.multiplyScalar(gain);
  const el = lerp(A.sunEl, B.sunEl, t), nig = lerp(A.night, B.night, t);
  U.uNight.value = nig;
  U.uSunVis.value.set(-0.36, el, -1).normalize();
  U.uSunDir.value.set(-0.52, 0.42 + el * 0.8 + nig * 0.2, -0.32 + nig * 0.1).normalize();
  setShadowLen(lerp(A.shadow, B.shadow, t));
  U.uShadowA.value = lerp(A.shadowA, B.shadowA, t);
  U.uLampC.value.setRGB(1, 0.84, 0.56).multiplyScalar(nig * 0.95);
  U.uInk.value.setRGB(0.012, 0.008, 0.02);
  U.uShadowC.value.setRGB(0.03, 0.015, 0.09);
}
// ── Golpes ──
function impact(t, inv) {
  if (!SET.flash || G.impactCool > 0) return;
  G.impactT = t;
  G.impactInv = !!inv;
  G.impactCool = 0.7;
}
const screenOf = (() => {
  const v = new T.Vector3();
  return (x, y, z) => {
    v.set(x, y, z).project(camera);
    return {x: (v.x * 0.5 + 0.5) * VIEW.cw, y: (-v.y * 0.5 + 0.5) * VIEW.ch};
  };
})();
function shout(text, tier, h = 2.4) {
  const p = screenOf(G.x, G.y + h, 0);
  UI.call(text, tier, p.x, p.y - 26);
}
const col = (u) => [U[u].value.r, U[u].value.g, U[u].value.b];
function damage(n) {
  const k = 1 - G.up.carton * 0.3;
  G.pkg = max(0, G.pkg - n * k);
  kickPackage(1.4 + n * 0.15);
  if (G.pkg <= 0 && !G.god) fail('pkg');
}
function crash(it) {
  if (G.iframes > 0 || G.god && !it.soft && false) return;
  if (it.soft) {
    G.turtles++;
    it.gone = true;
    G.speed *= 0.6;
    G.racha = 1;
    shout('¡Las tortuguitas!', 3);
    Audio.land(1);
    burst(it.x, 0.2, 0, 8, 5, 0.5, 0.14, col('uSandB'), {world: 1});
    return;
  }
  it.flash = 1;
  G.hits++;
  G.iframes = 1;
  G.hitstop = 0.06;
  G.shake = 1;
  G.racha = 1;
  G.speed *= 0.36;
  impact(0.06, false);
  shout(pick(['¡Qué clavo!', '¡Púchica, el paquete!', '¡Aaay!']), 3);
  Audio.hit();
  fx(2, G.x, 1.1, 0, 2, 0.22, [3, 2.6, 1.8], {world: 0});
  burst(G.x, 1, 0, 14, 8, 0.6, 0.14, [1, 0.84, 0.5], {world: 0.4, add: 0});
  UI.floatTime('−' + ceil(it.dmg * (1 - G.up.carton * 0.3)) + '% paquete', false);
  damage(it.dmg);
}
function near(it, gap) {
  const c = clamp(1 - gap / 0.85), tier = c < 0.4 ? 0 : c < 0.78 ? 1 : 2;
  G.nears++;
  G.racha = min(9, G.racha + (tier > 0 ? 1 : 0));
  G.rachaT = 6;
  G.q += 1 + (tier * G.racha) / 2;
  const bonus = 0.12 + tier * 0.14;
  G.clock += bonus;
  const dx = it.x - G.x;
  if (tier > 0 || G.callT <= 0) {
    shout(tier === 0 ? '¡Cerquita!' : tier === 1 ? pick(['¡Púchica!', '¡Uy!']) : pick(['¡A la gran!', '¡Cabal!']), tier);
    G.callT = 0.35;
  }
  Audio.near(c, dx / 6);
  G.lines = max(G.lines, 0.05 + tier * 0.08);
}
function jumpOver() {
  G.q += 2;
  G.clock += 0.2;
  G.racha = min(9, G.racha + 1);
  G.rachaT = 6;
  if (G.callT <= 0) {
    shout(pick(['¡Por encima!', '¡Volando!', '¡Eso!']), 1);
    G.callT = 0.4;
  }
}
function pickup(it) {
  it.gone = true;
  const z = -(it.D - G.dist);
  if (it.pick === 'coin') {
    G.q += 2;
    G.coinN = (G.coinT > 0 ? G.coinN + 1 : 0);
    G.coinT = 1.1;
    Audio.coin(G.coinN);
    fx(1, it.x, it.y, z, 1.1, 0.26, [1.6, 1.2, 0.3], {world: 1});
  } else if (it.pick === 'coco') {
    G.clock += 5;
    UI.floatTime('+5 s', true);
    shout('¡Agua de coco!', 1);
    Audio.pickup();
    burst(it.x, it.y, z, 8, 6, 0.5, 0.16, [0.75, 1, 0.6], {add: 0});
  } else if (it.pick === 'tape') {
    G.pkg = min(100, G.pkg + 18);
    UI.floatTime('+18% paquete', true);
    shout('¡Cinta de la buena!', 1);
    Audio.pickup();
  } else if (it.pick === 'tortilla') {
    Audio.pickup();
    if (BOSS.on && BOSS.mode !== 'full') {
      BOSS.hunger++;
      UI.boss(true, BOSS.hunger);
      shout(BOSS.hunger >= 3 ? '¡Tomá, chucho!' : '¡Ahí va la tortilla!', 2);
      BOSS.mode = 'eat';
      BOSS.eatT = 4;
      burst(it.x, 1, 3, 8, 6, 0.5, 0.15, [1, 0.8, 0.4], {add: 0, world: 0.8});
    }
  }
}
// ── Estados de falla y entrega ──
function fail(reason) {
  if (G.state !== 'play' || G.god) return;
  G.state = 'failing';
  G.deadReason = reason;
  G.fT = 1.1;
  Audio.fail();
  Audio.fadeMusic(1.2);
}
function showFail() {
  G.state = 'failed';
  $('app').dataset.state = 'menu';
  UI.hideHud();
  $('fxCalls').innerHTML = '';
  markMesh.visible = false;
  const t = G.deadReason === 'pkg' ? 'El paquete quedó hecho pedazos' : 'Se te pasó la hora';
  $('failTitle').textContent = t;
  $('failText').textContent = G.deadReason === 'pkg' ? 'Don Beto no quiere saber nada de lo que había adentro. Mejor intentalo otra vez.' : 'La Licenciada ya llamó tres veces. Don Beto te da otra oportunidad, pero solo una.';
  UI.showScreen('scrFail');
}
function snapshot(dist) {
  G.snap = {stage: G.stage, dist: dist === undefined ? LV.stageBounds[G.stage] : dist, q: G.q, pkg: G.pkg, clock: G.clock, up: Object.assign({}, G.up), turtles: G.turtles, hits: G.hits, nears: G.nears, tricks: G.tricks, encargos: G.encargos};
  store.set('run', G.snap);
}
function startAt(snap) {
  LV = buildLevel(COARSE);
  Object.assign(G, {dist: snap.dist, stage: snap.stage, q: snap.q, pkg: max(snap.pkg, snap.dist ? 45 : 100), clock: max(snap.clock, META.stages[snap.stage].clock * 0.82), up: Object.assign({frenos: 0, carton: 0, cadena: 0}, snap.up), turtles: snap.turtles, hits: snap.hits, nears: snap.nears, tricks: snap.tricks, encargos: snap.encargos,
    x: LV.center(snap.dist), y: 0, vy: 0, vx: 0, speed: 6, steer: 0, racha: 1, force: 1, iframes: 1.2, wet: 0, air: false, trickOn: false, spin: 0, ts: 1, phT: 0, phGap: snap.dist ? 1.4 : 0.8, fT: 0, cutT: 0, hitstop: 0, shake: 0, lines: 0.4, state: 'play', auto: G.auto, god: G.god});
  BOSS.on = false;
  BOSS.mode = 'off';
  BOSS.hunger = 0;
  DOG.root.visible = false;
  markMesh.visible = false;
  PQ.length = 0;
  document.getElementById('fxCalls').innerHTML = '';
  $('phone').hidden = true;
  G.camHero = false;
  for (const c of LV.calls) if (c.D < snap.dist + 20) c.done = true;
  for (const s of LV.surges) if (s.D < snap.dist) s.started = s.done = true;
  for (const c of LV.customers) if (c.D < snap.dist) c.done = true;
  for (const t of LV.tumulos) if (t.D < snap.dist) t.used = true;
  LV.cursor = 0;
  U.uSurge0.value.z = 0;
  U.uSurge1.value.z = 0;
  clearFx();
  G.time0 = U.uTime.value;
  G.camBlend = G.camBlend > 0.5 ? G.camBlend : 0;
  BIKE.visible = true;
  P.uFadeK.value = 0;
  P.uFadeW.value = 0;
  P.uCut.value = 0;
  $('app').dataset.state = 'play';
  UI.showHud();
  UI.hud(G, LV);
  Audio.start(themeOf(snap.stage));
  anime({targets: G, camBlend: 0, duration: 1100, easing: 'easeInOutCubic'});
  setTimeout(() => {
    if (G.state === 'play') UI.card(G.stage, META.stages[G.stage]);
  }, 500);
  updateMarkers();
}
const themeOf = (st) => st;
export function newRun() {
  document.activeElement && document.activeElement.blur && document.activeElement.blur();
  store.set('run', null);
  startAt({stage: 0, dist: 0, q: 0, pkg: 100, clock: META.stages[0].clock, up: {frenos: 0, carton: 0, cadena: 0}, turtles: 0, hits: 0, nears: 0, tricks: 0, encargos: 0});
  snapshot();
}
export function continueRun() {
  const s = store.get('run', null);
  if (s) startAt(s);
  else newRun();
}
const SHOP = [
  {id: 'cadena', name: 'Cadena nueva', desc: 'Pedaleás un 6% más rápido.', price: 60},
  {id: 'frenos', name: 'Frenos de verdad', desc: 'Frenás el doble y te recuperás más rápido de los golpes.', price: 45},
  {id: 'carton', name: 'Cartón extra', desc: 'El paquete recibe 30% menos daño.', price: 70},
];
function openShop() {
  G.state = 'shop';
  snapshot();
  $('app').dataset.state = 'menu';
  renderShop();
  UI.showScreen('scrShop');
}
function renderShop() {
  $('shopQ').textContent = 'Q' + floor(G.q);
  $('shopNext').textContent = META.stages[G.stage].name;
  $('shopTime').textContent = '+' + META.stages[G.stage].clock + ' s al reloj';
  $('shopPkg').textContent = ceil(G.pkg) + '%';
  const L = $('shopList');
  L.innerHTML = '';
  SHOP.forEach((s) => {
    const owned = G.up[s.id] > 0, can = G.q >= s.price;
    const row = document.createElement('div');
    row.className = 'shoprow';
    row.innerHTML = '<div class="min-w-0"><p class="font-display text-[1.2rem] leading-tight">' + s.name + '</p><p class="note">' + s.desc + '</p></div>';
    const b = document.createElement('button');
    b.className = 'btn btn-2 shrink-0';
    b.id = 'buy-' + s.id;
    b.innerHTML = '<span>' + (owned ? 'Ya lo tenés' : 'Q' + s.price) + '</span>';
    b.disabled = owned || !can;
    b.addEventListener('click', () => {
      G.q -= s.price;
      G.up[s.id] = 1;
      Audio.buy();
      renderShop();
    });
    row.appendChild(b);
    L.appendChild(row);
  });
  const fix = G.pkg < 100 ? $('btnFix') : null;
  $('btnFix').disabled = G.q < 25 || G.pkg >= 100;
}
function leaveShop() {
  Audio.ui();
  UI.hideScreen('scrShop', () => {});
  G.clock += META.stages[G.stage].clock;
  UI.floatTime('+' + META.stages[G.stage].clock + ' s', true);
  G.state = 'play';
  G.iframes = 1;
  G.speed = max(G.speed, 8);
  $('app').dataset.state = 'play';
  Audio.setLevel(themeOf(G.stage));
  Audio.resume();
  snapshot();
  UI.card(G.stage, META.stages[G.stage]);
}
function startBoss() {
  snapshot(S3);
  BOSS.on = true;
  BOSS.mode = 'cut';
  BOSS.t = 0;
  BOSS.next = 3;
  BOSS.side = G.x < LV.center(G.dist) ? 1 : -1;
  BOSS.x = G.x + BOSS.side * 3.1;
  BOSS.z = 0.7;
  BOSS.hunger = 0;
  DOG.root.visible = true;
  G.cutT = 1.25;
  G.cutWhat = 'dog';
  cutCam.layers.set(2);
  Audio.setLevel(3);
  Audio.bark();
  P.uCut.value = 1;
  anime.remove(P.uCutW);
  anime.timeline({easing: 'easeOutExpo'})
    .add({targets: P.uCutW, value: [0, 0.2], duration: 160})
    .add({targets: P.uCutW, value: 0.23, duration: 880, easing: 'linear'})
    .add({targets: P.uCutW, value: 0, duration: 150, easing: 'easeInExpo'});
  UI.cut('¡TERREMOTO!', 'El chucho de Doña Tere');
  G.fov = 66;
}
function endCut() {
  G.cutT = 0;
  P.uCut.value = 0;
  UI.cutOut();
  impact(0.12, true);
  G.lines = 0.9;
  G.shake = 0.7;
  if (G.cutWhat === 'dog') {
    BOSS.mode = 'chase';
    UI.boss(true, 0);
    queuePhone('Mamá', '¡Las tortillas, mijo! Agarrá tres y se le quita lo bravo.');
  }
}
function finish() {
  G.state = 'finish';
  G.fT = 0;
  G.camHero = true;
  G.landed = false;
  G.landT = 0;
  UI.hideHud();
  G.cutT = 0.95;
  G.cutWhat = 'rider';
  cutCam.layers.set(1);
  P.uCut.value = 1;
  anime.remove(P.uCutW);
  anime.timeline({easing: 'easeOutExpo'})
    .add({targets: P.uCutW, value: [0, 0.19], duration: 140})
    .add({targets: P.uCutW, value: 0.22, duration: 660, easing: 'linear'})
    .add({targets: P.uCutW, value: 0, duration: 140, easing: 'easeInExpo'});
  UI.cut('¡LA LANCHA!', 'Última salida a La Avellana');
  Audio.fanfare();
  DOG.root.visible = false;
  markMesh.visible = false;
}
function showResults() {
  G.state = 'results';
  $('fxCalls').innerHTML = '';
  $('app').dataset.state = 'menu';
  const checks = [
    [true, 'Llegaste a la lancha'],
    [G.pkg >= 60, 'Paquete con 60% o más'],
    [G.pkg >= 90, 'Paquete con 90% o más'],
    [G.clock >= 15, 'Te sobraron 15 segundos o más'],
    [G.turtles === 0, 'Ninguna tortuguita golpeada'],
  ];
  const n = checks.filter((c) => c[0]).length;
  const best = store.get('best', {stars: 0, clock: 0, q: 0});
  if (n > best.stars || (n === best.stars && G.clock > best.clock)) store.set('best', {stars: n, clock: G.clock, q: floor(G.q), pkg: ceil(G.pkg)});
  store.set('run', null);
  $('resList').innerHTML = checks.map((c) => '<li data-ok="' + (c[0] ? '1' : '0') + '">' + c[1] + '</li>').join('');
  UI.count($('resPkg'), ceil(G.pkg), (v) => floor(v) + '%');
  UI.count($('resClock'), max(0, G.clock), (v) => floor(v) + ' s');
  UI.count($('resQ'), floor(G.q), (v) => 'Q' + floor(v));
  $('resNear').textContent = String(G.nears);
  $('resEnc').textContent = String(G.encargos);
  UI.showScreen('scrResults');
  UI.stars(n);
  G.shareText = 'Crucé Monterrico en Vuelta a Guatemala: ' + n + ' de 5 estrellas, paquete al ' + ceil(G.pkg) + '%.';
}
export function goTitle() {
  G.state = 'title';
  G.camBlend = 1;
  G.camHero = false;
  LV = buildLevel(COARSE);
  G.dist = 40;
  G.x = 3;
  G.speed = 15;
  G.y = 0;
  G.vy = 0;
  G.spin = 0;
  BOSS.on = false;
  DOG.root.visible = false;
  BIKE.visible = true;
  UI.hideHud();
  P.uFadeK.value = 0;
  P.uFadeW.value = 0;
  P.uCut.value = 0;
  $('app').dataset.state = 'menu';
  refreshTitle();
  $('scrTitle').hidden = false;
  UI.titleIn();
  if (!COARSE) $('btnStart').focus({preventScroll: true});
}
function refreshTitle() {
  const best = store.get('best', null), run = store.get('run', null);
  $('bestLine').textContent = best ? 'Tu mejor entrega en Monterrico: ' + best.stars + ' de 5 estrellas.' : 'Primera entrega: Monterrico.';
  const cont = $('btnContinue');
  cont.hidden = !(run && run.stage > 0);
  if (run && run.stage > 0) cont.firstElementChild.textContent = 'Seguir en ' + META.stages[run.stage].name;
}
function updateMarkers() {}
// ── Llamadas ──
const PQ = [];
function queuePhone(from, t) {
  PQ.push({from, t});
}
function updatePhone(dt0) {
  if (G.state === 'play') {
    for (const c of LV.calls) {
      if (!c.done && G.dist >= c.D) {
        c.done = true;
        PQ.push(c);
      }
    }
  }
  if (G.phT > 0) {
    G.phT -= dt0;
    if (G.phT <= 0) {
      UI.phoneHide();
      G.phGap = 0.5;
    }
  } else if (G.phGap > 0) G.phGap -= dt0;
  else if (PQ.length && G.state === 'play') {
    while (PQ.length > 2) PQ.shift();
    const m = PQ.shift();
    UI.phone(m.from, m.t);
    G.phT = clamp(m.t.length * 0.056 + 1.6, 3.4, 7);
  }
}
// ── Piloto automático (título y pruebas) ──
const AP = {x: 0, t: 0};
function autoDrive(tr, sh) {
  const sp = max(G.speed, 8), L = sp * 1.9;
  let best = 1e9, bx = G.x;
  const lo = tr.kind === 0 ? max(tr.cx - tr.hw, sh + 0.2) : tr.cx - tr.hw + 0.5, hi = tr.kind === 0 ? tr.cx + min(tr.hw, 11) : tr.cx + tr.hw - 0.5;
  const obs = [];
  const near = (it) => {
    if (it.gone || it.passed) return;
    const d = it.D - G.dist;
    if (d < 0 || d > L) return;
    if (it.solid || it.pick) obs.push([it, d]);
  };
  for (let i = LV.cursor; i < LV.items.length; i++) {
    const it = LV.items[i];
    if (it.D > G.dist + L) break;
    near(it);
  }
  for (const m of LV.movers) if (m.on) near(m);
  for (let k = 0; k <= 12; k++) {
    const x = lerp(lo, hi, k / 12);
    let c = abs(x - G.x) * 0.1;
    if (tr.kind === 0) c += abs(x - (sh + 1.7)) * 0.32;
    else c += abs(x - tr.cx) * 0.6;
    for (const [it, d] of obs) {
      const ax = it.x + (it.vx || 0) * (d / sp);
      if (it.pick) {
        if (abs(x - ax) < 1.2) c -= it.pick === 'coin' ? 0.6 : 6;
        continue;
      }
      const clear = it.w + 0.75;
      if (abs(x - ax) < clear) {
        const jumpable = it.h < 1.05 && !it.h0;
        c += (jumpable ? 12 : 90) * (1.3 - d / L);
      }
    }
    if (c < best) {
      best = c;
      bx = x;
    }
  }
  AP.x = bx;
  IN.stick = clamp((AP.x - G.x) * 0.55, -1, 1);
  IN.stickOn = true;
  // Saltar lo que no se puede esquivar
  if (G.y <= 0) {
    for (const [it, d] of obs) {
      if (it.pick || it.soft && false) continue;
      if (it.h < 1.05 && abs(G.x - it.x) < it.w + 0.5 && d < sp * 0.27 && d > 1) IN.jump = 0.12;
    }
    for (const g of LV.gaps) {
      const d = g[0] - G.dist;
      if (d > 0 && d < sp * 0.14) IN.jump = 0.12;
    }
    for (const t of LV.tumulos) {
      const d = t.D - G.dist;
      if (!t.used && d > 0 && d < sp * 0.2) IN.jump = 0.12;
    }
    if (BOSS.mode === 'aim' && BOSS.aim < 0.42) IN.jump = 0.12;
  }
}
// ── Actualización ──
function readSteer() {
  if (IN.stickOn) return IN.stick;
  return (IN.right ? 1 : 0) - (IN.left ? 1 : 0);
}
function updateSurges(dt) {
  const act = [];
  for (const s of LV.surges) {
    if (!s.started && G.dist > s.D + 20) s.started = s.done = true;
    if (!s.started && G.dist > s.D - 125) {
      s.started = true;
      s.t = 0;
      queueMicrotask(() => {
        if (G.state === 'play') {
          UI.call('¡Aguas, viene la ola!', 2, VIEW.cw * 0.5, VIEW.ch * 0.3);
          Audio.wave();
        }
      });
    }
    if (s.started && !s.done) {
      s.t += dt;
      if (s.t > 7.5) s.done = true;
      else act.push(s);
    }
  }
  const a = U.uSurge0.value, b = U.uSurge1.value;
  a.z = 0;
  b.z = 0;
  const set = (v, s) => v.set(s.D, s.half, s.amp * sstep(0, 3.2, s.t) * (1 - sstep(5, 7.5, s.t)), 0);
  if (act[0]) set(a, act[0]);
  if (act[1]) set(b, act[1]);
}
function updateMovers(dt, t) {
  for (const m of LV.movers) {
    if (m.gone) continue;
    if (!m.on) {
      if (m.D - G.dist < (m.near || 140)) m.on = true;
      else continue;
    }
    if (m.kind === 'crab') {
      m.x = m.x0 + m.amp * sin(t * m.wv + m.ph);
      m.r = 0.5 * sin(t * 6 + m.ph);
    } else if (m.kind === 'turtle') {
      m.x += m.vx * dt;
    } else if (m.kind === 'traffic') {
      m.D += m.vD * dt;
    } else if (m.kind === 'heron') {
      if (m.D - G.dist < 62) m.x += m.vx * dt;
      m.y = 2.5 + sin(t * 3) * 0.1;
    } else if (m.kind === 'coco') {
      const d = m.D - G.dist;
      if (d < 44) {
        m.vy = (m.vy || 0) + 24 * dt;
        m.y = max(0, m.y - m.vy * dt);
        if (m.y === 0 && !m.thud) {
          m.thud = true;
          burst(m.x, 0.2, -d, 5, 3.5, 0.35, 0.12, col('uSandB'), {world: 1});
        }
      }
      if (m.y > 0.1 && d < 60 && d > -2) tick(1, m.x, 0.08, -d, 0.92 + 0.08 * sin(t * 14), [1.6, 0.18, 0.12], 0.85);
    }
  }
}
function collide(it, prev) {
  if (it.gone) return;
  const d = it.D - G.dist, sw = G.dist - prev;
  if (it.pick) {
    if (d < it.l + 0.4 && d > -it.l - sw && abs(G.x - it.x) < it.w + 0.5 && abs(G.y + 1 - (it.y || 1)) < 1.5) pickup(it);
    return;
  }
  if (!it.solid) return;
  const dx = abs(G.x - it.x), wide = it.w + 0.34;
  if (!it.passed && d < it.l + 0.25 && d > -it.l - sw - 0.25 && dx < wide) {
    const y0 = it.y && it.kind !== 'heron' ? it.y : 0;
    let hit;
    if (it.kind === 'heron') hit = G.y > 0.32;
    else if (it.kind === 'coco') hit = it.y < 1.8 && G.y < it.y + it.h;
    else hit = G.y < it.h;
    if (hit) {
      it.passed = true;
      crash(it);
      return;
    }
  }
  if (!it.passed && d < -it.l - 0.1) {
    it.passed = true;
    if (G.iframes > 0) return;
    const gap = dx - wide;
    if (G.y >= it.h && dx < wide + 0.1 && it.h < 2 && !it.soft) jumpOver();
    else if (gap >= 0 && gap < 0.85 && G.y < 1.4 && it.h > 0.25 && !it.soft && it.kind !== 'heron') near(it, gap);
  }
}
function updatePlay(dt, dt0, t) {
  const prev = G.dist;
  const st = META.stages[G.stage];
  const tr = trackAt(G.dist);
  const time = U.uTime.value;
  let sh = 0;
  G.hard = G.soft = G.inWater = false;
  // Velocidad objetivo
  let mul = 1;
  if (tr.kind === 0) {
    sh = shoreAt(G.dist, tr.base, time);
    const ds = sh - G.x;
    if (G.y <= 0.05) {
      if (ds > 0) {
        mul = 0.52;
        G.inWater = true;
      } else if (-ds < WET_W) {
        mul = 1.2;
        G.hard = true;
      } else if (-ds > 9) {
        mul = lerp(1, 0.8, sstep(9, 16, -ds));
        G.soft = -ds > 12;
      }
    }
  }
  if (G.auto) autoDrive(tr, sh);
  const wantBrake = IN.down || IN.brakeBtn;
  const wantSprint = (IN.up || IN.pedalBtn) && G.force > 0.02 && !wantBrake;
  G.sprint = wantSprint;
  G.brake = wantBrake;
  G.force = wantSprint ? max(0, G.force - dt / 3.4) : min(1, G.force + dt * 0.14);
  let target = st.speed * (BOSS.on ? 1.12 : 1) * mul * (1 + G.up.cadena * 0.06) * (wantSprint ? 1.26 : 1);
  if (wantBrake) target = 4;
  const accel = wantBrake ? (G.up.frenos ? 34 : 17) : G.speed < target ? (G.up.frenos ? 15 : 10) : 8;
  G.speed = G.speed < target ? min(target, G.speed + accel * dt) : max(target, G.speed - accel * dt);
  G.dist += G.speed * dt;
  // Dirección
  const s = readSteer();
  // Al soltar frena más rápido que al arrancar, para esquivar con precisión.
  G.steer = damp(G.steer, s, s * G.steer < 0 || s === 0 ? 18 : 11, dt0);
  const VX = 13.5 * clamp(G.speed / 16, 0.55, 1);
  G.x += G.steer * VX * dt;
  // Salto y pirueta
  if (IN.jump > 0) {
    IN.jump -= dt0;
    if (G.y <= 0 && !G.onRamp) {
      G.vy = 9.8;
      G.y = 0.01;
      G.air = true;
      IN.jump = 0;
      Audio.jump();
      kickPackage(0.5);
      burst(G.x, 0.1, 0.4, 4, 3, 0.3, 0.13, col('uSandB'), {world: 0.8});
    } else if (G.y > 0.35 && !G.trickOn) {
      // Si ya casi aterriza, el toque queda guardado para el próximo salto.
      const left = (G.vy + sqrt(max(0, G.vy * G.vy + 52 * G.y))) / 26;
      if (left >= 0.28) {
        G.trickOn = true;
        G.trick = 0;
        IN.jump = 0;
      }
    }
  }
  // Rampas
  G.onRamp = false;
  for (const r of LV.ramps) {
    const d = G.dist - (r.D - 2.64);
    if (d > 0 && d < 5.28 && abs(G.x - r.x) < r.w && G.y < 1.2) {
      G.onRamp = true;
      G.y = max(G.y, 0.86 * (d / 5.28));
      G.vy = 0;
      G.rampV = r.vy;
      G.rampLast = !!r.last;
    } else if (d >= 5.28 && d < 5.28 + G.speed * dt + 0.5 && G.rampV && abs(G.x - r.x) < r.w) {
      G.vy = G.rampV;
      G.rampV = 0;
      G.air = true;
      Audio.jump();
      kickPackage(0.9);
      G.lines = max(G.lines, 0.35);
      if (r.last) {
        finish();
        return;
      }
    }
  }
  if (!G.onRamp) {
    if (G.y > 0 || G.vy > 0) {
      G.vy -= 26 * dt;
      G.y += G.vy * dt;
      if (G.y <= 0) {
        // Aterrizaje
        const hard = G.vy < -12.5;
        G.y = 0;
        const v = G.vy;
        G.vy = 0;
        G.air = false;
        G.spin = 0;
        Audio.land(hard ? 1 : 0.65);
        kickPackage(hard ? 2.4 : 1.2);
        burst(G.x, 0.1, 0.3, hard ? 9 : 5, 4, 0.4, 0.16, col('uSandB'), {world: 0.8});
        if (G.trickOn) {
          G.trickOn = false;
          if (G.trick < 0.8) {
            shout('¡Se te fue la pirueta!', 3);
            G.speed *= 0.6;
            G.shake = 0.6;
            G.iframes = max(G.iframes, 0.4);
            G.hits++;
            UI.floatTime('−' + ceil(8 * (1 - G.up.carton * 0.3)) + '% paquete', false);
            damage(8);
            Audio.hit();
          }
        } else if (hard) {
          damage(2);
        }
      }
    }
  }
  if (G.trickOn) {
    G.trick = min(1, G.trick + dt / 0.5);
    G.spin = G.trick * PI * 2;
    if (G.trick >= 1) {
      G.trickOn = false;
      G.spin = 0;
      if (G.trickCool <= 0) {
        // Premio una vez cada tanto: saltar sin parar no regala tiempo.
        G.trickCool = 5;
        G.tricks++;
        G.q += 10;
        G.clock += 0.5;
        G.racha = min(9, G.racha + 1);
        G.rachaT = 6;
        UI.floatTime('+0.5 s', true);
        shout('¡PIRUETA!', 2);
        Audio.pickup();
      }
    }
  }
  // Túmulos
  for (const u of LV.tumulos) {
    if (u.used) continue;
    if (prev < u.D && G.dist >= u.D) {
      u.used = true;
      if (G.y < 0.3) {
        if (G.speed > 15.5) {
          G.vy = 5.6;
          G.y = 0.02;
          G.air = true;
          G.shake = 0.5;
          kickPackage(2.5);
          shout('¡TÚMULO!', 3);
          Audio.land(1);
          UI.floatTime('−' + ceil(5 * (1 - G.up.carton * 0.3)) + '% paquete', false);
          damage(5);
        } else {
          shout('¡Así, despacito!', 1);
          G.q += 3;
        }
      }
    }
  }
  // Límites de la pista
  const tr2 = trackAt(G.dist);
  const k = tr2.kind;
  if (k === 0) {
    const left = max(tr2.cx - tr2.hw, shoreAt(G.dist, tr2.base, time) - 6);
    const right = tr2.cx + tr2.hw;
    if (G.x < left) G.x = left;
    if (G.x > right) G.x = right;
  } else if (k === 2) {
    const dx = G.x - tr2.cx;
    if (abs(dx) > tr2.hw - 0.3) {
      G.x = tr2.cx + Math.sign(dx) * (tr2.hw - 0.3);
      G.speed = max(G.speed * (1 - dt * 1.5), 8);
      if (rnd() < dt * 26) fx(3, G.x, 0.7, 0.2, 0.1, 0.22, [1.6, 1.2, 0.5], {add: 1, vx: -Math.sign(dx) * rnd(2, 6), vy: rnd(1, 5), vz: rnd(0, 6), grav: 16, world: 0.5});
    }
  } else if (k === 1) {
    const dx = abs(G.x - tr2.cx);
    if (G.y <= 0.02 && !G.onRamp && (dx > tr2.hw + 0.25 || tr2.hw < 0.2)) {
      startFall();
      return;
    }
  }
  // Rastro
  const rate = dt0 * G.speed * 0.8;
  if (G.y <= 0 && rnd() < rate) {
    if (G.inWater || G.hard) {
      const c = col('uFoam');
      fx(3, G.x + rnd(-0.1, 0.1), 0.15, 0.6, rnd(0.05, 0.13), 0.42, c, {add: 0, vx: rnd(-1.5, 1.5), vy: rnd(1.2, G.inWater ? 5 : 3), vz: rnd(2, 6), grav: 15, world: 0.45});
    } else if (k === 0) {
      fx(3, G.x + rnd(-0.1, 0.1), 0.12, 0.7, rnd(0.08, 0.2), 0.45, col('uSandB'), {add: 0, vx: rnd(-0.5, 0.5), vy: rnd(0.2, 1), vz: 1, grow: 0.4, world: 0.5});
    }
  }
  if (G.sprint && rnd() < dt0 * 16) fx(3, G.x, rnd(0.4, 1.2), 0.6, 0.04, 0.2, [1.5, 1.4, 1], {add: 1, vz: 10, world: 0.5});
  // Colisiones
  const list = LV.items;
  for (let i = LV.cursor; i < list.length; i++) {
    const it = list[i];
    if (it.D > G.dist + 6) break;
    collide(it, prev);
  }
  for (const m of LV.movers) if (m.on && !m.gone && abs(m.D - G.dist) < 12) collide(m, prev);
  // Encargos
  for (const c of LV.customers) {
    if (c.done) continue;
    const d = c.D - G.dist;
    if (d < 95 && !c.told) {
      c.told = true;
      queuePhone(c.name, c.ask);
    }
    if (d < 120 && d > -3) {
      tick(1, c.x, 0.1, -d, 2.7, [1.6, 1.15, 0.2], 0.9);
      tick(0, c.x, 3.1 + sin(time * 4) * 0.15, -d, 0.9, [1.8, 1.3, 0.3], 0.9);
    }
    if (prev < c.D && G.dist >= c.D) {
      c.done = true;
      if (abs(G.x - c.x) < 3.1) {
        if (G.speed < 14) {
          G.q += 25;
          G.encargos++;
          shout(c.text + ' +Q25', 2);
          Audio.buy();
        } else shout('¡Muy rápido, no te alcanzó!', 3);
      }
    }
  }
  // Racha
  if (G.rachaT > 0) {
    G.rachaT -= dt;
    if (G.rachaT <= 0) G.racha = 1;
  }
  if (G.coinT > 0) G.coinT -= dt;
  // Reloj
  G.clock -= dt0 * G.ts;
  if (G.clock <= 0) {
    G.clock = 0;
    if (!G.god) fail('time');
    else G.clock = 30;
  }
  // Etapas
  if (G.stage < 2 && G.dist >= LV.stageBounds[G.stage + 1]) {
    G.stage++;
    G.dist = LV.stageBounds[G.stage];
    G.x = LV.center(G.dist);
    Audio.bell();
    if (TEST.autoShop) {
      G.clock += META.stages[G.stage].clock;
      Audio.setLevel(G.stage);
      snapshot();
    } else openShop();
    return;
  }
  if (!BOSS.on && G.dist >= S3) startBoss();
  if (BOSS.on) updateBoss(dt, dt0, time);
}
// Terremoto corre a un lado. Cuando ladra marca una franja roja y se lanza de costado:
// se esquiva saltando o saliéndose de la franja.
const LUNGE = {len: 11, speed: 26, hitH: 0.95};
function dogHome() {
  const b = BOSS, tr = trackAt(G.dist), room = max(1, tr.hw - 0.7);
  let hx = G.x + b.side * 3.1;
  if (abs(hx - tr.cx) > room) {
    b.side = -b.side;
    hx = G.x + b.side * 3.1;
  }
  return clamp(hx, tr.cx - room, tr.cx + room);
}
function updateBoss(dt, dt0, time) {
  const b = BOSS;
  b.t += dt0;
  let yaw = 0, hop = 0, mode = 'run';
  if (b.mode === 'chase') {
    b.z = damp(b.z, 0.7 + sin(time * 1.3) * 0.4, 3, dt0);
    b.x = damp(b.x, dogHome(), 4, dt0);
    b.next -= dt0;
    if (b.next <= 0 && G.y <= 0.2) {
      b.mode = 'aim';
      b.aim = 0.88;
      b.x0 = b.x;
      b.xEnd = b.x - b.side * LUNGE.len;
      Audio.bark();
      shout('¡Grrr!', 3, 1.4);
    }
    yaw = b.side * 0.22;
  } else if (b.mode === 'aim') {
    b.aim -= dt0;
    b.z = damp(b.z, 0.3, 8, dt0);
    yaw = b.side * 1.25;
    mode = 'aim';
    if (b.aim <= 0) {
      b.mode = 'lunge';
      b.hitDone = false;
    }
  } else if (b.mode === 'lunge') {
    const px = b.x;
    b.x -= b.side * LUNGE.speed * dt0;
    yaw = b.side * 1.5;
    hop = sin(clamp(abs(b.x - b.x0) / LUNGE.len) * PI) * 0.5;
    if (!b.hitDone && (px - G.x) * (b.x - G.x) <= 0) {
      b.hitDone = true;
      if (G.y < LUNGE.hitH && G.iframes <= 0) {
        G.iframes = 1;
        G.shake = 0.8;
        G.speed *= 0.62;
        G.hits++;
        G.racha = 1;
        G.hitstop = 0.06;
        impact(0.05, false);
        shout('¡Te mordió el paquete!', 3);
        Audio.hit();
        UI.floatTime('−' + ceil(13 * (1 - G.up.carton * 0.3)) + '% paquete', false);
        damage(13);
      } else if (G.iframes <= 0) {
        G.q += 4;
        G.clock += 0.5;
        G.racha = min(9, G.racha + 1);
        G.rachaT = 6;
        shout('¡Por poquito!', 2);
        Audio.near(1, 0);
      }
    }
    if ((b.x - b.xEnd) * b.side <= 0) {
      b.mode = 'chase';
      b.side = -b.side;
      b.next = rnd(2.2, 3.2) - (0.5 * G.dist) / LEN;
    }
  } else if (b.mode === 'eat') {
    b.z += G.speed * dt;
    b.eatT -= dt0;
    mode = 'eat';
    if (b.hunger >= 3 && b.z > 26) {
      b.mode = 'full';
      UI.boss(false, 3);
      shout('¡Se llenó!', 2);
      queuePhone('Doña Tere', 'Ya se durmió el Terremoto. Andá tranquilo, mijo.');
      Audio.setLevel(2);
    } else if (b.eatT <= 0 && b.hunger < 3) {
      b.mode = 'return';
      Audio.bark();
    }
  } else if (b.mode === 'return') {
    b.z -= 11 * dt0;
    b.x = damp(b.x, dogHome(), 3, dt0);
    if (b.z <= 1) {
      b.mode = 'chase';
      b.next = rnd(1.6, 2.6);
    }
  } else if (b.mode === 'cut') {
    b.x = G.x + b.side * 3.1;
    b.z = 0.7;
  }
  const vis = b.mode !== 'full' && b.z < 40;
  DOG.root.visible = vis;
  updateDog(b.x, hop, b.z, mode === 'eat' ? 0 : G.speed, dt0, time, mode, yaw);
  if (vis) dropShadow(b.x, b.z, 0.8, 1.5);
  const aiming = b.mode === 'aim';
  markMesh.visible = aiming;
  if (aiming) {
    // La franja corre de costado a la altura del perro.
    markMesh.position.set(b.x0 - (b.side * LUNGE.len) / 2, 0, b.z);
    markMesh.rotation.y = (b.side * PI) / 2;
  }
}
function startFall() {
  G.state = 'falling';
  G.fT = 0.62;
  G.vy = -2;
  G.air = true;
  Audio.splash();
  G.hits++;
  G.racha = 1;
  G.shake = 0.5;
  G.wet = 1;
  const c = col('uFoam');
  for (let i = 0; i < 22; i++) fx(3, G.x + rnd(-0.5, 0.5), 0.1, rnd(-0.5, 0.8), rnd(0.08, 0.22), 0.6, c, {add: 0, vx: rnd(-4, 4), vy: rnd(3, 9), vz: rnd(-3, 3), grav: 18, world: 0.5});
  fx(1, G.x, 0.1, 0, 3.4, 0.5, c, {world: 0.5});
  shout('¡Al agua!', 3);
}
function updateFalling(dt0) {
  G.fT -= dt0;
  G.vy -= 22 * dt0;
  G.y += G.vy * dt0;
  G.speed = damp(G.speed, 0, 5, dt0);
  G.dist += G.speed * dt0;
  P.uFadeK.value = sstep(0.3, 0.05, G.fT) * 1;
  if (G.fT <= 0) {
    // Reaparece en la tabla sólida más próxima
    let D = G.dist + 3;
    for (let i = 0; i < 120 && trackAt(D).hw < 1; i++) D += 1;
    D += 2;
    G.dist = D;
    G.x = trackAt(D).cx;
    G.y = 0;
    G.vy = 0;
    G.air = false;
    G.trickOn = false;
    G.spin = 0;
    G.speed = 8;
    G.iframes = 1.4;
    G.clock -= 3;
    G.state = 'play';
    P.uFadeK.value = 0;
    UI.floatTime('−3 s', false);
    UI.floatTime('−10% paquete', false);
    damage(10);
  }
}
const _look = new T.Vector3(), _hero = new T.Vector3(), _heroL = new T.Vector3(), _far = new T.Vector3();
let camY = 2.7, lookX = 0;
function updateCamera(dt0) {
  const b = G.camBlend, t = U.uTime.value;
  const tr = trackAt(G.dist + 34);
  lookX = damp(lookX, lerp(G.x, tr.cx, 0.45), 4, dt0);
  G.camX = damp(G.camX, lerp(G.x, trackAt(G.dist).cx, 0.14), 9, dt0);
  G.camX = clamp(G.camX, G.x - 4, G.x + 4);
  camY = damp(camY, 2.72 + G.y * 0.5, 7, dt0);
  G.shake *= exp(-dt0 * 6);
  const sk = G.shake * (SET.flash ? 0.34 : 0.1);
  const sx = (sin(t * 71) + sin(t * 113)) * 0.5 * sk, sy = (sin(t * 83) + sin(t * 131)) * 0.5 * sk;
  camera.position.set(G.camX + sx, camY + sy, CAM_Z);
  _look.set(lookX, 1.12 + G.y * 0.3, -24);
  if (b > 0.001 || G.camHero) {
    const hb = G.camHero ? 1 : b;
    // Toma baja desde el lado del mar: el sol a la izquierda, el ciclista a la derecha.
    const sw = sin(t * 0.18) * 0.35, hx = -2.7 + sw, hz = 4.4;
    const off = Math.atan(0.52 * Math.tan((camera.fov * PI) / 360) * VIEW.aspect);
    const head = Math.atan2(-hx, hz) - off;
    _hero.set(G.x + hx, 1.0, hz);
    _heroL.set(G.x + hx + sin(head) * 10, 1.85, hz - cos(head) * 10);
    if (G.camHero) {
      _hero.set(G.x + 6, G.y + 1.3, 6);
      _heroL.set(G.x - 0.4, G.y + 1, -3);
    }
    camera.position.lerp(_hero, hb);
    _look.lerp(_heroL, hb);
  }
  camera.lookAt(_look);
  camera.rotateZ(G.steer * 0.04 * (1 - b));
  let f = VIEW.fov + (G.sprint ? 7 : 0) + clamp(G.speed / 32) * 5 - b * 8;
  camera.fov = damp(camera.fov, f, 5, dt0);
  camera.updateProjectionMatrix();
  _far.set(camera.position.x, camera.position.y, -1500).project(camera);
  P.uVP.value.set(_far.x * 0.5 + 0.5, _far.y * 0.5 + 0.5);
  if (G.cutT > 0) {
    const q = clamp(1 - G.cutT / 1.2);
    if (G.cutWhat === 'dog') {
      cutCam.position.set(BOSS.x + lerp(1.3, 0.8, q), lerp(1.2, 1.4, q), BOSS.z - lerp(5.2, 3.9, q));
      cutCam.lookAt(BOSS.x - 1.05, 1.62, BOSS.z - 1.1);
    } else {
      cutCam.position.set(G.x + lerp(-3.4, -2.3, q), G.y + 0.9, -lerp(4.8, 3.6, q));
      cutCam.lookAt(G.x, G.y + 1.3, 0);
    }
    cutCam.updateMatrixWorld();
  }
}
function updatePost(dt0) {
  G.lines *= exp(-dt0 * 3.4);
  P.uLines.value = (REDUCED ? 0.25 : 1) * damp(P.uLines.value, G.lines + (G.sprint ? 0.22 : 0), 12, dt0);
  P.uChroma.value = damp(P.uChroma.value, 0.0006 + (G.sprint ? 0.0014 : 0) + G.lines * 0.002, 8, dt0);
  G.wet = max(0, G.wet - dt0 * 0.55);
  P.uWet.value = G.wet;
  if (G.impactT > 0) {
    G.impactT -= dt0;
    P.uImpact.value = 1;
    P.uImpactInv.value = G.impactInv ? floor(G.impactT / 0.05) % 2 : 0;
  } else P.uImpact.value = 0;
  if (G.impactCool > 0) G.impactCool -= dt0;
  U.uFlash.value = G.iframes > 0 && G.state === 'play' ? (floor(G.iframes * 14) % 2) * 0.32 : 0;
}
function fireflies(t) {
  if (G.dist < S1 - 30 || G.dist > S2 + 30) return;
  const base = floor(G.dist / 6);
  for (let i = 0; i < 26; i++) {
    const id = base + i, h = (id * 13.7) % 1, h2 = (id * 7.31) % 1, h3 = (id * 3.17) % 1;
    const D = id * 6, c = LV.center(D);
    const x = c + (h - 0.5) * 22 + sin(t * 0.9 + id) * 0.5, y = 0.8 + h2 * 3.4 + sin(t * 1.4 + id) * 0.3;
    const b = 0.5 + 0.5 * sin(t * 3 + id * 2);
    tick(0, x, y, -(D - G.dist), 0.26, [1.6, 1.8, 0.5], b * 0.9);
    if (h3 > 2) break;
  }
}
export function update(dtR) {
  const dt0 = min(dtR, 0.05);
  clearTicks();
  if (G.state === 'pause' || G.state === 'shop-frozen') return;
  U.uTime.value += dt0;
  const t = U.uTime.value;
  let tsT = 1;
  if (G.cutT > 0) tsT = 0.06;
  else if (G.state === 'finish') tsT = 0.42;
  else if (G.state === 'failing') tsT = 0.3;
  G.ts = damp(G.ts, tsT, G.cutT > 0 ? 34 : 9, dt0);
  let dt = dt0 * G.ts;
  if (G.hitstop > 0) {
    G.hitstop -= dt0;
    dt = 0;
  }
  if (G.callT > 0) G.callT -= dt0;
  if (G.iframes > 0) G.iframes -= dt0;
  if (G.trickCool > 0) G.trickCool -= dt0;
  if (G.cutT > 0 && G.state !== 'finish') {
    G.cutT -= dt0;
    if (G.cutT <= 0) endCut();
  }
  if (G.state === 'play') {
    updateSurges(dt);
    updateMovers(dt, t);
    updatePlay(dt, dt0, t);
  } else if (G.state === 'falling') {
    updateFalling(dt0);
  } else if (G.state === 'failing') {
    G.fT -= dt0;
    G.dist += G.speed * dt;
    G.speed = damp(G.speed, 0, 2, dt0);
    if (G.fT <= 0) showFail();
  } else if (G.state === 'finish') {
    G.fT += dt0;
    if (G.cutT > 0) {
      G.cutT -= dt0;
      if (G.cutT <= 0) {
        P.uCut.value = 0;
        UI.cutOut();
        impact(0.14, true);
        G.lines = 0.8;
      }
    }
    G.dist += G.speed * dt;
    G.vy -= 26 * dt;
    G.y += G.vy * dt;
    const deck = 1.08;
    if (G.y <= deck && G.vy < 0) {
      G.y = deck;
      G.vy = 0;
      if (!G.landed) {
        G.landed = true;
        G.shake = 0.7;
        Audio.land(1);
        kickPackage(3);
        const p = screenOf(G.x, G.y + 2.6, 0);
        UI.call('¡CABAL!', 2, p.x, p.y);
        burst(G.x, deck, 0.2, 10, 5, 0.45, 0.16, col('uFoam'), {world: 0});
      }
    }
    if (G.landed) {
      G.speed = damp(G.speed, 0, 3.4, dt0);
      G.landT = (G.landT || 0) + dt0;
    }
    if ((G.landT > 1.5 || G.fT > 7) && G.fT < 100) {
      G.fT = 200;
      showResults();
    }
    updateMovers(dt, t);
  } else if (G.state === 'title' || G.state === 'results' || G.state === 'failed') {
    G.speed = damp(G.speed, G.state === 'failed' ? 0 : G.state === 'results' ? 0 : 15, 2, dt0);
    G.dist += G.speed * dt;
    if (G.state === 'title') {
      G.x = damp(G.x, LV.shoreBase(G.dist) + 2.1 + sin(t * 0.3) * 0.7, 3, dt0);
      G.steer = cos(t * 0.3) * 0.1;
      if (G.dist > 1130) {
        G.dist = 40;
        LV.cursor = 0;
      }
    }
  } else if (G.state === 'shop') {
    G.speed = damp(G.speed, 0, 3, dt0);
  }
    U.uDist.value = G.dist;
  const bb = 0.00011;
  U.uBend.value.set(bb * sin(G.dist * 0.0037) + bb * 0.5 * sin(G.dist * 0.0081 + 1), 0.00005 * sin(G.dist * 0.0053));
  updatePalette(G.state === 'title' ? 500 : G.dist);
  U.uLampP.value.set(G.x, -6);
  updatePhone(dt0);
  updateCamera(dt0);
  updatePost(dt0);
  fireflies(t);
  updateFx(dt, G.speed);
  G.sink = damp(G.sink, G.inWater && G.y <= 0.05 ? 1 : 0, 8, dt0);
  updateBike({x: G.x, y: max(G.y, G.state === 'falling' ? -3 : 0) - G.sink * 0.2, speed: G.speed, steer: G.state === 'falling' ? 0.6 : G.steer, air: G.y > 0.03, crouch: G.sprint, brake: G.brake, pkg: G.pkg, time: t, dt: dt0, spin: G.spin, pitch: G.air ? clamp(G.vy * 0.018, -0.3, 0.3) : 0, scale: VIEW.aspect < 0.9 ? 1.05 : 1.22});
  if (G.state === 'play' && (G.uiT = (G.uiT || 0) - dt0) <= 0) {
    G.uiT = 0.08;
    UI.hud(G, LV);
  }
  Audio.ambient(G.dist < S1 ? 1 : G.dist > LEN - 300 ? 0.5 : 0.2, G.state === 'play' ? G.speed : 0);
}
function syncAll() {
  syncProps(LV, G.dist, U.uTime.value, G.state === 'title');
  if (G.y < 2.5 || G.state === 'title') dropShadow(G.x, 0, 0.32 + G.y * 0.02, 0.9);
  syncFx();
}
export function frame(dt) {
  update(dt);
  if (G.state !== 'pause') syncAll();
  renderFrame();
  Audio.tick();
  adaptQuality(dt);
}
export function pauseGame() {
  if (G.state !== 'play' || G.cutT > 0) return;
  G.state = 'pause';
  Audio.suspend();
  $('app').dataset.state = 'menu';
  UI.showScreen('scrPause');
}
export function resumeGame() {
  if (G.state !== 'pause') return;
  Audio.resume();
  UI.hideScreen('scrPause', () => {});
  G.state = 'play';
  $('app').dataset.state = 'play';
}
// ── Entrada ──
function bindInput() {
  const cv = $('gl');
  const KEYS = {ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down'};
  window.addEventListener('keydown', (e) => {
    const k = KEYS[e.code];
    if (k) {
      IN[k] = true;
      IN.stickOn = false;
      if (G.state === 'play') e.preventDefault();
    }
    if (e.repeat) return;
    if (e.code === 'Space') {
      if (G.state === 'play') {
        e.preventDefault();
        IN.jump = 0.14;
      }
    }
    if (e.code === 'KeyB' && G.state === 'play') Audio.bell();
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (G.state === 'play') pauseGame();
      else if (G.state === 'pause') resumeGame();
    }
    if (e.code === 'KeyM') {
      Audio.toggleMute();
      syncSound();
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = KEYS[e.code];
    if (k) IN[k] = false;
  });
  // Ratón: palanca analógica según distancia al centro de la pantalla.
  window.addEventListener('pointermove', (e) => {
    if (G.state !== 'play') return;
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      if (IN.left || IN.right) return;
      // Un roce sin querer no le quita el control al teclado.
      const now = performance.now();
      if (now - (IN.mouseT || 0) > 300) IN.mouseAcc = 0;
      IN.mouseT = now;
      IN.mouseAcc = (IN.mouseAcc || 0) + abs(e.movementX || 0);
      if (!IN.stickOn && IN.mouseAcc < 40) return;
      const nx = (e.clientX / VIEW.cw) * 2 - 1;
      IN.stick = clamp((abs(nx) < 0.06 ? 0 : nx - Math.sign(nx) * 0.06) * 2.2, -1, 1);
      IN.stickOn = true;
    } else if (e.pointerId === IN.touchId) {
      IN.stick = clamp((e.clientX - IN.startX) / 64, -1, 1);
      IN.stickOn = true;
    }
  }, {passive: true});
  cv.addEventListener('pointerdown', (e) => {
    if (G.state !== 'play') return;
    if (e.pointerType === 'touch') {
      if (IN.touchId === null) {
        IN.touchId = e.pointerId;
        IN.startX = e.clientX;
        IN.stick = 0;
        IN.stickOn = true;
      }
    } else {
      if (e.button === 0) IN.jump = 0.14;
      if (e.button === 2) IN.down = true;
    }
  });
  const upT = (e) => {
    if (e.pointerId === IN.touchId) {
      IN.touchId = null;
      IN.stick = 0;
    }
    if (e.button === 2) IN.down = false;
  };
  window.addEventListener('pointerup', upT);
  window.addEventListener('pointercancel', upT);
  window.addEventListener('contextmenu', (e) => {
    if (G.state === 'play' || G.state === 'pause') e.preventDefault();
  });
  const hold = (id, on, off) => {
    const b = $(id);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      on();
      try { b.setPointerCapture(e.pointerId); } catch (_) {}
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((n) => b.addEventListener(n, off));
  };
  hold('tcJump', () => (IN.jump = 0.14), () => {});
  hold('tcPedal', () => (IN.pedalBtn = true), () => (IN.pedalBtn = false));
  hold('tcBrake', () => (IN.brakeBtn = true), () => (IN.brakeBtn = false));
  window.addEventListener('blur', () => {
    IN.left = IN.right = IN.up = IN.down = IN.pedalBtn = IN.brakeBtn = false;
    if (!TEST.noAutoPause) pauseGame();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !TEST.noAutoPause) pauseGame();
  });
  window.addEventListener('resize', () => resize());
  // Botones
  const startFrom = (fn) => {
    Audio.ui();
    UI.hideScreen('scrTitle', () => {});
    fn();
  };
  $('btnStart').addEventListener('click', () => startFrom(newRun));
  $('btnContinue').addEventListener('click', () => startFrom(continueRun));
  $('btnBell').addEventListener('click', () => Audio.bell());
  $('btnResume').addEventListener('click', resumeGame);
  $('btnPause').addEventListener('click', pauseGame);
  $('btnRestart').addEventListener('click', () => {
    Audio.resume();
    Audio.ui();
    UI.hideScreen('scrPause', () => {});
    G.state = 'restart';
    startAt(G.snap);
  });
  $('btnQuit').addEventListener('click', () => {
    Audio.resume();
    Audio.stop();
    UI.hideScreen('scrPause', () => {});
    goTitle();
  });
  $('btnRetry').addEventListener('click', () => {
    Audio.ui();
    UI.hideScreen('scrFail', () => {});
    G.state = 'restart';
    startAt(G.snap);
  });
  $('btnFailMenu').addEventListener('click', () => {
    Audio.stop();
    UI.hideScreen('scrFail', () => {});
    goTitle();
  });
  $('btnShopGo').addEventListener('click', leaveShop);
  $('btnFix').addEventListener('click', () => {
    if (G.q < 25 || G.pkg >= 100) return;
    G.q -= 25;
    G.pkg = min(100, G.pkg + 25);
    Audio.buy();
    renderShop();
  });
  $('btnAgain').addEventListener('click', () => {
    Audio.ui();
    UI.hideScreen('scrResults', () => {});
    G.camHero = false;
    G.state = 'restart';
    newRun();
  });
  $('btnResMenu').addEventListener('click', () => {
    Audio.stop();
    UI.hideScreen('scrResults', () => {});
    goTitle();
  });
  $('btnCopy').addEventListener('click', () => {
    const t = G.shareText || '';
    const fail2 = () => UI.toast(t);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => UI.toast('Copiado'), fail2);
    else fail2();
  });
  const syncSound = () => {
    const txt = Audio.muted ? 'Sonido: no' : 'Sonido: sí';
    $('btnSound').textContent = txt;
    $('btnSoundP').textContent = txt;
  };
  const snd = () => {
    Audio.toggleMute();
    syncSound();
    Audio.ui();
  };
  $('btnSound').addEventListener('click', snd);
  $('btnSoundP').addEventListener('click', snd);
  syncSound();
  const syncFlash = () => {
    const s = SET.flash ? 'Destellos: sí' : 'Destellos: no';
    $('btnFlash').textContent = s;
    $('btnFlashP').textContent = s;
  };
  const fl = () => {
    SET.flash = !SET.flash;
    store.set('flash', SET.flash);
    syncFlash();
  };
  $('btnFlash').addEventListener('click', fl);
  $('btnFlashP').addEventListener('click', fl);
  syncFlash();
  const rv = $('rangeVol');
  rv.value = String(Math.round(Audio.vol * 100));
  rv.addEventListener('input', () => Audio.setVol(rv.value / 100));
  const fs = $('btnFull');
  if (!document.fullscreenEnabled || COARSE) fs.hidden = true;
  fs.addEventListener('click', () => {
    const d = document;
    (d.fullscreenElement ? d.exitFullscreen() : d.documentElement.requestFullscreen()).catch(() => UI.toast('Este visor no permite pantalla completa.'));
  });
  document.querySelectorAll('.only-desk').forEach((n) => (n.hidden = COARSE));
  document.querySelectorAll('.only-touch').forEach((n) => (n.hidden = !COARSE));
}
export function boot() {
  try {
    initGfx();
    updatePaletteInit();
    buildGround();
    buildProps();
    buildFx();
    buildBike();
    buildDog();
    const markGeo = new T.PlaneGeometry(2.4, LUNGE.len);
    markU = {uBend: U.uBend, uCamZ: U.uCamZ, uTime: U.uTime, uAmt: {value: 1}};
    markMesh = new T.Mesh(markGeo, new T.ShaderMaterial({vertexShader: VS_MARK, fragmentShader: FS_MARK, uniforms: markU, transparent: true, depthWrite: false, depthTest: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, side: T.DoubleSide}));
    markMesh.visible = false;
    markMesh.frustumCulled = false;
    markMesh.renderOrder = -8;
    scene.add(markMesh);
    resize();
    camera.fov = VIEW.fov;
    LV = buildLevel(COARSE);
    setTrackTexture(LV);
    drawSignAtlas();
    renderer.compile(scene, camera);
  } catch (err) {
    console.error(err);
    $('nogl').hidden = false;
    $('scrTitle').hidden = true;
    return;
  }
  bindInput();
  UI.init();
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('400 40px "Shrikhand"', 'Tienda La Bendición ¡AGUAS!')]).then(() => {
      drawSignAtlas();
      drawLabel();
    }, () => {});
  }
  goTitle();
  G.dist = 40;
  resetScarf();
  let last = performance.now();
  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = max(0, (now - last) / 1000);
    last = now;
    if (TEST.manual) return;
    frame(dt);
  };
  requestAnimationFrame(loop);
  if (TEST.expose || location.hash === '#vag-debug') {
    window.__VAG = {cam: camera, cutCam, renderer, G, IN, U, P, VIEW, BOSS, BIKE, DOG, updateDog, UI, Audio, anime, get LV() { return LV; }, frame, update, syncAll, renderFrame, newRun, startAt, pauseGame, resumeGame, goTitle, fail, finish, showResults, openShop, startBoss, renderShop, leaveShop,
      jump(D, st) {
        G.dist = D;
        G.stage = st;
        G.x = LV.center(D);
        LV.cursor = 0;
        for (const c of LV.calls) if (c.D < D) c.done = true;
      }};
  }
}
function updatePaletteInit() {
  updatePalette(500);
}
