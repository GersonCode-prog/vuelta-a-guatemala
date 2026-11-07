// Suelo único: un shader por tipo de nivel decide qué se pinta según la pista.
import * as T from 'three';
import {scene, U} from '../core/gfx.js';
import {VS_GROUND, FS_GROUND, FS_GROUND_FARM, FS_GROUND_CITY} from '../core/shaders.js';

let mesh, mats, trackTex;
export function buildGround() {
  const W = 420, near = 40, far = 420, nx = 40, nz = 110;
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3), idx = [];
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const u = i / nx, v = j / nz;
      // más malla cerca de la cámara
      const zz = near - (near + far) * Math.pow(v, 1.5);
      const o = (j * (nx + 1) + i) * 3;
      pos[o] = (u * 2 - 1) * W;
      pos[o + 1] = 0;
      pos[o + 2] = zz;
      if (i < nx && j < nz) {
        const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setIndex(idx);
  const uni = {};
  ['uBend','uCamZ','uTrack','uDist','uLen','uTime','uFogA','uFogB','uNight','uSurge0','uSurge1','uSunDir','uSunCol','uShade','uFog','uInk','uSkyTop','uSkyMid','uSkyLow','uSandA','uSandB','uWet','uWaterA','uWaterB','uFoam','uPlank','uStreet','uGrass','uLampC','uLampP','uBurn'].forEach((k) => (uni[k] = U[k]));
  mats = {
    beach: new T.ShaderMaterial({vertexShader: VS_GROUND, fragmentShader: FS_GROUND, uniforms: uni, side: T.DoubleSide}),
    farm: new T.ShaderMaterial({vertexShader: VS_GROUND, fragmentShader: FS_GROUND_FARM, uniforms: uni, side: T.DoubleSide}),
    city: new T.ShaderMaterial({vertexShader: VS_GROUND, fragmentShader: FS_GROUND_CITY, uniforms: uni, side: T.DoubleSide}),
  };
  mesh = new T.Mesh(g, mats.beach);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  scene.add(mesh);
}
// Empaqueta la pista en una textura: x central, medio ancho, tipo de tramo y orilla base.
export function setGround(kind) {
  mesh.material = mats[kind];
}
export function setTrackTexture(level) {
  if (trackTex) trackTex.dispose();
  const n = level.track.length / 4;
  const data = new Uint16Array(n * 4);
  for (let i = 0; i < n * 4; i++) data[i] = T.DataUtils.toHalfFloat(level.track[i]);
  const tx = new T.DataTexture(data, n, 1, T.RGBAFormat, T.HalfFloatType);
  tx.minFilter = tx.magFilter = T.LinearFilter;
  tx.wrapS = tx.wrapT = T.ClampToEdgeWrapping;
  tx.needsUpdate = true;
  trackTex = tx;
  U.uTrack.value = tx;
  U.uLen.value = level.len;
}
