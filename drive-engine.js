(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PortfolioDrive = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create(count) {
    const stops = Array.from({length:count}, (_,i)=>450+i*550);
    return {phase:'ready',distance:0,x:0,speed:0,stars:0,bumps:0,stop:0,stops,
      length:(stops.at(-1)||0)+400, collected:new Set(),hit:new Set(),
      coins:Array.from({length:count*8},(_,i)=>({z:100+i*65,x:Math.sin(i*1.7)*.65})),
      cones:Array.from({length:count*3},(_,i)=>({z:250+i*175,x:i%2?.65:-.65}))};
  }
  function step(state,input,delta) {
    if(state.phase!=='driving'||!Number.isFinite(delta))return;
    const dt=Math.max(0,Math.min(.05,delta));
    state.x=Math.max(-1,Math.min(1,state.x+(Number.isFinite(input.steer)?input.steer:0)*dt*1.9));
    const target=input.boost?180:110;
    state.speed+=(target-state.speed)*Math.min(1,dt*3);
    const previous=state.distance;state.distance=Math.min(state.length,state.distance+state.speed*dt);
    state.coins.forEach((coin,i)=>{
      if(!state.collected.has(i)&&previous<=coin.z&&state.distance>=coin.z&&Math.abs(state.x-coin.x)<.3){state.collected.add(i);state.stars++;}
    });
    state.cones.forEach((cone,i)=>{
      if(!state.hit.has(i)&&previous<=cone.z&&state.distance>=cone.z&&Math.abs(state.x-cone.x)<.27){state.hit.add(i);state.bumps++;state.speed*=.4;}
    });
    if(state.stop<state.stops.length&&state.distance>=state.stops[state.stop]){
      state.distance=state.stops[state.stop];state.phase='stopped';state.speed=0;
    }else if(state.distance>=state.length){state.phase='complete';state.speed=0;}
  }
  function proceed(state) {
    if(state.phase==='stopped')state.stop++;
    if(['ready','paused','stopped'].includes(state.phase))state.phase='driving';
  }
  return {create,step,proceed};
});
