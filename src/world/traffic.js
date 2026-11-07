// Semáforos, tráfico que cruza y la PMT: lo que hace que la capital se maneje distinto.
// Cada semáforo tiene un plan: 'go' siempre verde, 'turn' se pone amarillo cuando te acercás
// y 'red' ya está en rojo. En rojo, si frenás antes de la línea, cambia a verde en un momento.
import {abs, min, max, clamp, damp, rnd} from '../core/util.js';

const COL = {g: [0.3, 1, 0.5], y: [1, 0.74, 0.1], r: [1, 0.14, 0.1]};
const Y_OF = {r: 6.97, y: 6.45, g: 5.93};
export const COP = {on: false, leaving: false, z: 30, x: 0, t: 0, heat: 0, fines: 0};
const setPhase = (L, ph) => {
  L.phase = ph;
  L.t = 0;
};
export function resetTraffic(LV, D = 0) {
  COP.on = false;
  COP.leaving = false;
  COP.t = 0;
  COP.heat = 0;
  COP.fines = 0;
  if (!LV.lights) return;
  for (const L of LV.lights) {
    L.phase = 'g';
    L.t = 0;
    L.used = false;
    L.crossed = false;
    L.stopT = 0;
    L.waited = false;
    // Los que quedaron atrás del punto de arranque ya no cuentan.
    if (L.D < D + 3) L.crossed = L.used = true;
    paint(L);
  }
  for (const c of LV.copItems || []) c.gone = true;
}
function paint(L) {
  const c = COL[L.phase], y = Y_OF[L.phase];
  L.bulbs[0].y = y;
  L.bulbs[0].tint = c;
  L.bulbs[1].y = 3.3 + (y - 6.45) * 0.62;
  L.bulbs[1].tint = c;
}
// El siguiente semáforo que no ha pasado el jugador.
export function lightAhead(LV, D, range = 120) {
  if (!LV.lights) return null;
  for (const L of LV.lights) if (L.D - D > -0.5 && L.D - D < range) return L;
  return null;
}
function updateLight(api, L, dt0) {
  const {G} = api, d = L.D - G.dist;
  L.t += dt0;
  if (L.plan === 'turn') {
    if (L.phase === 'g' && !L.used && d > 0 && d < G.speed * 1.9 + 8) {
      setPhase(L, 'y');
      L.used = true;
    } else if (L.phase === 'y' && L.t > 1.05) setPhase(L, 'r');
  } else if (L.plan === 'red' && !L.used && d < 240) {
    setPhase(L, 'r');
    L.used = true;
  }
  // Si frenás a tiempo, el rojo no dura casi nada.
  if (L.phase === 'r' && d > -0.6 && d < 240 && G.speed < 8) {
    L.stopT += dt0;
    if (L.stopT > 0.75) {
      setPhase(L, 'g');
      L.waited = true;
      api.onGreen(L);
    }
  }
  if (d < -30 && L.phase !== 'g' && L.t > 2.5) setPhase(L, 'g');
  if (!L.crossed && G.dist >= L.D - 0.3) {
    L.crossed = true;
    api.onCross(L);
  }
  paint(L);
}
// Los carros de la calle que atraviesa: pasan cuando vos tenés rojo y esperan cuando tenés verde.
function updateCross(api, L, dt) {
  const {G} = api, d = L.D - G.dist;
  if (d > 280 || d < -40) return;
  const cx = api.center(L.D), hw = api.trackAt(L.D).hw, go = L.phase === 'r';
  for (const c of L.cross) {
    c.on = true;
    if (c.knock !== undefined) continue;
    const rel = (c.x - cx) * c.dir, stopRel = -(hw + 6.5);
    let v = c.v;
    if (!go && rel < stopRel + 0.1) v = min(v, max(0, (stopRel - rel) * 3));
    c.x += c.dir * v * dt;
    c.r = c.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    if (rel > 48) {
      c.x = cx - c.dir * rnd(40, 52);
      c.passed = false;
    }
  }
}
// El tráfico de tu lado también para en rojo.
function updateQueue(api, dt) {
  const {LV} = api;
  for (const m of LV.movers) {
    if (!m.city || !m.on || m.gone) continue;
    let target = m.vD0;
    const L = lightAhead(LV, m.D + 1, 60);
    if (L && L.phase !== 'g') {
      const gap = L.D - 3 - (m.l || 2) - m.D;
      target = gap > 0 ? min(m.vD0, gap * 1.1) : m.D > L.D - 1 ? m.vD0 : 0;
    }
    m.vD = damp(m.vD, target, 4, dt);
  }
}
// La patrulla: se acerca por detrás; si te alcanza, multa. Acelerando la podés dejar atrás.
export function startCop(api) {
  if (COP.on && !COP.leaving) {
    COP.heat++;
    return;
  }
  const {G} = api;
  COP.on = true;
  COP.leaving = false;
  COP.z = 22;
  COP.t = 0;
  COP.heat = 0;
  COP.x = G.x + 2.6;
  api.Audio.siren(true);
}
function copLeave(api) {
  COP.leaving = true;
  COP.t = 0;
  api.Audio.siren(false);
}
function updateCop(api, dt, dt0, time) {
  const {G, LV, MT} = api;
  const items = LV.copItems;
  if (!COP.on) {
    for (const c of items) c.gone = true;
    return;
  }
  COP.t += dt0;
  if (COP.leaving) {
    COP.z += 14 * dt;
    if (COP.z > 30) COP.on = false;
  } else {
    const st = MT.stages[G.stage].speed;
    const vc = st + 3.2 + COP.heat * 1.5;
    COP.z -= (vc - G.speed) * dt;
    COP.z = min(COP.z, 34);
    if (COP.z < 2.3) {
      api.fine();
      copLeave(api);
    } else if (COP.t > 8 && COP.z > 6) {
      api.shout('¡Perdiste a la PMT!', 2);
      G.racha = min(9, G.racha + 1);
      G.rachaT = 6;
      copLeave(api);
    } else G.chip = 'PMT a ' + Math.max(1, Math.round(COP.z - 2)) + ' m';
  }
  // Se arrima por el lado donde hay calle; si no cabe a la derecha, por la izquierda.
  const tr = api.trackAt(G.dist), side = G.x + 2.6 < tr.cx + tr.hw - 0.4 ? 1 : -1;
  COP.x = damp(COP.x, G.x + side * (COP.leaving ? 3.4 : 2.6), 3, dt0);
  const [moto, la, lb] = items, D = G.dist - COP.z;
  // Solo se dibuja cuando ya está delante de la cámara, para que no la atraviese.
  const vis = COP.z < 10;
  moto.gone = la.gone = lb.gone = !vis;
  moto.on = la.on = lb.on = true;
  moto.x = COP.x;
  moto.D = D;
  const blink = Math.floor(time * 7) % 2;
  la.x = COP.x - 0.13;
  lb.x = COP.x + 0.13;
  la.D = lb.D = D - 0.6;
  la.tint = blink ? [1, 0.12, 0.1] : [0.15, 0.1, 0.2];
  lb.tint = blink ? [0.15, 0.1, 0.2] : [0.2, 0.4, 1];
}
export function updateTraffic(api, dt, dt0, time) {
  const {LV} = api;
  if (!LV.lights) return;
  for (const L of LV.lights) {
    updateLight(api, L, dt0);
    updateCross(api, L, dt);
  }
  updateQueue(api, dt);
  updateCop(api, dt, dt0, time);
}
export function copOff(api) {
  if (COP.on && !COP.leaving) api.Audio.siren(false);
  COP.on = false;
  COP.leaving = false;
  for (const c of api.LV.copItems || []) c.gone = true;
}
