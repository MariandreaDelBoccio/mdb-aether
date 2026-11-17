import{c as _,d as L,T as P,r as a,e as R,R as O,C as $,b as W,A as V,V as N,S as G,f as E,u as B,a as X,j as s,B as Y,N as q,g as J}from"./index-DV6mda0e.js";import{C as K}from"./CanvasFrame-DjU1J2QE.js";import{D as Q}from"./DemoChrome-YZMP20EK.js";import{O as Z}from"./OrbitControls-CpZHNfYT.js";const z=e=>e===Object(e)&&!Array.isArray(e)&&typeof e!="function";function F(e,o){const r=_(n=>n.gl),t=L(P,z(e)?Object.values(e):e);return a.useLayoutEffect(()=>{o==null||o(t)},[o]),a.useEffect(()=>{if("initTexture"in r){let n=[];Array.isArray(t)?n=t:t instanceof R?n=[t]:z(t)&&(n=Object.values(t)),n.forEach(u=>{u instanceof R&&r.initTexture(u)})}},[r,t]),a.useMemo(()=>{if(z(e)){const n={};let u=0;for(const m in e)n[m]=t[u++];return n}else return t},[e,t])}F.preload=e=>L.preload(P,e);F.clear=e=>L.clear(P,e);const ee=()=>parseInt(O.replace(/\D+/g,"")),te=ee();class ae extends E{constructor(){super({uniforms:{time:{value:0},fade:{value:1}},vertexShader:`
      uniform float time;
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 0.5);
        gl_PointSize = size * (30.0 / -mvPosition.z) * (3.0 + sin(time + 100.0));
        gl_Position = projectionMatrix * mvPosition;
      }`,fragmentShader:`
      uniform sampler2D pointTexture;
      uniform float fade;
      varying vec3 vColor;
      void main() {
        float opacity = 1.0;
        if (fade == 1.0) {
          float d = distance(gl_PointCoord, vec2(0.5, 0.5));
          opacity = 1.0 / (1.0 + exp(16.0 * (d - 0.25)));
        }
        gl_FragColor = vec4(vColor, opacity);

        #include <tonemapping_fragment>
	      #include <${te>=154?"colorspace_fragment":"encodings_fragment"}>
      }`})}}const oe=e=>new N().setFromSpherical(new G(e,Math.acos(1-Math.random()*2),Math.random()*2*Math.PI)),re=a.forwardRef(({radius:e=100,depth:o=50,count:r=5e3,saturation:t=0,factor:i=4,fade:n=!1,speed:u=1},m)=>{const f=a.useRef(null),[g,b,M]=a.useMemo(()=>{const d=[],v=[],S=Array.from({length:r},()=>(.5+.5*Math.random())*i),p=new $;let y=e+o;const l=o/r;for(let c=0;c<r;c++)y-=l*Math.random(),d.push(...oe(y).toArray()),p.setHSL(c/r,t,.9),v.push(p.r,p.g,p.b);return[new Float32Array(d),new Float32Array(v),new Float32Array(S)]},[r,o,i,e,t]);W(d=>f.current&&(f.current.uniforms.time.value=d.clock.elapsedTime*u));const[w]=a.useState(()=>new ae);return a.createElement("points",{ref:m},a.createElement("bufferGeometry",null,a.createElement("bufferAttribute",{attach:"attributes-position",args:[g,3]}),a.createElement("bufferAttribute",{attach:"attributes-color",args:[b,3]}),a.createElement("bufferAttribute",{attach:"attributes-size",args:[M,1]})),a.createElement("primitive",{ref:f,object:w,attach:"material",blending:V,"uniforms-fade-value":n,depthWrite:!1,transparent:!0,vertexColors:!0}))}),T="/mdb-aether/".replace(/\/?$/,"/"),ne=[`${T}textures/planets/earth_day.jpg`,`${T}textures/planets/earth_night.jpg`,`${T}textures/planets/earth_water.png`,`${T}textures/planets/earth_clouds.png`],U=1.35,C=Math.PI/180;function se(e){const o=new Date(e),r=Date.UTC(o.getUTCFullYear(),0,0),t=(e-r)/864e5,i=-23.44*C*Math.cos(2*Math.PI/365*(t+10)),n=2*Math.PI/364*(t-81),u=9.87*Math.sin(2*n)-7.53*Math.cos(n)-1.5*Math.sin(n),m=o.getUTCHours()+o.getUTCMinutes()/60+o.getUTCSeconds()/3600+o.getUTCMilliseconds()/36e5,f=-(m+u/60-12)*15*C;return{dir:new N(Math.cos(i)*Math.cos(f),Math.sin(i),-Math.cos(i)*Math.sin(f)),lon:f/C,lat:i/C,utcH:m}}function ie(e,o,r){const t=e*C,i=o*C;return new N(Math.cos(t)*Math.cos(i)*r,Math.sin(t)*r,-Math.cos(t)*Math.sin(i)*r)}function le(e){const o=((e+180)%360+360)%360-180;return`${Math.abs(o).toFixed(0)}°${o>=0?"E":"W"}`}function ce(e){return`${Math.abs(e).toFixed(0)}°${e>=0?"N":"S"}`}const ue=`
varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;
void main(){
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`,me=`
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uWater;
uniform vec3 uSun;
uniform float uLights;
uniform float uAtmos;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;

void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  float ndl = dot(N, uSun);

  vec3 dayCol = texture2D(uDay, vUv).rgb;
  float water = texture2D(uWater, vUv).r;

  // direct sun with a soft terminator
  float lam = smoothstep(-0.04, 0.55, ndl);
  vec3 lit = dayCol * (lam * 1.25);

  // warm band along the terminator
  float tw = smoothstep(-0.12, 0.0, ndl) * (1.0 - smoothstep(0.0, 0.22, ndl));
  lit += vec3(1.0, 0.42, 0.16) * tw * 0.22 * dayCol;

  // ocean glint
  vec3 H = normalize(uSun + V);
  float glint = pow(max(dot(N, H), 0.0), 420.0) * water * smoothstep(0.0, 0.2, ndl);
  lit += vec3(1.0, 0.95, 0.85) * glint * 0.55;
  // broad soft sheen so oceans pick up the light without blowing out
  float sheen = pow(max(dot(N, H), 0.0), 36.0) * water * smoothstep(0.0, 0.3, ndl);
  lit += vec3(0.30, 0.45, 0.75) * sheen * 0.22;

  // faint earthshine so the night side is never flat black
  vec3 col = lit + dayCol * vec3(0.35, 0.5, 0.9) * 0.008;

  // city lights, only in darkness
  float dark = 1.0 - smoothstep(-0.10, 0.14, ndl);
  vec3 city = texture2D(uNight, vUv).rgb;
  col += city * vec3(1.0, 0.74, 0.42) * 1.7 * dark * uLights;

  // limb haze
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.2);
  float sunSide = smoothstep(-0.30, 0.40, ndl);
  col += vec3(0.22, 0.46, 1.0) * fres * 0.7 * sunSide * uAtmos;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`,fe=`
varying vec3 vNv;
varying vec3 vNw;
void main(){
  vNv = normalize(normalMatrix * normal);
  vNw = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,de=`
uniform vec3 uSun;
uniform float uAtmos;
varying vec3 vNv;
varying vec3 vNw;
void main(){
  float rim = pow(max(0.0, 0.64 - dot(vNv, vec3(0.0, 0.0, 1.0))), 3.4);
  float ndl = dot(normalize(vNw), uSun);
  float sunSide = smoothstep(-0.45, 0.45, ndl);
  float dusk = smoothstep(-0.25, 0.0, ndl) * (1.0 - smoothstep(0.0, 0.3, ndl));
  vec3 blue = vec3(0.16, 0.42, 1.0);
  vec3 warm = vec3(1.0, 0.5, 0.25);
  vec3 col = mix(blue, warm, dusk * 0.7);
  float a = rim * (0.06 + sunSide * 1.15) * uAtmos;
  gl_FragColor = vec4(col * a * 1.5, a);
}
`;function ve({clouds:e,lights:o,atmosphere:r,mode:t,reduced:i,clockRef:n}){const u=_(h=>h.gl),m=_(h=>h.camera),[f,g,b,M]=F(ne,h=>{const k=Array.isArray(h)?h:[h],A=Math.min(8,u.capabilities.getMaxAnisotropy());k.forEach((j,x)=>{j.colorSpace=x===2?q:J,j.anisotropy=A,j.needsUpdate=!0})}),w=a.useRef(null),d=a.useRef(null),v=a.useRef(Date.now()),S=a.useRef(performance.now()),p=a.useRef(0),y=a.useRef(!1),l=a.useMemo(()=>new E({vertexShader:ue,fragmentShader:me,uniforms:{uDay:{value:f},uNight:{value:g},uWater:{value:b},uSun:{value:new N(1,0,0)},uLights:{value:1},uAtmos:{value:1}}}),[f,g,b]),c=a.useMemo(()=>new E({vertexShader:fe,fragmentShader:de,uniforms:{uSun:{value:new N(1,0,0)},uAtmos:{value:1}},side:Y,blending:V,transparent:!0,depthWrite:!1,toneMapped:!1}),[]);return W((h,k)=>{const A=performance.now(),j=A-S.current;S.current=A,t===0||i?v.current=Date.now():v.current+=Math.min(j,100)*3600;const x=se(v.current);if(!y.current){y.current=!0;const D=ie(22,x.lon-34,6.4);m.position.copy(D),m.lookAt(0,0,0)}if(l.uniforms.uSun.value.copy(x.dir),l.uniforms.uLights.value=o?1:0,l.uniforms.uAtmos.value=r?1:0,c.uniforms.uSun.value.copy(x.dir),c.uniforms.uAtmos.value=r?1:0,w.current&&w.current.position.copy(x.dir).multiplyScalar(10),d.current&&!i&&(d.current.rotation.y+=k*.0035),n.current&&h.clock.elapsedTime-p.current>.12){p.current=h.clock.elapsedTime;const D=new Date(v.current),I=String(D.getUTCHours()).padStart(2,"0"),H=String(D.getUTCMinutes()).padStart(2,"0");n.current.textContent=`UTC ${I}:${H} · ☀ ${ce(x.lat)} ${le(x.lon)}`}}),s.jsxs("group",{children:[s.jsx("directionalLight",{ref:w,intensity:2.6,color:"#fff6ea"}),s.jsx("mesh",{material:l,children:s.jsx("sphereGeometry",{args:[U,128,96]})}),e?s.jsxs("mesh",{ref:d,scale:1.012,children:[s.jsx("sphereGeometry",{args:[U,96,72]}),s.jsx("meshStandardMaterial",{map:M,transparent:!0,opacity:.78,depthWrite:!1,roughness:1,metalness:0,color:new $("#ffffff")})]}):null,s.jsx("mesh",{material:c,scale:1.17,children:s.jsx("sphereGeometry",{args:[U,64,48]})})]})}function xe(){var v,S,p,y;const{t:e,lang:o}=B(),r=X(),t=e.demos["living-planet"],i=a.useRef(null),[n,u]=a.useState(!0),[m,f]=a.useState(!0),[g,b]=a.useState(!0),[M,w]=a.useState(0),d=[{label:(v=t.layers)==null?void 0:v[0],on:n,set:u},{label:(S=t.layers)==null?void 0:S[1],on:m,set:f},{label:(p=t.layers)==null?void 0:p[2],on:g,set:b}];return s.jsxs("div",{className:"demo-page",children:[s.jsxs(K,{environment:!1,background:"#010207",camera:{position:[0,1,6.4],fov:34},children:[s.jsx("ambientLight",{intensity:.04}),s.jsx(re,{radius:90,depth:50,count:r?1200:4200,factor:3.4,saturation:0,fade:!0,speed:0}),s.jsx(ve,{clouds:n,lights:m,atmosphere:g,mode:M,reduced:r,clockRef:i,lang:o}),s.jsx(Z,{enablePan:!1,enableDamping:!0,dampingFactor:.07,rotateSpeed:.55,zoomSpeed:.6,minDistance:2.3,maxDistance:11})]}),s.jsxs(Q,{id:"living-planet",children:[s.jsx("span",{className:"hud",ref:i,"aria-live":"off"}),s.jsx("div",{className:"material-row",role:"group","aria-label":"Layers",children:d.map(l=>s.jsx("button",{type:"button",className:l.on?"is-active":"","aria-pressed":l.on,onClick:()=>l.set(c=>!c),children:l.label},l.label))}),r?null:s.jsx("div",{className:"material-row",role:"group","aria-label":"Time",children:(y=t.actions)==null?void 0:y.map((l,c)=>s.jsx("button",{type:"button",className:M===c?"is-active":"","aria-pressed":M===c,onClick:()=>w(c),children:l},l))})]})]})}export{xe as LivingPlanet};
