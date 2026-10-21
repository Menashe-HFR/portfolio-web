'use strict';
(() => {
  const canvas=document.querySelector('#flight-scene');
  const context=canvas.getContext('2d',{alpha:false});
  const engine=window.PortfolioFlight;
  const projects=window.PORTFOLIO_PROJECTS;
  const overlay=document.querySelector('#mission-overlay');
  const panel=document.querySelector('#mission-panel');
  const introMarkup=panel.innerHTML;
  const hud=document.querySelector('#flight-hud');
  const pauseButton=document.querySelector('#pause-flight');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey='portfolio.orbital-save.v1';
  if (!context) {
    document.querySelector('#mission-heading').textContent='Explore the archive.';
    document.querySelector('.mission-description').textContent='Your browser cannot start the flight renderer. Every project is still available in the portfolio.';
    document.querySelector('.mission-actions').innerHTML='<a class="flight-primary" href="index.html#work">Browse every project →</a>';
    return;
  }
  let saved={};
  try { const value=JSON.parse(localStorage.getItem(storageKey));if(value?.version===1)saved=value; } catch { /* A fresh flight also works without storage. */ }
  let mission=engine.createMission(projects,saved);
  let assist=false,frame=0,lastTime=0,lastRender=0,lastHud=0,lastSave=0,clock=0;
  let width=0,height=0,pixelRatio=1,background;
  let toastTimer,pointer=null,boostHeld=false,wasPhase=mission.phase;
  const keys=new Set();
  const signalColors=['#217765','#327cba','#bd6749'];
  let randomSeed=1083;
  function random() { randomSeed=(randomSeed*16807)%2147483647;return (randomSeed-1)/2147483646; }
  const stars=Array.from({length:330},()=>({x:(random()-.5)*1100,y:(random()-.5)*650,z:random()*880,size:.4+random()*1.1}));
  function setText(selector,text) { const element=document.querySelector(selector);if(element.textContent!==String(text))element.textContent=String(text); }
  function announce(text) { setText('#flight-status',text); }
  function toast(text) {
    const element=document.querySelector('#flight-toast');element.textContent=text;element.classList.add('visible');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>element.classList.remove('visible'),2200);
  }
  function save() { try {localStorage.setItem(storageKey,JSON.stringify(engine.serialize(mission)));}catch{/* Optional local progress. */} }
  function clearInput() { keys.clear();pointer=null;boostHeld=false; }
  function releaseVideo() { panel.querySelectorAll('video').forEach(video=>{video.pause();video.removeAttribute('src');video.load();}); }
  function readInput() {
    let x=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
    let y=Number(keys.has('ArrowUp')||keys.has('KeyW'))-Number(keys.has('ArrowDown')||keys.has('KeyS'));
    if(pointer){x=Math.max(-1,Math.min(1,(pointer.x/width-.5)*3));y=Math.max(-1,Math.min(1,(.46-pointer.y/height)*3));}
    return {x,y,assist,boost:boostHeld||keys.has('Space')};
  }
  function project(point) {
    const depth=point.z-mission.travel+88;
    if(depth<12)return null;
    const scale=Math.min(width,height)*1.18/depth;
    return {x:width*.5+(point.x-mission.x)*scale,y:height*.46-(point.y-mission.y)*scale,scale,depth};
  }
  function backdrop() {
    background=document.createElement('canvas');background.width=Math.ceil(width+80);background.height=Math.ceil(height+80);
    const ctx=background.getContext('2d');const w=background.width,h=background.height;
    ctx.fillStyle='#e9eef9';ctx.fillRect(0,0,w,h);
    let glow=ctx.createRadialGradient(w*.73,h*.35,5,w*.73,h*.35,w*.58);
    glow.addColorStop(0,'#c3e9ed');glow.addColorStop(.48,'#e1e8fa');glow.addColorStop(1,'#e9eef9');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    glow=ctx.createRadialGradient(w*.27,h*.75,0,w*.27,h*.75,w*.48);glow.addColorStop(0,'#ffddc999');glow.addColorStop(1,'#f4e9ff00');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    // A quiet, procedurally drawn ringed planet. No image or texture download.
    const x=w*.78,y=h*.32,r=Math.min(w*.16,h*.2);
    ctx.save();ctx.translate(x,y);ctx.rotate(-.36);ctx.strokeStyle='#6d9fd755';ctx.lineWidth=r*.19;ctx.beginPath();ctx.ellipse(0,0,r*1.75,r*.48,0,0,Math.PI*2);ctx.stroke();
    const planet=ctx.createRadialGradient(-r*.45,-r*.4,r*.03,0,0,r);planet.addColorStop(0,'#f2fcff');planet.addColorStop(.32,'#b2d6ef');planet.addColorStop(.68,'#7ba3d5');planet.addColorStop(1,'#6c7fba');ctx.fillStyle=planet;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(0,0,r-.5,0,Math.PI*2);ctx.clip();for(let i=-12;i<12;i++){ctx.strokeStyle=i%3===0?'#ffffff50':'#7a93c02b';ctx.lineWidth=4+(i%3)*2;ctx.beginPath();ctx.ellipse(-r*.15,i*r*.09,r*1.1,r*.22,0,0,Math.PI*2);ctx.stroke();}ctx.restore();
    ctx.strokeStyle='#6a8bbf70';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#ffffff99';ctx.lineWidth=r*.09;ctx.beginPath();ctx.ellipse(0,0,r*1.75,r*.48,0,0,Math.PI);ctx.stroke();ctx.restore();
    for(let i=0;i<80;i++){const px=random()*w,py=random()*h;ctx.fillStyle=i%4===0?'#6189ae80':'#799cbe60';ctx.fillRect(px,py,i%7===0?1.5:1,1);}
  }
  function resize() {
    const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;
    pixelRatio=Math.min(devicePixelRatio||1,width<600?1.3:1.5);
    canvas.width=Math.round(width*pixelRatio);canvas.height=Math.round(height*pixelRatio);context.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    backdrop();render();
  }
  function drawStars() {
    const focal=Math.min(width,height)*1.18;
    const boost=readInput().boost&&mission.phase==='flying'&&!reduced.matches;
    for(const star of stars){
      const depth=((star.z-mission.travel)%880+880)%880+20;
      const x=width*.5+(star.x-mission.x*.8)*focal/depth;
      const y=height*.46-(star.y-mission.y*.8)*focal/depth;
      if(x<0||x>width||y<0||y>height)continue;
      const size=Math.min(2.2,star.size*(.35+170/depth));
      context.globalAlpha=Math.min(.85,.2+140/depth);context.fillStyle='#487ca6';context.fillRect(x,y,size,size);
      if(boost){const tail=1+Math.min(15,190/depth);context.strokeStyle='#6c96bf';context.lineWidth=.7;context.beginPath();context.moveTo(x,y);context.lineTo(x+(x-width*.5)*tail*.012,y+(y-height*.46)*tail*.012);context.stroke();}
    }context.globalAlpha=1;
  }
  function path(points,fill,stroke) {
    context.beginPath();points.forEach((p,index)=>index?context.lineTo(p[0],p[1]):context.moveTo(p[0],p[1]));context.closePath();
    if(fill){context.fillStyle=fill;context.fill();}if(stroke){context.strokeStyle=stroke;context.stroke();}
  }
  function drawStation(node) {
    const center=project(node);if(!center||center.depth>900||center.depth<35)return;
    const radius=node.radius*center.scale;
    const color=signalColors[node.index%signalColors.length];
    if(center.x+radius<-50||center.x-radius>width+50||center.y+radius<-80||center.y-radius>height+80)return;
    const found=mission.collected.has(node.id),active=engine.getTarget(mission)?.id===node.id;
    const ready=mission.phase==='ready';context.globalAlpha=ready?.24:found?.22:1;
    const tilt=.18*Math.sin(clock*.18+node.index);
    const ring=[];
    for(let i=0;i<=64;i++){const angle=i/64*Math.PI*2;const point=project({x:node.x+Math.cos(angle)*node.radius,y:node.y+Math.sin(angle)*node.radius,z:node.z+Math.sin(angle)*node.radius*tilt});if(point)ring.push(point);}
    if(ring.length<2)return;
    context.strokeStyle=color;context.lineWidth=Math.max(1,Math.min(4,center.scale*.55));context.shadowColor=color;context.shadowBlur=active?10:3;
    context.beginPath();ring.forEach((point,index)=>index?context.lineTo(point.x,point.y):context.moveTo(point.x,point.y));context.stroke();context.shadowBlur=0;
    context.strokeStyle=color+'40';context.lineWidth=.8;
    context.beginPath();context.ellipse(center.x,center.y,radius*1.17,radius*1.17,0,0,Math.PI*2);context.stroke();
    for(let i=0;i<12;i++){const angle=i*Math.PI/6+(reduced.matches?0:clock*.025);const a=radius*1.02,b=radius*1.09;context.strokeStyle=color+'90';context.lineWidth=2;context.beginPath();context.moveTo(center.x+Math.cos(angle)*a,center.y+Math.sin(angle)*a);context.lineTo(center.x+Math.cos(angle)*b,center.y+Math.sin(angle)*b);context.stroke();}
    // Three small orbital modules give the portals a mechanical silhouette.
    for(let i=0;i<3;i++){const angle=i*Math.PI*2/3+.4;const x=center.x+Math.cos(angle)*radius*1.17,y=center.y+Math.sin(angle)*radius*1.17;const size=Math.max(2,Math.min(7,center.scale*1.2));context.fillStyle='#e6f1fa';context.strokeStyle=color+'b0';context.lineWidth=1;context.fillRect(x-size,y-size,size*2,size*2);context.strokeRect(x-size,y-size,size*2,size*2);}
    if(!ready){context.textAlign='center';context.fillStyle=found?'#217765':color;context.font=`${Math.min(11,Math.max(7,radius*.1))}px 'DM Sans',sans-serif`;context.fillText(found?'✓ ARCHIVED':`SIGNAL ${String(node.index+1).padStart(2,'0')}`,center.x,center.y-5);}
    context.globalAlpha=1;
  }
  function drawFragments() {
    for(const fragment of mission.fragments){if(mission.energy.has(fragment.id))continue;const p=project(fragment);if(!p||p.depth>700||p.depth<25)continue;if(p.x<0||p.x>width||p.y<0||p.y>height)continue;const size=Math.min(7,Math.max(2,p.scale*1.1));context.globalAlpha=Math.min(.8,35/p.depth+.3);context.lineWidth=1;path([[p.x,p.y-size],[p.x+size,p.y],[p.x,p.y+size],[p.x-size,p.y]],'#ffffffb3','#217765');}context.globalAlpha=1;
  }
  function drawAsteroid(rock,index) {
    const p=project(rock);if(!p||p.depth>720||p.depth<30)return;const radius=rock.radius*p.scale;if(p.x+radius<0||p.x-radius>width||p.y+radius<0||p.y-radius>height)return;
    const points=Array.from({length:7},(_,i)=>{const angle=i/7*Math.PI*2+index*.4+(reduced.matches?0:clock*.025);const r=radius*(.78+Math.sin(index+i*3.8)*.14);return[p.x+Math.cos(angle)*r,p.y+Math.sin(angle)*r];});
    context.globalAlpha=Math.min(.8,55/p.depth+.35);context.lineWidth=.7;path(points,'#9daed0','#657f9f');path([points[0],points[1],points[3],[p.x,p.y]],'#c5d2e8');path([points[3],points[4],points[5],[p.x,p.y]],'#7e91b6');context.globalAlpha=1;
  }
  function drawShip() {
    const input=readInput();const scale=width<600?.75:1;const bob=reduced.matches?0:Math.sin(clock*1.7)*2;
    context.save();context.translate(width*.5,height*(width<600?.69:.76)+bob);context.scale(scale,scale);context.rotate(-input.x*.15);
    const thrust=(input.boost?1.6:1)*(mission.phase==='flying'?1:.5);const tail=45*thrust+(reduced.matches?0:Math.sin(clock*30)*4);
    const flame=context.createLinearGradient(0,22,0,tail+30);flame.addColorStop(0,'#34ac9dcc');flame.addColorStop(.3,'#3f91d564');flame.addColorStop(1,'#71b2ff00');
    path([[-8,23],[-5,tail+30],[0,tail+48],[5,tail+30],[8,23]],flame);
    context.lineWidth=1;path([[0,-36],[-12,-8],[-45,19],[-18,15],[-12,32],[0,22],[12,32],[18,15],[45,19],[12,-8]],'#1c3432','#8eafa1');
    path([[0,-36],[-12,-8],[-18,15],[0,8]],'#aec2b5');path([[0,-36],[12,-8],[18,15],[0,8]],'#637e77');
    path([[-12,-8],[-45,19],[-18,15]],'#3b5b54');path([[12,-8],[45,19],[18,15]],'#25453f');
    path([[0,-15],[-6,3],[0,10],[6,3]],'#102b32','#70c5b2');
    context.strokeStyle='#217765';context.lineWidth=2;context.beginPath();context.moveTo(-36,17);context.lineTo(-22,13);context.moveTo(36,17);context.lineTo(22,13);context.stroke();
    context.fillStyle='#d5f5bc';context.fillRect(-9,25,5,3);context.fillRect(4,25,5,3);context.restore();
  }
  function drawGuide() {
    const target=engine.getTarget(mission);if(!target)return;const point=project(target);if(!point)return;
    const x=Math.max(30,Math.min(width-30,point.x)),y=Math.max(120,Math.min(height-220,point.y));
    if(Math.hypot(point.x-width*.5,point.y-height*.46)<35)return;
    const angle=Math.atan2(point.y-height*.46,point.x-width*.5);
    context.save();context.translate(x,y);context.rotate(angle);context.strokeStyle='#c3f58cbb';context.lineWidth=1.5;context.beginPath();context.moveTo(-7,-5);context.lineTo(0,0);context.lineTo(-7,5);context.stroke();context.restore();
  }
  function render() {
    if(!width||!height)return;
    context.fillStyle='#e9eef9';context.fillRect(0,0,width,height);
    context.drawImage(background,-40-mission.x*.13,-40+mission.y*.1);
    drawStars();
    if(mission.phase!=='ready'&&mission.phase!=='complete'){drawFragments();for(let i=mission.asteroids.length-1;i>=0;i--)drawAsteroid(mission.asteroids[i],i);}
    [...mission.nodes].reverse().forEach(drawStation);drawShip();
    if(mission.phase==='flying')drawGuide();
  }
  function updateHud() {
    setText('#signal-count',String(mission.collected.size).padStart(2,'0'));
    setText('#signal-total',String(mission.nodes.length).padStart(2,'0'));
    setText('#flight-score',String(mission.score).padStart(5,'0'));
    setText('#shield-value',`${mission.shield}%`);document.querySelector('#shield-bar').style.width=`${mission.shield}%`;
    setText('#flight-thrust',readInput().boost?'BOOST':'CRUISE');
    const target=engine.getTarget(mission);
    setText('#target-name',target?.project.title||'Archive complete');
    setText('#target-distance',target?`${Math.max(0,Math.ceil(target.z-mission.travel))} u`:'ALL SIGNALS RECOVERED');
    setText('#target-label',assist?'GUIDED FLIGHT / NEXT SIGNAL':'ALIGN WITH THE SIGNAL');
    document.querySelectorAll('.route-node').forEach(button=>{const found=mission.collected.has(button.dataset.node);button.classList.toggle('found',found);button.classList.toggle('active',target?.id===button.dataset.node);button.setAttribute('aria-label',`${found?'Archived:':'Navigate to'} ${projects.find(project=>project.id===button.dataset.node).title}`);button.querySelector('small').textContent=found?'RECOVERED':'UNEXPLORED';});
    document.querySelectorAll('#signal-progress i').forEach((bar,index)=>bar.classList.toggle('found',mission.collected.has(mission.nodes[index].id)));
    pauseButton.disabled=mission.phase!=='flying'&&mission.phase!=='paused';pauseButton.setAttribute('aria-label',mission.phase==='paused'?'Resume flight':'Pause flight');
    pauseButton.innerHTML=mission.phase==='paused'?'▷ <span>Resume</span>':'Ⅱ <span>Pause</span>';
    const assistButton=document.querySelector('#assist-toggle');assistButton.setAttribute('aria-pressed',String(assist));setText('#assist-state',assist?'ON':'OFF');
  }
  function startLoop() { if(frame)cancelAnimationFrame(frame);frame=0;lastTime=0;lastRender=0;if(mission.phase==='flying'&&!document.hidden)frame=requestAnimationFrame(tick);else render(); }
  function tick(time) {
    frame=0;if(mission.phase!=='flying'||document.hidden)return;
    const dt=lastTime?Math.min((time-lastTime)/1000,.05):1/60;lastTime=time;clock+=dt;
    const events=engine.step(mission,readInput(),dt);
    for(const event of events){if(event.type==='energy')toast('+25 / SIGNAL DATA');if(event.type==='collision'){toast('SHIELD HIT / −25%');announce(`Asteroid hit. Shield ${mission.shield} percent.`);}if(event.type==='orbit')toast('NEW ORBIT / KEEP EXPLORING');}
    if(mission.phase!==wasPhase){syncPhase();return;}
    if(time-lastRender>=1000/60-.5){render();lastRender=time;}
    if(time-lastHud>100){updateHud();lastHud=time;}
    if(time-lastSave>2000){save();lastSave=time;}
    frame=requestAnimationFrame(tick);
  }
  function fly(guided=assist) {
    releaseVideo();assist=guided;clearInput();engine.continueFlight(mission);syncPhase();if(mission.phase==='flying')canvas.focus({preventScroll:true});
  }
  function pause() {
    if(mission.phase==='flying'){mission.phase='paused';clearInput();syncPhase();}
    else if(mission.phase==='paused')fly();
  }
  function bindLaunch() {
    document.querySelector('#launch-flight')?.addEventListener('click',()=>fly(false));
    document.querySelector('#launch-assisted')?.addEventListener('click',()=>fly(true));
  }
  function restartMission() {
    releaseVideo();mission=engine.createMission(projects);assist=false;
    clearTimeout(toastTimer);document.querySelector('#flight-toast').classList.remove('visible');
    panel.innerHTML=introMarkup;syncPhase();
    document.querySelector('#launch-flight').focus({preventScroll:true});
  }
  function syncPhase() {
    wasPhase=mission.phase;clearInput();save();updateHud();
    const phase=mission.phase;
    hud.hidden=phase==='ready'||phase==='complete';overlay.hidden=phase==='flying';overlay.classList.toggle('centered',phase!=='ready');
    if(phase==='ready'){bindLaunch();if(mission.collected.size){document.querySelector('.mission-footnote').textContent=`Welcome back. ${mission.collected.size} of ${mission.nodes.length} signals already recovered.`;}announce(`Expedition ready. ${mission.collected.size} of ${mission.nodes.length} signals recovered.`);}
    if(phase==='flying')announce('Flight in progress. Follow the signal markers.');
    if(phase==='paused'){
      panel.innerHTML='<p class="flight-eyebrow"><span class="live-light"></span> FLIGHT PAUSED</p><h2 id="mission-heading">Take a <em>breather.</em></h2><p class="mission-description">Your discoveries are safe. Resume when you’re ready, or explore the portfolio directly.</p><div class="mission-actions"><button class="flight-primary" id="resume-flight" type="button">Resume flight <span>→</span></button><a class="flight-secondary" href="index.html#work">Browse projects ↗</a><button class="flight-secondary" id="restart-flight" type="button">Restart expedition ↻</button></div>';
      document.querySelector('#resume-flight').addEventListener('click',()=>fly());document.querySelector('#restart-flight').addEventListener('click',restartMission);announce('Flight paused.');
    }
    if(phase==='discovered'){
      const node=mission.latestProject,project=node.project;
      panel.innerHTML=`<p class="flight-eyebrow"><span class="live-light"></span> SIGNAL ${String(node.index+1).padStart(2,'0')} RECOVERED / +250 POINTS</p><h2 id="mission-heading">${project.title}<em>.</em></h2><p class="mission-description">${project.summary}</p><div class="discovery-media" id="discovery-media"><img src="${project.poster}" alt="${project.title} preview"></div><div class="discovery-tags">${project.tags.map(tag=>`<span>${tag}</span>`).join('')}</div><a class="case-link" href="${project.page}" target="_blank" rel="noopener">Open the full project ↗</a><div class="mission-actions"><button class="flight-primary" id="continue-flight" type="button">${mission.collected.size===mission.nodes.length?'Complete expedition':'Continue exploring'} <span>→</span></button><button class="flight-secondary" id="watch-discovery" type="button">Watch the demo ▷</button></div>`;
      document.querySelector('#continue-flight').addEventListener('click',()=>fly());
      document.querySelector('#watch-discovery').addEventListener('click',event=>{
        const media=document.querySelector('#discovery-media');const video=document.createElement('video');video.src=project.video;video.controls=true;video.playsInline=true;video.preload='none';video.poster=project.poster;video.setAttribute('aria-label',`${project.title} demonstration`);media.replaceChildren(video);event.currentTarget.hidden=true;video.play().catch(()=>{});
      });announce(`${project.title} discovered. ${mission.collected.size} of ${mission.nodes.length} signals recovered.`);
    }
    if(phase==='crashed'){
      panel.innerHTML='<p class="flight-eyebrow">FLIGHT INTERRUPTED / YOUR DISCOVERIES ARE SAFE</p><h2 id="mission-heading">A little course<br><em>correction.</em></h2><p class="mission-description">The asteroid field caught up with you. Restore your shield and try again, or let navigation assist take the controls.</p><div class="mission-actions"><button class="flight-primary" id="retry-flight" type="button">Try again <span>→</span></button><button class="flight-secondary" id="retry-assisted" type="button">Continue with assistance →</button></div>';
      document.querySelector('#retry-flight').addEventListener('click',()=>fly(false));document.querySelector('#retry-assisted').addEventListener('click',()=>fly(true));announce('Shield depleted. Retry without losing your discoveries.');
    }
    if(phase==='complete'){
      panel.innerHTML=`<p class="flight-eyebrow"><span class="live-light"></span> EXPEDITION COMPLETE / ALL SIGNALS RECOVERED</p><h2 id="mission-heading">A universe of<br><em>possibilities.</em></h2><p class="mission-description">Three signals. Three different problems to solve.<br>You’ve explored the work. Now let’s build something together.</p><div class="completion-projects">${projects.map((project,index)=>`<a href="${project.page}" target="_blank" rel="noopener"><span>✓ 0${index+1}</span>${project.title}<span>↗</span></a>`).join('')}</div><p class="completion-score">MISSION SCORE ${String(mission.score).padStart(5,'0')} / DATA COLLECTED ${mission.energy.size}</p><div class="mission-actions"><a class="flight-primary" href="index.html#contact">Let’s talk <span>↗</span></a><button class="flight-secondary" id="restart-flight" type="button">Fly again ↻</button><a class="flight-secondary" href="index.html#work">Browse all work →</a></div>`;
      document.querySelector('#restart-flight').addEventListener('click',restartMission);announce('Expedition complete. Every project has been recovered.');
    }
    startLoop();
  }
  document.querySelector('#route-list').innerHTML=projects.map((project,index)=>`<button class="route-node" type="button" data-node="${project.id}" aria-label="Navigate to ${project.title}"><span class="node-number">0${index+1}</span><span><strong>${project.title}</strong><small>UNEXPLORED</small></span></button>`).join('');
  document.querySelector('#signal-progress').innerHTML=projects.map(()=>'<i></i>').join('');
  document.querySelectorAll('[data-node]').forEach(button=>button.addEventListener('click',()=>{if(mission.collected.has(button.dataset.node)){toast('ALREADY RECOVERED / CHECK YOUR ARCHIVE');return;}mission.targetId=button.dataset.node;assist=true;updateHud();toast('NAVIGATION ASSIST ENGAGED');canvas.focus({preventScroll:true});}));
  document.querySelector('#assist-toggle').addEventListener('click',()=>{assist=!assist;clearInput();updateHud();toast(assist?'NAVIGATION ASSIST ENGAGED':'MANUAL FLIGHT / YOU HAVE CONTROL');});
  pauseButton.addEventListener('click',pause);
  document.addEventListener('keydown',event=>{
    if(['BUTTON','A','INPUT','TEXTAREA','SELECT','VIDEO'].includes(event.target.tagName))return;
    if(event.code==='KeyP'||event.code==='Escape'){if(mission.phase==='flying'||mission.phase==='paused'){event.preventDefault();pause();}return;}
    if(mission.phase!=='flying'||!['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code))return;
    event.preventDefault();keys.add(event.code);if(event.code!=='Space'&&assist){assist=false;updateHud();}
  });
  document.addEventListener('keyup',event=>keys.delete(event.code));
  canvas.addEventListener('pointerdown',event=>{if(mission.phase!=='flying'||event.button!==0)return;const rect=canvas.getBoundingClientRect();pointer={x:event.clientX-rect.left,y:event.clientY-rect.top};canvas.setPointerCapture(event.pointerId);assist=false;updateHud();});
  canvas.addEventListener('pointermove',event=>{if(!pointer)return;const rect=canvas.getBoundingClientRect();pointer={x:event.clientX-rect.left,y:event.clientY-rect.top};},{passive:true});
  canvas.addEventListener('pointerup',()=>{pointer=null;});canvas.addEventListener('pointercancel',()=>{pointer=null;});canvas.addEventListener('lostpointercapture',()=>{pointer=null;});
  const steering={up:'ArrowUp',left:'ArrowLeft',right:'ArrowRight',down:'ArrowDown'};
  document.querySelectorAll('[data-steer]').forEach(button=>{
    button.addEventListener('pointerdown',event=>{event.preventDefault();if(mission.phase!=='flying')return;button.setPointerCapture(event.pointerId);keys.add(steering[button.dataset.steer]);assist=false;updateHud();});
    const release=()=>keys.delete(steering[button.dataset.steer]);button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  });
  const boost=document.querySelector('#touch-boost');boost.addEventListener('pointerdown',event=>{event.preventDefault();if(mission.phase!=='flying')return;boost.setPointerCapture(event.pointerId);boostHeld=true;});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>boost.addEventListener(type,()=>{boostHeld=false;}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(mission.phase==='flying'){mission.phase='paused';syncPhase();}else save();}});
  addEventListener('blur',()=>{clearInput();if(mission.phase==='flying'){mission.phase='paused';syncPhase();}});
  addEventListener('pagehide',save);
  function motionPreference(){document.body.classList.toggle('reduced-motion',reduced.matches);if(mission.phase!=='flying')render();}
  reduced.addEventListener('change',motionPreference);motionPreference();
  new ResizeObserver(resize).observe(canvas);resize();syncPhase();
})();
