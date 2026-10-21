const test=require('node:test');
const assert=require('node:assert/strict');
const {createMission,getTarget,step,continueFlight,serialize}=require('../flight-engine.js');
const projects=[{id:'drone',title:'Drone'},{id:'todo',title:'ToDo'},{id:'urlscan',title:'CLI'}];

test('guided flight discovers every project and completes the expedition',()=>{
  const state=createMission(projects);continueFlight(state);
  for(let index=0;index<3;index++){
    for(let frame=0;frame<1200&&state.phase==='flying';frame++)step(state,{assist:true},1/60);
    assert.equal(state.phase,'discovered');assert.equal(state.collected.size,index+1);
    continueFlight(state);
  }
  assert.equal(state.phase,'complete');assert.ok(state.score>=750);assert.equal(getTarget(state),null);
});
test('pause and non-finite time inputs cannot advance the simulation',()=>{
  const state=createMission(projects);state.phase='paused';step(state,{boost:true},10);assert.equal(state.travel,0);
  state.phase='flying';step(state,{x:Infinity,y:NaN},NaN);assert.equal(state.travel,0);
  step(state,{x:Infinity,y:NaN},Infinity);assert.equal(state.travel,0);
  step(state,{x:Infinity,y:NaN},100);assert.ok(state.travel<4);assert.ok(Number.isFinite(state.x));
});
test('manual steering stays within the world boundaries',()=>{
  const state=createMission(projects);state.phase='flying';state.asteroids=[];
  for(let frame=0;frame<1200;frame++)step(state,{x:1,y:-1},1/60);
  assert.equal(state.x,86);assert.equal(state.y,-48);
});
test('a fragment awards points exactly once',()=>{
  const state=createMission(projects);const fragment=state.fragments[0];state.phase='flying';state.x=fragment.x;state.y=fragment.y;state.travel=fragment.z;
  step(state,{},1/60);const score=state.score;step(state,{},1/60);
  assert.equal(score,25);assert.equal(state.score,25);assert.equal(state.energy.size,1);
});
test('a recovered station never awards its points again',()=>{
  const state=createMission(projects);const node=state.nodes[0];state.phase='flying';Object.assign(state,{x:node.x,y:node.y,travel:node.z});
  step(state,{},1/60);assert.equal(state.phase,'discovered');const score=state.score;
  continueFlight(state);step(state,{},1/60);assert.equal(state.score,score);assert.equal(state.collected.size,1);
});
test('an asteroid hit reduces shield once and guided flight avoids damage',()=>{
  const state=createMission(projects);const rock=state.asteroids[0];state.phase='flying';Object.assign(state,{x:rock.x,y:rock.y,travel:rock.z});
  step(state,{},1/60);assert.equal(state.shield,75);step(state,{},1/60);assert.equal(state.shield,75);
  const guided=createMission(projects);guided.phase='flying';Object.assign(guided,{x:rock.x,y:rock.y,travel:rock.z});step(guided,{assist:true},1/60);assert.equal(guided.shield,100);
});
test('missing a station loops the route without granting progress',()=>{
  const state=createMission(projects);state.phase='flying';state.travel=state.routeEnd+1;
  step(state,{},1/60);assert.equal(state.travel,0);assert.equal(state.loops,1);assert.equal(state.collected.size,0);
});
test('saved progress is validated and a completed archive restores correctly',()=>{
  const corrupt=createMission(projects,{collected:['unknown','drone'],energy:['unknown'],x:Infinity,y:-1000,travel:NaN,score:999999});
  assert.deepEqual([...corrupt.collected],['drone']);assert.equal(corrupt.energy.size,0);assert.equal(corrupt.x,0);assert.equal(corrupt.y,-48);assert.equal(corrupt.travel,0);assert.equal(corrupt.score,250);
  const state=createMission(projects);projects.forEach(project=>state.collected.add(project.id));const restored=createMission(projects,serialize(state));assert.equal(restored.phase,'complete');assert.equal(restored.score,750);
});
test('retrying after a crash preserves discoveries and restores the shield',()=>{
  const state=createMission(projects);state.collected.add('drone');state.phase='crashed';state.shield=0;
  continueFlight(state);assert.equal(state.phase,'flying');assert.equal(state.shield,100);assert.equal(state.collected.size,1);assert.equal(state.travel,state.nodes[1].z-130);
});
