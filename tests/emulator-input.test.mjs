import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../site/emulator.js';
import {NEUTRAL} from '../site/protocol.js';
test('full-travel analog input avoids the native core overflow and release clears both ports',()=>{
  const game=new Game(),events=[];game.ready=true;game.manager={simulateInput:(...args)=>events.push(args)};
  game.input(1,{mask:8193,x:32767,y:-32767});
  assert(events.some(([p,b,v])=>p===1&&b===0&&v===1));
  assert(events.some(([p,b,v])=>p===1&&b===23&&v>16000&&v<32767));
  assert(events.some(([p,b,v])=>p===1&&b===16&&v>25000&&v<32767));
  assert(events.some(([p,b,v])=>p===1&&b===19&&v>25000&&v<32767));
  game.release();assert.deepEqual(game.inputs,[NEUTRAL,NEUTRAL]);
  for(const b of [0,16,19,23])assert.equal(events.filter(([p,id])=>p===1&&id===b).at(-1)[2],0);
});
