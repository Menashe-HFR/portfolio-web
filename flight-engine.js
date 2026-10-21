/* Deterministic flight simulation, shared by the browser and Node's test runner. */
(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.PortfolioFlight = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clamp = (number, low, high) => Math.min(high, Math.max(low, number));
  const safe = (number, fallback, low, high) => Number.isFinite(number) ? clamp(number, low, high) : fallback;
  function createMission(projects, saved = {}) {
    if (!Array.isArray(projects) || !projects.length) throw new Error('A mission needs projects.');
    if (!saved || typeof saved !== 'object') saved = {};
    const positions = [[-34,14],[36,-16],[-8,26]];
    const colors = ['#c3f58c','#94dcff','#ffb28e'];
    const nodes = projects.map((project, index) => ({
      id: project.id, project, index, x: positions[index%3][0], y: positions[index%3][1],
      z: 160 + index*180, radius: 15, color: colors[index%3],
    }));
    const fragments = nodes.flatMap((node,index) => {
      const previous = nodes[index-1] || {x:0,y:0};
      return Array.from({length:5}, (_,part) => {
        const t=(part+1)/6;
        return {id:`${node.id}:${part}`,x:previous.x+(node.x-previous.x)*t,y:previous.y+(node.y-previous.y)*t,z:node.z-110+part*20};
      });
    });
    const routeEnd = nodes[nodes.length-1].z+100;
    const collected = new Set((Array.isArray(saved.collected) ? saved.collected : []).filter(id => nodes.some(node=>node.id===id)));
    const energy = new Set((Array.isArray(saved.energy) ? saved.energy : []).filter(id=>fragments.some(fragment=>fragment.id===id)));
    return {
      phase: collected.size===nodes.length ? 'complete' : 'ready', nodes, fragments, collected, energy,
      x:safe(saved.x,0,-86,86),y:safe(saved.y,0,-48,48),travel:safe(saved.travel,0,0,routeEnd),
      speed:0,shield:100,invulnerable:0,score:collected.size*250+energy.size*25,
      loops:0,routeEnd,latestProject:null,targetId:null,hit:new Set(),
      asteroids:[{x:12,y:-14,z:105,radius:7},{x:-64,y:32,z:220,radius:8},{x:-10,y:7,z:265,radius:7},{x:62,y:20,z:400,radius:9},{x:-32,y:-35,z:450,radius:7},{x:34,y:-6,z:600,radius:8}],
    };
  }
  function getTarget(state) {
    const remaining=state.nodes.filter(node=>!state.collected.has(node.id));
    return remaining.find(node=>node.id===state.targetId && node.z>=state.travel-20)
      || remaining.find(node=>node.z>=state.travel-20) || remaining[0] || null;
  }
  function step(state, input = {}, delta = 0) {
    const events=[];
    const dt=safe(delta,0,0,.05);
    if (state.phase!=='flying' || !dt) return events;
    const target=getTarget(state);
    if (input.assist && target) {
      const smoothing=1-Math.exp(-2.4*dt);
      state.x+=(target.x-state.x)*smoothing; state.y+=(target.y-state.y)*smoothing;
    } else {
      state.x=clamp(state.x+safe(input.x,0,-1,1)*46*dt,-86,86);
      state.y=clamp(state.y+safe(input.y,0,-1,1)*34*dt,-48,48);
    }
    state.speed+=((input.boost?76:36)-state.speed)*(1-Math.exp(-5*dt));
    state.travel+=state.speed*dt;
    state.invulnerable=Math.max(0,state.invulnerable-dt);
    for (const fragment of state.fragments) {
      if (!state.energy.has(fragment.id) && Math.abs(state.travel-fragment.z)<11 && Math.hypot(state.x-fragment.x,state.y-fragment.y)<10) {
        state.energy.add(fragment.id);state.score+=25;events.push({type:'energy',fragment});
      }
    }
    if (!input.assist && !state.invulnerable) {
      for (let index=0;index<state.asteroids.length;index++) {
        const rock=state.asteroids[index];
        if (!state.hit.has(index) && Math.abs(state.travel-rock.z)<10 && Math.hypot(state.x-rock.x,state.y-rock.y)<rock.radius+3) {
          state.hit.add(index);state.shield=Math.max(0,state.shield-25);state.invulnerable=1.4;
          events.push({type:'collision'});
          if (!state.shield) state.phase='crashed';
          break;
        }
      }
    }
    if (state.phase==='flying') {
      for (const node of state.nodes) {
        if (!state.collected.has(node.id) && Math.abs(state.travel-node.z)<18 && Math.hypot(state.x-node.x,state.y-node.y)<node.radius) {
          state.collected.add(node.id);state.score+=250;state.latestProject=node;
          state.shield=Math.min(100,state.shield+25);state.phase='discovered';
          events.push({type:'discovery',node});break;
        }
      }
    }
    if (state.travel>state.routeEnd && state.phase==='flying') {
      state.travel=0;state.loops++;state.hit.clear();events.push({type:'orbit'});
    }
    return events;
  }
  function continueFlight(state) {
    if (state.phase==='discovered') state.phase=state.collected.size===state.nodes.length?'complete':'flying';
    else if (state.phase==='ready' || state.phase==='paused') state.phase='flying';
    else if (state.phase==='crashed') {
      state.shield=100;state.invulnerable=2;state.phase='flying';
      state.travel=Math.max(0,(getTarget(state)?.z||160)-130);state.speed=0;
    }
  }
  function serialize(state) {
    return {version:1,collected:[...state.collected],energy:[...state.energy],x:state.x,y:state.y,travel:state.travel};
  }
  return {createMission,getTarget,step,continueFlight,serialize};
});
