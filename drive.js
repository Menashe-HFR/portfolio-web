'use strict';
(() => {
  const canvas=document.querySelector('#drive-scene'),ctx=canvas.getContext('2d',{alpha:false});
  const projects=window.PORTFOLIO_PROJECTS,engine=window.PortfolioDrive;
  const overlay=document.querySelector('#drive-overlay'),panel=document.querySelector('#drive-panel');
  const intro=panel.innerHTML,pause=document.querySelector('#pause-drive');
  const hud=document.querySelector('#drive-hud'),touch=document.querySelector('#drive-touch');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let state=engine.create(projects.length),width=0,height=0,roadWidth=0,frame=0,last=0,clock=0,lastHud=0,lastRender=0;
  const keys=new Set(),held=new Map();let boost=false;
  function text(id,value){const el=document.getElementById(id);if(el.textContent!==String(value))el.textContent=value;}
  function announce(value){text('drive-status',value);}
  if(!ctx){document.querySelector('#start-drive').hidden=true;announce('The renderer is unavailable. Browse every project in the portfolio.');return;}
  function clearInput(){keys.clear();held.clear();boost=false;}
  function controls(){return {steer:Math.max(-1,Math.min(1,Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'))+[...held.values()].reduce((a,b)=>a+b,0))),boost:boost||keys.has('Space')};}
  function roadX(z){return width*(state.phase==='ready'&&width>700?.72:.5)+Math.sin(z*.0028)*roadWidth*.25+Math.sin(z*.006+.8)*roadWidth*.12;}
  function screenY(z){return height*.76-(z-state.distance)*height/850;}
  function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
  function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  function scenery(){
    ctx.fillStyle='#e0efcf';ctx.fillRect(0,0,width,height);
    // Deterministic roadside details repeat beyond the visible road.
    const base=Math.floor((state.distance-350)/90)*90;
    for(let i=0;i<19;i++){
      const z=base+i*90,y=screenY(z),n=Math.round(z/90);if(y<-120||y>height+130)continue;
      const side=n%2?1:-1,x=roadX(z)+side*(roadWidth*.7+40+Math.sin(n*5.3)*45);
      if(n%4===0){ctx.fillStyle='#c5e0b3';ctx.beginPath();ctx.ellipse(x,y,52,32,.4,0,Math.PI*2);ctx.fill();}
      else if(n%5===0){
        rounded(x-20,y-19,40,34,5,'#fff2d0','#cfb58a');ctx.fillStyle='#d69278';ctx.beginPath();ctx.moveTo(x-27,y-15);ctx.lineTo(x,y-37);ctx.lineTo(x+27,y-15);ctx.fill();rounded(x-4,y,9,15,2,'#98b6a2');rounded(x-14,y-7,8,8,2,'#9fcbd0');
      }else{
        ctx.fillStyle='#899c6350';ctx.beginPath();ctx.ellipse(x+8,y+10,25,17,.4,0,Math.PI*2);ctx.fill();rounded(x-3,y,6,26,2,'#a08c60');circle(x,y-7,25,n%3?'#80b67b':'#9cc68b');circle(x-10,y-16,16,'#acd39a');circle(x+10,y-8,15,'#88bc7d');
      }
      for(let k=0;k<3;k++){const fx=x+side*(35+k*21),fy=y+30+Math.sin(n+k)*25;ctx.fillStyle=n%2?'#fff4ba':'#f3b2a1';ctx.beginPath();ctx.arc(fx,fy,3,0,7);ctx.fill();}
    }
  }
  function road(){
    const segments=[];for(let y=-40;y<=height+40;y+=14){const z=state.distance+(height*.76-y)*850/height;segments.push({x:roadX(z),y});}
    ctx.beginPath();segments.forEach((p,i)=>i?ctx.lineTo(p.x-roadWidth/2-8,p.y):ctx.moveTo(p.x-roadWidth/2-8,p.y));[...segments].reverse().forEach(p=>ctx.lineTo(p.x+roadWidth/2+8,p.y));ctx.closePath();ctx.fillStyle='#b9d9a5';ctx.fill();
    ctx.beginPath();segments.forEach((p,i)=>i?ctx.lineTo(p.x-roadWidth/2,p.y):ctx.moveTo(p.x-roadWidth/2,p.y));[...segments].reverse().forEach(p=>ctx.lineTo(p.x+roadWidth/2,p.y));ctx.closePath();ctx.fillStyle='#fff6dd';ctx.fill();
    ctx.strokeStyle='#dfca9a';ctx.lineWidth=3;ctx.setLineDash([18,18]);ctx.lineDashOffset=state.distance*height/850;ctx.beginPath();segments.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);
  }
  function star(x,y,r){ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,s=i%2?r*.46:r;i?ctx.lineTo(x+Math.cos(a)*s,y+Math.sin(a)*s):ctx.moveTo(x+Math.cos(a)*s,y+Math.sin(a)*s);}ctx.closePath();ctx.fillStyle='#e5ad49';ctx.fill();ctx.strokeStyle='#b17e29';ctx.lineWidth=1;ctx.stroke();}
  function roadObjects(){
    state.coins.forEach((coin,i)=>{if(state.collected.has(i))return;const y=screenY(coin.z);if(y<-20||y>height+20)return;star(roadX(coin.z)+coin.x*roadWidth*.34,y,10);});
    state.cones.forEach((cone,i)=>{const y=screenY(cone.z);if(y<-20||y>height+20||state.hit.has(i))return;const x=roadX(cone.z)+cone.x*roadWidth*.34;rounded(x-12,y+5,24,6,2,'#d4825c');ctx.beginPath();ctx.moveTo(x,y-15);ctx.lineTo(x-9,y+6);ctx.lineTo(x+9,y+6);ctx.closePath();ctx.fillStyle='#e7a06d';ctx.fill();rounded(x-5,y-2,10,3,1,'#fff5e7');});
    state.stops.forEach((z,i)=>{const y=screenY(z);if(y<-60||y>height+60)return;const x=roadX(z)+roadWidth*.57;rounded(x,y,5,48,1,'#9b8b64');rounded(x-12,y-30,88,45,5,i<state.stop?'#e7f2de':'#ffffff','#98bc87');ctx.fillStyle='#315c4a';ctx.font="bold 9px 'DM Sans',sans-serif";ctx.textAlign='left';ctx.fillText(`STOP 0${i+1}`,x-2,y-12);ctx.font="8px 'DM Sans',sans-serif";ctx.fillText(i<state.stop?'Nice to meet you!':'Project ahead →',x-2,y+3);});
  }
  function car(){
    const input=controls(),x=roadX(state.distance)+state.x*roadWidth*.34,y=height*.76;
    ctx.save();ctx.translate(x,y);ctx.scale(width<600?.8:1,width<600?.8:1);ctx.rotate(input.steer*.13);
    ctx.fillStyle='#70835d30';ctx.beginPath();ctx.ellipse(7,10,30,48,0,0,7);ctx.fill();
    [-1,1].forEach(side=>{rounded(side<0?-29:21,-28,8,20,3,'#415750');rounded(side<0?-29:21,15,8,20,3,'#415750');});
    rounded(-23,-45,46,88,15,'#ee987f','#be715b');rounded(-18,-35,36,65,10,'#f2a58d');
    rounded(-16,-23,32,21,[9,9,3,3],'#c5e7e7','#9cbfc2');rounded(-14,14,28,16,[3,3,6,6],'#b5dada');
    rounded(-19,-39,9,5,2,'#fff3c8');rounded(10,-39,9,5,2,'#fff3c8');rounded(-18,34,8,4,2,'#bd6456');rounded(10,34,8,4,2,'#bd6456');
    ctx.strokeStyle='#d58268';ctx.beginPath();ctx.moveTo(0,-35);ctx.lineTo(0,-28);ctx.stroke();
    if(input.boost&&state.phase==='driving'&&!reduced.matches){ctx.strokeStyle='#a6bf9380';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-12+i*12,50);ctx.lineTo(-12+i*12,65+Math.sin(clock*10+i)*5);ctx.stroke();}}
    ctx.restore();
  }
  function render(){scenery();road();roadObjects();car();}
  function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);width=r.width;height=r.height;roadWidth=Math.min(280,width*.57);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);render();}
  function updateHud(){text('drive-stop-count',`${String(Math.min(projects.length,state.stop+(state.phase==='stopped'?1:0))).padStart(2,'0')} / ${String(projects.length).padStart(2,'0')}`);text('drive-stars',state.stars);text('drive-speed',controls().boost?'A little extra sunshine':'Taking it easy');document.querySelector('#drive-progress').style.width=`${state.distance/state.length*100}%`;}
  function stopLoop(){cancelAnimationFrame(frame);frame=0;last=0;clearInput();}
  function loop(time){frame=0;const dt=last?Math.min((time-last)/1000,.05):0;last=time;clock+=dt;engine.step(state,controls(),dt);if(time-lastRender>=1000/60-.5){render();lastRender=time;}if(time-lastHud>100){lastHud=time;updateHud();}if(state.phase==='driving')frame=requestAnimationFrame(loop);else showState();}
  function start(){engine.proceed(state);clearInput();overlay.hidden=true;hud.hidden=false;touch.hidden=false;pause.disabled=false;pause.textContent='Ⅱ Pause';pause.setAttribute('aria-label','Pause drive');last=0;render();updateHud();frame=requestAnimationFrame(loop);canvas.focus({preventScroll:true});announce(`Driving to project stop ${state.stop+1}. Use arrows or A and D to steer.`);}
  function reset(){stopLoop();state=engine.create(projects.length);overlay.classList.remove('centered');panel.innerHTML=intro;overlay.hidden=false;hud.hidden=true;touch.hidden=true;pause.disabled=true;pause.textContent='Ⅱ Pause';pause.setAttribute('aria-label','Pause drive');bindStart();updateHud();render();announce('Ready for a Sunday drive.');panel.querySelector('button').focus({preventScroll:true});}
  function showState(){
    stopLoop();updateHud();overlay.hidden=false;overlay.classList.add('centered');touch.hidden=true;pause.disabled=state.phase!=='paused';
    if(state.phase==='paused'){
      pause.textContent='▶ Resume';pause.setAttribute('aria-label','Resume drive');panel.innerHTML='<p class="drive-eyebrow">PULL OVER FOR A MOMENT</p><h2 id="drive-heading">Enjoy the <em>view.</em></h2><p class="drive-description">Your road trip is right here when you’re ready.</p><div class="drive-actions"><button class="drive-primary" id="continue-drive">Keep driving →</button><button id="reset-drive">Start over ↻</button><a href="index.html#work">Browse projects ↗</a></div>';announce('Drive paused.');
    }else if(state.phase==='stopped'){
      const project=projects[state.stop];panel.innerHTML=`<p class="drive-eyebrow">A NICE PLACE TO STOP / 0${state.stop+1}</p><h2 id="drive-heading">${project.title}</h2><p class="drive-description">${project.summary}</p><img class="drive-project-image" src="${project.poster}" alt="${project.title} preview"><div class="drive-actions"><button class="drive-primary" id="continue-drive">Back on the road →</button><a href="${project.page}" target="_blank" rel="noopener">Explore the project ↗</a></div>`;announce(`Project stop ${state.stop+1}: ${project.title}.`);
    }else if(state.phase==='complete'){
      panel.innerHTML=`<p class="drive-eyebrow">YOU TOOK THE SCENIC ROUTE ☀</p><h2 id="drive-heading">Good drive.<br><em>Great to meet you.</em></h2><p class="drive-description">${state.stars} little stars. ${projects.length} project stops. Thanks for taking a look around.</p><div class="drive-stop-links">${projects.map(project=>`<a href="${project.page}" target="_blank" rel="noopener">${project.title}<span>↗</span></a>`).join('')}</div><div class="drive-actions"><a class="drive-primary" href="index.html#contact">Let’s talk ↗</a><button id="reset-drive">Another little drive ↻</button><a href="index.html#play">Back to portfolio →</a></div>`;announce('Road trip complete. Every project is available.');
    }
    panel.querySelector('#continue-drive')?.addEventListener('click',start);panel.querySelector('#reset-drive')?.addEventListener('click',reset);panel.querySelector('button,a')?.focus({preventScroll:true});render();
  }
  function pauseDrive(){if(state.phase==='driving'){state.phase='paused';showState();}}
  function bindStart(){panel.querySelector('#start-drive').addEventListener('click',start);}
  bindStart();pause.addEventListener('click',()=>state.phase==='paused'?start():pauseDrive());
  addEventListener('keydown',event=>{
    if(event.target.closest('button,a,input,textarea,select'))return;
    if(['KeyP','Escape'].includes(event.code)&&['driving','paused'].includes(state.phase)){if(event.repeat)return;event.preventDefault();state.phase==='paused'?start():pauseDrive();return;}
    if(state.phase==='driving'&&['ArrowLeft','ArrowRight','KeyA','KeyD','Space'].includes(event.code)){event.preventDefault();keys.add(event.code);}
  });
  addEventListener('keyup',event=>keys.delete(event.code));
  document.querySelectorAll('[data-steer]').forEach(button=>{
    button.addEventListener('pointerdown',event=>{event.preventDefault();if(state.phase!=='driving')return;button.setPointerCapture(event.pointerId);held.set(event.pointerId,Number(button.dataset.steer));});
    ['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,event=>held.delete(event.pointerId)));
  });
  const boostButton=document.querySelector('#drive-boost');boostButton.addEventListener('pointerdown',event=>{event.preventDefault();if(state.phase!=='driving')return;boostButton.setPointerCapture(event.pointerId);boost=true;});['pointerup','pointercancel','lostpointercapture'].forEach(type=>boostButton.addEventListener(type,()=>{boost=false;}));
  addEventListener('blur',()=>{clearInput();pauseDrive();});document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseDrive();});addEventListener('resize',resize,{passive:true});resize();
})();
