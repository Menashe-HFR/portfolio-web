const test=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../drive-engine.js');
test('a drive visits every project and reaches the finish',()=>{
  const state=engine.create(3);engine.proceed(state);let stops=0;
  for(let i=0;i<3000&&state.phase!=='complete';i++){
    engine.step(state,{steer:0},.05);
    if(state.phase==='stopped'){assert.equal(state.stop,stops++);engine.proceed(state);}
  }
  assert.equal(stops,3);assert.equal(state.phase,'complete');assert.equal(state.stop,3);
});
test('pause, invalid time, and steering bounds keep the drive stable',()=>{
  const state=engine.create(3);engine.step(state,{steer:1},1);assert.equal(state.distance,0);
  engine.proceed(state);engine.step(state,{steer:1},NaN);assert.equal(state.distance,0);
  for(let i=0;i<50;i++)engine.step(state,{steer:1},.05);
  assert.equal(state.x,1);state.phase='paused';const distance=state.distance;engine.step(state,{steer:-1},.05);assert.equal(state.distance,distance);
});
test('stars and cone collisions are counted once',()=>{
  const state=engine.create(1);engine.proceed(state);
  state.distance=99;state.speed=110;state.x=state.coins[0].x;engine.step(state,{},.05);assert.equal(state.stars,1);
  state.distance=99;engine.step(state,{},.05);assert.equal(state.stars,1);
  state.distance=249;state.speed=110;state.x=state.cones[0].x;engine.step(state,{},.05);assert.equal(state.bumps,1);assert.ok(state.speed<110);
  state.distance=249;state.speed=110;engine.step(state,{},.05);assert.equal(state.bumps,1);
});
