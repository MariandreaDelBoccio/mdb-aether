import{a as C,j as r,r as n,c as b,f as z,C as f,V as g,b as H}from"./index-DV6mda0e.js";import{C as T}from"./CanvasFrame-DjU1J2QE.js";import{D}from"./DemoChrome-YZMP20EK.js";import{S as P}from"./glsl-D3vT2fwX.js";import{O as j}from"./OrbitControls-CpZHNfYT.js";const N=`
uniform float uTime;
uniform float uAmp;
uniform float uHover;
uniform vec3 uPoint;
uniform float uPulseT;
varying vec3 vNv;
varying float vDisp;
varying float vGlow;

${P}

// returns xyz = displaced position, and writes disp/glow through globals
float gDisp;
float gGlow;

vec3 organic(vec3 n){
  float t = uTime * (0.32 + uHover * 0.85);
  float a = snoise(n * 1.35 + t * vec3(0.7, 0.5, 0.3));
  float b = snoise(n * 3.1 - t * 0.8) * 0.35;
  float d = (a + b) * uAmp * (0.65 + uHover * 0.95);

  float k = max(dot(n, normalize(uPoint)), 0.0);
  float bulge = pow(k, 5.0) * uHover * 0.36;

  float ang = acos(clamp(dot(n, normalize(uPoint)), -1.0, 1.0));
  float age = max(uTime - uPulseT, 0.0);
  float pulse = sin(ang * 9.0 - age * 9.0) * exp(-ang * 1.6) * exp(-age * 1.7) * 0.2;

  gDisp = d + bulge + pulse;
  gGlow = pow(k, 6.0) * uHover + abs(pulse) * 2.0;
  return n * (1.2 + gDisp);
}

void main(){
  vec3 n = normalize(position);
  vec3 t1 = normalize(cross(n, abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 t2 = cross(n, t1);

  vec3 p0 = organic(n);
  vDisp = gDisp;
  vGlow = gGlow;
  vec3 p1 = organic(normalize(n + t1 * 0.012));
  vec3 p2 = organic(normalize(n + t2 * 0.012));
  vec3 nn = normalize(cross(p1 - p0, p2 - p0));

  vNv = normalize(normalMatrix * nn);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p0, 1.0);
}
`,G=`
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uHot;
varying vec3 vNv;
varying float vDisp;
varying float vGlow;

void main(){
  vec3 N = normalize(vNv);
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 L = normalize(vec3(-0.5, 0.75, 0.8));
  float diff = max(dot(N, L), 0.0) * 0.8 + 0.2;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 56.0);

  vec3 base = mix(uColorA, uColorB, smoothstep(-0.35, 0.5, vDisp));
  vec3 col = base * diff;
  col += vec3(0.7, 0.82, 0.95) * fres * 0.55;
  col += vec3(1.0) * spec * 0.85;
  col = mix(col, uHot, clamp(vGlow, 0.0, 1.0) * 0.55);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;function R({reduced:o}){const t=n.useRef(null),l=n.useRef(null),{camera:x}=b(),a=n.useMemo(()=>new z({vertexShader:N,fragmentShader:G,uniforms:{uTime:{value:0},uAmp:{value:o?.08:.3},uHover:{value:0},uPoint:{value:new g(0,0,1)},uPulseT:{value:-100},uColorA:{value:new f("#2a323a")},uColorB:{value:new f("#c8d0d8")},uHot:{value:new f("#8fc4ff")}}}),[o]),u=n.useRef({x:0,y:0,last:-1e9});n.useEffect(()=>{if(o)return;const c=m=>{u.current.x=m.clientX/window.innerWidth*2-1,u.current.y=-(m.clientY/window.innerHeight*2-1),u.current.last=performance.now()};return window.addEventListener("pointermove",c,{passive:!0}),()=>window.removeEventListener("pointermove",c)},[o]);const v=n.useMemo(()=>new g,[]),d=n.useRef({x:0,y:0,hover:0});return H((c,m)=>{const p=Math.min(m,.1),h=c.clock.elapsedTime;if(a.uniforms.uTime.value=o?.5:h,o)return;const i=u.current,e=d.current,w=performance.now()-i.last<2600,y=Math.max(0,1.15-Math.hypot(i.x*.9,i.y)*.8),M=w?.35+.65*Math.min(1,y):0,s=1-Math.exp(-p*5);e.x+=(i.x-e.x)*s,e.y+=(i.y-e.y)*s,e.hover+=(M-e.hover)*(1-Math.exp(-p*3.5)),a.uniforms.uHover.value=e.hover,t.current&&(t.current.rotation.x+=(-e.y*.32-t.current.rotation.x)*s,t.current.rotation.y+=(e.x*.42-t.current.rotation.y)*s),v.set(e.x*1.25,e.y*1.25,1.15).applyQuaternion(x.quaternion),l.current&&(l.current.updateWorldMatrix(!0,!1),v.transformDirection(l.current.matrixWorld.clone().invert())),a.uniforms.uPoint.value.lerp(v.normalize(),s)}),r.jsx("group",{ref:t,children:r.jsx("mesh",{ref:l,material:a,frustumCulled:!1,onClick:()=>{o||(a.uniforms.uPulseT.value=a.uniforms.uTime.value)},children:r.jsx("sphereGeometry",{args:[1,192,144]})})})}function V(){const o=C();return r.jsxs("div",{className:"demo-page",children:[r.jsxs(T,{environment:!1,camera:{position:[0,.2,5.8],fov:40},children:[r.jsx(R,{reduced:o}),r.jsx(j,{enablePan:!1,enableZoom:!1,enableDamping:!0,dampingFactor:.08,autoRotate:!o,autoRotateSpeed:.35})]}),r.jsx(D,{id:"organic-matter"})]})}export{V as OrganicMatter};
