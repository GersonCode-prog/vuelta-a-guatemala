// GLSL del juego. Todo pasa por la misma idea: fondo pintado y objetos como cels con tinta.
export const NOISE = `
float hash11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
float hash21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float vn2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}
float fbm2(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
`;
export const VS_FS = `varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}`;

const BEND = `
uniform vec2 uBend;uniform float uCamZ;
vec4 bendW(vec4 w){float d=min(w.z-uCamZ,0.);w.xy+=uBend*d*d;return w;}
`;
// Faro de la bici y luces: entran en todos los materiales del suelo y de los objetos.
const LIGHTS = `
uniform vec3 uLampC;uniform vec2 uLampP;
vec3 lampAt(vec3 p){vec2 d=p.xz-uLampP;return uLampC*exp(-dot(d,d)*.018);}
`;

// ── Cel: tres tonos, trama de manga en la sombra, filo de luz ──
export const VS_CEL = `
attribute vec3 aCol;attribute float aGlow,aFlat;
#ifdef USE_INSTANCING
attribute vec4 iFx;
#endif
uniform float uFlash;
${BEND}
varying vec3 vN,vW,vCol;varying float vGlow,vFl,vFlatV;
void main(){
  vFlatV=aFlat;
  mat4 M=modelMatrix;
  #ifdef USE_INSTANCING
  M=modelMatrix*instanceMatrix;vCol=aCol*iFx.rgb;vFl=iFx.a;
  #else
  vCol=aCol;vFl=uFlash;
  #endif
  vec4 w=M*vec4(position,1.);
  vN=normalize(mat3(M)*normal);
  vGlow=aGlow;
  w=bendW(w);vW=w.xyz;
  gl_Position=projectionMatrix*viewMatrix*w;
}`;
export const FS_CEL = `
precision highp float;
uniform vec3 uSunDir,uSunCol,uShade,uRim,uFog,uInk;
uniform float uFogA,uFogB,uDot,uFlat;
${LIGHTS}
varying vec3 vN,vW,vCol;varying float vGlow,vFl,vFlatV;
float halftone(vec2 fc,float v){
  const float s=.7071;
  vec2 p=mat2(s,-s,s,s)*fc/uDot;
  vec2 c=fract(p)-.5;
  return 1.-smoothstep(v-.1,v+.1,length(c)*1.4);
}
void main(){
  vec3 Nf=normalize(cross(dFdx(vW),dFdy(vW)));
  float fl=step(.5,vFlatV);
  vec3 Ns=normalize(mix(vN,Nf,fl));
  vec3 N=normalize(mix(Ns,Nf,uFlat));
  vec3 V=normalize(cameraPosition-vW);
  float nl=dot(N,uSunDir)*.5+.5;
  float lit=smoothstep(.56,.58,nl);
  vec3 base=max(vCol,vec3(0.));
  vec3 light=mix(uShade,uSunCol,lit);
  vec3 col=base*light;
  float dist=length(cameraPosition-vW);
  float ht=halftone(gl_FragCoord.xy,clamp((.5-nl)*1.1,0.,.62))*(1.-lit)*(1.-smoothstep(30.,70.,dist));
  col=mix(col,base*uShade*.55,ht);
  float fr=pow(clamp(1.-dot(Ns,V),0.,1.),2.4);
  float rim=smoothstep(.3,.36,fr*(.35+.65*max(dot(Ns,uSunDir),0.)));
  col=mix(col,max(base,vec3(.35))*uRim*1.5,rim);
  col+=base*lampAt(vW);
  col+=base*clamp(vGlow,0.,4.)*2.2;
  col+=vec3(1.)*vFl*1.4;
  float fog=smoothstep(uFogA,uFogB,dist);
  gl_FragColor=vec4(mix(col,uFog,fog),1.);
}`;
export const VS_HULL = `
#ifdef USE_INSTANCING
attribute vec4 iFx;
#endif
${BEND}
uniform vec2 uRes;uniform float uOutline;
varying float vD;
void main(){
  mat4 M=modelMatrix;
  #ifdef USE_INSTANCING
  M=modelMatrix*instanceMatrix;
  #endif
  vec4 w=bendW(M*vec4(position,1.));
  vec3 nW=normalize(mat3(M)*normal);
  vec4 clip=projectionMatrix*viewMatrix*w;
  vec4 clipN=projectionMatrix*viewMatrix*vec4(w.xyz+nW,1.);
  float asp=uRes.x/uRes.y;
  vec2 dir=(clipN.xy/clipN.w-clip.xy/clip.w)*vec2(asp,1.);
  dir=normalize(dir+1e-5)/vec2(asp,1.);
  float near=clamp(1.-clip.w/80.,0.,1.);
  clip.xy+=dir*uOutline*(.32+.78*near)*2./uRes.y*clip.w;
  vD=clip.w;
  gl_Position=clip;
}`;
export const FS_HULL = `
precision highp float;
uniform vec3 uInk,uFog;uniform float uFogA,uFogB;
varying float vD;
void main(){gl_FragColor=vec4(mix(uInk,uFog,smoothstep(uFogA,uFogB,vD)),1.);}`;

// ── Suelo: arena negra, orilla, mar, pasarela y calle, según la pista del nivel ──
export const VS_GROUND = `
${BEND}
varying vec2 vP;varying vec3 vW;
void main(){
  vP=position.xz;
  vec4 w=bendW(vec4(position,1.));
  vW=w.xyz;
  gl_Position=projectionMatrix*viewMatrix*w;
}`;
export const FS_GROUND = `
precision highp float;
uniform sampler2D uTrack;
uniform float uDist,uLen,uTime,uFogA,uFogB,uNight;
uniform vec4 uSurge0,uSurge1;
uniform vec3 uSunDir,uSunCol,uShade,uFog,uInk,uSkyTop,uSkyMid,uSkyLow;
uniform vec3 uSandA,uSandB,uWet,uWaterA,uWaterB,uFoam,uPlank,uStreet,uGrass;
${LIGHTS}
${NOISE}
varying vec2 vP;varying vec3 vW;
vec3 skyC(vec3 R){
  vec3 c=mix(uSkyLow,uSkyMid,smoothstep(0.,.2,R.y));
  return mix(c,uSkyTop,smoothstep(.15,.65,R.y));
}
float shoreAt(float D,float base){
  float s=base+.6*sin(uTime*.7+D*.05)+.35*sin(uTime*1.3-D*.11);
  float a=(D-uSurge0.x)/uSurge0.y,b=(D-uSurge1.x)/uSurge1.y;
  s+=uSurge0.z*exp(-a*a)+uSurge1.z*exp(-b*b);
  return s;
}
vec3 water(float ds,float x,float D,vec3 refl,float glit,float g){
  vec3 w=mix(uWaterB,uWaterA,smoothstep(0.,30.,ds));
  w=mix(w,refl,.2+.3*smoothstep(0.,70.,ds));
  float n=vn2(vec2(x*.13,D*.07+uTime*.1));
  // crestas que llegan a la orilla
  float cr=fract(ds*.075+uTime*.11+n*.5);
  float wv=smoothstep(.93,.965,cr)*(1.-smoothstep(.97,1.,cr))*smoothstep(1.,6.,ds)*(1.-smoothstep(38.,60.,ds));
  w=mix(w,uFoam,wv*.72);
  float sp=step(.72,vn2(vec2(x*1.6,D*.32+uTime*.9)));
  w+=uSunCol*glit*sp*2.2;
  return w;
}
void main(){
  float x=vP.x,D=uDist-vP.y;
  vec4 tr=texture2D(uTrack,vec2(clamp(D/uLen,0.,1.),.5));
  float cx=tr.r,hw=tr.g,kind=tr.b,base=tr.a;
  vec3 V=normalize(cameraPosition-vW);
  vec3 R=reflect(-V,vec3(0.,1.,0.));
  vec3 refl=skyC(R);
  float g1=pow(max(dot(R,uSunDir),0.),26.);
  float g2=pow(max(dot(R,uSunDir),0.),320.);
  float fw=fwidth(x)+.02;
  // ── Playa ──
  float sh=shoreAt(D,base);
  float ds=sh-x;
  vec3 sandc;
  {
    float rp=vn2(vec2(x*.75,D*.13));
    float tone=floor(rp*3.)/3.;
    sandc=mix(uSandA,uSandB,tone);
    float gr=step(.982,hash21(floor(vec2(x,D)*24.)))*(1.-smoothstep(.03,.16,fw));
    sandc+=uSunCol*gr*.2;
    // luz de sol rasante sobre la arena
    sandc+=uSunCol*g1*.16;
    float d=-ds;
    float wet=1.-smoothstep(3.25,3.45,d);
    vec3 wc=mix(uWet,refl,.62)+uSunCol*g2*1.6+uSunCol*g1*.4;
    sandc=mix(sandc,wc,wet);
    // línea que deja la última ola
    float rim=1.-smoothstep(.0,.14,abs(d-3.35-.3*sin(D*.2)));
    sandc=mix(sandc,uSandB*1.5,rim*.5);
    // tierra adentro: monte
    float gm=smoothstep(.45,.6,vn2(vec2(x*.05,D*.05)))*smoothstep(cx+20.,cx+30.,x);
    sandc=mix(sandc,uGrass,gm);
  }
  vec3 sea=water(max(ds,0.),x,D,refl,g1,g2);
  float foamW=.5+.45*vn2(vec2(D*.5,uTime*.8));
  float fm=(1.-smoothstep(foamW-fw,foamW+fw,abs(ds)));
  float lace=step(.52,vn2(vec2(x*3.,D*.9+uTime*.7)))*smoothstep(0.,1.,ds)*(1.-smoothstep(1.,3.2,ds));
  vec3 beach=mix(sandc,sea,step(0.,ds));
  beach=mix(beach,uFoam,max(fm,lace*.7));
  // ── Canal con pasarela ──
  float dx=abs(x-cx);
  float inW=1.-smoothstep(hw-fw,hw+fw,dx);
  vec3 canal=water(max(dx-hw,0.)+6.,x,D,refl,g1,g2);
  canal=mix(canal,uWaterA*.6,.42);
  float lily=step(.8,vn2(vec2(x*.5,D*.5)))*smoothstep(hw+2.,hw+5.,dx);
  canal=mix(canal,uGrass*.7,lily*.5);
  float plankN=floor(D*1.05);
  float pl=fract(D*1.05);
  float seam=smoothstep(.02,.06,pl)*(1.-smoothstep(.94,.98,pl));
  float var=.8+.3*hash11(plankN);
  vec3 wood=uPlank*var*mix(.45,1.,seam);
  float edge=smoothstep(hw-.28,hw-.2,dx);
  wood=mix(wood,uPlank*.45,edge);
  vec3 walk=mix(canal,wood,inW);
  float pool1=exp(-pow(mod(D,30.)-15.,2.)*.05)*exp(-pow(max(dx-hw,0.)*.25,2.));
  walk+=wood*vec3(1.,.72,.38)*pool1*uNight*1.1*inW;
  // ── Calle del pueblo ──
  float cb=vn2(vec2(x*.5,D*.5));
  vec3 street=uStreet*(.82+.3*floor(cb*3.)/3.);
  float line=(1.-smoothstep(.08,.12,abs(x-cx)))*step(.45,fract(D*.08));
  street=mix(street,uFoam*.55,line*.28);
  vec3 side=uStreet*1.5+vec3(.02,.015,.0);
  float inS=1.-smoothstep(hw-fw,hw+fw,dx);
  float curb=1.-smoothstep(.0,.18,abs(dx-hw));
  vec3 town=mix(side,street,inS);
  town=mix(town,uFoam*.35,curb*.7);
  float pool2=exp(-pow(mod(D,40.)-20.,2.)*.018);
  town+=mix(side,street,inS)*vec3(1.2,.82,.42)*pool2*uNight*1.15;
  // ── Mezcla por tipo de tramo ──
  vec3 col=mix(beach,walk,smoothstep(.45,.55,kind));
  col=mix(col,town,smoothstep(1.45,1.55,kind));
  col+=col*lampAt(vec3(x,0.,vP.y))*2.2;
  float dist=length(cameraPosition-vW);
  gl_FragColor=vec4(mix(col,uFog,smoothstep(uFogA,uFogB,dist)),1.);
}`;

// ── Cielo pintado ──
export const VS_SKY = `varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,1.,1.);}`;
export const FS_SKY = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uClouds;
uniform vec3 uCamF,uCamR,uCamU,uSkyTop,uSkyMid,uSkyLow,uSunVis,uSunDisc,uCloudL,uCloudS,uHill,uHill2,uMoon;
uniform float uTanX,uTanY,uTime,uNight,uYaw;
${NOISE}
float ridge(float a,float s,float k){return (fbm2(vec2(a*s,k))-.42)*.2;}
void main(){
  vec2 ndc=vUv*2.-1.;
  vec3 d=normalize(uCamF+ndc.x*uTanX*uCamR+ndc.y*uTanY*uCamU);
  float el=d.y;
  float az=atan(d.x,-d.z)+uYaw;
  vec3 col=mix(uSkyLow,uSkyMid,smoothstep(.0,.2,el));
  col=mix(col,uSkyTop,smoothstep(.14,.62,el));
  // gradiente en bandas suaves, como acuarela de fondo
  float sd=dot(d,uSunVis);
  col+=uSunDisc*pow(max(sd,0.),10.)*.14*(1.-uNight);
  col+=uSunDisc*pow(max(sd,0.),90.)*.42*(1.-uNight);
  // estrellas
  if(uNight>.01){
    vec2 g=vec2(az*42.,el*42./max(cos(el),.2));
    vec2 id=floor(g),f=fract(g)-.5;
    float h=hash21(id);
    float st=step(.91,h)*(1.-smoothstep(0.,.1,length(f-(vec2(hash21(id+3.),hash21(id+7.))-.5)*.7)))*(.6+.4*sin(uTime*2.+h*30.));
    col+=vec3(1.,.95,.85)*st*uNight*1.8*smoothstep(.02,.2,el);
  }
  // sol con bandas de anime
  float cs=.9985;
  float disc=smoothstep(cs,cs+.0002,sd);
  float rel=dot(d,normalize(vec3(0.,1.,0.)-uSunVis*uSunVis.y));
  float stripes=step(.0,sin(rel*210.+uTime*.3))+smoothstep(-.012,.02,rel);
  disc*=clamp(stripes,0.,1.);
  col=mix(col,uSunDisc*2.2,disc*(1.-uNight));
  // luna
  float md=dot(d,uMoon);
  float moon=smoothstep(.99945,.9996,md)*(1.-smoothstep(.9994,.99975,dot(d,normalize(uMoon+vec3(.012,.008,0.)))));
  col=mix(col,vec3(1.,.97,.86)*1.5,moon*uNight);
  col+=vec3(.5,.6,.9)*pow(max(md,0.),300.)*.25*uNight;
  // nubes horneadas, cortadas en tonos
  if(el>-.02){
    vec2 uv=vec2(az/6.2832+uTime*.0012,clamp(el*1.5+.02,0.,1.));
    vec4 c=texture2D(uClouds,uv);
    float m=c.r;
    float a=smoothstep(.53,.56,m)*smoothstep(.0,.05,el);
    float sidel=clamp(.5+.5*sd+.45*(c.g-.5),0.,1.);
    vec3 cc=mix(uCloudS,uCloudL,smoothstep(.42,.45,c.g+sd*.14));
    float ed=(1.-smoothstep(.56,.63,m))*a;
    cc=mix(cc,uSunDisc*1.5,ed*pow(max(sd,0.),3.)*(1.-uNight));
    col=mix(col,cc,a);
    float cir=smoothstep(.54,.62,c.b)*smoothstep(.12,.3,el);
    col=mix(col,uCloudL,cir*.32);
  }
  // volcanes y monte del lado de tierra
  float r0=max(az,-.6)+.6;
  float vol=max(max(0.,.14-abs(az-.74)*.3),max(max(0.,.095-abs(az-.4)*.34),max(0.,.11-abs(az-1.2)*.3)));
  float h1=vol+ridge(az,3.2,1.)*.16;
  h1*=smoothstep(.04,.3,az);
  // Humo del volcán, como el de Fuego en un día claro
  vec2 pf=vec2(az-.74,el-.14);
  float puff=max(max(1.-length(pf-vec2(.012,.012))/.012,1.-length(pf-vec2(.034,.022))/.016),1.-length(pf-vec2(.066,.028))/.018);
  float h2=(.03+ridge(az,9.,4.)*.3)*smoothstep(.0,.3,az);
  col=mix(col,uCloudL,smoothstep(0.,.1,puff));
  if(el<h1&&az>.0)col=mix(uHill,uSkyLow,.42);
  if(el<h2&&az>.0)col=uHill2;
  gl_FragColor=vec4(col,1.);
}`;
export const FS_CLOUDBAKE = `
precision highp float;
varying vec2 vUv;
${NOISE}
// fbm que da la vuelta completa al cielo sin costura
float tile(vec2 p,float per){
  float a=.5,s=0.;
  for(int i=0;i<6;i++){
    vec2 q=p;
    vec2 i0=floor(q),f=fract(q);f=f*f*(3.-2.*f);
    float A=hash21(vec2(mod(i0.x,per),i0.y)),B=hash21(vec2(mod(i0.x+1.,per),i0.y));
    float C=hash21(vec2(mod(i0.x,per),i0.y+1.)),D=hash21(vec2(mod(i0.x+1.,per),i0.y+1.));
    s+=a*mix(mix(A,B,f.x),mix(C,D,f.x),f.y);
    p*=2.;per*=2.;a*=.5;
  }
  return s;
}
void main(){
  float u=vUv.x,v=vUv.y;
  vec2 p=vec2(u*9.,v*5.4);
  float shape=tile(vec2(p.x,p.y*1.7),9.);
  float band=smoothstep(.02,.16,v)*(1.-smoothstep(.34,.56,v));
  float m=shape*.92+(band-.5)*.42-.04;
  float lightv=tile(vec2(u*18.,v*12.+3.),18.);
  float high=tile(vec2(u*6.,v*30.+8.),6.);
  gl_FragColor=vec4(m,lightv,high,1.);
}`;

// ── Sombra larga en el suelo ──
export const VS_SHADOW = `
${BEND}
varying vec2 vQ;
void main(){
  vQ=position.xy;
  vec3 p=vec3(position.x,0.,position.y);
  vec4 w=bendW(instanceMatrix*vec4(p,1.));
  gl_Position=projectionMatrix*viewMatrix*w;
}`;
export const FS_SHADOW = `
precision highp float;
uniform vec3 uShadowC;uniform float uShadowA;
varying vec2 vQ;
void main(){
  float r=length(vQ);
  float a=(1.-smoothstep(.9,1.,r))*uShadowA;
  gl_FragColor=vec4(uShadowC*a,a);
}`;

// ── Efectos en quads (alfa premultiplicado: sirve para humo sólido y para luz) ──
export const VS_FX = `
attribute vec4 aP;attribute vec4 aD;attribute vec4 aC;
${BEND}
varying vec2 vQ;varying vec4 vD,vC;
void main(){
  vec4 v=viewMatrix*bendW(vec4(aP.xyz,1.));
  float c=cos(aD.x),s=sin(aD.x);
  vec2 q=mat2(c,s,-s,c)*position.xy*aP.w;
  v.xy+=q;
  vQ=position.xy;vD=aD;vC=aC;
  gl_Position=projectionMatrix*v;
}`;
export const FS_FX = `
precision highp float;
varying vec2 vQ;varying vec4 vD,vC;
void main(){
  float r=length(vQ),t=vD.y,life=clamp(vD.z,0.,1.),add=vD.w;
  float a=0.;
  if(t<.5){a=exp(-r*r*5.)*(1.-smoothstep(.85,1.,r));}
  else if(t<1.5){float w=mix(.2,.03,life);a=1.-smoothstep(0.,w,abs(r-mix(.2,.95,life)));}
  else if(t<2.5){
    float an=atan(vQ.y,vQ.x);
    float sp=.25+.75*pow(abs(cos(an*3.)),10.)+.4*pow(abs(cos(an*5.+1.)),18.);
    float e=sp*(1.-life*.45);a=1.-smoothstep(e-.1,e,r);
  }else{
    // bola de humo o espuma de borde duro
    float e=mix(.92,.3,life);a=1.-smoothstep(e-.08,e,r);
  }
  a=clamp(a,0.,1.)*vC.a;
  gl_FragColor=vec4(vC.rgb*a,a*(1.-add));
}`;
// ── Letreros pintados ──
export const VS_SIGN = `
attribute vec4 iP;attribute vec4 iUv;attribute vec2 iS;
${BEND}
varying vec2 vUv;varying vec3 vW;
void main(){
  vUv=iUv.xy+uv*iUv.zw;
  vec3 p=iP.xyz+vec3(position.x*iS.x,position.y*iS.y,0.);
  vec4 w=bendW(vec4(p,1.));vW=w.xyz;
  gl_Position=projectionMatrix*viewMatrix*w;
}`;
export const FS_SIGN = `
precision highp float;
uniform sampler2D uAtlas;uniform vec3 uFog,uSunCol;uniform float uFogA,uFogB,uNight;
varying vec2 vUv;varying vec3 vW;
void main(){
  vec4 t=texture2D(uAtlas,vUv);
  if(t.a<.4)discard;
  vec3 c=t.rgb*mix(uSunCol*.82,vec3(1.05),uNight);
  float d=length(cameraPosition-vW);
  gl_FragColor=vec4(mix(c,uFog,smoothstep(uFogA,uFogB,d)),1.);
}`;
// ── Faja típica al viento ──
export const VS_SCARF = `
${BEND}
varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*viewMatrix*bendW(vec4(position,1.));}`;
export const FS_SCARF = `
precision highp float;
uniform vec3 uSunCol,uShade;
varying vec2 vUv;
void main(){
  float t=clamp(vUv.x,0.,1.),s=clamp(vUv.y,0.,1.);
  // tejido: rombos y franjas como un corte típico
  float rows=floor(s*5.);
  float z=abs(fract(t*22.+rows*.5)-.5)*2.;
  vec3 c=vec3(.82,.04,.07);
  if(rows==2.){c=z>.5?vec3(1.,.72,.05):vec3(.02,.55,.58);}
  if(rows==1.||rows==3.)c=z>.72?vec3(.95,.9,.75):vec3(.82,.04,.07);
  gl_FragColor=vec4(c*mix(uSunCol,vec3(1.),.35),1.);
}`;
// ── Etiqueta del paquete ──
export const VS_TEX = `
${BEND}
varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*viewMatrix*bendW(modelMatrix*vec4(position,1.));}`;
export const FS_TEX = `
precision highp float;
uniform sampler2D uMap;uniform vec3 uSunCol,uShade;
varying vec2 vUv;
void main(){gl_FragColor=vec4(texture2D(uMap,vUv).rgb*mix(uShade,uSunCol,.8),1.);}`;
// ── Marcador de peligro en el suelo ──
export const VS_MARK = `
${BEND}
varying vec2 vQ;
void main(){vQ=position.xy;vec4 w=bendW(modelMatrix*vec4(position.x,.05,position.y,1.));gl_Position=projectionMatrix*viewMatrix*w;}`;
export const FS_MARK = `
precision highp float;
uniform float uTime,uAmt;
varying vec2 vQ;
void main(){
  float d=abs(vQ.x);
  float st=step(.5,fract(vQ.y*.7-uTime*3.));
  float a=(1.-smoothstep(.82,1.,d))*(.34+.5*st);
  gl_FragColor=vec4(vec3(1.5,.1,.14)*a*uAmt,a*uAmt);
}`;

// ── Post ──
export const FS_DOWN = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;uniform vec2 uTexel;uniform float uThresh;
void main(){
  vec3 c=texture2D(tSrc,vUv).rgb*4.;
  c+=texture2D(tSrc,vUv+uTexel*vec2(-1.,-1.)).rgb;
  c+=texture2D(tSrc,vUv+uTexel*vec2(1.,-1.)).rgb;
  c+=texture2D(tSrc,vUv+uTexel*vec2(-1.,1.)).rgb;
  c+=texture2D(tSrc,vUv+uTexel*vec2(1.,1.)).rgb;
  c/=8.;
  if(!(c.r==c.r&&c.g==c.g&&c.b==c.b))c=vec3(0.);
  c=clamp(c,vec3(0.),vec3(24.));
  if(uThresh>0.){float l=max(c.r,max(c.g,c.b));c*=smoothstep(uThresh,uThresh*1.6,l);}
  gl_FragColor=vec4(c,1.);
}`;
export const FS_UP = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;uniform vec2 uTexel;
void main(){
  vec3 c=texture2D(tSrc,vUv+uTexel*vec2(-2.,0.)).rgb;
  c+=texture2D(tSrc,vUv+uTexel*vec2(-1.,1.)).rgb*2.;
  c+=texture2D(tSrc,vUv+uTexel*vec2(0.,2.)).rgb;
  c+=texture2D(tSrc,vUv+uTexel*vec2(1.,1.)).rgb*2.;
  c+=texture2D(tSrc,vUv+uTexel*vec2(2.,0.)).rgb;
  c+=texture2D(tSrc,vUv+uTexel*vec2(1.,-1.)).rgb*2.;
  c+=texture2D(tSrc,vUv+uTexel*vec2(0.,-2.)).rgb;
  c+=texture2D(tSrc,vUv+uTexel*vec2(-1.,-1.)).rgb*2.;
  gl_FragColor=vec4(c/12.,1.);
}`;
export const FS_COMP = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene,tBloom,tCut;
uniform float uTime,uAspect,uBloomAmt,uChroma,uLines,uImpact,uImpactInv,uFadeK,uFadeW,uCut,uCutW,uGrain,uVig,uWet;
uniform vec2 uVP;
uniform vec3 uBandA,uBandB;
${NOISE}
vec3 aces(vec3 c){return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}
void main(){
  vec2 uv=vUv;
  vec2 dir=uv-uVP;
  vec3 col=texture2D(tScene,uv).rgb;
  if(uChroma>.0002){
    col.r=mix(col.r,texture2D(tScene,uv+dir*uChroma).r,.9);
    col.b=mix(col.b,texture2D(tScene,uv-dir*uChroma).b,.9);
  }
  col+=texture2D(tBloom,uv).rgb*uBloomAmt;
  col=max(col,vec3(0.));
  if(!(col.r==col.r&&col.g==col.g&&col.b==col.b))col=vec3(0.);
  col=aces(col*1.02);
  col=pow(col,vec3(1./2.2));
  col=clamp(mix(vec3(dot(col,vec3(.3,.59,.11))),col,1.16),0.,1.);
  vec2 p=(vUv-uVP)*vec2(uAspect,1.);
  float rr=length(p);
  if(uLines>.003){
    float an=atan(p.y,p.x);
    vec2 cc=vec2(cos(an),sin(an));
    float n=vn2(cc*42.+uTime*11.)*.6+vn2(cc*120.-uTime*17.)*.4;
    float th=mix(.84,.56,uLines);
    float ln=smoothstep(th,th+.03,n)*smoothstep(mix(.92,.38,uLines),mix(1.3,.88,uLines),rr);
    col=mix(col,vec3(1.,.97,.88),ln*min(uLines*1.5,1.));
  }
  if(uWet>.001){
    float dr=step(.72,vn2(vUv*vec2(uAspect*14.,14.)+vec2(0.,uTime*2.)));
    col=mix(col,col*vec3(.75,.92,1.)+vec3(.05,.12,.16),uWet*(.4+.5*dr));
  }
  float vg=1.-uVig*smoothstep(.45,1.25,length((vUv-.5)*vec2(uAspect*.72,1.))*1.45);
  col*=vg;
  col+=(hash21(gl_FragCoord.xy+fract(uTime)*91.)-.5)*uGrain;
  if(uCut>.001){
    float sl=(vUv.y-.5)+(vUv.x-.5)*.17;
    if(abs(sl)<uCutW+.012){
      vec3 band;
      if(abs(sl)<uCutW){
        vec2 q=(vUv-vec2(.5,.5))*vec2(uAspect,1.);
        float a2=atan(q.y,q.x);
        vec2 c2=vec2(cos(a2),sin(a2));
        float s=vn2(c2*30.+uTime*14.);
        vec3 bg=mix(uBandA,uBandB,smoothstep(.45,.5,s));
        vec4 cs=texture2D(tCut,vUv);
        vec3 fg=pow(aces(max(cs.rgb,vec3(0.))),vec3(1./2.2));
        band=mix(bg,fg,clamp(cs.a,0.,1.));
      }else band=vec3(1.,.95,.84);
      col=mix(col,band,uCut);
    }
  }
  if(uImpact>.001){
    float l=dot(col,vec3(.3,.59,.11));
    float m=step(.42,l+(hash21(gl_FragCoord.xy*.5)-.5)*.02);
    m=uImpactInv>.5?1.-m:m;
    col=mix(col,mix(vec3(.05,.03,.03),vec3(1.,.95,.84),m),uImpact);
  }
  col=mix(col,vec3(.03,.02,.04),uFadeK);
  col=mix(col,vec3(1.,.97,.9),uFadeW);
  gl_FragColor=vec4(col,1.);
}`;
