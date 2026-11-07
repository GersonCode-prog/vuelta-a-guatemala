// Récords para todos: se guardan en Supabase y cualquiera los puede ver.
// La llave publicable está hecha para ir en páginas web: solo deja leer y agregar récords
// (las reglas de la tabla no permiten editar ni borrar).
const URL = 'https://vvazgkziqvzdkosnpoiu.supabase.co/rest/v1/records';
const KEY = 'sb_publishable_QD4FoCopCMMZG96Cf_SWfg_UTYIFU0-';
export const LEVEL_IDS = ['monterrico', 'taxisco', 'capital'];

const headers = (extra = {}) => Object.assign({apikey: KEY}, extra);
async function call(url, opts = {}, ms = 9000) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const tm = ctl ? setTimeout(() => ctl.abort(), ms) : 0;
  try {
    const r = await fetch(url, Object.assign({signal: ctl ? ctl.signal : undefined, mode: 'cors', cache: 'no-store'}, opts));
    if (!r.ok) throw new Error('http ' + r.status);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  } finally {
    clearTimeout(tm);
  }
}
// Los diez mejores de una parada: más estrellas, luego más tiempo sobrante, luego más propinas.
export function fetchTop(level, n = 10) {
  const q = '?select=id,nombre,estrellas,tiempo,propinas,paquete,creado&nivel=eq.' + encodeURIComponent(level) + '&order=estrellas.desc,tiempo.desc,propinas.desc,creado.asc&limit=' + n;
  return call(URL + q, {headers: headers()});
}
export async function saveRecord(rec) {
  const rows = await call(URL + '?select=id', {method: 'POST', headers: headers({'Content-Type': 'application/json', Prefer: 'return=representation'}), body: JSON.stringify(rec)});
  return rows && rows[0] ? rows[0].id : null;
}

// ── Nombres ──
const BAD = ['puta', 'puto', 'mierda', 'verga', 'pija', 'culer', 'cerot', 'pendej', 'maric', 'hijuep', 'chinga', 'culo', 'mamon', 'zorra', 'joder', 'nazi', 'sexo', 'vagina', 'idiota', 'estupid', 'shit', 'fuck', 'bitch', 'porn', 'nigg'];
const plain = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[@4]/g, 'a').replace(/3/g, 'e').replace(/[1!|]/g, 'i').replace(/0/g, 'o').replace(/[5$]/g, 's').replace(/7/g, 't').replace(/[^a-z]/g, '');
// Devuelve el nombre limpio o un aviso de por qué no sirve.
export function checkName(raw) {
  const name = String(raw || '').replace(/[^\p{L}\p{N} ._-]/gu, '').replace(/\s+/g, ' ').trim();
  if (name.length < 3) return {error: 'Tu nombre necesita al menos 3 letras.'};
  if (name.length > 12) return {error: 'Máximo 12 letras.'};
  const p = plain(name);
  if (BAD.some((w) => p.includes(w))) return {error: 'Escogé otro nombre, porfa.'};
  return {name};
}
// Lo que el juego permite: si no cuadra, no se manda.
export function plausible(rec) {
  return LEVEL_IDS.includes(rec.nivel) && rec.estrellas >= 1 && rec.estrellas <= 5 && rec.tiempo >= 0 && rec.tiempo <= 200 && rec.propinas >= 0 && rec.propinas <= 3000 && rec.paquete >= 0 && rec.paquete <= 100;
}
