'use strict';
// Small, dependency-free WebGL sculpture. Render only while visible, at <= 30fps.
(() => {
  const canvas = document.querySelector('#sculpture');
  if (!canvas) return;
  const container = document.querySelector('#hero-art');
  const toggle = document.querySelector('#motion-toggle');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let gl;
  try { gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' }); } catch { /* CSS fallback remains visible. */ }
  if (!gl) { toggle.hidden = true; canvas.tabIndex = -1; canvas.setAttribute('aria-hidden', 'true'); return; }
  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source); gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error('Unable to compile artwork shader.');
    return result;
  }
  try {
    const vertex = shader(gl.VERTEX_SHADER, `
      attribute vec3 position; attribute vec3 normal;
      uniform float rotation; uniform vec2 pointer; uniform float aspect;
      varying vec3 vNormal; varying vec3 vPosition;
      void main() {
        float y = rotation + pointer.x * .25;
        float x = -.45 + pointer.y * .2;
        mat3 ry = mat3(cos(y),0.,-sin(y), 0.,1.,0., sin(y),0.,cos(y));
        mat3 rx = mat3(1.,0.,0., 0.,cos(x),sin(x), 0.,-sin(x),cos(x));
        float z = -.35;
        mat3 rz = mat3(cos(z),sin(z),0., -sin(z),cos(z),0., 0.,0.,1.);
        mat3 model = rz * rx * ry;
        vec3 p = model * position;
        vNormal = model * normal; vPosition = p;
        float d = 5.5 - p.z;
        gl_Position = vec4(p.x * 2.35 / aspect, p.y * 2.35, (d-2.)*.12, d);
      }
    `);
    const fragment = shader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform vec3 tint;
      uniform float wireframe;
      varying vec3 vNormal; varying vec3 vPosition;
      void main() {
        vec3 n = normalize(vNormal);
        vec3 eye = normalize(vec3(0.,0.,6.) - vPosition);
        vec3 key = normalize(vec3(-3.,5.,4.));
        vec3 fill = normalize(vec3(4.,-1.,2.));
        float diffuse = max(dot(n,key),0.);
        float soft = max(dot(n,fill),0.);
        float spec = pow(max(dot(n,normalize(key+eye)),0.),55.);
        float spec2 = pow(max(dot(n,normalize(fill+eye)),0.),24.);
        float rim = pow(1.-max(dot(n,eye),0.),3.);
        vec3 base = tint * .78;
        vec3 color = base * (.18 + diffuse*.76 + soft*.25);
        color += mix(tint,vec3(1.),.65)*spec*.8 + tint*spec2*.24;
        color += tint*rim*.22;
        float stripes = .985 + .015*sin(vPosition.y*200.);
        if (wireframe > .5) color = tint * (.45 + diffuse*.55 + soft*.22);
        gl_FragColor = vec4(color*stripes,wireframe > .5 ? .74 : 1.);
      }
    `);
    const program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Unable to link artwork.');
    gl.useProgram(program);
    const vertices = [], normals = [], indices = [], wireIndices = [];
    const segments = 192, sides = 24;
    function center(t) {
      const r = 1.03 + .35 * Math.cos(3*t);
      return [r*Math.cos(2*t), r*Math.sin(2*t), .48*Math.sin(3*t)];
    }
    function normalize(v) { const length = Math.hypot(...v); return v.map(n => n/length); }
    function cross(a,b) { return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
    for (let i=0; i<=segments; i++) {
      const t = i/segments*Math.PI*2, p = center(t), next = center(t+.001);
      const tangent = normalize(next.map((n,j) => n-p[j]));
      const frame = normalize(cross(tangent,normalize(p)));
      const binormal = normalize(cross(tangent,frame));
      for (let j=0;j<=sides;j++) {
        const angle = j/sides*Math.PI*2;
        const n = frame.map((v,k) => v*Math.cos(angle)+binormal[k]*Math.sin(angle));
        vertices.push(...p.map((v,k) => v+n[k]*.255)); normals.push(...n);
        if (i<segments && j<sides) {
          const a = i*(sides+1)+j, b = a+sides+1;
          indices.push(a,b,a+1,b,b+1,a+1);
          if (i%4 === 0) wireIndices.push(a,a+1);
          if (j%3 === 0) wireIndices.push(a,b);
        }
      }
    }
    function attribute(name, data) {
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
      const location = gl.getAttribLocation(program,name); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location,3,gl.FLOAT,false,0,0);
    }
    attribute('position',vertices); attribute('normal',normals);
    const solidBuffer = gl.createBuffer(), wireBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,solidBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,wireBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(wireIndices),gl.STATIC_DRAW);
    gl.enable(gl.DEPTH_TEST); gl.clearColor(0,0,0,0);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    const uniforms = Object.fromEntries(['rotation','pointer','aspect','tint','wireframe'].map(name => [name, gl.getUniformLocation(program,name)]));
    let rotation=.35, visible=true, paused=reducedMotion.matches, frame=0, lastTime=0, previousDraw=0, lost=false;
    let pointerX=0,pointerY=0,currentX=0,currentY=0;
    let wireframe=false, dragging=false, dragPointer=null, lastDragX=0, lastDragY=0, demandFrame=0;
    let tint=[.765,.96,.55];
    function readTint() {
      const hex=getComputedStyle(document.documentElement).getPropertyValue('--art-tint').trim() || getComputedStyle(document.documentElement).getPropertyValue('--art-tint').trim() || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      if (/^#[\da-f]{6}$/i.test(hex)) tint=[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)/255);
    }
    readTint();
    function updateToggle() {
      toggle.setAttribute('aria-pressed',String(paused));
      toggle.setAttribute('aria-label', paused ? 'Play 3D animation' : 'Pause 3D animation');
      toggle.innerHTML = paused ? 'PLAY MOTION <span aria-hidden="true">▷</span>' : 'PAUSE MOTION <span aria-hidden="true">Ⅱ</span>';
    }
    function draw() {
      if (lost) return;
      const dpr=Math.min(devicePixelRatio||1,1.7);
      const width=Math.round(canvas.clientWidth*dpr),height=Math.round(canvas.clientHeight*dpr);
      if (!width||!height) return;
      if (canvas.width!==width||canvas.height!==height) { canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height); }
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniform1f(uniforms.rotation,rotation); gl.uniform2f(uniforms.pointer,currentX,currentY); gl.uniform1f(uniforms.aspect,width/height);
      gl.uniform3fv(uniforms.tint,tint); gl.uniform1f(uniforms.wireframe,wireframe?1:0);
      if (wireframe) gl.enable(gl.BLEND); else gl.disable(gl.BLEND);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,wireframe?wireBuffer:solidBuffer);
      gl.drawElements(wireframe?gl.LINES:gl.TRIANGLES,wireframe?wireIndices.length:indices.length,gl.UNSIGNED_SHORT,0);
    }
    function renderOnDemand() {
      if (demandFrame || lost) return;
      demandFrame=requestAnimationFrame(()=>{demandFrame=0;draw();});
    }
    function tick(time) {
      frame=0;
      if (paused||!visible||document.hidden||lost) return;
      if (time-previousDraw>=1000/30) {
        if (!dragging) rotation+=Math.min(lastTime ? time-lastTime : 33,70)*.00013;
        currentX+=(pointerX-currentX)*.09; currentY+=(pointerY-currentY)*.09;
        draw();lastTime=time;previousDraw=time;
      }
      frame=requestAnimationFrame(tick);
    }
    function sync() {
      if(frame) cancelAnimationFrame(frame);
      frame=0;lastTime=0;previousDraw=0;
      if (!paused&&visible&&!document.hidden&&!lost) frame=requestAnimationFrame(tick);
    }
    canvas.addEventListener('pointermove',event => {
      if (dragging && event.pointerId===dragPointer) {
        rotation+=(event.clientX-lastDragX)*.008;
        currentY=Math.max(-1.8,Math.min(1.8,currentY+(event.clientY-lastDragY)*.009));
        pointerY=currentY; lastDragX=event.clientX; lastDragY=event.clientY;
        if (paused) renderOnDemand();
        return;
      }
      if (paused||reducedMotion.matches||event.pointerType==='touch') return;
      const rect=canvas.getBoundingClientRect();pointerX=(event.clientX-rect.left)/rect.width*2-1;pointerY=(event.clientY-rect.top)/rect.height*2-1;
    },{passive:true});
    canvas.addEventListener('pointerdown',event=>{
      if (event.button!==0 || lost) return;
      dragging=true;dragPointer=event.pointerId;lastDragX=event.clientX;lastDragY=event.clientY;
      canvas.setPointerCapture(event.pointerId);canvas.classList.add('is-dragging');
    });
    function endDrag(event) {
      if (event.pointerId!==dragPointer) return;
      dragging=false;dragPointer=null;canvas.classList.remove('is-dragging');
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    }
    canvas.addEventListener('pointerup',endDrag);
    canvas.addEventListener('pointercancel',endDrag);
    canvas.addEventListener('lostpointercapture',endDrag);
    canvas.addEventListener('pointerleave',()=>{if(!dragging){pointerX=0;pointerY=0;}},{passive:true});
    canvas.addEventListener('keydown',event=>{
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key==='Home') {rotation=.35;currentX=0;currentY=0;}
      if (event.key==='ArrowLeft') rotation-=.18;
      if (event.key==='ArrowRight') rotation+=.18;
      if (event.key==='ArrowUp') currentY=Math.max(-1.8,currentY-.25);
      if (event.key==='ArrowDown') currentY=Math.min(1.8,currentY+.25);
      pointerX=currentX;pointerY=currentY;renderOnDemand();
    });
    document.querySelectorAll('[data-material]').forEach(button=>button.addEventListener('click',()=>{
      wireframe=button.dataset.material==='wire';
      document.querySelectorAll('[data-material]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
      renderOnDemand();
    }));
    document.addEventListener('portfolio:palette',()=>{readTint();renderOnDemand();});
    toggle.addEventListener('click',()=>{paused=!paused;updateToggle();sync();});
    reducedMotion.addEventListener('change',event=>{paused=event.matches;updateToggle();sync();draw();});
    document.addEventListener('visibilitychange',sync);
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0.05}).observe(canvas);
    new ResizeObserver(draw).observe(canvas);
    function showFallback() {
      lost=true;sync();cancelAnimationFrame(demandFrame);
      container.classList.remove('has-webgl');canvas.hidden=true;toggle.hidden=true;
      document.querySelector('[data-render-controls]').hidden=true;
      document.querySelector('#art-hint').hidden=true;
    }
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();showFallback();});
    container.classList.add('has-webgl');
    document.querySelector('[data-render-controls]').hidden=false;
    document.querySelector('#art-hint').hidden=false;
    updateToggle();draw();sync();
  } catch {
    canvas.hidden=true;toggle.hidden=true;container.classList.remove('has-webgl');
  }
})();
