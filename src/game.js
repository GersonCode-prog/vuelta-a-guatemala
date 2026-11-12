// El juego: estados, física del vehículo, choques, jefe y flujo del nivel.
import * as T from 'three';
import {PI, abs, sin, cos, min, max, floor, ceil, sqrt, exp, clamp, lerp, damp, sstep, rnd, pick, store, TEST, COARSE, REDUCED, $} from './core/util.js';
import {initGfx, resize, renderFrame, adaptQuality, U, P, VIEW, camera, cutCam, scene, renderer} from './core/gfx.js';
import {Audio} from './core/audio.js';
import {Voice} from './core/voice.js';
import {UI, anime} from './core/ui.js';
import {buildProps, syncProps, dropShadow, setShadowLen, drawSignAtlas} from './world/props.js';
import {buildGround, setGround, setTrackTexture} from './world/ground.js';
import {buildFx, fx, tick, burst, updateFx, syncFx, clearFx, clearTicks} from './world/fx.js';
import {buildWake, updateWake, resetWake} from './world/wake.js';
import {drawLabel} from './vehicles/rider.js';
import {BIKE_V} from './vehicles/bicycle.js';
import {HORSE_V} from './vehicles/horse.js';
import {BUS_V, exhaustTip} from './vehicles/bus.js';
import {TUK_V} from './vehicles/tuctuc.js';
import {LANCHA_V} from './vehicles/lancha.js';
import {MOTO_V, motoExhaust} from './vehicles/moto.js';
import {dogBoss} from './bosses/dog.js';
import {bullBoss} from './bosses/bull.js';
import {rivalBoss} from './bosses/rival.js';
import {chocoBoss} from './bosses/choco.js';
import {xocomilBoss} from './bosses/xocomil.js';
import {cadejoBoss} from './bosses/cadejo.js';
import {updateTraffic, resetTraffic, lightAhead, startCop, copOff, COP} from './world/traffic.js';
import {LEVELS, ORDER} from './levels/index.js';
import {fetchTop, saveRecord, checkName, plausible, LEVEL_IDS} from './core/records.js';
import {SLOTS, ITEMS, NEED_TEXT, alcancia, unlocked, buy, wear, earn, specialsNow, stars as bestStars, apply as applyOutfit, pitoOf, P as PERFIL} from './core/ropero.js';
import {initPerfil, google, syncNow, onPerfil, GOOGLE_OK, S as NUBE} from './core/perfil.js';

const WET_W = 3.35;
export const G = {state: 'boot', dist: 0, speed: 0, x: 0, y: 0, vy: 0, vx: 0, steer: 0, clock: 80, pkg: 100, q: 0, racha: 1, rachaT: 0, force: 1, stage: 0, hits: 0, turtles: 0, nears: 0, spook: 0, mudT: 0, iceT: 0, rear: 0, level: 'monterrico', tricks: 0, encargos: 0, iframes: 0, shake: 0, lines: 0, ts: 1, hitstop: 0, callT: 0, phT: 0, phGap: 1, air: false, trick: 0, trickOn: false, trickCool: 0, sink: 0, spin: 0, hard: false, soft: false, inWater: false, camBlend: 1, camX: 0, wet: 0, fT: 0, impactT: 0, impactInv: false, impactCool: 0, up: {frenos: 0, carton: 0, cadena: 0}, auto: false, god: false, fov: 60, cutT: 0, flashT: 0, onRamp: false, attract: 0, sprint: false, brake: false, deadReason: '', snap: null, bestRun: false, time: 0};
export const IN = {left: false, right: false, up: false, down: false, jump: 0, stick: 0, stickOn: false, mouse: false, touchId: null, startX: 0, pedalBtn: false, brakeBtn: false};
const SET = {flash: store.get('flash', !REDUCED)};
// El juego no sabe de bicicletas ni caballos: habla con el vehículo y el jefe del nivel actual.
const VEHICLES = {bike: BIKE_V, horse: HORSE_V, bus: BUS_V, tuk: TUK_V, lancha: LANCHA_V, moto: MOTO_V};
const BOSSES = {dog: dogBoss, bull: bullBoss, rival: rivalBoss, choco: chocoBoss, xocomil: xocomilBoss, cadejo: cadejoBoss};
let LV = null, DEF = null, MT = null, VEH = BIKE_V, BOSSK = dogBoss, pal = null, currentLevel = null;
const BOSS = {on: false, mode: 'off', side: 1, z: 0.7, x: 0, x0: 0, xEnd: 0, t: 0, next: 3, count: 0, aim: 0, eatT: 0, hitDone: false};

// ── Pista ──
function trackAt(D) {
  const tr = LV.track, f = clamp(D, 0, LV.len - 2) / 2, i = floor(f), u = f - i, o = i * 4;
  let kind = u < 0.5 ? tr[o + 2] : tr[o + 6], base = lerp(tr[o + 3], tr[o + 7], u);
  // En el campo, -1 en el canal del río marca una calle de pueblo (la feria de Taxisco).
  if (MT.ground === 'farm' && base < -0.5) {
    kind = 3;
    base = 0;
  }
  return {cx: lerp(tr[o], tr[o + 4], u), hw: lerp(tr[o + 1], tr[o + 5], u), kind, base: max(base, MT.ground === 'farm' ? 0 : -1e9)};
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
const palCache = {};
function palOf(id) {
  if (!palCache[id]) {
    const keys = LEVELS[id].SKYKEYS, last = {};
    // Cada clave hereda lo que no define de la anterior.
    const full = keys.map((k) => Object.assign(last, k) && Object.assign({}, last));
    palCache[id] = {keys: full, cols: full.map((k) => palKeys.map((n) => new T.Color().setStyle(k[n])))};
  }
  return palCache[id];
}
const uName = (n) => 'u' + n[0].toUpperCase() + n.slice(1);
function updatePalette(D) {
  const K = pal.keys, CL = pal.cols;
  let i = 0;
  while (i < K.length - 2 && D > K[i + 1].D) i++;
  const A = K[i], B = K[i + 1], t = sstep(A.D, B.D, D);
  palKeys.forEach((n, j) => {
    U[uName(n)].value.copy(CL[i][j]).lerp(CL[i + 1][j], t);
  });
  const gain = lerp(MT.palGain[0], MT.palGain[1], clamp(D / MT.palGain[2]));
  U.uSunCol.value.multiplyScalar(gain);
  const el = lerp(A.sunEl, B.sunEl, t), nig = lerp(A.night, B.night, t);
  U.uNight.value = nig;
  const sx = MT.sunAz === undefined ? -0.36 : MT.sunAz;
  U.uSunVis.value.set(sx, el, -1).normalize();
  U.uSunDir.value.set(sx > 0 ? 0.52 : -0.52, 0.42 + el * 0.8 + nig * 0.2, -0.32 + nig * 0.1).normalize();
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
// El repartidor también lo dice en voz alta. 'hard' corta lo que estaba diciendo (los golpes).
function say(text, hard) {
  if (!hard && (G.sayT > 0 || Voice.busy('shout'))) return;
  G.sayT = 0.45;
  Voice.speak('Repartidor', text, {ch: 'shout', chain: 'direct', maxDur: 0.95, gain: 1.3});
}
const col = (u) => [U[u].value.r, U[u].value.g, U[u].value.b];
// En el lago no hay polvo: todo lo que salpica es espuma.
const LAKE = () => MT.look === 'lake';
const dust = () => col(LAKE() ? 'uFoam' : 'uSandB');
function damage(n) {
  const k = 1 - G.up.carton * 0.3;
  G.pkg = max(0, G.pkg - n * k);
  VEH.kick(1.4 + n * 0.15);
  if (G.pkg <= 0 && !G.god) fail('pkg');
}
function crash(it) {
  if (G.iframes > 0) return;
  if (it.trap === 'cohete') {
    it.gone = true;
    G.spook = 1.15;
    G.iframes = 0.5;
    G.speed *= 0.78;
    G.racha = 1;
    G.shake = 0.7;
    shout('¡Cohetillos!', 3);
    say('¡Cohetillos!', true);
    Audio.cohete();
    Audio.neigh();
    for (let i = 0; i < 16; i++) fx(3, it.x + rnd(-1.6, 1.6), 0.2, 0, rnd(0.04, 0.09), 0.34, [3, 1.8, 0.5], {add: 1, vx: rnd(-5, 5), vy: rnd(2, 7), vz: rnd(-3, 5), grav: 16, world: 0.6});
    fx(2, it.x, 0.5, 0, 1.6, 0.16, [3, 2.4, 1.3], {world: 0.6});
    UI.floatTime('−' + ceil(it.dmg * (1 - G.up.carton * 0.3)) + '% paquete', false);
    damage(it.dmg);
    return;
  }
  if (it.bump) {
    G.vy = 4.8;
    G.y = 0.02;
    G.air = true;
    G.shake = 0.6;
    G.iframes = 0.35;
    G.speed *= 0.86;
    VEH.kick(2.2);
    const w = it.t.startsWith('alcantarilla') ? '¡Alcantarilla!' : '¡Hoyo!';
    shout(w, 3);
    say(w, true);
    Audio.land(1);
    UI.floatTime('−' + ceil(it.dmg * (1 - G.up.carton * 0.3)) + '% paquete', false);
    damage(it.dmg);
    return;
  }
  if (it.soft) {
    G.turtles++;
    G.speed *= MT.soft.keep ? 0.5 : 0.6;
    G.racha = 1;
    shout(MT.soft.shout, 3);
    say(MT.soft.shout, true);
    if (MT.soft.ruin) {
      it.solid = false;
      it.soft = false;
      it.tint = MT.soft.tint || [0.58, 0.52, 0.48];
      G.iframes = 0.5;
      G.shake = 0.35;
      Audio.land(1);
      const cs = MT.soft.bits || [[0.42, 0.17, 0.6], [1, 0.82, 0.23], [0.9, 0.23, 0.23], [0.21, 0.66, 0.31], [1, 0.96, 0.9]];
      if (MT.soft.call && G.turtles === 1) queuePhone(MT.soft.call[0], MT.soft.call[1]);
      for (let i = 0; i < 18; i++) fx(3, G.x + rnd(-1, 1), 0.15, rnd(-0.5, 1), rnd(0.05, 0.11), 0.7, pick(cs), {add: 0, vx: rnd(-4, 4), vy: rnd(1, 4), vz: rnd(-1, 4), grav: 12, world: 0.6});
      return;
    }
    if (MT.soft.keep) {
      G.iframes = 0.7;
      G.shake = 0.5;
      it.flash = 1;
      Audio.moo();
      Audio.land(1);
    } else {
      it.gone = true;
      Audio.land(1);
    }
    burst(it.x, 0.2, 0, 8, 5, 0.5, 0.14, col('uSandB'), {world: 1});
    return;
  }
  it.flash = 1;
  G.hits++;
  G.lastHit = it.t + (it.kind ? '/' + it.kind : '');
  G.iframes = 1;
  G.hitstop = 0.06;
  G.shake = 1;
  G.racha = 1;
  G.speed *= 0.36;
  impact(0.06, false);
  const ay = pick(['¡Qué clavo!', '¡Púchica, el paquete!', '¡Aaay!']);
  shout(ay, 3);
  say(ay, true);
  Audio.hit();
  fx(2, G.x, 1.1, 0, 2, 0.22, [3, 2.6, 1.8], {world: 0});
  burst(G.x, 1, 0, 14, 8, 0.6, 0.14, [1, 0.84, 0.5], {world: 0.4, add: 0});
  UI.floatTime('−' + ceil(it.dmg * (1 - G.up.carton * 0.3)) + '% paquete', false);
  damage(it.dmg);
  // La camioneta manda a volar lo pequeño; lo grande la empuja a un lado.
  if (MT.vehicle === 'bus') {
    if (it.h < 3) {
      it.knock = U.uTime.value;
      it.kx = it.x >= G.x ? 1 : -1;
    } else G.x = it.x + (Math.sign(G.x - it.x) || 1) * (it.w + VEH.phys.halfW + 0.15);
  }
}
// ── Semáforos y la PMT ──
function onCross(L) {
  if (L.phase === 'r' && G.speed > 6) {
    G.racha = 1;
    shout('¡Te pasaste en rojo!', 3);
    impact(0.04, true);
    startCop(api);
    if (!G.toldCop) {
      G.toldCop = true;
      queuePhone('Don Beto', '¡Te vio la PMT! Acelerá para perderla, o te multan.');
    }
  } else if (L.phase === 'y') {
    shout('¡En amarillo!', 1);
    G.q += 2;
  }
}
function onGreen() {
  G.q += 3;
  G.racha = min(9, G.racha + 1);
  G.rachaT = 6;
  shout('¡Verde! Bien parado', 1);
}
function fine() {
  G.turtles++;
  const q = min(25, floor(G.q));
  G.q -= q;
  G.clock -= 4;
  G.speed *= 0.4;
  G.shake = 0.6;
  G.racha = 1;
  UI.floatTime('−4 s', false);
  UI.ticket(q);
  shout('¡Oríllese!', 3);
  Voice.speak('PMT', '¡Oríllese!', {ch: 'shout', chain: 'mega', maxDur: 0.8});
  Audio.stamp();
  if (G.turtles === 1) queuePhone('Don Beto', '¿Una multa? La de verdad es de doscientos quetzales. Agradecé que te la rebajaron.');
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
    const w = it.nearShout || (tier === 0 ? '¡Cerquita!' : tier === 1 ? pick(['¡Púchica!', '¡Uy!']) : pick(['¡A la gran!', '¡Cabal!']));
    shout(w, tier);
    if (tier === 2 && !Voice.busy('call')) say(w);
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
  } else if (it.pick === 'elote') {
    G.clock += 5;
    G.force = 1;
    G.tired = 0;
    UI.floatTime('+5 s', true);
    shout('¡Elote para Turbo!', 1);
    Audio.pickup();
    burst(it.x, it.y, z, 8, 6, 0.5, 0.16, [1, 0.85, 0.3], {add: 0});
  } else if (it.pick === 'pinata') {
    G.q += 8;
    G.racha = min(9, G.racha + 1);
    G.rachaT = 6;
    shout('¡Piñata! +Q8', 2);
    Audio.pickup();
    const cs = [[1, 0.2, 0.3], [1, 0.8, 0.1], [0.1, 0.8, 0.75], [1, 0.4, 0.6], [0.3, 0.8, 0.4]];
    for (let i = 0; i < 24; i++) fx(3, it.x + rnd(-0.4, 0.4), it.y, z, rnd(0.05, 0.13), 0.9, pick(cs), {add: 0, vx: rnd(-5, 5), vy: rnd(-1, 6), vz: rnd(-3, 3), grav: 13, world: 1});
  } else if (it.pick === 'shuco') {
    G.clock += 5;
    UI.floatTime('+5 s', true);
    shout('¡Un shuco!', 1);
    Audio.pickup();
    burst(it.x, it.y, z, 8, 6, 0.5, 0.16, [1, 0.7, 0.35], {add: 0});
  } else if (it.pick === 'choco') {
    G.clock += 5;
    UI.floatTime('+5 s', true);
    shout('¡Un chocobanano!', 1);
    Audio.pickup();
    burst(it.x, it.y, z, 8, 6, 0.5, 0.16, [0.9, 0.6, 0.3], {add: 0});
  } else if (it.pick === 'cafe') {
    G.clock += 5;
    UI.floatTime('+5 s', true);
    shout('¡Un cafecito!', 1);
    Audio.pickup();
    burst(it.x, it.y, z, 8, 6, 0.5, 0.16, [0.95, 0.5, 0.35], {add: 0});
  } else if (it.pick === 'sheca') {
    G.clock += 5;
    UI.floatTime('+5 s', true);
    shout('¡Una sheca calientita!', 1);
    Audio.pickup();
    burst(it.x, it.y, z, 8, 6, 0.5, 0.16, [0.75, 0.48, 0.25], {add: 0});
  } else if (it.pick === 'tortilla') {
    Audio.pickup();
    if (BOSSK.onPick) BOSSK.onPick(api, it);
  }
}
// ── Estados de falla y entrega ──
function fail(reason) {
  if (G.state !== 'play' || G.god) return;
  G.state = 'failing';
  G.deadReason = reason;
  G.fT = 1.1;
  Audio.siren(false);
  Voice.stop('call');
  Audio.fail();
  Audio.fadeMusic(1.2);
}
function showFail() {
  G.state = 'failed';
  $('app').dataset.state = 'menu';
  UI.hideHud();
  $('fxCalls').innerHTML = '';
  BOSSK.hide();
  const t = G.deadReason === 'pkg' ? 'El paquete quedó hecho pedazos' : 'Se te pasó la hora';
  $('failTitle').textContent = t;
  $('failText').textContent = G.deadReason === 'pkg' ? 'Don Beto no quiere saber nada de lo que había adentro. Mejor intentalo otra vez.' : 'La Licenciada ya llamó tres veces. Don Beto te da otra oportunidad, pero solo una.';
  UI.showScreen('scrFail');
}
function snapshot(dist) {
  G.snap = {level: MT.id, stage: G.stage, dist: dist === undefined ? LV.stageBounds[G.stage] : dist, q: G.q, q0: G.q0 || 0, spent: G.spent || 0, pkg: G.pkg, clock: G.clock, up: Object.assign({}, G.up), turtles: G.turtles, hits: G.hits, nears: G.nears, tricks: G.tricks, encargos: G.encargos};
  store.set('run', G.snap);
}
// Prepara todo lo que depende del nivel: vehículo, suelo, paleta, jefe y letrero de la interfaz.
function useLevel(id) {
  DEF = LEVELS[id];
  MT = DEF.META;
  G.level = id;
  VEH = VEHICLES[MT.vehicle];
  for (const k in VEHICLES) VEHICLES[k].setVisible(VEHICLES[k] === VEH);
  for (const k in BOSSES) BOSSES[k].hide();
  BOSSK = BOSSES[MT.boss.id];
  pal = palOf(id);
  LV = DEF.buildLevel(COARSE);
  api.LV = LV;
  api.MT = MT;
  if (currentLevel !== id) {
    currentLevel = id;
    setGround(MT.look || MT.ground);
    setTrackTexture(LV);
    U.uAgua.value.set(MT.agua ? MT.agua[0] : 0, MT.agua ? MT.agua[1] : 0.2, MT.agua ? MT.agua[2] : 0.5, MT.agua ? 1 : 0);
    U.uFogA.value = 90;
    U.uLake.value.set(MT.look === 'lake' ? 1 : 0, 0, 0, 0);
    U.uLeftHills.value = MT.leftHills;
    U.uBurn.value.set(MT.burn ? MT.burn[0] : -1000, MT.burn ? MT.burn[1] : -1000);
    U.uFogB.value = MT.ground === 'farm' ? 340 : MT.ground === 'city' ? 330 : 300;
    camY = VEH.cam.y;
    UI.setLevel(MT, LV);
    VEH.update({x: 0, y: 0, speed: 0, steer: 0, air: false, crouch: false, brake: false, pkg: 100, time: 0, dt: 0.016, spin: 0, pitch: 0, vy: 0, rear: 0, scale: 1});
    VEH.reset();
  }
}
function startAt(snap) {
  useLevel(snap.level || 'monterrico');
  Object.assign(G, {dist: snap.dist, stage: snap.stage, q: snap.q, q0: snap.q0 || 0, spent: snap.spent || 0, pkg: max(snap.pkg, snap.dist ? 45 : 100), clock: max(snap.clock, MT.stages[snap.stage].clock * 0.82), up: Object.assign({frenos: 0, carton: 0, cadena: 0}, snap.up), turtles: snap.turtles, hits: snap.hits, nears: snap.nears, tricks: snap.tricks, encargos: snap.encargos,
    x: LV.center(snap.dist), y: 0, vy: 0, vx: 0, speed: 6, steer: 0, racha: 1, force: 1, iframes: 1.2, wet: 0, air: false, trickOn: false, spin: 0, spook: 0, mudT: 0, iceT: 0, rear: 0, tired: 0, trickDone: false, pull: 0, pullT: 0, pullWarn: 0, pullNext: snap.dist ? 7 : 3, ts: 1, phT: 0, phGap: snap.dist ? 1.4 : 0.8, fT: 0, cutT: 0, hitstop: 0, shake: 0, lines: 0.4, state: 'play', auto: G.auto, god: G.god});
  BOSS.on = false;
  BOSS.mode = 'off';
  BOSS.count = 0;
  UI.boss(false, 0);
  PQ.length = 0;
  G.autoBrake = false;
  G.halted = false;
  if (LV.lights) resetTraffic(LV, snap.dist);
  Audio.siren(false);
  Voice.stopAll();
  document.getElementById('fxCalls').innerHTML = '';
  $('phone').hidden = true;
  G.camHero = false;
  resetWake();
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
  P.uFadeK.value = 0;
  P.uFadeW.value = 0;
  P.uCut.value = 0;
  $('app').dataset.state = 'play';
  UI.showHud();
  UI.hud(G, LV);
  Audio.start(themeOf(snap.stage));
  if (MT.vehicle === 'horse' && !snap.dist) Audio.neigh();
  anime({targets: G, camBlend: 0, duration: 1100, easing: 'easeInOutCubic'});
  setTimeout(() => {
    if (G.state === 'play') UI.card(G.stage, MT.stages[G.stage]);
  }, 500);
}
const themeOf = (st) => MT.music[st];
// Las propinas de la parada anterior solo cuentan de la segunda en adelante.
const startQ = (id) => (LEVELS[id].META.stop > 1 ? store.get('wallet', 0) : 0);
export function newRun(id = G.level, q = 0) {
  document.activeElement && document.activeElement.blur && document.activeElement.blur();
  store.set('run', null);
  startAt({level: id, stage: 0, dist: 0, q, q0: q, spent: 0, pkg: 100, clock: LEVELS[id].META.stages[0].clock, up: {frenos: 0, carton: 0, cadena: 0}, turtles: 0, hits: 0, nears: 0, tricks: 0, encargos: 0});
  snapshot();
}
export function continueRun() {
  const s = store.get('run', null);
  if (s) startAt(s);
  else newRun();
}
function openShop() {
  G.state = 'shop';
  snapshot();
  $('app').dataset.state = 'menu';
  renderShop();
  UI.showScreen('scrShop');
}
function renderShop() {
  $('shopQ').textContent = 'Q' + floor(G.q);
  $('shopTitle').textContent = MT.shop.title;
  $('btnShopGo').textContent = MT.shop.go;
  $('shopNext').textContent = MT.stages[G.stage].name;
  $('shopTime').textContent = '+' + MT.stages[G.stage].clock + ' s al reloj';
  $('shopPkg').textContent = ceil(G.pkg) + '%';
  const L = $('shopList');
  L.innerHTML = '';
  MT.shop.items.forEach((s) => {
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
      G.spent = (G.spent || 0) + s.price;
      G.up[s.id] = 1;
      Audio.buy();
      renderShop();
    });
    row.appendChild(b);
    L.appendChild(row);
  });
  $('btnFix').disabled = G.q < 25 || G.pkg >= 100;
}
function leaveShop() {
  Audio.ui();
  UI.hideScreen('scrShop', () => {});
  G.clock += MT.stages[G.stage].clock;
  UI.floatTime('+' + MT.stages[G.stage].clock + ' s', true);
  G.state = 'play';
  G.iframes = 1;
  G.speed = max(G.speed, 8);
  $('app').dataset.state = 'play';
  Audio.setLevel(themeOf(G.stage));
  Audio.resume();
  snapshot();
  UI.card(G.stage, MT.stages[G.stage]);
}
function startBoss() {
  snapshot(LV.S3);
  BOSS.on = true;
  BOSSK.start(api);
  G.cutT = 1.25;
  G.cutWhat = 'boss';
  cutCam.layers.set(2);
  Audio.setLevel(MT.music[3]);
  Audio[BOSSK.sfx]();
  $('fxCalls').innerHTML = '';
  P.uCut.value = 1;
  anime.remove(P.uCutW);
  anime.timeline({easing: 'easeOutExpo'})
    .add({targets: P.uCutW, value: [0, 0.2], duration: 160})
    .add({targets: P.uCutW, value: 0.23, duration: 880, easing: 'linear'})
    .add({targets: P.uCutW, value: 0, duration: 150, easing: 'easeInExpo'});
  UI.cut(MT.boss.cut, MT.boss.sub);
  G.fov = 66;
}
function endCut() {
  G.cutT = 0;
  P.uCut.value = 0;
  UI.cutOut();
  impact(0.12, true);
  G.lines = 0.9;
  G.shake = 0.7;
  if (G.cutWhat === 'boss') BOSSK.endCut(api);
}
function finish() {
  G.state = 'finish';
  if (LV.lights) copOff(api);
  Audio.siren(false);
  Voice.stopAll();
  G.fT = 0;
  G.camHero = true;
  G.landed = false;
  G.landT = 0;
  UI.hideHud();
  $('fxCalls').innerHTML = '';
  G.cutT = 0.95;
  G.cutWhat = 'rider';
  cutCam.layers.set(1);
  P.uCut.value = 1;
  anime.remove(P.uCutW);
  anime.timeline({easing: 'easeOutExpo'})
    .add({targets: P.uCutW, value: [0, 0.19], duration: 140})
    .add({targets: P.uCutW, value: 0.22, duration: 660, easing: 'linear'})
    .add({targets: P.uCutW, value: 0, duration: 140, easing: 'easeInExpo'});
  UI.cut(MT.finish.cut, MT.finish.sub);
  Audio.fanfare();
  BOSSK.hide();
}
function showResults() {
  G.state = 'results';
  $('fxCalls').innerHTML = '';
  $('app').dataset.state = 'menu';
  const checks = [
    [true, MT.finish.arrive],
    [G.pkg >= 60, 'Paquete con 60% o más'],
    [G.pkg >= 90, 'Paquete con 90% o más'],
    [G.clock >= 15, 'Te sobraron 15 segundos o más'],
    [G.turtles === 0, MT.soft.check],
  ];
  const n = checks.filter((c) => c[0]).length;
  const unl0 = specialsNow();
  const best = store.get(bestKey(MT.id), {stars: 0, clock: 0, q: 0});
  if (n > best.stars || (n === best.stars && G.clock > best.clock)) store.set(bestKey(MT.id), {stars: n, clock: G.clock, q: floor(G.q), pkg: ceil(G.pkg)});
  store.set('run', null);
  $('resStop').textContent = 'Parada ' + MT.stop + ' de 6';
  $('resTitle').textContent = MT.resTitle || '¡' + MT.name + ', listo!';
  $('resNote').innerHTML = MT.note;
  const nx = $('btnNext');
  nx.hidden = !MT.nextId;
  if (MT.nextId) nx.textContent = 'Seguir a ' + LEVELS[MT.nextId].META.short;
  $('btnAgain').className = MT.nextId ? 'btn btn-2' : 'btn btn-main';
  $('resList').innerHTML = checks.map((c) => '<li data-ok="' + (c[0] ? '1' : '0') + '">' + c[1] + '</li>').join('');
  UI.count($('resPkg'), ceil(G.pkg), (v) => floor(v) + '%');
  UI.count($('resClock'), max(0, G.clock), (v) => floor(v) + ' s');
  UI.count($('resQ'), floor(G.q), (v) => 'Q' + floor(v));
  $('resNear').textContent = String(G.nears);
  $('resEnc').textContent = String(G.encargos);
  // Récord para la tabla de todos: propinas ganadas en esta parada, sin contar lo que traías.
  REC.pending = {nivel: MT.id, estrellas: n, tiempo: Math.round(max(0, G.clock) * 10) / 10, propinas: max(0, floor(G.q - (G.q0 || 0) + (G.spent || 0))), paquete: ceil(G.pkg)};
  REC.saved = false;
  // Las propinas de la parada caen en la alcancía del ropero; las estrellas pueden desbloquear ropa.
  const nuevos = earn(MT.id, REC.pending.propinas, n, unl0);
  $('resNote').innerHTML = MT.note + ' <span class="text-oro">+Q' + REC.pending.propinas + ' a tu alcancía.</span>';
  if (nuevos.length) setTimeout(() => UI.toast('¡Desbloqueaste en el ropero: ' + nuevos.map((i) => i.name + ' (' + SLOTS.find((s) => s.id === i.slot).name.toLowerCase() + ')').join(', ') + '!'), 1400);
  $('recName').value = store.get('name', '');
  $('recMsg').textContent = '';
  $('btnRecSave').disabled = false;
  $('recForm').hidden = !plausible(REC.pending);
  UI.showScreen('scrResults');
  UI.stars(n);
  G.shareText = MT.share + ' en Vuelta a Guatemala: ' + n + ' de 5 estrellas, paquete al ' + ceil(G.pkg) + '%.';
}
const bestKey = (id) => (id === 'monterrico' ? 'best' : 'best.' + id);
// ── Récords de todos ──
const REC = {pending: null, saved: false, busy: false, lastId: null, lastLevel: null, from: 'title', tab: 'monterrico', tok: 0};
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
async function saveRec() {
  if (REC.saved || REC.busy || !REC.pending) return;
  const msg = $('recMsg'), c = checkName($('recName').value);
  if (c.error) {
    msg.textContent = c.error;
    return;
  }
  store.set('name', c.name);
  REC.busy = true;
  $('btnRecSave').disabled = true;
  msg.textContent = 'Guardando…';
  try {
    const rec = Object.assign({nombre: c.name}, REC.pending);
    REC.lastId = await saveRecord(rec);
    REC.lastLevel = rec.nivel;
    REC.saved = true;
    msg.textContent = '¡Guardado!';
    Audio.buy();
    openRecords(rec.nivel, 'results');
  } catch (e) {
    $('btnRecSave').disabled = false;
    msg.textContent = 'No se pudo guardar. Revisá tu internet e intentá otra vez.';
  } finally {
    REC.busy = false;
  }
}
function openRecords(level, from) {
  REC.from = from;
  Audio.ui();
  UI.hideScreen(from === 'results' ? 'scrResults' : 'scrTitle', () => {});
  UI.showScreen('scrRecords');
  showRecTab(LEVELS[level] ? level : 'monterrico');
}
function closeRecords() {
  Audio.ui();
  UI.hideScreen('scrRecords', () => {});
  if (REC.from === 'results') UI.showScreen('scrResults');
  else {
    $('scrTitle').hidden = false;
    UI.titleIn();
    if (!COARSE) $('btnStart').focus({preventScroll: true});
  }
}
async function showRecTab(level) {
  REC.tab = level;
  document.querySelectorAll('#recTabs [data-rec]').forEach((b) => b.setAttribute('aria-selected', b.dataset.rec === level ? 'true' : 'false'));
  const L = $('recList'), note = $('recNote'), tok = ++REC.tok;
  L.innerHTML = '';
  note.textContent = 'Cargando récords…';
  try {
    const rows = await fetchTop(level, 10);
    if (tok !== REC.tok) return;
    if (!rows || !rows.length) {
      note.textContent = 'Todavía no hay récords en esta parada. ¡Sé el primero!';
      return;
    }
    L.innerHTML = rows.map((r, i) => '<li data-me="' + (r.id === REC.lastId ? 1 : 0) + '"><b class="rp">' + (i + 1) + '</b><span class="rn">' + esc(r.nombre) + '</span><span class="rs" aria-label="' + r.estrellas + ' de 5 estrellas">' + '★'.repeat(r.estrellas) + '<i>' + '★'.repeat(5 - r.estrellas) + '</i></span><span class="rt">' + floor(r.tiempo) + ' s</span><span class="rq">Q' + r.propinas + '</span></li>').join('');
    anime({targets: '#recList li', translateX: [-18, 0], opacity: [0, 1], delay: anime.stagger(45), duration: 380, easing: 'easeOutExpo'});
    const mine = REC.lastId && REC.lastLevel === level;
    note.textContent = mine && !rows.some((r) => r.id === REC.lastId) ? 'Tu récord quedó guardado, pero todavía no entra entre los diez mejores.' : 'Gana el de más estrellas; si empatan, al que le sobró más tiempo.';
  } catch (e) {
    if (tok === REC.tok) note.textContent = 'No se pudieron cargar los récords. Revisá tu internet.';
  }
}
export function goTitle(id = G.level) {
  store.set('level', id);
  Audio.siren(false);
  Voice.stopAll();
  useLevel(id);
  G.state = 'title';
  G.camBlend = 1;
  G.camHero = false;
  G.dist = MT.title.D0;
  G.x = MT.title.x(LV, G.dist, U.uTime.value);
  G.speed = MT.title.speed;
  G.y = 0;
  G.vy = 0;
  G.spin = 0;
  G.rear = 0;
  G.sprint = G.brake = false;
  BOSS.on = false;
  BOSS.mode = 'off';
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
  const best = store.get(bestKey(MT.id), null);
  let run = store.get('run', null);
  if (run && (run.level || 'monterrico') !== MT.id) run = null;
  $('bestLine').textContent = best ? 'Tu mejor entrega aquí: ' + best.stars + ' de 5 estrellas.' : 'Parada ' + MT.stop + ' de 6.';
  $('btnStart').textContent = 'Arrancar en ' + MT.short;
  $('btnBell').textContent = MT.callChip;
  $('legendDesk').textContent = 'Flechas o A y D: moverte · Espacio: saltar, y otra vez en el aire para la pirueta · ↑ ' + MT.sprintWord + ' · ↓ frenar · B: ' + MT.callWord + ' · P: pausa';
  const cont = $('btnContinue');
  const show = run && (run.stage > 0 || run.dist > 0);
  cont.hidden = !show;
  if (show) cont.firstElementChild.textContent = 'Seguir en ' + MT.stages[run.stage].name;
  document.querySelectorAll('#route [data-level]').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.level === MT.id ? 'true' : 'false');
    // Tus mejores estrellas en cada parada
    const n = bestStars(b.dataset.level), st = b.querySelector('.st');
    if (st) st.innerHTML = n ? '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i>' : '';
    b.setAttribute('aria-label', b.querySelector('b').textContent + ', ' + b.querySelector('span').textContent + (n ? ', ' + n + ' de 5 estrellas' : ''));
  });
}
// Cambiar de parada en el título, con un fundido corto.
let picking = false;
function pickLevel(id) {
  if (id === G.level || picking || G.state !== 'title') return;
  picking = true;
  Audio.ui();
  anime({targets: P.uFadeK, value: 1, duration: 170, easing: 'easeInQuad', complete: () => {
    useLevel(id);
    store.set('level', id);
    if (VEH.call() === 'neigh') Audio.neigh();
    G.dist = MT.title.D0;
    G.x = MT.title.x(LV, G.dist, U.uTime.value);
    G.speed = MT.title.speed;
    refreshTitle();
    anime({targets: P.uFadeK, value: 0, duration: 260, easing: 'easeOutQuad', complete: () => (picking = false)});
  }});
}
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
  const sp = max(G.speed, 8), L = sp * 1.9, farm = MT.ground === 'farm', city = MT.ground === 'city', jumpH = VEH.phys.jumpH, hwV = VEH.phys.halfW;
  let best = 1e9, bx = G.x;
  const open = tr.kind === 0 && !city, wide = farm ? tr.hw + MT.fenceOff - 1 : min(tr.hw, 11);
  const edge = city ? hwV + 0.15 : 0.5;
  const lo = open ? (farm ? tr.cx - wide : max(tr.cx - tr.hw, sh + 0.2)) : tr.cx - tr.hw + edge, hi = open ? tr.cx + wide : tr.cx + tr.hw - edge;
  const obs = [];
  // También lo que va a la par: no hay que cerrarse encima del carro que estás pasando.
  const near = (it) => {
    if (it.gone || it.passed) return;
    const d = it.D - G.dist;
    if (d > L || d < (it.solid ? -(it.l || 1) - 0.4 : 0)) return;
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
    let c = abs(x - G.x) * 0.1 + (city ? abs(x - AP.x) * 0.14 : 0);
    if (open && !farm) c += abs(x - (sh + 1.7)) * 0.32;
    else c += abs(x - tr.cx) * (farm ? 0.3 : 0.6);
    if (BOSSK.laneCost && BOSS.on) c += BOSSK.laneCost(api, x);
    for (const [it, d] of obs) {
      // Las motos que zigzaguean ocupan todo su vaivén.
      const weave = it.kind === 'weave' || (city && it.kind === 'crab');
      // La camioneta que sale de la orilla: cuenta desde donde está hasta donde va a quedar.
      const ax = it.kind === 'merge' ? (it.x + it.xT) / 2 : weave ? it.x0 : it.x + (it.vx || 0) * (d / sp);
      if (it.pick) {
        if (abs(x - ax) < 1.2) c -= it.pick === 'coin' ? 0.6 : 6;
        continue;
      }
      if (it.mud || it.ice) {
        if (d >= 0 && abs(x - ax) < it.w + (it.ice ? hwV + 0.3 : 0)) c += it.ice ? 14 : 3;
        continue;
      }
      // Lo que está casi encima o a la par: no cruzarse en su camino para llegar al carril.
      if (d < 7 && !(it.h < jumpH && G.y > it.h)) {
        const band = it.w + hwV + 0.3 + (weave ? abs(it.amp) : 0) + (it.kind === 'merge' ? abs(it.xT - it.x) / 2 : 0);
        if (abs(G.x - ax) >= band && min(G.x, x) < ax + band && max(G.x, x) > ax - band) c += 70;
      }
      if (d < 0) continue;
      const clear = it.w + (city ? hwV + 0.55 : 0.75) + (weave ? abs(it.amp) : 0) + (it.kind === 'merge' ? abs(it.xT - it.x) / 2 : 0);
      if (abs(x - ax) < clear) {
        const jumpable = it.h < jumpH && !it.h0;
        c += (jumpable ? 12 : 90) * (1.3 - d / L);
      }
    }
    if (c < best) {
      best = c;
      bx = x;
    }
  }
  AP.x = bx;
  // Si Turbo se jala, el piloto lo corrige como lo haría una persona.
  IN.stick = clamp((AP.x - G.x) * 0.55 - (MT.pull ? MT.pull.dir * MT.pull.s * (G.pull || 0) * (G.pullK === undefined ? 1 : G.pullK) : 0), -1, 1);
  IN.stickOn = true;
  // Saltar lo que no se puede esquivar
  if (G.y <= 0) {
    for (const [it, d] of obs) {
      if (it.pick || it.mud || it.ice) continue;
      if (it.h < jumpH && !it.h0 && abs(G.x - it.x) < it.w + (city ? hwV + 0.1 : 0.5) && d < sp * (farm ? 0.24 : 0.27) && d > 1) IN.jump = 0.12;
    }
    for (const g of LV.gaps) {
      const d = g[0] - G.dist;
      if (d > 0 && d < sp * 0.14) IN.jump = 0.12;
    }
    for (const t of LV.tumulos) {
      const d = t.D - G.dist;
      if (!t.used && d > 0 && d < sp * 0.2) IN.jump = 0.12;
    }
    if (BOSS.on && BOSSK.auto && BOSSK.auto(api)) IN.jump = 0.12;
  }
  // En la capital, el piloto para en los rojos y en los amarillos que no alcanza.
  G.autoBrake = false;
  if (city) {
    const Lt = lightAhead(LV, G.dist, 110);
    if (Lt && Lt.phase !== 'g') {
      const d = Lt.D - G.dist - 1.4, need = (G.speed * G.speed) / (2 * (G.up.frenos ? 34 : 17)) + 5;
      if (d > -0.3 && d < need + 4 && !(Lt.phase === 'y' && d < G.speed * 0.5)) G.autoBrake = true;
    }
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
      m.r = (m.r0 || 0) + (m.wobA === undefined ? 0.5 : m.wobA) * sin(t * (m.wobF || 6) + m.ph);
    } else if (m.kind === 'turtle' || m.kind === 'drift') {
      m.x += m.vx * dt;
    } else if (m.kind === 'traffic') {
      m.D += m.vD * dt;
      const dm = m.D - G.dist;
      if (m.smoke && dm > 6 && dm < 120 && rnd() < dt * 9) fx(3, m.x + rnd(-0.4, 0.4), rnd(1.5, 2.1), -(dm - 2.8), rnd(0.07, 0.13), 1.4, [0.95, 0.92, 0.98], {add: 0, vx: rnd(-0.3, 0.3), vy: rnd(0.5, 1.1), vz: rnd(-0.3, 0.3), grow: 1.25, world: 1});
    } else if (m.kind === 'merge') {
      // Camioneta parada en la orilla: cuando llegás, el ayudante grita y se te mete al carril.
      const dm = m.D - G.dist;
      if (!m.go && dm < m.trig) {
        m.go = true;
        m.gt = 0;
        if (G.state === 'play' && dm > 4) {
          const p = screenOf(m.x, 3.4, -dm);
          UI.call('¡Xela, Xela, Xela!', 2, p.x, p.y);
          Voice.speak('Ayudante', '¡Xela, Xela, Xela!', {ch: 'shout', chain: 'direct', maxDur: 1.1, gain: 1.2});
          Audio.honk();
        }
      }
      if (m.go) {
        m.gt += dt;
        m.vD = min(m.vMax, m.vD + 6 * dt);
        m.D += m.vD * dt;
        const k = sstep(0, 1.5, m.gt);
        m.x = lerp(m.x0, m.xT, k);
        m.r = -(m.xT - m.x0) * 0.08 * (1 - k) * (k > 0 ? 1 : 0);
        if (rnd() < dt * 14 && m.gt < 1.6) fx(3, m.x + rnd(-0.4, 0.4), 0.6, -(m.D - G.dist) + 5, rnd(0.25, 0.4), 1, [0.08, 0.07, 0.08], {add: 0, vy: rnd(0.8, 1.6), vz: rnd(1, 3), grow: 1.4, world: 1});
      }
    } else if (m.kind === 'weave') {
      // Motos que van zigzagueando entre carriles
      m.D += m.vD * dt;
      m.x = m.x0 + m.amp * sin(t * m.wv + m.ph);
      m.r = -0.35 * cos(t * m.wv + m.ph) * Math.sign(m.amp);
    } else if (m.kind === 'heron') {
      if (m.D - G.dist < 62) m.x += m.vx * dt;
      m.y = (m.flyH || 2.5) + sin(t * 3) * 0.1;
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
  if (it.mud) {
    if (G.y < 0.05 && abs(d) < it.l + sw && abs(G.x - it.x) < it.w) G.mudT = 0.12;
    return;
  }
  // Escarcha: no frena, pero la moto se resbala y tarda en hacerte caso.
  if (it.ice) {
    if (G.y < 0.05 && abs(d) < it.l + sw && abs(G.x - it.x) < it.w) {
      if (G.iceT <= 0 && !it.told) {
        it.told = true;
        if (G.callT <= 0) {
          shout('¡Resbala!', 3);
          say('¡Resbala!');
          G.callT = 0.6;
        }
        Audio.squeak();
      }
      G.iceT = 0.32;
    }
    return;
  }
  if (it.pick) {
    if (d < it.l + 0.4 && d > -it.l - sw && abs(G.x - it.x) < it.w + 0.5 && abs(G.y + 1 - (it.y || 1)) < 1.5) pickup(it);
    return;
  }
  if (!it.solid) return;
  const dx = abs(G.x - it.x), wide = it.w + VEH.phys.halfW;
  if (!it.passed && d < it.l + 0.25 && d > -it.l - sw - 0.25 && dx < wide) {
    const y0 = it.y && it.kind !== 'heron' ? it.y : 0;
    let hit;
    if (it.kind === 'heron') hit = G.y > (it.hitY || 0.32);
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
// Estela de la lancha: dos brazos de espuma que se abren detrás, la espuma del motor y, acelerando, el rocío de la proa.
function lakeWake(dt0) {
  if (G.y > 0.05) return;
  const sp = G.speed, c = col('uFoam'), sx = G.x - 0.3 * G.steer;
  // Gotitas que tira la hélice; la estela misma es una cinta sobre el agua (wake.js).
  if (rnd() < dt0 * sp * 0.35) fx(3, sx + rnd(-0.25, 0.25), 0.15, 2.6, rnd(0.05, 0.1), 0.5, c, {add: 0, vx: rnd(-0.6, 0.6), vy: rnd(1, 2.4), vz: rnd(1, 3), grav: 12, world: 0.6});
  if ((G.sprint || G.rough) && rnd() < dt0 * 16) {
    const s = rnd() < 0.5 ? -1 : 1;
    fx(3, G.x + s * 0.55, 0.3, -1.1, rnd(0.06, 0.12), 0.45, c, {add: 0, vx: s * rnd(2, 3.5), vy: rnd(2, 3.6), vz: rnd(0, 2), grav: 14, world: 0.5});
  }
}
function updatePlay(dt, dt0, t) {
  const prev = G.dist;
  const st = MT.stages[G.stage], PH = VEH.phys;
  const tr = trackAt(G.dist);
  const time = U.uTime.value;
  let sh = 0;
  G.hard = G.soft = G.inWater = G.road = false;
  G.rough = 0;
  G.chip = '';
  // Velocidad objetivo
  let mul = 1;
  const farm = MT.ground === 'farm';
  if (G.mudT > 0) G.mudT -= dt0;
  if (G.iceT > 0) {
    G.iceT -= dt0;
    G.chip = 'Escarcha';
  }
  if (farm) {
    if (G.y <= 0.05) {
      const off = abs(G.x - tr.cx) - tr.hw;
      if (tr.base > 0.5 && tr.kind !== 1) {
        mul = 0.74;
        G.inWater = true;
        G.chip = 'En el agua';
      } else if (G.mudT > 0) {
        mul = 0.6;
        G.chip = 'Lodo';
      } else if (tr.kind === 0) {
        if (off < 0) {
          mul = 1.1;
          G.road = true;
        } else if (off > 4.5) {
          mul = 0.8;
          G.chip = 'Monte alto';
        } else {
          mul = 0.92;
          G.chip = 'Pasto';
        }
      }
    }
  } else if (MT.surface && G.y <= 0.05 && MT.surface(G.x - tr.cx, tr, G.dist)) {
    // Antigua: las lajas del centro corren más que el empedrado, que además sacude.
    const sf = MT.surface(G.x - tr.cx, tr, G.dist);
    mul = sf.mul;
    G.chip = sf.chip || '';
    G.hard = !!sf.fast;
    G.rough = sf.rough || 0;
  } else if (tr.kind === 0 && MT.ground === 'beach') {
    sh = shoreAt(G.dist, tr.base, time);
    const ds = sh - G.x;
    if (G.y <= 0.05) {
      if (ds > 0) {
        mul = 0.52;
        G.inWater = true;
        G.chip = 'En el agua';
      } else if (-ds < WET_W) {
        mul = 1.2;
        G.hard = true;
        G.chip = 'Arena dura';
      } else if (-ds > 9) {
        mul = lerp(1, 0.8, sstep(9, 16, -ds));
        G.soft = -ds > 12;
        if (G.soft) G.chip = 'Arena suelta';
      }
    }
  }
  if (G.auto) autoDrive(tr, sh);
  const wantBrake = IN.down || IN.brakeBtn || G.autoBrake;
  // Si se le acaba el aliento, Turbo no se deja apurar hasta recuperarse un poco.
  if (G.tired > 0) G.tired = G.force > 0.35 ? 0 : G.tired;
  const wantSprint = (IN.up || IN.pedalBtn) && G.force > 0.02 && !wantBrake && !G.tired;
  G.sprint = wantSprint;
  G.brake = wantBrake;
  G.force = wantSprint ? max(0, G.force - dt * PH.drain) : min(1, G.force + dt * PH.regen);
  if (MT.vehicle === 'horse' && wantSprint && G.force <= 0.02) {
    G.tired = 1;
    shout('¡Turbo ya no da!', 3);
    say('¡Turbo ya no da!');
    Audio.neigh();
  }
  let target = st.speed * (BOSS.on ? 1.12 : 1) * mul * (1 + G.up.cadena * 0.06) * (wantSprint ? PH.sprint : 1) * (G.tired ? 0.86 : 1);
  if (G.spook > 0) target *= 1.08;
  // La camioneta sí para del todo (semáforos y paradas); los demás solo bajan la velocidad.
  if (wantBrake) target = MT.ground === 'city' ? 0 : 4;
  const accel = wantBrake ? (G.up.frenos ? 34 : 17) : G.speed < target ? (G.up.frenos ? 15 : PH.accel) : 8;
  G.speed = G.speed < target ? min(target, G.speed + accel * dt) : max(target, G.speed - accel * dt);
  G.dist += G.speed * dt;
  // Dirección
  let s = readSteer();
  // Asustado por los cohetillos, Turbo arranca más rápido un ratito, pero sigue yendo para donde lo guiás.
  if (G.spook > 0) G.spook -= dt0;
  if (MT.pull) s = updatePull(s, dt0, tr, sh);
  // Al soltar frena más rápido que al arrancar, para esquivar con precisión.
  // En la escarcha la moto se resbala: el timón tarda en agarrar.
  const grip = G.iceT > 0 ? 0.16 : 1;
  G.steer = damp(G.steer, s, (s * G.steer < 0 || s === 0 ? PH.steerRel : PH.steer) * grip, dt0);
  const VX = PH.vx * clamp(G.speed / 16, 0.55, 1);
  G.x += G.steer * VX * dt;
  // Salto y pirueta
  if (IN.jump > 0) {
    IN.jump -= dt0;
    if (G.y <= 0 && !G.onRamp) {
      G.vy = PH.jumpV;
      G.y = 0.01;
      G.air = true;
      IN.jump = 0;
      Audio.jump();
      VEH.kick(0.5);
      burst(G.x, 0.1, 0.4, LAKE() ? 8 : 4, 3, 0.3, 0.13, dust(), {world: 0.8});
    } else if (G.y > 0.35 && !G.trickOn && !G.trickDone) {
      // Si ya casi aterriza, el toque queda guardado para el próximo salto.
      const left = (G.vy + sqrt(max(0, G.vy * G.vy + 2 * PH.grav * G.y))) / PH.grav;
      if (left >= 0.34) {
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
      VEH.kick(0.9);
      G.lines = max(G.lines, 0.35);
      if (r.last) {
        finish();
        return;
      }
    }
  }
  if (!G.onRamp) {
    if (G.y > 0 || G.vy > 0) {
      G.vy -= PH.grav * dt;
      G.y += G.vy * dt;
      if (G.y <= 0) {
        // Aterrizaje
        const hard = G.vy < -13.5;
        G.y = 0;
        G.vy = 0;
        G.air = false;
        G.spin = 0;
        G.trickDone = false;
        if (LAKE()) Audio.splash();
        else Audio.land(hard ? 1 : 0.65);
        VEH.kick(hard ? 2.4 : 1.2);
        burst(G.x, 0.1, 0.3, LAKE() ? (hard ? 16 : 10) : hard ? 9 : 5, LAKE() ? 5 : 4, 0.4, 0.16, dust(), {world: 0.8});
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
      G.trickDone = true;
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
        say('¡Pirueta!');
        Audio.pickup();
      }
    }
  }
  // Túmulos
  for (const u of LV.tumulos) {
    if (u.used) continue;
    if (prev < u.D && G.dist >= u.D) {
      u.used = true;
      // Ola de lado a lado: si no la brincás, te levanta y moja el paquete.
      if (u.ola) {
        if (G.y < 0.3) {
          G.vy = 4.2;
          G.y = 0.02;
          G.air = true;
          G.shake = 0.5;
          G.speed *= 0.82;
          G.racha = 1;
          VEH.kick(2.4);
          shout('¡Golpe de ola!', 3);
          say('¡Golpe de ola!', true);
          Audio.splash();
          burst(G.x, 0.4, 0.2, 12, 5, 0.5, 0.18, col('uFoam'), {world: 0.6, add: 0});
          UI.floatTime('−' + ceil(4 * (1 - G.up.carton * 0.3)) + '% paquete', false);
          damage(4);
        } else jumpOver();
        continue;
      }
      if (G.y < 0.3) {
        if (G.speed > 15.5) {
          G.vy = 5.6;
          G.y = 0.02;
          G.air = true;
          G.shake = 0.5;
          VEH.kick(2.5);
          shout('¡TÚMULO!', 3);
          say('¡Túmulo!', true);
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
  if (MT.ground === 'city') {
    const lim = tr2.hw - PH.halfW * 0.92, dx = G.x - tr2.cx;
    G.scraping = abs(dx) > lim;
    if (abs(dx) > lim) {
      G.x = tr2.cx + Math.sign(dx) * lim;
      G.speed = max(G.speed * (1 - dt * 1.4), min(G.speed, 11));
      if (LAKE()) {
        if (rnd() < dt0 * 24) fx(3, G.x + Math.sign(dx) * 0.8, 0.2, rnd(-0.5, 1.5), rnd(0.08, 0.16), 0.5, col('uFoam'), {add: 0, vx: Math.sign(dx) * rnd(1, 3), vy: rnd(1.5, 3.5), vz: rnd(1, 4), grav: 14, world: 0.5});
      } else if (rnd() < dt0 * 30) fx(3, G.x + Math.sign(dx) * 0.9, rnd(0.3, 1.2), rnd(0.5, 6), 0.08, 0.22, [1.8, 1.3, 0.5], {add: 1, vx: Math.sign(dx) * rnd(1, 4), vy: rnd(1, 4), vz: rnd(2, 8), grav: 14, world: 0.5});
      if (G.callT <= 0 && G.speed > 14) {
        shout(LAKE() ? '¡Las boyas!' : '¡Raspón!', 0);
        G.callT = 2.5;
      }
    }
  } else if (k === 0) {
    const off = tr2.hw + MT.fenceOff;
    const left = farm ? tr2.cx - off : max(tr2.cx - tr2.hw, shoreAt(G.dist, tr2.base, time) - 6);
    const right = tr2.cx + (farm ? off : tr2.hw);
    if (G.x < left) G.x = left;
    if (G.x > right) G.x = right;
  } else if (k >= 2) {
    const dx = G.x - tr2.cx;
    if (abs(dx) > tr2.hw - 0.3) {
      G.x = tr2.cx + Math.sign(dx) * (tr2.hw - 0.3);
      G.speed = max(G.speed * (1 - dt * 1.5), 8);
      if (farm) {
        if (rnd() < dt * 22) fx(3, G.x + Math.sign(dx) * 0.4, rnd(0.6, 2), 0.2, rnd(0.05, 0.1), 0.42, col('uGrass'), {add: 0, vx: -Math.sign(dx) * rnd(1, 4), vy: rnd(0.5, 3), vz: rnd(1, 6), grav: 9, world: 0.5});
      } else if (rnd() < dt * 26) fx(3, G.x, 0.7, 0.2, 0.1, 0.22, [1.6, 1.2, 0.5], {add: 1, vx: -Math.sign(dx) * rnd(2, 6), vy: rnd(1, 5), vz: rnd(0, 6), grav: 16, world: 0.5});
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
    if (MT.vehicle === 'bike' && (G.inWater || G.hard)) {
      const c = col('uFoam');
      fx(3, G.x + rnd(-0.1, 0.1), 0.15, 0.6, rnd(0.05, 0.13), 0.42, c, {add: 0, vx: rnd(-1.5, 1.5), vy: rnd(1.2, G.inWater ? 5 : 3), vz: rnd(2, 6), grav: 15, world: 0.45});
    } else if (k === 0 && !farm && MT.vehicle !== 'moto') {
      fx(3, G.x + rnd(-0.1, 0.1), 0.12, 0.7, rnd(0.08, 0.2), 0.45, col('uSandB'), {add: 0, vx: rnd(-0.5, 0.5), vy: rnd(0.2, 1), vz: 1, grow: 0.4, world: 0.5});
    }
  }
  if (G.sprint && rnd() < dt0 * 16) fx(3, G.x, rnd(0.4, 1.2), 0.6, 0.04, 0.2, [1.5, 1.4, 1], {add: 1, vz: 10, world: 0.5});
  if (LAKE()) lakeWake(dt0);
  // El humito de la moto cuando acelera, y el agua que levanta la llanta en la calle mojada.
  if (MT.vehicle === 'moto') {
    if ((G.sprint || G.speed < 10) && rnd() < dt0 * (G.sprint ? 14 : 6)) {
      const q = motoExhaust();
      fx(3, q.x, q.y, q.z, rnd(0.07, 0.13), 0.7, [0.62, 0.62, 0.68], {add: 0, vx: rnd(-0.3, 0.3), vy: rnd(0.3, 0.9), vz: rnd(1, 3), grow: 0.9, world: 0.85});
    }
    const wk = MT.rainAt ? MT.rainAt(G.dist) : 0;
    if (wk > 0.2 && G.y <= 0.02 && rnd() < dt0 * G.speed * 1.4 * wk) {
      const c = col('uFoam'), s = rnd() < 0.5 ? -1 : 1;
      fx(3, G.x + s * rnd(0.05, 0.3), 0.12, 1.1, rnd(0.05, 0.1), 0.42, [c[0] * 0.8, c[1] * 0.85, c[2] * 0.95], {add: 0, vx: s * rnd(0.5, 2.5), vy: rnd(1.5, 3.5), vz: rnd(2, 5), grav: 14, world: 0.45});
    }
  }
  // Humo negro del escape cuando la camioneta acelera; y el "psst" de los frenos de aire al parar.
  if (MT.vehicle === 'bus') {
    if (G.sprint && rnd() < dt0 * 20) {
      const q = exhaustTip();
      fx(3, q.x, q.y, q.z, rnd(0.22, 0.38), 0.9, [0.07, 0.06, 0.07], {add: 0, vx: rnd(-0.4, 0.4), vy: rnd(1.4, 2.8), vz: rnd(1, 4), grow: 1.5, world: 0.85});
    }
    if (G.speed < 0.8 && !G.halted) {
      G.halted = true;
      Audio.airbrake();
    } else if (G.speed > 4) G.halted = false;
  }
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
    if (LV.lights) copOff(api);
    if (TEST.autoShop) {
      G.clock += MT.stages[G.stage].clock;
      Audio.setLevel(themeOf(G.stage));
      snapshot();
    } else openShop();
    return;
  }
  if (!BOSS.on && G.dist >= LV.S3) startBoss();
  if (BOSS.on) BOSSK.update(api, dt, dt0, time);
  if (LV.lights) updateTraffic(api, dt, dt0, time);
}
// Algo que te saca de tu línea unos segundos: Turbo que se jala, el viento del mar o la camioneta
// desalineada. Avisa antes, y hay que corregir para el otro lado.
function bridgeAhead() {
  for (let k = 0; k <= 120; k += 15) if (trackAt(G.dist + k).kind === 1) return true;
  return false;
}
function pullAllowed() {
  if (BOSS.on || G.y > 0.05) return false;
  if (MT.ground === 'beach') return G.dist < LV.S1 - 160 && trackAt(G.dist).kind === 0;
  if (MT.ground === 'farm') return !bridgeAhead() && !G.inWater;
  return G.speed > 12 && !(LV.lights && lightAhead(LV, G.dist, 45));
}
// Cuánto más te puede llevar: llega hasta el pasto o la arena suelta, no más allá.
function pullRoom(tr, sh) {
  if (MT.ground === 'beach') return sh + 11 - G.x;
  if (MT.ground === 'farm') return G.x - (tr.cx - tr.hw - 2.5);
  return 9;
}
function updatePull(s, dt0, tr, sh) {
  const PL = MT.pull;
  if (G.pullT > 0) {
    G.pullT -= dt0;
    G.pull = min(1, G.pull + dt0 * 5);
    if (G.scraping) G.pullBad = true;
    if (G.pullT <= 0 && G.hits === G.pullHits && !G.pullBad && pullRoom(tr, sh) > 1) {
      G.q += 4;
      G.racha = min(9, G.racha + 1);
      G.rachaT = 6;
      shout('¡Lo controlaste!', 1);
    }
  } else {
    G.pull = max(0, G.pull - dt0 * 3);
    if (G.pullWarn > 0) {
      G.pullWarn -= dt0;
      if (G.pullWarn <= 0) {
        G.pullT = rnd(1.8, 2.6);
        G.pullHits = G.hits;
        G.pullBad = false;
      }
    } else if (G.dist > PL.from) {
      G.pullNext -= dt0;
      if (G.pullNext <= 0) {
        if (!pullAllowed()) G.pullNext = 2;
        else {
          G.pullNext = rnd(10, 16);
          G.pullWarn = 0.8;
          Audio[PL.sfx]();
          shout(PL.shout, 3);
          say(PL.shout);
        }
      }
    }
  }
  const on = G.pullT > 0 || G.pullWarn > 0;
  if (on) G.chip = PL.chip;
  // Arena que vuela con el viento
  if (on && MT.ground === 'beach' && rnd() < dt0 * 46) fx(3, G.x - PL.dir * rnd(3, 14), rnd(0.15, 1.8), rnd(-16, 3), rnd(0.03, 0.06), 0.55, col('uSandB'), {add: 0, vx: PL.dir * rnd(9, 15), vy: rnd(-0.3, 0.6), world: 0.7});
  G.pullK = clamp(pullRoom(tr, sh) / 2.5);
  return clamp(s + PL.dir * PL.s * G.pull * G.pullK, -1, 1);
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
  shout(MT.fallText, 3);
  say(MT.fallText, true);
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
  const b = G.camBlend, t = U.uTime.value, VC = VEH.cam;
  const tr = trackAt(G.dist + 34);
  // En vertical la pantalla es angosta: la cámara mira menos hacia el camino y más al jugador.
  const tallV = VIEW.aspect < 1;
  lookX = damp(lookX, lerp(G.x, tr.cx, tallV ? 0.14 : 0.45), 4, dt0);
  G.camX = damp(G.camX, lerp(G.x, trackAt(G.dist).cx, tallV ? 0.04 : 0.14), 9, dt0);
  G.camX = clamp(G.camX, G.x - (tallV ? 1.4 : 4), G.x + (tallV ? 1.4 : 4));
  camY = damp(camY, VC.y + G.y * 0.5, 7, dt0);
  G.shake *= exp(-dt0 * 6);
  const sk = G.shake * (SET.flash ? 0.34 : 0.1);
  const sx = (sin(t * 71) + sin(t * 113)) * 0.5 * sk, sy = (sin(t * 83) + sin(t * 131)) * 0.5 * sk;
  camera.position.set(G.camX + sx, camY + sy, VC.z);
  _look.set(lookX, VC.lookY + G.y * 0.3, -24);
  if (b > 0.001 || G.camHero) {
    const hb = G.camHero ? 1 : b;
    // Toma baja desde el lado del mar: el sol a la izquierda, el ciclista a la derecha.
    // En vertical se aleja y centra, para que el protagonista quede entre el rótulo y el botón.
    const tall = VIEW.aspect < 1, far = tall ? 1.3 : 1;
    const sw = sin(t * 0.18) * 0.35, hx = (VC.heroX + sw) * far, hz = VC.heroZ * far;
    const off = Math.atan((tall ? 0.1 : 0.52) * Math.tan((camera.fov * PI) / 360) * VIEW.aspect);
    const head = Math.atan2(-hx, hz) - off;
    _hero.set(G.x + hx, VC.heroY + (tall ? 0.5 : 0), hz);
    _heroL.set(G.x + hx + sin(head) * 10, VC.heroLook + (tall ? 0.75 : 0), hz - cos(head) * 10);
    if (G.camHero) {
      _hero.set(G.x + VC.finish[0], G.y + VC.finish[1], VC.finish[2]);
      _heroL.set(G.x - 0.4, G.y + 1 + (VC.y - 2.72) * 0.5, -3);
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
    if (G.cutWhat === 'boss') BOSSK.cutView(api, cutCam, q);
    else if (VC.cut) {
      const c = VIEW.aspect < 1 ? VC.cut.t : VC.cut.w, k = lerp(1.1, 0.97, q);
      cutCam.position.set(G.x + c[3] + (c[0] - c[3]) * k, G.y + c[4] + (c[1] - c[4]) * k, c[5] + (c[2] - c[5]) * k);
      cutCam.lookAt(G.x + c[3], G.y + c[4], c[5]);
    } else {
      const far = VC.cutFar || (MT.vehicle === 'horse' ? 1.5 : 1);
      cutCam.position.set(G.x + lerp(-3.4, -2.3, q) * far, G.y + 0.9, -lerp(4.8, 3.6, q) * far);
      cutCam.lookAt(G.x - 1.15 * far, G.y + VC.cutH, 0.82 * far);
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
// Ceniza y humo de la quema, mariposas en los potreros y cohetes sobre la feria.
function levelFx(t, dt0) {
  const D = G.dist;
  // Xela: la lluvia de la noche, en rayitas que caen alrededor de la cámara.
  if (MT.rainAt) {
    const rk = MT.rainAt(G.state === 'title' ? MT.title.pal : D);
    let n = dt0 * 250 * rk;
    while (n > 0) {
      if (n >= 1 || rnd() < n) fx(4, G.x + rnd(-13, 13), rnd(1.5, 9), -rnd(-2, 36), rnd(0.3, 0.45), 0.42, [0.62, 0.68, 0.82], {a: 0.5, vy: -24, vx: -1.2, rot: 0.06, world: 1});
      n -= 1;
    }
  }
  if (MT.burn && D > MT.burn[0] - 50 && D < MT.burn[1] + 40) {
    if (rnd() < dt0 * 34) fx(3, G.x + rnd(-16, 16), rnd(1, 8), rnd(-40, 2), rnd(0.03, 0.07), 1.5, [0.05, 0.04, 0.04], {add: 0, vx: rnd(-0.6, 0.6), vy: -rnd(0.5, 1.3), vz: rnd(0, 1), world: 1});
    if (rnd() < dt0 * 12) {
      const s = rnd() < 0.5 ? 1 : -1;
      const x0 = LV.center(D + 40) + s * rnd(8, 15), z0 = -rnd(34, 96);
      for (let i = 0; i < 3; i++) fx(3, x0 + rnd(-1.4, 1.4), rnd(4.5, 8), z0 + rnd(-1, 1), rnd(1.4, 2.6), 2.2, [0.17, 0.135, 0.125], {add: 0, vy: rnd(1.6, 3.2), vx: rnd(-0.4, 0.4), grow: 1.25, world: 1});
    }
    if (rnd() < dt0 * 14) fx(0, LV.center(D + 24) + (rnd() < 0.5 ? 1 : -1) * rnd(6, 10), rnd(0.8, 3), -rnd(10, 50), rnd(0.07, 0.15), 0.8, [2.4, 0.9, 0.2], {vy: rnd(1, 3), world: 1});
  }
  if (MT.id === 'taxisco' && D > LV.fair + 40 && D < LV.S1 - 60) {
    const base = floor(D / 11);
    for (let i = 0; i < 14; i++) {
      const id = base + i, h = (id * 13.7) % 1, h2 = (id * 7.31) % 1, z = id * 11, c = LV.center(z);
      tick(0, c + (h - 0.5) * 26 + sin(t * 1.3 + id) * 0.8, 0.8 + h2 * 1.9 + sin(t * 5 + id) * 0.2, -(z - D), 0.11, [1.5, 1.45, 1], 0.9);
    }
  }
  if (MT.id === 'taxisco' && (D > LV.S2 + 60 || D < LV.fair + 40) && rnd() < dt0 * (D < LV.fair + 40 ? 0.9 : 0.55)) {
    const x = G.x + rnd(-30, 30), y = rnd(14, 26), z = -rnd(60, 140), cs = [[2.6, 0.7, 0.5], [2.6, 2, 0.5], [0.6, 2.2, 2], [2.4, 0.8, 1.8]], c = pick(cs);
    for (let i = 0; i < 18; i++) {
      const a = rnd(0, 6.283), v = rnd(5, 11);
      fx(0, x, y, z, 0.3, 0.8, c, {vx: cos(a) * v, vy: sin(a) * v, grav: 7, world: 1});
    }
    fx(0, x, y, z, 1.8, 0.22, [2.6, 2.4, 2], {world: 1});
    if (G.state === 'play') Audio.cohete(0.3);
  }
}
function fireflies(t) {
  if (MT.id !== 'monterrico' || G.dist < LV.S1 - 30 || G.dist > LV.S2 + 30) return;
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
  if (G.sayT > 0) G.sayT -= dt0;
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
    G.vy -= VEH.phys.grav * dt;
    G.y += G.vy * dt;
    const deck = MT.finish.deck;
    if (G.y <= deck && G.vy < 0) {
      G.y = deck;
      G.vy = 0;
      if (!G.landed) {
        G.landed = true;
        G.shake = 0.7;
        if (LAKE()) Audio.splash();
        else Audio.land(1);
        VEH.kick(3);
        G.air = false;
        if (MT.finish.rear) {
          G.rear = 1;
          Audio.neigh();
        }
        const p = screenOf(G.x, G.y + 2.6 + (VEH.cam.y - 2.72) + (MT.finish.rear ? 1.3 : 0), 0);
        UI.call('¡CABAL!', 2, p.x, p.y);
        burst(G.x, deck, 0.2, 10, 5, 0.45, 0.16, col('uFoam'), {world: 0});
      }
    }
    if (G.landed) {
      G.speed = damp(G.speed, 0, 3.4, dt0);
      G.landT = (G.landT || 0) + dt0;
      if (G.landT > 1.1) G.rear = 0;
    }
    if ((G.landT > 1.5 || G.fT > 7) && G.fT < 100) {
      G.fT = 200;
      showResults();
    }
    updateMovers(dt, t);
  } else if (G.state === 'title' || G.state === 'results' || G.state === 'failed') {
    G.speed = damp(G.speed, G.state === 'title' ? MT.title.speed : 0, 2, dt0);
    G.dist += G.speed * dt;
    if (G.state === 'title') {
      G.x = damp(G.x, MT.title.x(LV, G.dist, t), 3, dt0);
      G.steer = cos(t * 0.3) * 0.1;
      if (LAKE()) lakeWake(dt0);
      if (G.dist > MT.title.D1) {
        G.dist = MT.title.D0;
        LV.cursor = 0;
      }
    }
  } else if (G.state === 'shop') {
    G.speed = damp(G.speed, 0, 3, dt0);
  }
    U.uDist.value = G.dist;
  const bb = 0.00011;
  U.uBend.value.set(bb * sin(G.dist * 0.0037) + bb * 0.5 * sin(G.dist * 0.0081 + 1), 0.00005 * sin(G.dist * 0.0053));
  updatePalette(G.state === 'title' ? MT.title.pal : G.dist);
  // Neblina de la bajada a Antigua
  if (LAKE()) U.uLake.value.y = clamp((G.state === 'title' ? MT.title.pal : G.dist) / LV.length);
  if (MT.fogAt) {
    const f = MT.fogAt(G.state === 'title' ? MT.title.pal : G.dist);
    U.uFogA.value = f[0];
    U.uFogB.value = f[1];
  }
  U.uLampP.value.set(G.x, -6);
  updatePhone(dt0);
  updateCamera(dt0);
  updatePost(dt0);
  fireflies(t);
  levelFx(t, dt0);
  updateFx(dt, G.speed);
  G.sink = damp(G.sink, G.inWater && G.y <= 0.05 ? 1 : 0, 8, dt0);
  const spooked = G.spook > 0.55 ? 0.8 : 0;
  VEH.update({x: G.x, y: max(G.y, G.state === 'falling' ? -3 : 0) - G.sink * VEH.phys.sink, speed: G.speed, steer: G.state === 'falling' ? 0.6 : G.steer, air: G.y > 0.03, crouch: G.sprint, brake: G.brake, pkg: G.pkg, time: t, dt: dt0, spin: G.spin, pitch: G.air ? clamp(G.vy * 0.018, -0.3, 0.3) : 0, vy: G.vy, rear: max(G.rear, spooked), pull: MT.pull ? -MT.pull.dir * ((G.pull || 0) + (G.pullWarn > 0 ? 0.35 : 0)) : 0, scale: VIEW.aspect < 0.9 ? VEH.phys.scaleV : VEH.phys.scale, rough: G.state === 'play' ? G.rough || 0 : 0, onStep});
  updateWake(LAKE() && G.state !== 'falling', G.x - 0.3 * G.steer, G.dist, G.speed, G.y > 0.05, dt0 * (G.ts || 1));
  if (G.state === 'play' && (G.uiT = (G.uiT || 0) - dt0) <= 0) {
    G.uiT = 0.08;
    UI.hud(G, LV);
  }
  Audio.ambient(MT.ambient(G.dist, LV), G.state === 'play' ? G.speed : 0);
  Audio.engine(MT.vehicle === 'moto' && G.state === 'play' ? 1 : 0, G.speed, G.sprint);
}
// Cada pisada del caballo: se oye y levanta polvo o agua.
function onStep(i, front) {
  if (G.state !== 'play' && G.state !== 'title') return;
  const inGame = G.state === 'play';
  const tr = trackAt(G.dist), wood = tr.kind === 1, stone = tr.kind === 3;
  if (inGame) Audio.hoof(G.sprint ? 1 : 0.75, wood || stone ? 1 : 0, G.inWater);
  const fx0 = i % 2 ? 0.2 : -0.2, z = front ? -0.5 : 0.8;
  if (G.inWater) fx(3, G.x + fx0, 0.1, z, rnd(0.08, 0.2), 0.45, col('uFoam'), {add: 0, vx: rnd(-1.6, 1.6), vy: rnd(2.5, 6), vz: rnd(1, 5), grav: 16, world: 0.45});
  else if (G.mudT > 0) fx(3, G.x + fx0, 0.1, z, rnd(0.08, 0.18), 0.42, col('uWet'), {add: 0, vx: rnd(-1.5, 1.5), vy: rnd(1.5, 4), vz: rnd(2, 6), grav: 15, world: 0.45});
  else if (!wood) {
    const c = stone || abs(G.x - tr.cx) < tr.hw ? col('uSandB') : col('uGrass');
    // En el título la cámara está cerca: el polvo se apaga antes de llegarle a la cara.
    fx(3, G.x + fx0, 0.1, z + 0.2, rnd(0.07, 0.16), inGame ? 0.42 : 0.22, [c[0] * 1.35, c[1] * 1.35, c[2] * 1.35], {add: 0, vx: rnd(-0.5, 0.5), vy: rnd(0.3, 1.1), vz: rnd(0.5, 2), grow: 0.42, world: 0.5});
  }
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
    // Escribiendo el nombre del récord, las teclas no mueven el juego.
    if (e.target && e.target.id === 'recName') {
      if (e.key === 'Enter') saveRec();
      return;
    }
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
    if (e.code === 'KeyB' && G.state === 'play') honk();
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
  $('btnStart').addEventListener('click', () => startFrom(() => newRun(G.level, startQ(G.level))));
  document.querySelectorAll('#route [data-level]').forEach((b) => b.addEventListener('click', () => pickLevel(b.dataset.level)));
  $('btnContinue').addEventListener('click', () => startFrom(continueRun));
  $('btnRecords').addEventListener('click', () => openRecords(G.level, 'title'));
  $('btnRecBack').addEventListener('click', closeRecords);
  $('btnRecSave').addEventListener('click', saveRec);
  document.querySelectorAll('#recTabs [data-rec]').forEach((b) => b.addEventListener('click', () => {
    Audio.ui();
    showRecTab(b.dataset.rec);
  }));
  $('btnBell').addEventListener('click', honk);
  $('btnRopero').addEventListener('click', openRopero);
  document.querySelectorAll('#soon [data-soon]').forEach((b) => b.addEventListener('click', () => {
    Audio.ui();
    UI.toast(b.dataset.soon + ' viene en la Temporada 2. ¡Pronto!');
  }));
  $('btnRopBack').addEventListener('click', closeRopero);
  $('btnGoogle').addEventListener('click', () => {
    Audio.ui();
    $('ropCuenta').textContent = 'Abriendo Google…';
    google().catch(() => ($('ropCuenta').textContent = 'No se pudo abrir Google. Revisá tu internet.'));
  });
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
    G.spent = (G.spent || 0) + 25;
    G.pkg = min(100, G.pkg + 25);
    Audio.buy();
    renderShop();
  });
  $('btnAgain').addEventListener('click', () => {
    Audio.ui();
    UI.hideScreen('scrResults', () => {});
    G.camHero = false;
    G.state = 'restart';
    newRun(G.level, startQ(G.level));
  });
  // Las propinas viajan a la siguiente parada; las mejoras se quedan con cada vehículo.
  $('btnNext').addEventListener('click', () => {
    Audio.ui();
    UI.hideScreen('scrResults', () => {});
    G.camHero = false;
    G.state = 'restart';
    store.set('wallet', floor(G.q));
    G.camBlend = 1;
    newRun(MT.nextId, floor(G.q));
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
  const syncVoice = () => {
    const s = Voice.on ? 'Voces: sí' : 'Voces: no';
    $('btnVoice').textContent = s;
    $('btnVoiceP').textContent = s;
  };
  const vc = () => {
    Voice.toggle();
    syncVoice();
    Audio.ui();
  };
  $('btnVoice').addEventListener('click', vc);
  $('btnVoiceP').addEventListener('click', vc);
  syncVoice();
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
    buildWake();
    for (const k in VEHICLES) VEHICLES[k].build();
    for (const k in BOSSES) BOSSES[k].build();
    resize();
    camera.fov = VIEW.fov;
    const saved = store.get('level', 'monterrico');
    useLevel(LEVELS[saved] ? saved : 'monterrico');
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
  applyOutfit();
  onPerfil(() => {
    paintCuenta();
    if (!$('scrRopero').hidden) $('ropQ').textContent = 'Q' + alcancia();
  });
  initPerfil((t) => UI.toast(t)).catch(() => {});
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('400 40px "Shrikhand"', 'Tienda La Bendición ¡AGUAS!')]).then(() => {
      drawSignAtlas();
      drawLabel();
    }, () => {});
  }
  goTitle(G.level);
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
    window.__VAG = {cam: camera, cutCam, renderer, scene, G, IN, U, P, VIEW, BOSS, VEHICLES, UI, Audio, Voice, anime, COP, lightAhead, startCop, get LV() { return LV; }, get MT() { return MT; }, get VEH() { return VEH; }, get BOSSK() { return BOSSK; }, frame, update, syncAll, renderFrame, newRun, startAt, useLevel, pickLevel, pauseGame, openRecords, REC, resumeGame, goTitle, fail, finish, showResults, openShop, startBoss, renderShop, leaveShop, PERFIL, NUBE, renderRopero, applyOutfit,
      jump(D, st) {
        G.dist = D;
        G.stage = st;
        G.x = LV.center(D);
        LV.cursor = 0;
        for (const c of LV.calls) if (c.D < D) c.done = true;
      }};
  }
}
// ── Ropero ──
const honk = () => Audio[pitoOf() || VEH.call()]();
const ROP = {slot: 'camisa'};
function openRopero() {
  Audio.ui();
  UI.hideScreen('scrTitle', () => {});
  UI.showScreen('scrRopero');
  renderRopero();
  syncNow();
}
function closeRopero() {
  Audio.ui();
  UI.hideScreen('scrRopero', () => {});
  $('scrTitle').hidden = false;
  UI.titleIn();
  if (!COARSE) $('btnStart').focus({preventScroll: true});
}
const swatch = (it) => {
  const L = it.look;
  if (Array.isArray(L)) return L.map((c) => '<i class="sw" style="background:' + (Array.isArray(c) ? 'rgb(' + c.map((v) => Math.round(Math.pow(v, 1 / 2.2) * 255)).join(',') + ')' : c) + '"></i>').join('');
  if (typeof L === 'string' && L[0] === '#') return '<i class="sw" style="background:' + L + '"></i>';
  return '';
};
function renderRopero() {
  $('ropQ').textContent = 'Q' + alcancia();
  const T = $('ropTabs');
  T.innerHTML = SLOTS.map((s) => '<button class="chip" role="tab" data-slot="' + s.id + '" aria-selected="' + (s.id === ROP.slot) + '">' + s.name + '</button>').join('');
  T.querySelectorAll('[data-slot]').forEach((b) => b.addEventListener('click', () => {
    Audio.ui();
    ROP.slot = b.dataset.slot;
    renderRopero();
  }));
  const L = $('ropList');
  L.innerHTML = '';
  ITEMS.filter((i) => i.slot === ROP.slot).forEach((it) => {
    const on = PERFIL.puesto[it.slot] === it.id, has = unlocked(it);
    const row = document.createElement('div');
    row.className = 'shoprow';
    row.innerHTML = '<div class="min-w-0"><p class="font-display text-[1.15rem] leading-tight">' + swatch(it) + it.name + '</p><p class="note">' + (it.need && !has ? '🔒 ' + NEED_TEXT[it.need] : it.desc) + '</p></div>';
    const b = document.createElement('button');
    b.className = 'btn btn-2 shrink-0';
    b.innerHTML = '<span>' + (on ? 'Puesto' : has ? 'Ponértelo' : it.need ? 'Bloqueado' : 'Q' + it.price) + '</span>';
    b.disabled = on || (!has && (it.need || alcancia() < it.price));
    b.addEventListener('click', () => {
      if (has ? wear(it) : buy(it)) {
        if (has) Audio.ui();
        else Audio.buy();
        if (it.slot === 'pito') setTimeout(honk, 150);
        renderRopero();
      }
    });
    row.appendChild(b);
    L.appendChild(row);
  });
  paintCuenta();
}
function paintCuenta() {
  const c = $('ropCuenta'), g = $('btnGoogle');
  if (!c) return;
  g.hidden = !GOOGLE_OK || NUBE.google;
  if (NUBE.google) c.textContent = 'Guardado con Google' + (NUBE.email ? ' (' + NUBE.email + ')' : '') + '. No se pierde aunque cambiés de teléfono.';
  else if (!GOOGLE_OK) c.textContent = 'Tu ropa y tu alcancía se guardan en este aparato.';
  else if (NUBE.sync === 'error') c.textContent = 'Sin conexión: se guarda en este aparato y se sube después.';
  else if (NUBE.user) c.textContent = 'Guardado en la nube. Para no perderlo nunca, guardalo con Google.';
  else c.textContent = 'Por ahora se guarda en este aparato. Guardalo con Google para no perderlo nunca.';
}
function updatePaletteInit() {
  MT = LEVELS.monterrico.META;
  pal = palOf('monterrico');
  updatePalette(500);
}
// Lo que necesitan los jefes del juego.
const api = {G, IN, BOSS, UI, Audio, LV: null, MT: null, trackAt: (D) => trackAt(D), center: (D) => LV.center(D), shout, impact, damage, burst, fx, dropShadow, queuePhone: (f, t) => queuePhone(f, t), dust, onCross, onGreen, fine};
