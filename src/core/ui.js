// Interfaz: todo lo que se mueve en pantalla fuera del 3D lo anima anime.js.
import anime from 'animejs';
import {$, COARSE, clamp, rnd, min, clockText} from './util.js';
import {Audio} from './audio.js';
import {Voice} from './voice.js';

export const UI = {
  shown: {},
  init() {
    this.shown = {};
    $('fxCalls').innerHTML = '';
  },
  hud(G, lv) {
    const s = this.shown;
    const ck = clockText(G.clock);
    if (ck !== s.ck) {
      s.ck = ck;
      $('hudClock').textContent = ck;
    }
    const low = G.clock < 12 ? '1' : '0';
    if (low !== s.low) {
      s.low = low;
      $('hudClockBox').dataset.low = low;
    }
    const pk = Math.ceil(G.pkg);
    if (pk !== s.pk) {
      s.pk = pk;
      $('hudPkgBar').style.transform = 'scaleX(' + clamp(pk / 100) + ')';
      $('hudPkgVal').textContent = pk + '%';
      $('hudPkg').dataset.low = pk < 35 ? '1' : '0';
    }
    const q = Math.floor(G.q);
    if (q !== s.q) {
      s.q = q;
      $('hudQ').textContent = 'Q' + q;
    }
    const ra = G.racha;
    if (ra !== s.ra) {
      if (ra > (s.ra || 0)) anime({targets: '#hudRacha', scale: [1.5, 1], duration: 260, easing: 'easeOutExpo'});
      s.ra = ra;
      $('hudRacha').textContent = ra > 1 ? 'Racha ×' + ra : '';
    }
    const kmh = Math.round(G.speed * 1.7);
    if (kmh !== s.kmh) {
      s.kmh = kmh;
      $('hudKmh').textContent = kmh;
    }
    $('hudForce').style.transform = 'scaleX(' + clamp(G.force) + ')';
    const prog = clamp(G.dist / lv.length);
    $('hudMark').style.left = (prog * 100).toFixed(2) + '%';
    const chip = G.chip;
    if (chip !== s.chip) {
      s.chip = chip;
      const el = $('hudChip');
      el.textContent = chip;
      el.hidden = !chip;
      el.dataset.kind = G.hard ? 'good' : 'bad';
    }
  },
  // Rótulos que cambian con el nivel: marcas de etapa, nombre del jefe y de la barra de fuerza.
  setLevel(MT, LV) {
    $('hudForceLabel').textContent = MT.forceLabel;
    $('bossName').textContent = MT.boss.name;
    const ticks = document.querySelectorAll('#hudTrack i');
    ticks.forEach((t, i) => (t.style.left = ((LV.stageBounds[i + 1] / LV.length) * 100).toFixed(1) + '%'));
    const tc = $('tcPedal');
    if (tc) tc.setAttribute('aria-label', MT.sprintWord);
  },
  call(text, tier, x, y) {
    const L = $('fxCalls');
    const old = L.querySelectorAll('.call');
    if (old.length > 5) old[0].remove();
    // Cada grito ocupa un renglón mientras se lee; el siguiente busca uno libre.
    // Si están los tres ocupados, los gritos chiquitos (¡Uy!, ¡Cerquita!) se omiten.
    const now = performance.now();
    const rows = this.callRows || (this.callRows = [0, 0, 0]);
    let row = rows.findIndex((t) => now >= t);
    if (row < 0) {
      if (tier < 2) return;
      row = rows.indexOf(Math.min(...rows));
    }
    rows[row] = now + (tier > 1 ? 650 : 470);
    y -= row * clamp(innerHeight * 0.07, 34, 58);
    const el = document.createElement('div');
    el.className = 'call call-' + tier;
    el.textContent = text;
    el.style.left = clamp(x, 80, innerWidth - 80) + 'px';
    el.style.top = clamp(y, 100, innerHeight - 110) + 'px';
    L.appendChild(el);
    const r = rnd(-6, 2);
    anime.timeline({targets: el, complete: () => el.remove()})
      .add({translateX: ['-50%', '-50%'], translateY: ['-50%', '-50%'], scale: [tier > 0 ? 2.3 : 1.5, 1], rotate: [r * 2.4, r], opacity: [0, 1], duration: 130, easing: 'easeOutExpo'})
      .add({translateY: ['-50%', '-130%'], opacity: [1, 0], scale: [1, 1.08], duration: 380, delay: tier > 1 ? 360 : 180, easing: 'easeInQuad'});
  },
  floatTime(text, good) {
    const L = $('fxCalls');
    const box = $('hudClockBox').getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'float ' + (good ? 'float-good' : 'float-bad');
    el.textContent = text;
    el.style.left = box.left + box.width / 2 + 'px';
    el.style.top = box.bottom + 4 + 'px';
    L.appendChild(el);
    anime({targets: el, translateX: ['-50%', '-50%'], translateY: [0, 22], opacity: [1, 0], duration: 900, easing: 'easeOutQuad', complete: () => el.remove()});
  },
  card(i, stage) {
    const c = $('card');
    $('cardNum').textContent = String(i + 1);
    $('cardName').textContent = stage.name;
    $('cardFact').textContent = stage.fact;
    c.hidden = false;
    anime.remove(c);
    anime.timeline({easing: 'easeOutExpo'})
      .add({targets: c, translateX: ['-104%', '0%'], duration: 380})
      .add({targets: c, translateX: ['0%', '108%'], duration: 340, delay: 1900, easing: 'easeInExpo', complete: () => (c.hidden = true)});
  },
  tok: 0,
  phone(from, text) {
    const tok = ++this.tok, p = $('phone');
    p.hidden = false;
    $('phoneFrom').textContent = from;
    $('phoneText').textContent = '';
    anime.remove(p);
    anime({targets: p, translateX: [-40, 0], opacity: [0, 1], rotate: [-3, -1], duration: 300, easing: 'easeOutBack'});
    Audio.phone();
    const o = {n: 0}, v = Voice.speak(from, text, {delay: 0.3});
    const show = (t) => { if (tok === this.tok) $('phoneText').textContent = t; };
    if (v) {
      // Con voz, el texto sale al ritmo de las sílabas.
      const mk = v.marks;
      let i = 0;
      anime({targets: o, n: v.dur, duration: v.dur * 1000, easing: 'linear',
        update: () => {
          while (i < mk.length && mk[i][0] <= o.n) i++;
          show(i ? text.slice(0, mk[i - 1][1]) : '');
        },
        complete: () => show(text)});
    } else {
      anime({targets: o, n: text.length, duration: min(1300, text.length * 17), easing: 'linear',
        update: () => show(text.slice(0, o.n | 0)),
        complete: () => show(text)});
    }
  },
  phoneHide() {
    const tok = this.tok, p = $('phone');
    anime({targets: p, opacity: 0, translateX: -24, duration: 240, easing: 'easeInCubic', complete: () => { if (tok === this.tok) p.hidden = true; }});
  },
  showScreen(id) {
    const s = $(id);
    s.hidden = false;
    const kids = s.querySelectorAll('[data-in]');
    anime.remove(kids);
    anime({targets: kids, translateY: [24, 0], opacity: [0, 1], delay: anime.stagger(65, {start: 40}), duration: 560, easing: 'easeOutExpo'});
    const f = s.querySelector('[data-focus]:not([hidden])');
    if (f && !COARSE) f.focus({preventScroll: true});
  },
  hideScreen(id, cb) {
    const s = $(id);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const kids = s.querySelectorAll('[data-in]');
    anime.remove(kids);
    anime({targets: kids, translateY: -14, opacity: 0, duration: 200, delay: anime.stagger(18), easing: 'easeInCubic', complete: () => {
      s.hidden = true;
      anime.set(kids, {translateY: 0, opacity: 1});
      if (cb) cb();
    }});
  },
  showHud() {
    $('hud').hidden = false;
    anime({targets: '#hudTop > *', translateY: [-40, 0], opacity: [0, 1], delay: anime.stagger(70), duration: 620, easing: 'easeOutExpo'});
    anime({targets: '#hudBottom > *', translateY: [40, 0], opacity: [0, 1], delay: anime.stagger(70, {start: 80}), duration: 620, easing: 'easeOutExpo'});
    this.shown = {};
  },
  hideHud() {
    $('hud').hidden = true;
    $('phone').hidden = true;
    $('bossBar').hidden = true;
  },
  boss(show, hunger) {
    const b = $('bossBar');
    if (show && b.hidden) {
      b.hidden = false;
      anime({targets: b, translateY: [-30, 0], opacity: [0, 1], duration: 420, easing: 'easeOutBack'});
    }
    if (!show) b.hidden = true;
    b.querySelectorAll('.tort').forEach((t, i) => {
      const on = i < hunger;
      if (on && t.dataset.on !== '1') anime({targets: t, scale: [1.8, 1], duration: 340, easing: 'easeOutBack'});
      t.dataset.on = on ? '1' : '0';
    });
  },
  cut(text, sub) {
    const L = $('cutLayer');
    $('cutText').textContent = text;
    $('cutSub').textContent = sub;
    L.hidden = false;
    anime.remove(['#cutText', '#cutSub']);
    anime({targets: '#cutText', translateX: ['46vw', '-2vw'], skewX: [-22, -8], opacity: [0, 1], duration: 190, easing: 'easeOutExpo'});
    anime({targets: '#cutSub', translateX: ['-30vw', '0vw'], opacity: [0, 1], duration: 240, delay: 70, easing: 'easeOutExpo'});
  },
  cutOut() {
    anime({targets: '#cutText', translateX: '-70vw', opacity: 0, duration: 150, easing: 'easeInExpo', complete: () => ($('cutLayer').hidden = true)});
    anime({targets: '#cutSub', opacity: 0, duration: 110, easing: 'linear'});
  },
  // Boleta de la PMT: entra de lado, sella y se va.
  ticket(q) {
    const el = $('ticket');
    $('ticketQ').textContent = q > 0 ? '−Q' + q + ' y −4 s' : '−4 s';
    el.hidden = false;
    anime.remove([el, '#ticketStamp']);
    anime.timeline({targets: el, easing: 'easeOutExpo', complete: () => (el.hidden = true)})
      .add({translateX: ['120%', '0%'], rotate: [8, -4], opacity: [0, 1], duration: 300})
      .add({translateX: '130%', opacity: 0, duration: 320, delay: 1900, easing: 'easeInExpo'});
    anime({targets: '#ticketStamp', scale: [2.6, 1], opacity: [0, 1], rotate: [-30, -14], duration: 260, delay: 240, easing: 'easeOutBack'});
  },
  toast(t) {
    const el = $('toast');
    el.textContent = t;
    el.hidden = false;
    anime.remove(el);
    anime.timeline({targets: el, complete: () => (el.hidden = true)})
      .add({opacity: [0, 1], translateY: [8, 0], duration: 170, easing: 'easeOutCubic'})
      .add({opacity: 0, duration: 240, delay: 1700, easing: 'linear'});
  },
  stars(n) {
    document.querySelectorAll('#resStars .star').forEach((s, i) => {
      s.dataset.on = i < n ? '1' : '0';
      if (i < n) anime({targets: s, scale: [0, 1], rotate: [-120, 0], duration: 520, delay: 500 + i * 180, easing: 'easeOutBack'});
    });
  },
  count(el, to, fmt, dur = 900) {
    const o = {v: 0};
    anime({targets: o, v: to, duration: dur, easing: 'easeOutExpo', update: () => (el.textContent = fmt(o.v)), complete: () => (el.textContent = fmt(to))});
  },
  titleIn() {
    const kids = $('scrTitle').querySelectorAll('[data-in]');
    anime({targets: kids, translateY: [20, 0], opacity: [0, 1], delay: anime.stagger(80, {start: 150}), duration: 760, easing: 'easeOutExpo'});
    anime({targets: '#logo .w', translateX: [-60, 0], rotate: [-9, -4], opacity: [0, 1], delay: anime.stagger(150, {start: 80}), duration: 760, easing: 'easeOutBack'});
  },
};
export {anime};
