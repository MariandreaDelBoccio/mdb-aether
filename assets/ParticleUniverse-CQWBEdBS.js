import{a as E,j as i,b as H,r as n,h as S,V as A,s as G,t as T,f as V,C as j,A as F}from"./index-DV6mda0e.js";import{C as _}from"./CanvasFrame-DjU1J2QE.js";import{D as I}from"./DemoChrome-YZMP20EK.js";const y=6,O=`
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uVel;
uniform float uHover;
uniform float uPress;
uniform vec3 uShock[${y}];
attribute float aSeed;
varying float vLift;
varying float vGlow;
varying float vDist;

void main() {
  vec3 pos = position;
  vec2 base = position.xz;

  float wave =
    sin(base.x * 0.55 + uTime * 0.9 + aSeed * 0.3) * 0.55 +
    cos(base.y * 0.48 - uTime * 0.7) * 0.4 +
    sin((base.x + base.y) * 0.22 + uTime * 0.35) * 0.35;

  vec2 rel = base - uMouse;
  float d = length(rel);

  // hover: the field swirls around the pointer
  float fall = exp(-d * d * 0.085) * uHover;
  float ang = fall * (1.15 + uPress * 1.2);
  float c = cos(ang);
  float s = sin(ang);
  vec2 swirled = mat2(c, -s, s, c) * rel;

  // hold: everything is drawn toward the pointer
  float pull = exp(-d * d * 0.045) * uPress;
  swirled *= 1.0 - pull * 0.62;

  vec2 xz = uMouse + swirled;

  // wake: motion drags a ridge of light behind the cursor
  float speed = length(uVel);
  float wake = exp(-d * d * 0.16) * min(speed * 0.35, 1.6) * uHover;

  float lift =
    exp(-d * d * 0.16) * uHover * 0.85 +
    sin(d * 4.2 - uTime * 5.5) * exp(-d * 0.45) * uHover * 0.2 +
    wake * 0.5 -
    pull * 0.95;

  // click: shock rings travelling outward
  float ring = 0.0;
  for (int i = 0; i < ${y}; i++) {
    vec3 sh = uShock[i];
    float age = uTime - sh.z;
    if (age > 0.0 && age < 7.0) {
      vec2 toS = base - sh.xy;
      float sd = length(toS);
      float r = age * 5.2;
      float band = exp(-pow(sd - r, 2.0) * 1.15) * exp(-age * 0.75);
      ring += band;
      xz += normalize(toS + 0.0001) * band * 0.42;
    }
  }

  pos.xz = xz;
  pos.y = wave + lift + ring * 1.7;
  vLift = pos.y;
  vGlow = fall * 0.6 + ring * 0.9 + wake * 0.7 + pull * 0.6;
  vDist = d;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float size = 120.0 + vLift * 26.0 + vGlow * 80.0;
  gl_PointSize = size * (1.1 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`,W=`
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uHot;
varying float vLift;
varying float vGlow;
varying float vDist;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  if (r > 0.5) discard;
  float glow = smoothstep(0.5, 0.0, r);
  float core = smoothstep(0.22, 0.0, r);
  vec3 col = mix(uColorA, uColorB, clamp(vLift * 0.5 + 0.55, 0.0, 1.0));
  col = mix(col, uHot, clamp(vGlow, 0.0, 1.0));
  float alpha = glow * 0.7 + core * 1.0;
  alpha *= smoothstep(14.0, 2.0, vDist) * 0.35 + 0.65;
  gl_FragColor = vec4(col, alpha);
}
`;function $({cols:o,rows:s,reduced:m}){const l=n.useRef(null),a=n.useMemo(()=>new S(0,0),[]),d=n.useMemo(()=>new S(0,0),[]),c=n.useMemo(()=>new S(0,0),[]),h=n.useMemo(()=>new A,[]),g=n.useRef(0),M=n.useRef(0),b=n.useRef(0),C=n.useRef(0),{geometry:L,material:f}=n.useMemo(()=>{const e=o*s,t=new Float32Array(e*3),r=new Float32Array(e),p=17,w=12.5;let u=0;for(let x=0;x<s;x++)for(let z=0;z<o;z++){const B=(Math.random()-.5)*.7*(p/o),D=(Math.random()-.5)*.7*(w/s);t[u*3]=(z/(o-1)-.5)*p+B,t[u*3+1]=0,t[u*3+2]=(x/(s-1)-.5)*w+D,r[u]=Math.random()*Math.PI*2,u++}const v=new G;v.setAttribute("position",new T(t,3)),v.setAttribute("aSeed",new T(r,1));const k=new V({transparent:!0,depthWrite:!1,blending:F,uniforms:{uTime:{value:0},uMouse:{value:a},uVel:{value:c},uHover:{value:0},uPress:{value:0},uShock:{value:Array.from({length:y},()=>new A(0,0,-100))},uColorA:{value:new j("#2c78c0")},uColorB:{value:new j("#b8e2ff")},uHot:{value:new j("#ffffff")}},vertexShader:O,fragmentShader:W});return{geometry:v,material:k}},[o,s,a,c]);n.useEffect(()=>{const e=()=>{b.current=0};return window.addEventListener("pointerup",e),window.addEventListener("pointercancel",e),()=>{window.removeEventListener("pointerup",e),window.removeEventListener("pointercancel",e)}},[]);const R=(e,t,r)=>{f.uniforms.uShock.value[C.current%y].set(e,t,r),C.current+=1};H((e,t)=>{const r=Math.min(t,.05),p=e.clock.elapsedTime;f.uniforms.uTime.value=m?.8:p;const w=a.x,u=a.y,v=1-Math.exp(-r*9);a.x+=(d.x-a.x)*v,a.y+=(d.y-a.y)*v;const k=(a.x-w)/Math.max(r,.001),x=(a.y-u)/Math.max(r,.001);c.x+=(k-c.x)*(1-Math.exp(-r*8)),c.y+=(x-c.y)*(1-Math.exp(-r*8)),M.current+=(b.current-M.current)*(1-Math.exp(-r*6)),f.uniforms.uHover.value=g.current,f.uniforms.uPress.value=M.current,l.current&&(l.current.rotation.x=0,l.current.position.y=-.6)});const P=e=>{const t=l.current;t&&(h.copy(e.point),t.worldToLocal(h),d.set(h.x,h.z))};return i.jsxs("group",{ref:l,children:[i.jsx("points",{geometry:L,material:f,frustumCulled:!1}),i.jsxs("mesh",{"rotation-x":-Math.PI/2,visible:!1,onPointerMove:e=>{m||(P(e),g.current=1)},onPointerOut:()=>{g.current=0},onPointerDown:e=>{m||(P(e),g.current=1,b.current=1,R(d.x,d.y,f.uniforms.uTime.value))},children:[i.jsx("planeGeometry",{args:[40,30]}),i.jsx("meshBasicMaterial",{})]})]})}function K(){return H(({camera:o,pointer:s})=>{o.position.x+=(s.x*.9-o.position.x)*.03,o.lookAt(0,-.5,.4)}),null}function Z(){const o=E(),s=typeof window<"u"&&window.matchMedia("(max-width: 720px)").matches,m=o?48:s?70:110,l=o?36:s?52:80;return i.jsxs("div",{className:"demo-page demo-particles",children:[i.jsxs(_,{environment:!1,camera:{position:[0,6.4,8.6],fov:42},background:"#03060c",children:[i.jsx(K,{}),i.jsx($,{cols:m,rows:l,reduced:o})]}),i.jsx(I,{id:"particle-universe"})]})}export{Z as ParticleUniverse};
