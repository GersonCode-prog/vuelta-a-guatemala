// Perfil en la nube: un usuario anónimo de Supabase que guarda la alcancía, la ropa y las estrellas
// en la tabla "perfiles". Si el jugador quiere, lo une a su cuenta de Google para no perderlo nunca.
// Todo funciona igual sin internet: el ropero vive en el aparato y se sube cuando se puede.
import {AuthClient} from '@supabase/auth-js';
import {BASE, KEY} from './records.js';
import {P, merge, toRow, fromRow, setOnChange} from './ropero.js';

// Google solo funciona en la página publicada (ahí está registrada la vuelta del inicio de sesión).
export const GOOGLE_OK = typeof location !== 'undefined' && (/(^|\.)github\.io$/.test(location.hostname) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname));
export const S = {sync: 'local', email: null, google: false, user: false};
let sb = null, user = null, pulled = false, busy = false, want = false, timer = 0, fails = 0;
const subs = [];
export const onPerfil = (f) => subs.push(f);
const emit = () => subs.forEach((f) => {
  try { f(S); } catch (e) {}
});
const home = () => location.origin + location.pathname;
function setUser(u) {
  user = u || null;
  S.user = !!user;
  S.email = user && !user.is_anonymous ? user.email || null : null;
  S.google = !!user && !user.is_anonymous;
  emit();
}
function schedule(ms) {
  clearTimeout(timer);
  timer = setTimeout(run, ms);
}
// Hay algo que valga la pena guardar en la nube
const worth = () => want || P.ganado > 0 || P.tiene.length > 0;
// La tabla por la API REST de Supabase, con el token del jugador: cada quien solo ve lo suyo.
async function rest(path, tok, method = 'GET', body) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const tm = ctl ? setTimeout(() => ctl.abort(), 9000) : 0;
  try {
    const h = {apikey: KEY, Authorization: 'Bearer ' + tok};
    if (body) Object.assign(h, {'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal'});
    const r = await fetch(BASE + '/rest/v1/' + path, {method, headers: h, body: body ? JSON.stringify(body) : undefined, signal: ctl ? ctl.signal : undefined, cache: 'no-store'});
    if (!r.ok) throw new Error('http ' + r.status);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  } finally {
    clearTimeout(tm);
  }
}
async function run() {
  if (!sb) return;
  if (busy) return schedule(800);
  if (!user && !worth()) return;
  busy = true;
  S.sync = 'saving';
  emit();
  try {
    if (!user) {
      const {data, error} = await sb.auth.signInAnonymously();
      if (error) throw error;
      setUser(data.user);
    }
    const {data: ses} = await sb.auth.getSession();
    const tok = ses.session && ses.session.access_token;
    if (!tok) throw new Error('sin sesión');
    if (!pulled) {
      const rows = await rest('perfiles?select=alcancia,ropa,estrellas&id=eq.' + user.id, tok);
      merge(fromRow(rows && rows[0]));
      pulled = true;
    }
    await rest('perfiles?on_conflict=id', tok, 'POST', Object.assign({id: user.id, actualizado: new Date().toISOString()}, toRow()));
    S.sync = 'ok';
    fails = 0;
  } catch (e) {
    S.sync = 'error';
    fails++;
    // Sin internet o con la base ocupada: se vuelve a intentar más tarde.
    if (fails < 6) schedule(15000 * fails);
  } finally {
    busy = false;
    emit();
  }
}
export async function initPerfil(toast) {
  // Si Google dice que esa cuenta ya tiene otro perfil, se entra a ese y se juntan los dos.
  let err = null;
  try {
    const q = new URLSearchParams(location.hash.slice(1) + '&' + location.search.slice(1));
    err = q.get('error_code') || (q.get('error') ? 'error' : null);
    if (err) history.replaceState(null, '', location.pathname);
  } catch (e) {}
  try {
    sb = {auth: new AuthClient({url: BASE + '/auth/v1', headers: {apikey: KEY}, storageKey: 'vag.auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit'})};
  } catch (e) {
    sb = null;
    return;
  }
  setOnChange(() => schedule(1500));
  sb.auth.onAuthStateChange((ev, session) => {
    const u = session ? session.user : null;
    if ((u && u.id) !== (user && user.id)) pulled = false;
    setUser(u);
    if (u) schedule(60);
  });
  try {
    const {data} = await sb.auth.getSession();
    setUser(data.session ? data.session.user : null);
  } catch (e) {}
  if (err === 'identity_already_exists' && GOOGLE_OK) {
    if (toast) toast('Esa cuenta de Google ya tiene un perfil. Entrando…');
    setTimeout(() => sb.auth.signInWithOAuth({provider: 'google', options: {redirectTo: home()}}), 900);
    return;
  }
  if (err && toast) toast('No se pudo entrar con Google. Probá otra vez.');
  schedule(user ? 60 : 2500);
}
// "Guardar con Google": une el perfil de este aparato con la cuenta de Google.
export async function google() {
  if (!sb || !GOOGLE_OK || S.google) return false;
  want = true;
  if (!user) {
    await run();
  }
  if (!user) {
    await sb.auth.signInWithOAuth({provider: 'google', options: {redirectTo: home()}});
    return true;
  }
  const {error} = await sb.auth.linkIdentity({provider: 'google', options: {redirectTo: home()}});
  if (error) {
    await sb.auth.signInWithOAuth({provider: 'google', options: {redirectTo: home()}});
  }
  return true;
}
// Fuerza una subida (al abrir el ropero, por ejemplo).
export const syncNow = () => schedule(30);
