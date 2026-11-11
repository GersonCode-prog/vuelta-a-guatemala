// Efectos en quads: humo de borde duro, gotas, estrellas de golpe, ondas y brillos.
import * as T from 'three';
import {scene, U} from '../core/gfx.js';
import {VS_FX, FS_FX} from '../core/shaders.js';
import {rnd, TAU, sqrt, exp} from '../core/util.js';

const CAP = 420;
const list = [];
const ticks = [];
let mesh, A;
export function buildFx() {
  const g = new T.InstancedBufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  A = {aP: new T.InstancedBufferAttribute(new Float32Array(CAP * 4), 4), aD: new T.InstancedBufferAttribute(new Float32Array(CAP * 4), 4), aC: new T.InstancedBufferAttribute(new Float32Array(CAP * 4), 4)};
  for (const k in A) g.setAttribute(k, A[k].setUsage(T.DynamicDrawUsage));
  g.instanceCount = 0;
  mesh = new T.Mesh(g, new T.ShaderMaterial({vertexShader: VS_FX, fragmentShader: FS_FX, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor,
    uniforms: {uBend: U.uBend, uCamZ: U.uCamZ}}));
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  scene.add(mesh);
}
// type: 0 brillo · 1 onda · 2 estrella · 3 bola de humo o espuma · 4 raya de lluvia. add=1: suma luz; add=0: tapa.
export function fx(type, x, y, z, size, life, c, o = {}) {
  if (list.length >= CAP - 40) list.shift();
  list.push({type, x, y, z, size, life, max: life, r: c[0], g: c[1], b: c[2], a: o.a ?? 1, add: o.add ?? 1, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, grav: o.grav || 0, grow: o.grow || 0, world: o.world ?? 1, rot: o.rot ?? rnd(TAU)});
}
export function tick(type, x, y, z, size, c, a = 1) {
  ticks.push(type, x, y, z, size, c[0], c[1], c[2], a);
}
export function burst(x, y, z, n, sp, life, size, c, o = {}) {
  for (let i = 0; i < n; i++) {
    const u = rnd(-1, 1), a = rnd(TAU), s = sqrt(1 - u * u), q = sp * rnd(0.3, 1);
    fx(3, x, y, z, size * rnd(0.6, 1.2), life * rnd(0.6, 1), c, Object.assign({add: 0, vx: s * Math.cos(a) * q, vy: Math.abs(u) * q + (o.up || 0), vz: s * Math.sin(a) * q, grav: o.grav ?? 14}, o));
  }
}
export function clearFx() {
  list.length = 0;
}
export function updateFx(dt, speed) {
  for (let i = list.length - 1; i >= 0; i--) {
    const q = list[i];
    q.life -= dt;
    if (q.life <= 0) {
      list[i] = list[list.length - 1];
      list.pop();
      continue;
    }
    q.vy -= q.grav * dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.z += (q.vz + speed * q.world) * dt;
    if (q.grav && q.y < 0.02) {
      q.y = 0.02;
      q.vy *= -0.2;
    }
    q.size += q.grow * dt;
  }
}
export function syncFx() {
  const P = A.aP.array, D = A.aD.array, C = A.aC.array;
  let m = 0;
  for (const q of list) {
    if (m >= CAP) break;
    const t = 1 - q.life / q.max;
    P[m * 4] = q.x; P[m * 4 + 1] = q.y; P[m * 4 + 2] = q.z; P[m * 4 + 3] = q.size;
    D[m * 4] = q.rot; D[m * 4 + 1] = q.type; D[m * 4 + 2] = t; D[m * 4 + 3] = q.add;
    C[m * 4] = q.r; C[m * 4 + 1] = q.g; C[m * 4 + 2] = q.b; C[m * 4 + 3] = q.a * (q.type === 3 ? 1 : 1 - t * t);
    m++;
  }
  for (let i = 0; i < ticks.length && m < CAP; i += 9) {
    P[m * 4] = ticks[i + 1]; P[m * 4 + 1] = ticks[i + 2]; P[m * 4 + 2] = ticks[i + 3]; P[m * 4 + 3] = ticks[i + 4];
    D[m * 4] = 0; D[m * 4 + 1] = ticks[i]; D[m * 4 + 2] = 0; D[m * 4 + 3] = 1;
    C[m * 4] = ticks[i + 5]; C[m * 4 + 1] = ticks[i + 6]; C[m * 4 + 2] = ticks[i + 7]; C[m * 4 + 3] = ticks[i + 8];
    m++;
  }
  ticks.length = 0;
  mesh.geometry.instanceCount = m;
  mesh.visible = m > 0;
  A.aP.needsUpdate = A.aD.needsUpdate = A.aC.needsUpdate = true;
}
export const clearTicks = () => (ticks.length = 0);
