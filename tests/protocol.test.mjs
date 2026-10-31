import test from 'node:test';
import assert from 'node:assert/strict';
import {InputSources,NEUTRAL,validInput,stick,parseRoomCode,gamepadInput} from '../site/protocol.js';
test('room invitations and malformed codes',()=>{
  assert.equal(parseRoomCode(' k7 '),'K7');assert.equal(parseRoomCode('https://example.com/#room=AB'),'AB');
  for(const code of ['I0','ABC','<>','javascript:alert(1)'])assert.equal(parseRoomCode(code),null);
});
test('network input rejects malformed analog axes and unsafe masks',()=>{
  const valid={type:'input',seq:0,mask:8192,x:32767,y:-32767};assert(validInput(valid));
  for(const change of [{x:NaN},{y:Infinity},{x:32768},{y:1.2},{mask:65536},{seq:-1},{seq:1.5},{x:'1'},{x:undefined}])assert(!validInput({...valid,...change}));
});
test('analog stick has a dead zone, proportional walking, bounded diagonals',()=>{
  assert.deepEqual(stick(.03,.04),{x:0,y:0});assert(stick(.4,0).x>0&&stick(.4,0).x<16384);
  const diagonal=stick(2,-2);assert(Math.hypot(diagonal.x,diagonal.y)<=32768);assert(diagonal.x>0&&diagonal.y<0);
});
test('simultaneous stick, attack and jump survive individual releases',()=>{
  const events=[],sources=new InputSources(v=>events.push(v));
  sources.set('stick',{x:16000,y:0});sources.set('attack',{mask:1});sources.set('jump',{mask:8192});
  assert.deepEqual(sources.state,{mask:8193,x:16000,y:0});sources.set('attack',null);assert.equal(sources.state.mask,8192);
  sources.clear();assert.deepEqual(sources.state,NEUTRAL);assert.deepEqual(events.at(-1),NEUTRAL);
});
test('standard controller maps physical actions and analog motion',()=>{
  const pad={mapping:'standard',axes:[.5,-.5],buttons:Array.from({length:16},()=>({pressed:false}))};
  pad.buttons[0].pressed=true;pad.buttons[4].pressed=true;pad.buttons[2].pressed=true;
  const input=gamepadInput(pad);assert.equal(input.mask,1|4096|8192);assert(input.x>0&&input.y<0);
  assert.deepEqual(gamepadInput(null),NEUTRAL);
});
