import{u as d,a as h,r as l,j as r,V as m,C as x,b as S,M as g}from"./index-DV6mda0e.js";import{C as P}from"./CanvasFrame-DjU1J2QE.js";import{D as T}from"./DemoChrome-YZMP20EK.js";import{S as b,C as M}from"./StudioEnv-Co_jQ5Hk.js";import{S as j}from"./glsl-D3vT2fwX.js";import{O as w}from"./OrbitControls-CpZHNfYT.js";const C=[{color:"#f4f7fb",metalness:1,roughness:.09,clearcoat:0,env:1.6},{color:"#f2c26b",metalness:1,roughness:.07,clearcoat:.3,env:1.5},{color:"#060608",metalness:.15,roughness:.04,clearcoat:1,env:2.4}],D=1.15,N=`
uniform float uTime;
uniform vec3 uPoint;
uniform float uHover;
uniform vec3 uSplashDir;
uniform float uSplashT;
uniform float uSplashAmp;
uniform float uFlow;

vec3 aeDisplace(vec3 n){
  float flow =
    snoise(n * 0.85 + vec3(0.0, uTime * 0.12, 0.0)) * 0.13 +
    snoise(n * 1.7 - vec3(uTime * 0.16, 0.0, 0.0)) * 0.035;
  flow *= uFlow;

  float d = acos(clamp(dot(n, normalize(uPoint)), -1.0, 1.0));
  float ripple = sin(d * 15.0 - uTime * 7.0) * exp(-d * 3.4) * uHover * 0.085;
  float bump = exp(-d * d * 9.0) * uHover * 0.17;

  float sd = acos(clamp(dot(n, normalize(uSplashDir)), -1.0, 1.0));
  float age = max(uTime - uSplashT, 0.0);
  float splash = sin(sd * 13.0 - age * 10.0) * exp(-sd * 1.9) * exp(-age * 1.5) * uSplashAmp * 0.2;
  splash += exp(-sd * sd * 5.0) * exp(-age * 2.2) * uSplashAmp * 0.2;

  return n * (${D.toFixed(2)} + flow + ripple + bump + splash);
}
`;function y(i){return l.useMemo(()=>{const a=new g;return a.onBeforeCompile=n=>{Object.assign(n.uniforms,i),n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
${j}
${N}`).replace("#include <beginnormal_vertex>",`
          vec3 aeN = normalize(position);
          vec3 aeT = normalize(cross(aeN, abs(aeN.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
          vec3 aeB = cross(aeN, aeT);
          vec3 aeP0 = aeDisplace(aeN);
          vec3 aeP1 = aeDisplace(normalize(aeN + aeT * 0.012));
          vec3 aeP2 = aeDisplace(normalize(aeN + aeB * 0.012));
          vec3 objectNormal = normalize(cross(aeP1 - aeP0, aeP2 - aeP0));
          `).replace("#include <begin_vertex>","vec3 transformed = aeP0;")},a.customProgramCacheKey=()=>"aether-liquid-v1",a},[i])}function z({mat:i,reduced:a}){const n=l.useRef(null),o=l.useMemo(()=>({uTime:{value:0},uPoint:{value:new m(0,0,1)},uHover:{value:0},uSplashDir:{value:new m(0,0,1)},uSplashT:{value:-100},uSplashAmp:{value:0},uFlow:{value:a?.25:1}}),[a]),s=y(o),u=l.useRef(0),c=l.useMemo(()=>new m(0,0,1),[]),p=l.useMemo(()=>new m,[]);l.useEffect(()=>{const e=C[i];s.color=new x(e.color),s.metalness=e.metalness,s.roughness=e.roughness,s.clearcoat=e.clearcoat,s.clearcoatRoughness=.04,s.envMapIntensity=e.env,s.needsUpdate=!0},[i,s]),S((e,t)=>{const f=1-Math.exp(-Math.min(t,.1)*7);o.uTime.value=e.clock.elapsedTime,o.uHover.value+=(u.current-o.uHover.value)*f,o.uPoint.value.lerp(c,f).normalize()});const v=e=>{const t=n.current;return t?(p.copy(e.point),t.worldToLocal(p),p.normalize()):null};return r.jsx("mesh",{ref:n,material:s,frustumCulled:!1,onPointerOver:()=>{a||(u.current=1)},onPointerOut:()=>{u.current=0},onPointerMove:e=>{if(a)return;const t=v(e);t&&c.copy(t)},onClick:e=>{if(a)return;const t=v(e);t&&(o.uSplashDir.value.copy(t),o.uSplashT.value=o.uTime.value,o.uSplashAmp.value=1)},children:r.jsx("sphereGeometry",{args:[1,256,192]})})}function I(){const{t:i}=d(),a=h(),[n,o]=l.useState(0),s=i.demos["liquid-metal"].materials??[];return r.jsxs("div",{className:"demo-page demo-liquid",children:[r.jsxs(P,{environment:!1,background:null,camera:{position:[0,.35,5.9],fov:36},children:[r.jsx(b,{}),r.jsx(z,{mat:n,reduced:a}),r.jsx(M,{position:[0,-1.5,0],opacity:.55,scale:9,blur:2.8,far:3,color:"#000"}),r.jsx(w,{enablePan:!1,enableDamping:!0,dampingFactor:.08,minDistance:3.4,maxDistance:8.5,rotateSpeed:.9,autoRotate:!a,autoRotateSpeed:.5,maxPolarAngle:Math.PI*.62})]}),r.jsx(T,{id:"liquid-metal",children:r.jsx("div",{className:"material-row",role:"group","aria-label":"Material",children:s.map((u,c)=>r.jsx("button",{type:"button",className:n===c?"is-active":"","aria-pressed":n===c,onClick:()=>o(c),children:u},u))})})]})}export{I as LiquidMetal};
