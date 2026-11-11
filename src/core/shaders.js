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
  float fl=step(.5,vFlatV),painted=1.-step(-.5,vFlatV);
  vec3 Ns=normalize(mix(vN,Nf,fl));
  vec3 N=normalize(mix(Ns,Nf,uFlat*(1.-painted)));
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
  float rim=smoothstep(.3,.36,fr*(.35+.65*max(dot(Ns,uSunDir),0.)))*(1.-painted);
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

// ── Atitlán: San Pedro al frente, Tolimán y Atitlán a la izquierda y la orilla norte a la derecha ──
// Lo usan el cielo y el agua, que refleja las mismas siluetas. k: avance del viaje, de Panajachel (0) a San Pedro (1).
const LAKE_SKY = `
float lkR(float a,float s,float k){return (fbm2(vec2(a*s,k))-.42)*.2;}
float lkCone(float az,float c,float h,float w,float p){float u=(az-c)/w;return h*(1.-pow(min(abs(u),1.),p));}
float lkFar(float az){return .022+lkR(az,5.,2.)*.12;}
float lkSP(float az,float k){return lkCone(az,mix(-.24,-.05,k),mix(.1,.19,k),mix(.3,.42,k),1.12);}
float lkTo(float az,float k){return lkCone(az,mix(-.56,-.8,k),mix(.088,.1,k),.26,1.05);}
float lkAt(float az,float k){return lkCone(az,mix(-.72,-1.,k),.105,.27,1.);}
float lkNear(float az){return (.05+.08*smoothstep(.1,.75,az)+lkR(az,8.,5.)*.45)*smoothstep(.05,.24,az);}
float lkTop(float az,float k){return max(max(lkFar(az),lkNear(az)),max(lkSP(az,k),max(lkTo(az,k),lkAt(az,k))));}
`;
// ── Cielo pintado ──
export const VS_SKY = `varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,1.,1.);}`;
export const FS_SKY = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uClouds;
uniform vec3 uCamF,uCamR,uCamU,uSkyTop,uSkyMid,uSkyLow,uSunVis,uSunDisc,uCloudL,uCloudS,uHill,uHill2,uMoon;
uniform float uTanX,uTanY,uTime,uNight,uYaw,uLeftHills;
uniform vec4 uAgua,uLake;
${NOISE}
float ridge(float a,float s,float k){return (fbm2(vec2(a*s,k))-.42)*.2;}
${LAKE_SKY}
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
  if(uLake.x<.5){
    // volcanes y monte del lado de tierra
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
  }else{
    // Atitlán: la orilla de enfrente, Atitlán detrás de Tolimán, San Pedro que se acerca y el monte de la orilla norte.
    float k=uLake.y;
    if(el<lkFar(az))col=mix(uHill,uSkyLow,.55);
    float cA=mix(-.72,-1.,k),cT=mix(-.56,-.8,k),cS=mix(-.24,-.05,k),wS=mix(.3,.42,k);
    if(el<lkAt(az,k))col=mix(mix(uHill,uSkyLow,.38),mix(uHill2,uSkyLow,.36),step(az-cA+.008*sin(el*70.),0.)*.7);
    float hT=lkTo(az,k);
    if(el<hT)col=mix(mix(uHill,uSkyLow,.24),mix(uHill2,uSkyLow,.22),step(az-cT+.008*sin(el*80.),0.)*.7);
    // Collar de nube en Tolimán y Atitlán
    float ring=exp(-pow((el-.058)/.01,2.))*smoothstep(-1.2,-1.,az)*(1.-smoothstep(-.52,-.42,az))*(.5+.5*fbm2(vec2(az*25.+uTime*.02,el*30.)));
    col=mix(col,uCloudL,smoothstep(.35,.7,ring)*.8);
    float hS=lkSP(az,k);
    if(el<hS){
      float u=(az-cS)/wS,hp=mix(.1,.19,k);
      vec3 vc=mix(uHill,uSkyLow,mix(.2,.06,k));
      vc=mix(vc,mix(uHill2,uSkyLow,mix(.18,.04,k)),step(u+.03*sin(el*90.),0.)*.75);
      // Cárcavas que bajan desde la cumbre
      float rad=u/max(1.-el/hp,.06);
      vc=mix(vc,uHill2,step(.88,fract(rad*4.5+.3+lkR(az,60.,3.)*1.6))*smoothstep(.05,.4,1.-el/hp)*smoothstep(.0,.25,el/hp)*.22);
      col=vc;
    }
    float hN=lkNear(az);
    if(el<hN)col=mix(uHill2,uHill,.2+.16*step(.55,fract(az*6.+lkR(az,20.,8.)*5.)));
  }
  // Volcán de Agua, de frente en Antigua: cono parejo, lado de sombra y su collar de nube.
  if(uAgua.w>.5){
    float u=(az-uAgua.x)/uAgua.z;
    float hA=uAgua.y*(1.-pow(min(abs(u),1.),.92))-.004;
    hA+=(fbm2(vec2(az*40.,2.))-.5)*.004;
    if(el<hA){
      vec3 vc=mix(uHill,uSkyLow,.3);
      vc=mix(vc,mix(uHill,uHill2,.45),step(.0,u+.04*sin(el*90.))*.8);
      float gully=step(.82,fract(u*7.+el*20.))*smoothstep(.0,uAgua.y*.8,uAgua.y-el)*.25;
      vc=mix(vc,uHill2,gully);
      col=vc;
    }
    float ring=exp(-pow((el-uAgua.y*.66)/(uAgua.y*.07),2.))*smoothstep(1.3,.4,abs(u))*(.55+.45*fbm2(vec2(az*22.+uTime*.02,el*30.)));
    col=mix(col,uCloudL,smoothstep(.35,.7,ring)*.85);
  }
  if(uLeftHills>.5){
    float hL=(.022+ridge(az,6.,9.)*.26)*(1.-smoothstep(-.3,-.02,az));
    float hF=(.012+ridge(az,11.,3.)*.1);
    if(el<hF)col=mix(uHill2,uSkyLow,.3);
    if(el<hL)col=mix(uHill2,uHill,.3);
  }
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
  }else if(t<3.5){
    // bola de humo o espuma de borde duro
    float e=mix(.92,.3,life);a=1.-smoothstep(e-.08,e,r);
  }else{
    // raya de lluvia
    a=(1.-smoothstep(.03,.07,abs(vQ.x)))*(1.-smoothstep(.5,1.,abs(vQ.y)));
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
// ── Cola del caballo: mechones oscuros con brillo ──
export const FS_TAIL = `
precision highp float;
uniform vec3 uCol,uSunCol,uShade;
varying vec2 vUv;
void main(){
  float t=clamp(vUv.x,0.,1.),s=clamp(vUv.y,0.,1.);
  float strand=step(.5,fract(s*4.+t*1.5));
  vec3 c=uCol*mix(uShade,uSunCol,.55)*(.72+.5*strand)+uSunCol*.09*(1.-abs(s-.5)*2.)*strand;
  gl_FragColor=vec4(max(c,vec3(0.)),1.);
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
uniform float uTime,uAmt,uFreq,uWid;
varying vec2 vQ;
void main(){
  float d=abs(vQ.x)/uWid;
  float st=step(.5,fract(vQ.y*uFreq-uTime*3.));
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

// ── Suelo de campo: potrero, puente sobre el río, cañal y calle de feria ──
export const FS_GROUND_FARM = `
precision highp float;
uniform sampler2D uTrack;
uniform float uDist,uLen,uTime,uFogA,uFogB,uNight;
uniform vec2 uBurn;
uniform vec3 uSunDir,uSunCol,uShade,uFog,uInk,uSkyTop,uSkyMid,uSkyLow;
uniform vec3 uSandA,uSandB,uWet,uWaterA,uWaterB,uFoam,uPlank,uStreet,uGrass;
${LIGHTS}
${NOISE}
varying vec2 vP;varying vec3 vW;
vec3 skyC(vec3 R){
  vec3 c=mix(uSkyLow,uSkyMid,smoothstep(0.,.2,R.y));
  return mix(c,uSkyTop,smoothstep(.15,.65,R.y));
}
void main(){
  float x=vP.x,D=uDist-vP.y;
  vec4 tr=texture2D(uTrack,vec2(clamp(D/uLen,0.,1.),.5));
  float cx=tr.r,hw=max(tr.g,0.),kind=tr.b,riv=tr.a;
  // -1 en el canal del río: calle de feria en medio del campo (Taxisco).
  float fairT=1.-smoothstep(-.6,-.4,riv);
  riv=max(riv,0.);
  float fw=fwidth(x)+.02,fd=fwidth(D)+.02;
  float dx=abs(x-cx);
  vec3 V=normalize(cameraPosition-vW);
  vec3 R=reflect(-V,vec3(0.,1.,0.));
  vec3 refl=skyC(R);
  float g1=pow(max(dot(R,uSunDir),0.),24.);
  float g2=pow(max(dot(R,uSunDir),0.),260.);
  float far=1.-smoothstep(.05,.4,fd);
  // Pasto pintado en tonos
  float n1=vn2(vec2(x*.07,D*.05)),n2=vn2(vec2(x*.42,D*.16));
  float tone=floor((n1*.72+n2*.28)*5.)/5.;
  vec3 grass=uGrass*mix(.64,1.14,tone);
  float blade=step(.86,hash21(floor(vec2(x*7.,D*2.2))))*far;
  grass=mix(grass,uGrass*1.24,blade*.55);
  float fl=step(.988,hash21(floor(vec2(x,D)*4.5)))*far;
  grass=mix(grass,mix(vec3(1.,.82,.2),vec3(1.,.95,.86),step(.5,hash21(floor(vec2(x,D)*4.5)+3.))),fl);
  // Camino de tierra con huellas
  float wob=(vn2(vec2(D*.16,3.))-.5)*1.5;
  float road=1.-smoothstep(hw+wob-.16-fw,hw+wob+.16+fw,dx);
  float rt=vn2(vec2(x*.55,D*.17));
  vec3 dirt=mix(uSandA,uSandB,floor(rt*3.)/3.);
  float rut=1.-smoothstep(.06,.42,abs(dx-hw*.46));
  dirt=mix(dirt,uSandA*.76,rut*.5);
  float peb=step(.975,hash21(floor(vec2(x,D)*7.)))*far;
  dirt=mix(dirt,uSandB*1.3,peb*.7);
  float roadEdge=(1.-smoothstep(.0,.5,abs(dx-hw-wob)))*.5;
  vec3 land=mix(mix(grass,uGrass*.62,roadEdge),dirt,road);
  // Cañal: tierra oscura en surcos a los lados
  float rows=step(.5,fract(x*.28));
  vec3 soil=mix(uGrass*.34,uSandA*.42,rows);
  float bn=vn2(vec2(x*.5,D*.4));
  float burn=smoothstep(uBurn.x-14.,uBurn.x+14.,D)*(1.-smoothstep(uBurn.y-14.,uBurn.y+14.,D));
  soil=mix(soil,vec3(.035,.03,.032),burn*.9);
  vec3 canal=mix(soil,dirt*mix(1.,.72,burn),road);
  float ember=burn*(1.-road)*step(.982,hash21(floor(vec2(x,D)*4.)))*(.55+.45*sin(uTime*7.+D));
  canal+=vec3(2.2,.65,.1)*ember;
  // Adoquín de feria con papel picado en el suelo
  vec2 cb=vec2(x*1.05+step(.5,fract(D*.5))*.5,D*1.0);
  vec2 fc=fract(cb),id=floor(cb);
  float m=smoothstep(.02,.09,fc.x)*(1.-smoothstep(.91,.98,fc.x))*smoothstep(.02,.1,fc.y)*(1.-smoothstep(.9,.98,fc.y));
  float cobbleTone=.84+.3*hash21(id);
  vec3 cobble=uStreet*cobbleTone*mix(mix(.5,1.,m),1.,1.-far);
  float inS=1.-smoothstep(hw-fw,hw+fw,dx);
  vec3 side=uStreet*1.42+vec3(.02,.015,.0);
  vec3 town=mix(side,cobble,inS);
  float curb=1.-smoothstep(.0,.2,abs(dx-hw));
  town=mix(town,uFoam*.55,curb*.7);
  vec2 cf=floor(vec2(x,D)*5.5);
  float conf=step(.972,hash21(cf))*far;
  vec3 ccol=vec3(1.,.15,.2);
  float hc=hash21(cf+7.);
  if(hc>.75)ccol=vec3(1.,.8,.1);else if(hc>.5)ccol=vec3(.07,.72,.7);else if(hc>.25)ccol=vec3(1.,.36,.5);
  town=mix(town,ccol,conf*.85);
  // Mezcla por tipo de tramo
  float isCane=smoothstep(1.45,1.55,kind);
  float isTown=max(smoothstep(2.45,2.55,kind),fairT);
  float isBridge=smoothstep(.45,.55,kind)*(1.-isCane);
  vec3 col=mix(land,canal,isCane);
  col=mix(col,town,isTown);
  // Río: cruza el camino de lado a lado
  float rn=(vn2(vec2(x*.045,D*.09))-.5)*.34;
  float rv=riv+rn*step(.01,riv)*(1.-step(.99,riv));
  float wat=smoothstep(.47,.53,rv);
  if(wat>.001){
    float deep=smoothstep(.0,.6,riv-.4)*(.45+.55*isBridge);
    vec3 w=mix(uWaterB,uWaterA,deep);
    w=mix(w,refl,.2+.14*far);
    float flow=fract(x*.075-uTime*.42+vn2(vec2(x*.09,D*.22))*1.6);
    float line=smoothstep(.88,.92,flow)*(1.-smoothstep(.94,.98,flow));
    w=mix(w,uFoam,line*.5);
    float ston=step(.8,vn2(vec2(x*.5,D*.5)))*(1.-isBridge)*.55;
    w=mix(w,uSandA*.9,ston*.35);
    w+=uSunCol*g1*.22+uSunCol*g2*step(.68,vn2(vec2(x*1.4,D*.3-uTime*.5)))*1.8;
    col=mix(col,w,wat);
    float bank=(1.-smoothstep(.0,.06,abs(rv-.5)));
    col=mix(col,uFoam,bank*.85);
  }
  // Puente de tablas
  float inW=1.-smoothstep(hw-fw,hw+fw,dx);
  float plankN=floor(D*1.05);
  float pl=fract(D*1.05);
  float seam=smoothstep(.02,.07,pl)*(1.-smoothstep(.93,.98,pl));
  vec3 wood=uPlank*(.78+.34*hash11(plankN))*mix(.42,1.,mix(1.,seam,far));
  wood=mix(wood,uPlank*.42,smoothstep(hw-.3,hw-.2,dx));
  col=mix(col,wood,inW*isBridge*step(.1,hw));
  col=max(col,vec3(0.));
  col+=col*lampAt(vec3(x,0.,vP.y))*2.2;
  float dist=length(cameraPosition-vW);
  gl_FragColor=vec4(mix(col,uFog,smoothstep(uFogA,uFogB,dist)),1.);
}`;

// ── Suelo de ciudad: avenida con camellón, periférico, puente sobre el barranco y calles del centro ──
export const FS_GROUND_CITY = `
precision highp float;
uniform sampler2D uTrack;
uniform float uDist,uLen,uTime,uFogA,uFogB,uNight;
uniform vec3 uSunDir,uSunCol,uShade,uFog,uInk,uSkyTop,uSkyMid,uSkyLow;
uniform vec3 uSandA,uSandB,uWet,uWaterA,uWaterB,uFoam,uPlank,uStreet,uGrass;
${LIGHTS}
${NOISE}
varying vec2 vP;varying vec3 vW;
float band(float v,float w,float fw){return 1.-smoothstep(w,w+fw,abs(v));}
void main(){
  float x=vP.x,D=uDist-vP.y;
  vec4 tr=texture2D(uTrack,vec2(clamp(D/uLen,0.,1.),.5));
  float cx=tr.r,hw=max(tr.g,0.),kind=tr.b,xw=tr.a;
  float fw=fwidth(x)+.02,fd=fwidth(D)+.02;
  float far=1.-smoothstep(.05,.4,fd);
  float dx=x-cx,ax=abs(dx),mL=-dx-hw;
  float isHwy=smoothstep(.5,.6,kind)*(1.-smoothstep(1.4,1.5,kind));
  float isBr=smoothstep(1.5,1.6,kind)*(1.-smoothstep(2.4,2.5,kind));
  float isZ1=smoothstep(2.5,2.6,kind);
  float fast=max(isHwy,isBr);
  // Cruce: .5 paso de cebra, 1 la calle que atraviesa; la rampa de subida deja la línea de alto.
  float box=smoothstep(.72,.78,xw);
  float cw=smoothstep(.22,.28,xw)*(1.-box);
  float stopL=smoothstep(.07,.11,xw)*(1.-smoothstep(.19,.23,xw));
  // Asfalto en tonos, con parches y grava
  float n1=vn2(vec2(x*.11,D*.045)),n2=vn2(vec2(x*.8,D*.33));
  vec3 asph=uStreet*(.84+.2*floor((n1*.7+n2*.3)*4.)/4.);
  asph*=1.-step(.8,vn2(vec2(x*.2+3.,D*.07)))*.13;
  asph=mix(asph,uStreet*1.35,step(.985,hash21(floor(vec2(x,D)*9.)))*far*.6);
  float dash=step(.45,fract(D*.1)),lw=.075;
  // Tres carriles en las calles anchas, dos en las del centro.
  float lanes=mix(band(dx,lw,fw),max(band(dx-1.8,lw,fw),band(dx+1.8,lw,fw)),step(4.6,hw))*dash;
  float edgeL=band(dx+hw-.32,lw*1.3,fw)*(1.-isZ1);
  float edgeR=band(dx-hw+.32,lw,fw)*(1.-isZ1);
  vec3 road=asph;
  road=mix(road,uFoam*.86,lanes*(1.-cw)*.9);
  road=mix(road,uWet,edgeL);
  road=mix(road,uFoam*.86,edgeR);
  road=mix(road,uFoam*.9,step(.5,fract(x*.85+.25))*cw*.9);
  road=mix(road,uFoam*.9,stopL*.95);
  // Banqueta de piso y terreno donde van los edificios
  vec2 tl=fract(vec2(x*.9,D*.9));
  float tileS=smoothstep(.0,.06,tl.x)*smoothstep(.0,.06,tl.y);
  vec3 walk=uSandA*mix(.8,1.,tileS*far+(1.-far));
  float walkW=mix(3.2,2.4,isZ1);
  vec3 lots=uSandB*.6;
  vec3 near_=mix(walk,lots,smoothstep(hw+walkW,hw+walkW+.1,ax));
  // Avenida: camellón con grama y la vía de regreso
  vec3 grass=uGrass*mix(.78,1.08,floor(vn2(vec2(x*.3,D*.12))*3.)/3.);
  vec3 opp=uStreet*(.8+.16*n1);
  opp=mix(opp,uFoam*.8,max(band(mL-7.,lw,fw),band(mL-10.7,lw,fw))*dash);
  vec3 med=mix(grass,opp,smoothstep(3.2,3.3,mL));
  med=mix(med,uSandB*1.12,band(mL-3.25,.12,fw));
  med=mix(med,mix(walk,lots,smoothstep(17.6,17.7,mL)),smoothstep(14.4,14.5,mL));
  // Periférico: hombro, talud de grama y vía contraria detrás de los muros
  vec3 slope=mix(asph*.9,grass*.88,smoothstep(hw+2.3,hw+2.7,ax));
  slope=mix(slope,grass*.72,smoothstep(hw+10.,hw+40.,ax));
  vec3 hwL=mix(opp,grass*.8,smoothstep(12.2,12.6,mL));
  vec3 side=dx>0.?mix(near_,slope,fast):mix(med,hwL,fast);
  // Puente: barranco hondo a los dos lados
  float rv=vn2(vec2(x*.05,D*.04)),rv2=vn2(vec2(x*.3,D*.2));
  vec3 rav=mix(uWaterA,uWaterB,floor((rv*.7+rv2*.3)*4.)/4.);
  rav=mix(rav*.8,uFog,.1+.22*smoothstep(hw+4.,hw+80.,ax));
  side=mix(side,rav,isBr*smoothstep(hw+.55,hw+.7,ax));
  // Zona 1: banquetas a los dos lados
  side=mix(side,near_,isZ1);
  side=mix(side,uSandB*1.12,band(ax-hw-.15,.15,fw)*(1.-fast));
  vec3 col=mix(road,side,smoothstep(hw-fw,hw+fw,ax));
  col=mix(col,asph*.94,box);
  // Charcos de luz de los faroles en la noche
  float pool=exp(-pow(mod(D,18.)-9.,2.)*.035)*exp(-pow(ax-hw-1.4,2.)*.05);
  col+=col*vec3(1.25,.9,.5)*pool*uNight*1.7;
  col=max(col,vec3(0.));
  col+=col*lampAt(vec3(x,0.,vP.y))*2.2;
  float dist=length(cameraPosition-vW);
  gl_FragColor=vec4(mix(col,uFog,smoothstep(uFogA,uFogB,dist)),1.);
}`;

// ── Suelo de Antigua: la bajada entre pinos, el empedrado con sus lajas y la plaza ──
export const FS_GROUND_COLONIAL = `
precision highp float;
uniform sampler2D uTrack;
uniform float uDist,uLen,uTime,uFogA,uFogB,uNight;
uniform vec3 uSunDir,uSunCol,uShade,uFog,uInk,uSkyTop,uSkyMid,uSkyLow;
uniform vec3 uSandA,uSandB,uWet,uWaterA,uWaterB,uFoam,uPlank,uStreet,uGrass;
${LIGHTS}
${NOISE}
varying vec2 vP;varying vec3 vW;
float band(float v,float w,float fw){return 1.-smoothstep(w,w+fw,abs(v));}
// Empedrado: piedras redondeadas en hileras corridas, con la junta oscura.
vec3 cobble(vec2 p,float far){
  vec2 g=p*vec2(2.7,3.3);
  g.x+=step(1.,mod(floor(g.y),2.))*.5;
  vec2 id=floor(g),f=fract(g)-.5;
  float h=hash21(id);
  f+=(vec2(hash21(id+3.),hash21(id+9.))-.5)*.12;
  float d=length(f*vec2(1.,1.12));
  float st=1.-smoothstep(.34,.46,d);
  vec3 c=mix(uSandA,uSandB,floor(h*3.)/3.*.85);
  c*=.84+.26*smoothstep(.45,0.,length(f-vec2(-.08,.1)));
  return mix(uSandB*.5,c,mix(.82,st,far));
}
void main(){
  float x=vP.x,D=uDist-vP.y;
  vec4 tr=texture2D(uTrack,vec2(clamp(D/uLen,0.,1.),.5));
  float cx=tr.r,hw=max(tr.g,0.),kind=tr.b,xw=tr.a;
  float fw=fwidth(x)+.02,fd=fwidth(D)+.02;
  float far=1.-smoothstep(.05,.4,fd);
  float dx=x-cx,ax=abs(dx);
  float isMt=1.-smoothstep(.5,.6,kind);
  float isPl=smoothstep(1.5,1.6,kind);
  // Carretera de montaña: asfalto, línea al centro y orillas blancas
  float n1=vn2(vec2(x*.11,D*.045)),n2=vn2(vec2(x*.8,D*.33));
  vec3 asph=uStreet*(.84+.2*floor((n1*.7+n2*.3)*4.)/4.);
  asph=mix(asph,uStreet*1.3,step(.985,hash21(floor(vec2(x,D)*9.)))*far*.5);
  float dash=step(.45,fract(D*.08)),lw=.08;
  vec3 road=asph;
  road=mix(road,uFoam*.88,band(dx,lw,fw)*dash);
  road=mix(road,uFoam*.88,max(band(dx-hw+.35,lw,fw),band(dx+hw-.35,lw,fw)));
  // Orilla de piedrín y el suelo del bosque, con agujas de pino
  float fn=vn2(vec2(x*.09,D*.06)),fn2=vn2(vec2(x*.6,D*.4));
  vec3 forest=uGrass*mix(.55,1.05,floor((fn*.7+fn2*.3)*4.)/4.);
  forest=mix(forest,uSandB*.7,step(.8,vn2(vec2(x*.25,D*.2)))*.45);
  forest=mix(forest,uGrass*1.25,step(.9,hash21(floor(vec2(x*5.,D*2.))))*far*.5);
  vec3 shoulder=mix(uSandB*.82,uSandA*.7,hash21(floor(vec2(x,D)*6.))*far*.5);
  vec3 mside=mix(shoulder,forest,smoothstep(hw+1.3,hw+1.7,ax));
  // Barranco con neblina del lado izquierdo, en los tramos abiertos
  float drop=smoothstep(.6,.75,vn2(vec2(D*.004,7.)))*step(dx,0.);
  mside=mix(mside,mix(uWaterB,uFog,.55+.35*smoothstep(hw+6.,hw+60.,ax)),drop*smoothstep(hw+4.,hw+6.,ax));
  vec3 mtn=mix(road,mside,smoothstep(hw-fw,hw+fw,ax));
  // Calle empedrada con su franja de lajas al centro
  vec3 st=cobble(vec2(x,D),far);
  vec2 lj=vec2(dx*.9,D*.62);
  vec2 lf=fract(lj+vec2(0.,step(.5,fract(lj.x*.5))*.5));
  float seam=smoothstep(.0,.06,lf.x)*(1.-smoothstep(.94,1.,lf.x))*smoothstep(.0,.05,lf.y)*(1.-smoothstep(.95,1.,lf.y));
  vec3 laja=uPlank*(.86+.14*hash21(floor(lj)))*mix(1.,mix(.72,1.,seam),far);
  st=mix(st,laja,1.-smoothstep(.92,.98,ax));
  st=mix(st,st*.72,band(ax-hw+.28,.16,fw));
  // Banqueta de losas y el pie de las casas
  vec2 bl=fract(vec2(x*.7,D*.55));
  float bs=smoothstep(.0,.05,bl.x)*smoothstep(.0,.05,bl.y);
  vec3 walk=uSandA*1.05*mix(.82,1.,bs*far+(1.-far));
  vec3 lots=uSandB*.62;
  vec3 near_=mix(walk,lots,smoothstep(hw+1.7,hw+1.8,ax));
  near_=mix(near_,uFoam*.8,band(ax-hw-.1,.1,fw));
  // En las esquinas, la calle que cruza sigue empedrada.
  float box=smoothstep(.72,.78,xw);
  near_=mix(near_,cobble(vec2(D,x),far),box);
  vec3 town=mix(st,near_,smoothstep(hw-fw,hw+fw,ax));
  // Plaza: losas grandes y arriates de grama
  vec2 pg=fract(vec2(x*.32,D*.32));
  float ps=smoothstep(.0,.03,pg.x)*smoothstep(.0,.03,pg.y);
  vec3 plaza=mix(uSandA*.86,uPlank,step(.5,fract(floor(x*.32)*.5+floor(D*.32)*.5)))*mix(.8,1.,ps*far+(1.-far));
  plaza=mix(plaza,uGrass*mix(.8,1.05,vn2(vec2(x*.3,D*.3))),smoothstep(hw+3.,hw+3.2,ax)*(1.-smoothstep(hw+20.,hw+20.2,ax)));
  vec3 col=mix(town,mtn,isMt);
  col=mix(col,plaza,isPl);
  col=max(col,vec3(0.));
  col+=col*lampAt(vec3(x,0.,vP.y))*2.2;
  float dist=length(cameraPosition-vW);
  gl_FragColor=vec4(mix(col,uFog,smoothstep(uFogA,uFogB,dist)),1.);
}`;
// ── Xela: la carretera de la cumbre con helada, el entronque con orillas de tierra,
// las calles mojadas con sus faroles y el parque. Lo mojado va en los decimales del tramo. ──
export const FS_GROUND_XELA = `
precision highp float;
uniform sampler2D uTrack;
uniform float uDist,uLen,uTime,uFogA,uFogB,uNight;
uniform vec3 uSunDir,uSunCol,uShade,uFog,uInk,uSkyTop,uSkyMid,uSkyLow;
uniform vec3 uSandA,uSandB,uWet,uWaterA,uWaterB,uFoam,uPlank,uStreet,uGrass;
${LIGHTS}
${NOISE}
varying vec2 vP;varying vec3 vW;
float band(float v,float w,float fw){return 1.-smoothstep(w,w+fw,abs(v));}
void main(){
  float x=vP.x,D=uDist-vP.y;
  vec4 tr=texture2D(uTrack,vec2(clamp(D/uLen,0.,1.),.5));
  float cx=tr.r,hw=max(tr.g,0.),kind=tr.b,xw=tr.a;
  float fw=fwidth(x)+.02,fd=fwidth(D)+.02;
  float far=1.-smoothstep(.05,.4,fd);
  float dx=x-cx,ax=abs(dx);
  float isMt=1.-smoothstep(.5,.6,kind);
  float isCity=smoothstep(1.5,1.6,kind);
  float isPl=smoothstep(2.5,2.6,kind);
  float wet=clamp((kind-floor(kind+.05))/.4,0.,1.)*(1.-isMt)*(1.-isPl);
  float frost=xw*isMt;
  float box=smoothstep(.72,.78,xw)*(1.-isMt);
  float zebra=smoothstep(.3,.36,xw)*(1.-box)*(1.-isMt);
  // Asfalto en tonos, con parches; mojado se oscurece
  float n1=vn2(vec2(x*.11,D*.045)),n2=vn2(vec2(x*.8,D*.33));
  vec3 asph=uStreet*(.84+.2*floor((n1*.7+n2*.3)*4.)/4.);
  asph*=1.-step(.78,vn2(vec2(x*.2+3.,D*.07)))*.12;
  asph=mix(asph,uStreet*1.3,step(.985,hash21(floor(vec2(x,D)*9.)))*far*.5);
  asph*=1.-wet*.28;
  float dash=step(.45,fract(D*.08)),lw=.07;
  // Cumbre: doble línea amarilla y orillas blancas
  vec3 rMt=asph;
  rMt=mix(rMt,uWet,max(band(dx-.13,lw*.8,fw),band(dx+.13,lw*.8,fw)));
  rMt=mix(rMt,uFoam*.9,max(band(dx-hw+.32,lw,fw),band(dx+hw-.32,lw,fw)));
  // Entronque: carriles de raya cortada; en Xela, raya amarilla al centro y paso de cebra
  vec3 rTw=asph;
  rTw=mix(rTw,uFoam*.86,max(band(dx-1.15,lw,fw),band(dx+1.15,lw,fw))*dash*(1.-isCity));
  rTw=mix(rTw,uWet,band(dx,lw,fw)*dash*isCity*.85);
  rTw=mix(rTw,uFoam*.9,max(band(dx-hw+.3,lw,fw),band(dx+hw-.3,lw,fw))*(1.-isCity));
  rTw=mix(rTw,uFoam*.9,step(.5,fract(x*.85+.25))*zebra*.9);
  vec3 road=mix(rTw,rMt,isMt);
  // Monte: piedrín, grama con agujas de pino y la helada blanca
  float fn=vn2(vec2(x*.09,D*.06)),fn2=vn2(vec2(x*.6,D*.4));
  vec3 forest=uGrass*mix(.55,1.05,floor((fn*.7+fn2*.3)*4.)/4.);
  forest=mix(forest,uSandB*.7,step(.8,vn2(vec2(x*.25,D*.2)))*.45);
  forest=mix(forest,uFoam*.9,frost*smoothstep(.55,.85,vn2(vec2(x*.35,D*.25))+fn*.25)*.7);
  vec3 shoulder=mix(uSandB*.82,uSandA*.7,hash21(floor(vec2(x,D)*6.))*far*.5);
  shoulder=mix(shoulder,uFoam*.85,frost*.25);
  vec3 mside=mix(shoulder,forest,smoothstep(hw+1.3,hw+1.7,ax));
  float drop=smoothstep(.6,.75,vn2(vec2(D*.004,7.)))*step(dx,0.);
  mside=mix(mside,mix(uWaterB,uFog,.55+.35*smoothstep(hw+6.,hw+60.,ax)),drop*smoothstep(hw+4.,hw+6.,ax));
  // Entronque: orilla de tierra con huellas de llanta, y lotes
  vec3 dirt=uSandB*mix(.78,1.,vn2(vec2(x*.5,D*.25)));
  dirt=mix(dirt,uSandB*.62,max(band(ax-hw-1.0,.18,fw),band(ax-hw-2.2,.18,fw))*.6);
  vec3 lots=mix(uSandB*.66,uGrass*.7,step(.6,vn2(vec2(x*.08,D*.05))));
  vec3 tside=mix(dirt,lots,smoothstep(hw+3.4,hw+3.6,ax));
  // Ciudad: banqueta de losas grises con su bordillo
  vec2 bl=fract(vec2(x*.7,D*.55));
  float bs=smoothstep(.0,.05,bl.x)*smoothstep(.0,.05,bl.y);
  vec3 walk=uSandA*mix(.8,1.,bs*far+(1.-far))*(1.-wet*.18);
  vec3 cside=mix(walk,uSandB*.6,smoothstep(hw+1.75,hw+1.85,ax));
  cside=mix(cside,uFoam*.75,band(ax-hw-.08,.09,fw));
  vec3 side=mix(tside,cside,isCity);
  side=mix(side,mside,isMt);
  vec3 col=mix(road,side,smoothstep(hw-fw,hw+fw,ax));
  // La calle que cruza
  col=mix(col,asph*.96,box*step(ax,hw+40.));
  // Parque: losas grandes y arriates
  vec2 pg=fract(vec2(x*.55,D*.55));
  float ps=smoothstep(.0,.04,pg.x)*smoothstep(.0,.04,pg.y);
  vec3 plaza=mix(uSandA*.8,uPlank*.9,step(.5,fract(floor(x*.55)*.5+floor(D*.55)*.5)))*mix(.78,1.,ps*far+(1.-far));
  plaza=mix(plaza,uGrass*mix(.8,1.05,vn2(vec2(x*.3,D*.3))),smoothstep(hw+3.,hw+3.2,ax)*(1.-smoothstep(hw+20.,hw+20.2,ax)));
  col=mix(col,plaza,isPl);
  // Faroles en la noche: charco de luz en la banqueta y su reflejo largo en el asfalto mojado
  float lit=clamp(isCity+isPl,0.,1.)*(1.-box);
  float pool=exp(-pow(mod(D,18.)-9.,2.)*.035)*exp(-pow(ax-hw-1.4,2.)*.06);
  col+=col*vec3(1.25,.9,.5)*pool*uNight*1.15*lit;
  float refl=exp(-pow(mod(D,18.)-7.5,2.)*.012)*exp(-pow(ax-hw+.55,2.)*2.6)*(.6+.4*vn2(vec2(x*3.,D*1.5+uTime*2.)));
  col+=vec3(1.,.78,.45)*refl*uNight*wet*.3*lit;
  // Gotas que salpican en el asfalto
  float drops=step(.97,hash21(floor(vec2(x*4.,D*4.))+floor(uTime*7.)))*wet*far;
  col+=uFoam*drops*.12;
  col=max(col,vec3(0.));
  col+=col*lampAt(vec3(x,0.,vP.y))*2.2;
  float dist=length(cameraPosition-vW);
  gl_FragColor=vec4(mix(col,uFog,smoothstep(uFogA,uFogB,dist)),1.);
}`;
// ── Lago de Atitlán: agua que refleja los volcanes, rayitas de oleaje, cabrillas con el Xocomil,
// la franja de agua mansa, la pita de las boyas y la orilla norte con piedras y monte. ──
export const FS_GROUND_LAKE = `
precision highp float;
uniform sampler2D uTrack;
uniform float uDist,uLen,uTime,uFogA,uFogB,uNight;
uniform vec3 uSunDir,uSunCol,uShade,uFog,uInk,uSkyTop,uSkyMid,uSkyLow,uHill,uHill2;
uniform vec3 uSandA,uSandB,uWet,uWaterA,uWaterB,uFoam,uPlank,uStreet,uGrass;
uniform vec4 uLake;
${LIGHTS}
${NOISE}
${LAKE_SKY}
varying vec2 vP;varying vec3 vW;
float band(float v,float w,float fw){return 1.-smoothstep(w,w+fw,abs(v));}
float calmOff(float D,float hw){return clamp(2.6*sin(D*.0061+.4)+1.1*sin(D*.017+2.),-(hw-1.2),hw-1.2);}
void main(){
  float x=vP.x,D=uDist-vP.y;
  vec4 tr=texture2D(uTrack,vec2(clamp(D/uLen,0.,1.),.5));
  float cx=tr.r,hw=max(tr.g,0.),kind=tr.b,gap=tr.a;
  float fw=fwidth(x)+.02,fd=fwidth(D)+.02;
  float far=1.-smoothstep(.04,.45,fd);
  float dx=x-cx;
  // Oleaje por tramo: espejo en la mañana, picado con el Xocomil y otra vez manso en San Pedro
  float chop=kind<1.?mix(.14,.45,kind):kind<2.?mix(.45,1.,kind-1.):mix(1.,.3,clamp(kind-2.,0.,1.));
  float isX=smoothstep(1.5,1.8,kind)*(1.-smoothstep(2.3,2.6,kind));
  float co=calmOff(D,hw);
  float calm=(1.-smoothstep(.95,1.2,abs(dx-co)))*isX;
  float edge=band(abs(dx-co)-1.07,.07,fw)*isX*step(.5,vn2(vec2(D*.45,sign(dx-co)*9.+uTime*.5)));
  float rough=chop*(1.-calm*.9);
  // La normal se mueve con las ondas: deforma el reflejo y hace los brillos
  vec2 q=vec2(x*.32,D*.2+uTime*(.18+rough*.35));
  float n1=vn2(q),n2=vn2(q*2.7+vec2(7.,3.));
  vec3 N=normalize(vec3((n1-.5)*rough*.32,1.,(n2-.5)*rough*.32));
  vec3 V=normalize(cameraPosition-vW);
  vec3 R=reflect(-V,N);
  float az=atan(R.x,-R.z),el=R.y;
  vec3 refl=mix(uSkyLow,uSkyMid,smoothstep(0.,.2,el));
  refl=mix(refl,uSkyTop,smoothstep(.15,.65,el));
  float top=lkTop(az,uLake.y);
  refl=mix(refl,mix(uHill2,uHill,.35)*.92,1.-smoothstep(top-.004,top+.004,el));
  float fr=.3+.62*pow(1.-max(V.y,0.),5.);
  float dist=length(cameraPosition-vW);
  vec3 base=mix(uWaterB,uWaterA,smoothstep(8.,60.,dist));
  vec3 col=mix(base,refl,fr);
  col=mix(col,mix(uWaterA*.9,refl,.5),calm*.55);
  // Rayitas de oleaje
  vec2 g=vec2(x*.5,D*1.1);
  g.x+=floor(g.y)*.37;
  vec2 id=floor(g),f=fract(g)-.5;
  float h=hash21(id);
  f.x+=(hash21(id+5.)-.5)*.4+sin(uTime*.8+h*6.)*.08;
  f.y+=(hash21(id+9.)-.5)*.5;
  float len=.16+.2*h;
  float st=(1.-smoothstep(len-.06,len,abs(f.x)))*(1.-smoothstep(.04,.1,abs(f.y)));
  st*=step(1.-(.08+.5*rough),hash21(id+13.))*far;
  col=mix(col,mix(uFoam,refl,.3),st*.45);
  // Cabrillas: espuma que sale y se deshace con el viento
  vec2 wg=vec2(x*.22,D*.34+uTime*.3);
  vec2 wid=floor(wg),wf=fract(wg)-.5;
  float wh=hash21(wid+11.);
  float life=fract(uTime*.22+wh*7.);
  float on=step(1.-.34*rough*rough,wh)*smoothstep(0.,.12,life)*(1.-smoothstep(.5,.8,life));
  vec2 wp=(wf-vec2((hash21(wid+2.)-.5)*.5,(hash21(wid+4.)-.5)*.4))*vec2(1.,2.3);
  float cap=(1.-smoothstep(.2,.26,length(wp)))*smoothstep(.1,.16,length(wp-vec2(0.,.12)));
  col=mix(col,uFoam,cap*on*(1.-calm)*mix(.6,1.,far));
  col=mix(col,uFoam*.95,edge*.3*far);
  // Pita de las boyas
  col=mix(col,uInk*2.,band(abs(dx)-hw-.45,.025,fw)*.5*far);
  // Brillos de sol
  float gl=pow(max(dot(R,uSunDir),0.),220.);
  col+=uSunCol*step(.35,gl)*1.6*(1.-calm*.5);
  // Orilla norte: agua bajita, la espuma que lame, piedras y monte
  float ds=cx+hw+gap-x;
  float lap=.35+.25*sin(uTime*1.2+D*.13)+.15*sin(uTime*.7-D*.31);
  vec3 water=mix(col,uWet,.55*(1.-smoothstep(0.,7.,ds)));
  vec3 stones=mix(uSandA,uSandB,floor(vn2(vec2(x*1.3,D*1.3))*3.)/3.);
  vec3 land=uGrass*mix(.62,1.05,floor((vn2(vec2(x*.08,D*.08))*.7+vn2(vec2(x*.5,D*.5))*.3)*4.)/4.);
  land=mix(land,uSandB*.8,step(.78,vn2(vec2(x*.2,D*.2)))*.5);
  vec3 shore=mix(stones,land,smoothstep(3.,3.6,-ds));
  col=mix(shore,water,step(0.,ds));
  col=mix(col,uFoam,band(ds+lap*.5,.12+.06*sin(D*.7+uTime),fw)*.85);
  col=max(col,vec3(0.));
  gl_FragColor=vec4(mix(col,uFog,smoothstep(uFogA,uFogB,dist)),1.);
}`;
// ── Remolino del Xocomil: brazos de espuma que giran sobre un hoyo oscuro ──
export const FS_SWIRL = `
precision highp float;
uniform float uTime,uAmt;
varying vec2 vQ;
void main(){
  float r=length(vQ),a=atan(vQ.y,vQ.x);
  float sp=fract(a/6.2832*3.+r*1.4-uTime*1.6);
  float arm=smoothstep(.0,.12,sp)*(1.-smoothstep(.3,.45,sp))*smoothstep(.12,.5,r);
  float disc=1.-smoothstep(.86,1.,r);
  vec3 c=mix(vec3(.02,.1,.18),vec3(1.5,1.6,1.6),arm);
  float al=disc*uAmt*mix(.85,.55,smoothstep(.6,1.,r));
  gl_FragColor=vec4(c*al,al);
}`;
// ── Estela de la lancha: dos brazos de espuma que se abren y la espuma del motor al centro ──
export const VS_WAKE = `
attribute float aK;
${BEND}
varying vec2 vUv;varying float vK;varying vec3 vW;
void main(){vUv=uv;vK=aK;vec4 w=bendW(vec4(position,1.));vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
export const FS_WAKE = `
precision highp float;
uniform float uTime,uFogA,uFogB;uniform vec3 uFoam,uFog;
${NOISE}
varying vec2 vUv;varying float vK;varying vec3 vW;
void main(){
  float u=abs(vUv.x),v=vUv.y;
  float n=vn2(vec2(vUv.x*2.5+vW.z*.6,vW.z*.9-uTime*.5));
  float arm=smoothstep(.7,.84,u)*(1.-smoothstep(.92,1.,u))*step(.36,n);
  float wash=(1.-smoothstep(.0,.42,u))*(1.-smoothstep(.0,.25,v))*step(.45,vn2(vec2(vUv.x*4.,vW.z*1.6-uTime*.8)));
  float a=clamp((arm*.7+wash*.55)*vK,0.,.85);
  float d=length(cameraPosition-vW);
  vec3 c=mix(uFoam*1.04,uFog,smoothstep(uFogA,uFogB,d));
  gl_FragColor=vec4(c*a,a);
}`;
