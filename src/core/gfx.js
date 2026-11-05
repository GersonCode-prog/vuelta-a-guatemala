// Render: pases, cielo, uniformes compartidos y calidad adaptativa.
import * as T from 'three';
import {TEST, MOBILE, $, min, max, floor, tan, PI, clamp, lerp} from './util.js';
import * as S from './shaders.js';

T.ColorManagement.enabled = true;
export const CAM_Z = 6.4;
export const VIEW = {cw: 1, ch: 1, pr: 1, q: 1, qMax: 1, aspect: 1.77, fov: 60, msaa: 4, hdr: true};
export let renderer, camera, scene, cutCam;
let fsCam, mainRT, cutRT, bloomRT = [], downPass, upPass, compPass, skyMesh;

const col = () => ({value: new T.Color()});
export const U = {
  uTime: {value: 0}, uBend: {value: new T.Vector2()}, uCamZ: {value: CAM_Z}, uRes: {value: new T.Vector2(1, 1)},
  uDot: {value: 4.4}, uOutline: {value: 2.2}, uFlash: {value: 0}, uFlat: {value: 0.55},
  uSunDir: {value: new T.Vector3(-0.4, 0.5, -0.6).normalize()}, uSunVis: {value: new T.Vector3(-0.3, 0.12, -0.9).normalize()},
  uMoon: {value: new T.Vector3(0.42, 0.55, -0.72).normalize()},
  uSunCol: col(), uShade: col(), uRim: col(), uFog: col(), uInk: col(), uSkyTop: col(), uSkyMid: col(), uSkyLow: col(),
  uSunDisc: col(), uCloudL: col(), uCloudS: col(), uHill: col(), uHill2: col(),
  uSandA: col(), uSandB: col(), uWet: col(), uWaterA: col(), uWaterB: col(), uFoam: col(), uPlank: col(), uStreet: col(), uGrass: col(),
  uFogA: {value: 90}, uFogB: {value: 300}, uNight: {value: 0}, uYaw: {value: 0},
  uLampC: {value: new T.Color(0, 0, 0)}, uLampP: {value: new T.Vector2()},
  uShadowC: {value: new T.Color(0.04, 0.02, 0.1)}, uShadowA: {value: 0.5},
  uDist: {value: 0}, uLen: {value: 1}, uTrack: {value: null},
  uSurge0: {value: new T.Vector4(0, 1, 0, 0)}, uSurge1: {value: new T.Vector4(0, 1, 0, 0)},
};
export const SKY = {
  uCamF: {value: new T.Vector3(0, 0, -1)}, uCamR: {value: new T.Vector3(1, 0, 0)}, uCamU: {value: new T.Vector3(0, 1, 0)},
  uTanX: {value: 1}, uTanY: {value: 1}, uClouds: {value: null},
};
export const P = {
  tScene: {value: null}, tBloom: {value: null}, tCut: {value: null}, uTime: U.uTime, uAspect: {value: 1.77},
  uBloomAmt: {value: 0.62}, uChroma: {value: 0.0007}, uLines: {value: 0}, uImpact: {value: 0}, uImpactInv: {value: 0},
  uFadeK: {value: 0}, uFadeW: {value: 0}, uCut: {value: 0}, uCutW: {value: 0}, uGrain: {value: 0.024}, uVig: {value: 0.36}, uWet: {value: 0},
  uVP: {value: new T.Vector2(0.5, 0.56)}, uBandA: {value: new T.Color('#17100e')}, uBandB: {value: new T.Color('#e3262f')},
};
const fsGeo = new T.BufferGeometry();
fsGeo.setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
function makePass(fs, uniforms, opts = {}) {
  const mat = new T.ShaderMaterial(Object.assign({vertexShader: S.VS_FS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false}, opts));
  const mesh = new T.Mesh(fsGeo, mat);
  mesh.frustumCulled = false;
  const sc = new T.Scene();
  sc.add(mesh);
  return {scene: sc, mat, uni: uniforms};
}
const runPass = (p, target) => {
  renderer.setRenderTarget(target);
  renderer.render(p.scene, fsCam);
};

// Uniformes que comparte todo material cel.
export const celUni = () => ({
  uBend: U.uBend, uCamZ: U.uCamZ, uFlash: U.uFlash, uFlat: U.uFlat, uSunDir: U.uSunDir, uSunCol: U.uSunCol, uShade: U.uShade, uRim: U.uRim,
  uFog: U.uFog, uInk: U.uInk, uFogA: U.uFogA, uFogB: U.uFogB, uDot: U.uDot, uLampC: U.uLampC, uLampP: U.uLampP, uRes: U.uRes, uOutline: U.uOutline,
});

export function initGfx() {
  renderer = new T.WebGLRenderer({canvas: $('gl'), antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance'});
  if (!renderer.capabilities.isWebGL2) throw new Error('webgl2');
  renderer.autoClear = false;
  renderer.outputColorSpace = T.LinearSRGBColorSpace;
  renderer.toneMapping = T.NoToneMapping;
  VIEW.hdr = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
  if (MOBILE) {
    VIEW.qMax = 0.85;
    VIEW.msaa = 2;
  }
  if (TEST.msaa !== undefined) VIEW.msaa = TEST.msaa;
  VIEW.q = VIEW.qMax;
  fsCam = new T.Camera();
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(60, 1.77, 0.25, 1200);
  cutCam = new T.PerspectiveCamera(30, 1.77, 0.1, 200);
  cutCam.layers.set(1);
  const opt = (o = {}) => Object.assign({type: VIEW.hdr ? T.HalfFloatType : T.UnsignedByteType, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false, stencilBuffer: false}, o);
  mainRT = new T.WebGLRenderTarget(4, 4, opt({depthBuffer: true, samples: VIEW.msaa}));
  cutRT = new T.WebGLRenderTarget(4, 4, opt({depthBuffer: true, samples: VIEW.msaa ? 2 : 0}));
  for (let i = 0; i < 5; i++) bloomRT.push(new T.WebGLRenderTarget(4, 4, opt()));
  downPass = makePass(S.FS_DOWN, {tSrc: {value: null}, uTexel: {value: new T.Vector2()}, uThresh: {value: 0}});
  upPass = makePass(S.FS_UP, {tSrc: {value: null}, uTexel: {value: new T.Vector2()}}, {transparent: true, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor});
  compPass = makePass(S.FS_COMP, P);
  P.tScene.value = mainRT.texture;
  P.tBloom.value = bloomRT[0].texture;
  P.tCut.value = cutRT.texture;
  // Las nubes se pintan una vez.
  const cloudRT = new T.WebGLRenderTarget(MOBILE ? 1024 : 2048, MOBILE ? 256 : 512, {type: T.UnsignedByteType, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false, wrapS: T.RepeatWrapping});
  runPass(makePass(S.FS_CLOUDBAKE, {}), cloudRT);
  SKY.uClouds.value = cloudRT.texture;
  const skyUni = Object.assign({}, SKY, {uTime: U.uTime, uSkyTop: U.uSkyTop, uSkyMid: U.uSkyMid, uSkyLow: U.uSkyLow, uSunVis: U.uSunVis, uSunDisc: U.uSunDisc,
    uCloudL: U.uCloudL, uCloudS: U.uCloudS, uHill: U.uHill, uHill2: U.uHill2, uMoon: U.uMoon, uNight: U.uNight, uYaw: U.uYaw});
  skyMesh = new T.Mesh(fsGeo, new T.ShaderMaterial({vertexShader: S.VS_SKY, fragmentShader: S.FS_SKY, uniforms: skyUni, depthTest: false, depthWrite: false}));
  skyMesh.frustumCulled = false;
  skyMesh.renderOrder = -30;
  scene.add(skyMesh);
}
export function resize() {
  const cw = max(1, innerWidth), ch = max(1, innerHeight);
  const dpr = min(window.devicePixelRatio || 1, TEST.dpr || 2);
  VIEW.cw = cw;
  VIEW.ch = ch;
  VIEW.pr = min(dpr, max(1, 2048 / cw), max(1, 1280 / ch));
  renderer.setPixelRatio(1);
  renderer.setSize(floor(cw * VIEW.pr), floor(ch * VIEW.pr), false);
  VIEW.aspect = cw / ch;
  applyQuality();
  VIEW.fov = VIEW.aspect < 1 ? lerp(84, 62, clamp((VIEW.aspect - 0.45) / 0.55)) : 60;
  camera.aspect = VIEW.aspect;
  cutCam.aspect = VIEW.aspect;
  cutCam.updateProjectionMatrix();
  P.uAspect.value = VIEW.aspect;
}
function applyQuality() {
  const pw = floor(VIEW.cw * VIEW.pr * VIEW.q), ph = floor(VIEW.ch * VIEW.pr * VIEW.q);
  mainRT.setSize(pw, ph);
  cutRT.setSize(max(2, floor(pw * 0.8)), max(2, floor(ph * 0.8)));
  let w = pw, h = ph;
  for (const rt of bloomRT) {
    w = max(2, w >> 1);
    h = max(2, h >> 1);
    rt.setSize(w, h);
  }
  U.uRes.value.set(pw, ph);
  U.uOutline.value = max(1.3, ph / 400);
  U.uDot.value = max(3, ph / 240);
}
function updateSkyCam() {
  camera.updateMatrixWorld();
  const e = camera.matrixWorld.elements;
  SKY.uCamR.value.set(e[0], e[1], e[2]);
  SKY.uCamU.value.set(e[4], e[5], e[6]);
  SKY.uCamF.value.set(-e[8], -e[9], -e[10]);
  SKY.uTanY.value = tan((camera.fov * PI) / 360);
  SKY.uTanX.value = SKY.uTanY.value * camera.aspect;
}
export function renderFrame() {
  updateSkyCam();
  renderer.setRenderTarget(mainRT);
  renderer.setClearColor(0x000000, 1);
  renderer.clear(true, true, false);
  renderer.render(scene, camera);
  if (P.uCut.value > 0.001) {
    renderer.setRenderTarget(cutRT);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.render(scene, cutCam);
    renderer.setClearColor(0x000000, 1);
  }
  const dn = downPass.uni, up = upPass.uni;
  let src = mainRT.texture;
  for (let i = 0; i < bloomRT.length; i++) {
    dn.tSrc.value = src;
    const sW = i === 0 ? mainRT.width : bloomRT[i - 1].width, sH = i === 0 ? mainRT.height : bloomRT[i - 1].height;
    dn.uTexel.value.set(1 / sW, 1 / sH);
    dn.uThresh.value = i === 0 ? 1.1 : 0;
    runPass(downPass, bloomRT[i]);
    src = bloomRT[i].texture;
  }
  for (let i = bloomRT.length - 1; i > 0; i--) {
    up.tSrc.value = bloomRT[i].texture;
    up.uTexel.value.set(1 / bloomRT[i].width, 1 / bloomRT[i].height);
    runPass(upPass, bloomRT[i - 1]);
  }
  runPass(compPass, null);
}
const QA = {t: 0, n: 0, cool: 0};
export function adaptQuality(dt) {
  if (TEST.noAdapt) return;
  QA.t += dt;
  QA.n++;
  QA.cool -= dt;
  if (QA.t < 1) return;
  const ms = (QA.t / QA.n) * 1000;
  QA.t = 0;
  QA.n = 0;
  if (QA.cool > 0 || document.hidden) return;
  let q = VIEW.q;
  if (ms > 24) q = max(0.5, q - 0.12);
  else if (ms > 19) q = max(0.5, q - 0.05);
  else if (ms < 14.5 && q < VIEW.qMax) q = min(VIEW.qMax, q + 0.04);
  if (Math.abs(q - VIEW.q) > 0.001) {
    VIEW.q = q;
    if (q < 0.66 && mainRT.samples > 0) {
      mainRT.dispose();
      mainRT.samples = 0;
      cutRT.dispose();
      cutRT.samples = 0;
    }
    applyQuality();
    QA.cool = ms > 24 ? 1 : 2.5;
  }
}
