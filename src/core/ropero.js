// Ropero: la alcancía de propinas y la ropa del repartidor. Se guarda en el aparato y,
// cuando hay internet, en el perfil de Supabase (perfil.js). Nada de esto da ventaja en el juego.
import {store} from './util.js';
import {hex} from './geo.js';
import {C, repaint, FAJA, setLabel} from '../vehicles/rider.js';
import {MOTO_COL} from '../vehicles/moto.js';

export const SLOTS = [
  {id: 'camisa', name: 'Camisa'},
  {id: 'gorra', name: 'Gorra y casco'},
  {id: 'faja', name: 'Faja'},
  {id: 'paquete', name: 'Paquete'},
  {id: 'pito', name: 'Pito'},
  {id: 'moto', name: 'Moto'},
];
const v3 = (h) => (Array.isArray(h) ? h : hex(h));
// Cada cosa: ranura, precio o requisito, y lo que cambia.
export const ITEMS = [
  {id: 'camisa-clasica', slot: 'camisa', name: 'La de siempre', desc: 'Amarilla con franja roja.', price: 0, look: ['#ffc91f', '#e3262f']},
  {id: 'camisa-bandera', slot: 'camisa', name: 'Azul y blanco', desc: 'Celeste con franja blanca.', price: 180, look: ['#4aa3df', '#fffaf0']},
  {id: 'camisa-roja', slot: 'camisa', name: 'Roja', desc: 'Roja con franja blanca.', price: 150, look: ['#e3262f', '#fffaf0']},
  {id: 'camisa-negra', slot: 'camisa', name: 'Negra', desc: 'Negra con franja dorada.', price: 200, look: ['#2a2630', '#ffc91f']},
  {id: 'camisa-verde', slot: 'camisa', name: 'Verde', desc: 'Verde con franja crema.', price: 150, look: ['#2bae56', '#fff3d6']},
  {id: 'camisa-campeon', slot: 'camisa', name: 'De campeón', desc: 'Dorada. Para el que saca 5 estrellas en las 6 paradas.', need: 'todas5', look: ['#f2c230', '#17100e']},
  {id: 'gorra-roja', slot: 'gorra', name: 'Roja', desc: 'Gorra roja y casco blanco.', price: 0, look: ['#e4262f', '#fbfaf6']},
  {id: 'gorra-azul', slot: 'gorra', name: 'Azul', desc: 'Gorra y casco azules.', price: 120, look: ['#1b62c9', '#1b62c9']},
  {id: 'gorra-negra', slot: 'gorra', name: 'Negra', desc: 'Gorra y casco negros.', price: 150, look: ['#2a2630', '#2a2630']},
  {id: 'gorra-turquesa', slot: 'gorra', name: 'Turquesa', desc: 'Gorra y casco turquesa.', price: 120, look: ['#12b5b0', '#12b5b0']},
  {id: 'gorra-oro', slot: 'gorra', name: 'De oro', desc: 'Para el que llegó hasta Xela.', need: 'xela', look: ['#ffc91f', '#ffc91f']},
  {id: 'faja-tipica', slot: 'faja', name: 'Típica', desc: 'Roja, amarilla y turquesa.', price: 0, look: [[0.82, 0.04, 0.07], [1, 0.72, 0.05], [0.02, 0.55, 0.58]]},
  {id: 'faja-azul', slot: 'faja', name: 'Azul y blanco', desc: 'Como la bandera.', price: 100, look: ['#1b62c9', '#fff6e6', '#4aa3df']},
  {id: 'faja-morada', slot: 'faja', name: 'Morada', desc: 'Morada, dorada y rosada.', price: 120, look: ['#5b2a86', '#ffc91f', '#ff5d7d']},
  {id: 'faja-quetzal', slot: 'faja', name: 'De quetzal', desc: 'Para el que saca 5 estrellas en una parada.', need: 'una5', look: ['#1f9a4a', '#e3262f', '#12b5b0']},
  {id: 'paquete-fragil', slot: 'paquete', name: 'FRÁGIL', desc: 'La calcomanía de siempre.', price: 0, look: 'FRÁGIL'},
  {id: 'paquete-noabrir', slot: 'paquete', name: 'NO SE ABRE', desc: 'Por si acaso.', price: 80, look: 'NO SE ABRE'},
  {id: 'paquete-carino', slot: 'paquete', name: '¡CON CARIÑO!', desc: 'Para La Licenciada.', price: 80, look: '¡CON CARIÑO!'},
  {id: 'paquete-urgente', slot: 'paquete', name: 'URGENTE', desc: 'Como dice Don Beto.', price: 80, look: 'URGENTE'},
  {id: 'pito-normal', slot: 'pito', name: 'El de cada vehículo', desc: 'Timbre, relincho, pito o bocina.', price: 0, look: null},
  {id: 'pito-marimba', slot: 'pito', name: 'Marimba', desc: 'Tres notas de marimba.', price: 200, look: 'marimbita'},
  {id: 'pito-camioneta', slot: 'pito', name: 'De camioneta', desc: 'El pito musical de La Chusita.', price: 150, look: 'pito'},
  {id: 'moto-roja', slot: 'moto', name: 'Roja', desc: 'La Chilera, como la dejó el Brayan.', price: 0, look: '#d8262c'},
  {id: 'moto-azul', slot: 'moto', name: 'Azul', desc: 'Pintura azul.', price: 250, look: '#1b62c9'},
  {id: 'moto-negra', slot: 'moto', name: 'Negra', desc: 'Pintura negra.', price: 250, look: '#2a2630'},
  {id: 'moto-verde', slot: 'moto', name: 'Verde', desc: 'Pintura verde.', price: 250, look: '#2bae56'},
];
const DEF = {camisa: 'camisa-clasica', gorra: 'gorra-roja', faja: 'faja-tipica', paquete: 'paquete-fragil', pito: 'pito-normal', moto: 'moto-roja'};
export const NEED_TEXT = {todas5: '5 estrellas en las 6 paradas', una5: '5 estrellas en una parada', xela: 'Terminá Xela'};
const LEVELS6 = ['monterrico', 'taxisco', 'capital', 'antigua', 'atitlan', 'xela'];
const bestKey = (id) => (id === 'monterrico' ? 'best' : 'best.' + id);

// ── El perfil del aparato ──
function blank() {
  return {ganado: 0, gastado: 0, tiene: [], puesto: Object.assign({}, DEF), estrellas: {}, t: 0};
}
export const P = Object.assign(blank(), store.get('perfil', {}));
P.puesto = Object.assign({}, DEF, P.puesto);
P.tiene = Array.isArray(P.tiene) ? P.tiene : [];
P.estrellas = P.estrellas || {};
let onChange = null;
export const setOnChange = (f) => (onChange = f);
function save(sync = true) {
  P.t = Date.now();
  store.set('perfil', P);
  if (sync && onChange) onChange();
}
export const alcancia = () => Math.max(0, Math.floor(P.ganado - P.gastado));
// Mejores estrellas: lo del aparato y lo del perfil, lo que sea más.
export function stars(id) {
  const b = store.get(bestKey(id), null);
  return Math.max(b ? b.stars : 0, P.estrellas[id] || 0);
}
export function unlocked(it) {
  if (!it.need) return it.price === 0 || P.tiene.includes(it.id);
  if (it.need === 'xela') return stars('xela') >= 1;
  if (it.need === 'una5') return LEVELS6.some((l) => stars(l) >= 5);
  if (it.need === 'todas5') return LEVELS6.every((l) => stars(l) >= 5);
  return false;
}
export function buy(it) {
  if (unlocked(it) || it.need || alcancia() < it.price) return false;
  P.gastado += it.price;
  P.tiene.push(it.id);
  P.puesto[it.slot] = it.id;
  save();
  apply();
  return true;
}
export function wear(it) {
  if (!unlocked(it)) return false;
  P.puesto[it.slot] = it.id;
  save();
  apply();
  return true;
}
// Al terminar una parada: las propinas ganadas caen en la alcancía y se guardan las estrellas.
// Devuelve lo que se acaba de desbloquear con estrellas, para avisarlo.
export const specialsNow = () => ITEMS.filter((i) => i.need && unlocked(i)).map((i) => i.id);
export function earn(level, q, starsNow, before = specialsNow()) {
  P.ganado += Math.max(0, Math.min(3000, Math.floor(q)));
  P.estrellas[level] = Math.max(P.estrellas[level] || 0, starsNow);
  save();
  return ITEMS.filter((i) => i.need && unlocked(i) && !before.includes(i.id));
}
// Junta dos perfiles (el del aparato y el de la base de datos) sin perder nada ni duplicar propinas.
export function merge(r) {
  if (!r) return false;
  const old = JSON.stringify([P.ganado, P.gastado, P.tiene, P.estrellas]);
  P.ganado = Math.max(P.ganado, r.ganado || 0);
  P.gastado = Math.max(P.gastado, r.gastado || 0);
  P.tiene = [...new Set([...P.tiene, ...(r.tiene || [])])].filter((id) => ITEMS.some((i) => i.id === id));
  for (const k in r.estrellas || {}) P.estrellas[k] = Math.max(P.estrellas[k] || 0, r.estrellas[k]);
  // La ropa puesta: la del perfil si este aparato no ha escogido nada todavía.
  if (!P.t && r.puesto) Object.assign(P.puesto, r.puesto);
  save(false);
  apply();
  return old !== JSON.stringify([P.ganado, P.gastado, P.tiene, P.estrellas]);
}
// Lo que se guarda en la base de datos
export const toRow = () => ({alcancia: alcancia(), ropa: {tiene: P.tiene, puesto: P.puesto, ganado: Math.floor(P.ganado), gastado: Math.floor(P.gastado)}, estrellas: P.estrellas});
export const fromRow = (row) => (row ? {ganado: row.ropa?.ganado || 0, gastado: row.ropa?.gastado || 0, tiene: row.ropa?.tiene || [], puesto: row.ropa?.puesto, estrellas: row.estrellas || {}} : null);

// ── Ponerse la ropa ──
const item = (slot) => ITEMS.find((i) => i.id === P.puesto[slot] && i.slot === slot && unlocked(i)) || ITEMS.find((i) => i.id === DEF[slot]);
export const pitoOf = () => item('pito').look;
export function apply() {
  const cam = item('camisa').look, gor = item('gorra').look, fj = item('faja').look;
  repaint('rider', [[C.shirt, v3(cam[0])], [C.stripe, v3(cam[1])], [C.cap, v3(gor[0])]]);
  repaint('casco', [[hex('#fbfaf6'), v3(gor[1])]]);
  repaint('moto', [[MOTO_COL.red, v3(item('moto').look)]]);
  [FAJA.uA, FAJA.uB, FAJA.uC].forEach((u, i) => {
    const c = v3(fj[i]);
    u.value.set(c[0], c[1], c[2]);
  });
  setLabel(item('paquete').look);
}
