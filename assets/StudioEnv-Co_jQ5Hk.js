import{r as a,c as b,W as w,m as L,n as O,o as q,C as X,f as R,b as J,_ as K,j as e,p as N,B as Q,q as f}from"./index-DV6mda0e.js";const Y={uniforms:{tDiffuse:{value:null},h:{value:1/512}},vertexShader:`
      varying vec2 vUv;

      void main() {

        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

      }
  `,fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float h;

    varying vec2 vUv;

    void main() {

    	vec4 sum = vec4( 0.0 );

    	sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;

    	gl_FragColor = sum;

    }
  `},$={uniforms:{tDiffuse:{value:null},v:{value:1/512}},vertexShader:`
    varying vec2 vUv;

    void main() {

      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    }
  `,fragmentShader:`

  uniform sampler2D tDiffuse;
  uniform float v;

  varying vec2 vUv;

  void main() {

    vec4 sum = vec4( 0.0 );

    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;

    gl_FragColor = sum;

  }
  `},re=a.forwardRef(({scale:r=10,frames:D=1/0,opacity:E=1,width:o=1,height:n=1,blur:g=1,near:_=0,far:k=10,resolution:c=512,smooth:G=!0,color:h="#000000",depthWrite:z=!1,renderOrder:A,...F},V)=>{const m=a.useRef(null),v=b(t=>t.scene),i=b(t=>t.gl),l=a.useRef(null);o=o*(Array.isArray(r)?r[0]:r||1),n=n*(Array.isArray(r)?r[1]:r||1);const[x,W,Z,s,p,y,U]=a.useMemo(()=>{const t=new w(c,c),B=new w(c,c);B.texture.generateMipmaps=t.texture.generateMipmaps=!1;const C=new L(o,n).rotateX(Math.PI/2),H=new O(C),d=new q;d.depthTest=d.depthWrite=!1,d.onBeforeCompile=u=>{u.uniforms={...u.uniforms,ucolor:{value:new X(h)}},u.fragmentShader=u.fragmentShader.replace("void main() {",`uniform vec3 ucolor;
           void main() {
          `),u.fragmentShader=u.fragmentShader.replace("vec4( vec3( 1.0 - fragCoordZ ), opacity );","vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );")};const T=new R(Y),I=new R($);return I.depthTest=T.depthTest=!1,[t,C,d,H,T,I,B]},[c,o,n,r,h]),M=t=>{s.visible=!0,s.material=p,p.uniforms.tDiffuse.value=x.texture,p.uniforms.h.value=t*1/256,i.setRenderTarget(U),i.render(s,l.current),s.material=y,y.uniforms.tDiffuse.value=U.texture,y.uniforms.v.value=t*1/256,i.setRenderTarget(x),i.render(s,l.current),s.visible=!1};let S=0,P,j;return J(()=>{l.current&&(D===1/0||S<D)&&(S++,P=v.background,j=v.overrideMaterial,m.current.visible=!1,v.background=null,v.overrideMaterial=Z,i.setRenderTarget(x),i.render(v,l.current),M(g),G&&M(g*.4),i.setRenderTarget(null),m.current.visible=!0,v.overrideMaterial=j,v.background=P)}),a.useImperativeHandle(V,()=>m.current,[]),a.createElement("group",K({"rotation-x":Math.PI/2},F,{ref:m}),a.createElement("mesh",{renderOrder:A,geometry:W,scale:[1,-1,1],rotation:[-Math.PI/2,0,0]},a.createElement("meshBasicMaterial",{transparent:!0,map:x.texture,opacity:E,depthWrite:z})),a.createElement("orthographicCamera",{ref:l,args:[-o/2,o/2,n/2,-n/2,_,k]}))});function te({intensity:r=1}){return e.jsxs(N,{resolution:512,environmentIntensity:r,children:[e.jsxs("mesh",{scale:60,children:[e.jsx("sphereGeometry",{args:[1,32,16]}),e.jsx("shaderMaterial",{side:Q,toneMapped:!1,vertexShader:"varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:"varying vec3 vP; void main(){ float h = vP.y * 0.5 + 0.5; vec3 lo = vec3(0.01,0.012,0.016); vec3 mid = vec3(0.10,0.115,0.14); vec3 hi = vec3(0.55,0.6,0.68); vec3 c = mix(lo, mid, smoothstep(0.1,0.55,h)); c = mix(c, hi, smoothstep(0.55,1.0,h)); gl_FragColor = vec4(c,1.0); }"})]}),e.jsx(f,{form:"rect",intensity:5,position:[0,6,1],"rotation-x":Math.PI/2,scale:[12,5,1],color:"#ffffff"}),e.jsx(f,{form:"rect",intensity:3.4,position:[-6,1.5,1],"rotation-y":Math.PI/2,scale:[2.2,8,1],color:"#ffffff"}),e.jsx(f,{form:"rect",intensity:3.4,position:[6,1.5,-1],"rotation-y":-Math.PI/2,scale:[2.2,8,1],color:"#dfe9ff"}),e.jsx(f,{form:"rect",intensity:3.2,position:[0,2,-7],scale:[14,3,1],color:"#ffffff"}),e.jsx(f,{form:"ring",intensity:4,position:[3,3,5],scale:3,color:"#fff4e0"}),e.jsx(f,{form:"rect",intensity:.7,position:[0,-4,2],"rotation-x":-Math.PI/2,scale:[10,6,1],color:"#8a9aa8"})]})}export{re as C,te as S};
