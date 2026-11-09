// Estela de la lancha: una cinta sobre el agua que sigue el camino que hizo y se va abriendo en V.
import * as T from 'three';
import {scene, U} from '../core/gfx.js';
import {VS_WAKE, FS_WAKE} from '../core/shaders.js';
import {clamp, min, max} from '../core/util.js';

const N = 46, STEP = 0.55, STERN = 2.3;
const W = {mesh: null, pts: []};
export function buildWake() {
  const g = new T.BufferGeometry();
  const pos = new Float32Array(N * 2 * 3), uv = new Float32Array(N * 2 * 2), k = new Float32Array(N * 2), idx = [];
  for (let i = 0; i < N; i++) {
    uv.set([-1, i / (N - 1), 1, i / (N - 1)], i * 4);
  }
  for (let i = 0; i < N - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  g.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  g.setAttribute('aK', new T.BufferAttribute(k, 1).setUsage(T.DynamicDrawUsage));
  g.setIndex(idx);
  const m = new T.Mesh(g, new T.ShaderMaterial({vertexShader: VS_WAKE, fragmentShader: FS_WAKE, transparent: true, depthWrite: false, side: T.DoubleSide,
    blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor,
    uniforms: {uBend: U.uBend, uCamZ: U.uCamZ, uTime: U.uTime, uFoam: U.uFoam, uFog: U.uFog, uFogA: U.uFogA, uFogB: U.uFogB}}));
  m.frustumCulled = false;
  m.renderOrder = -6;
  m.visible = false;
  scene.add(m);
  W.mesh = m;
}
export const resetWake = () => (W.pts.length = 0);
// x: popa de la lancha. En el aire no deja estela; al reiniciar o saltar de lugar se borra.
export function updateWake(on, x, dist, speed, air, dt) {
  if (!W.mesh) return;
  W.mesh.visible = on;
  if (!on) return;
  const P = W.pts;
  if (P.length && (dist < P[0].D - 0.01 || dist - P[0].D > 40)) P.length = 0;
  if (!P.length || dist - P[0].D >= STEP) {
    P.unshift({x, D: dist, t: 0, a: air ? 0 : clamp((speed - 2) / 12)});
    if (P.length > N) P.pop();
  }
  for (const p of P) p.t += dt;
  const pos = W.mesh.geometry.attributes.position.array, K = W.mesh.geometry.attributes.aK.array;
  for (let i = 0; i < N; i++) {
    const p = P[min(i, P.length - 1)];
    if (!p) {
      K[i * 2] = K[i * 2 + 1] = 0;
      continue;
    }
    // La primera muestra va pegada a la popa, aunque la lancha ya avanzó un poquito.
    const px = i === 0 ? x : p.x, z = STERN + (i === 0 ? 0 : dist - p.D);
    const w = 0.5 + p.t * 1.5;
    pos.set([px - w, 0.035, z, px + w, 0.035, z], i * 6);
    const fade = i >= P.length - 1 ? 0 : (1 - clamp(p.t / 1.9)) * p.a;
    K[i * 2] = K[i * 2 + 1] = max(0, fade);
  }
  W.mesh.geometry.attributes.position.needsUpdate = true;
  W.mesh.geometry.attributes.aK.needsUpdate = true;
}
