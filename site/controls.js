import {InputSources,KEY_MAP,gamepadInput,stick} from './protocol.js';
export function setupControls(change) {
  let enabled=false, pointer=null;
  const stickEl=document.querySelector('#stick'),thumb=document.querySelector('#stick-thumb');
  const sources=new InputSources(input=>{
    document.querySelectorAll('[data-button]').forEach(el=>el.classList.toggle('pressed',!!(input.mask&(1<<Number(el.dataset.button)))));
    thumb.style.transform=`translate(${input.x/32767*32}px,${input.y/32767*32}px)`;
    change(input);
  });
  const canInput=()=>enabled&&!document.hidden&&!document.querySelector('dialog[open]');
  const held=new Set();
  function clear(){held.clear();pointer=null;sources.clear();}
  function key(e,down){
    const axis={ArrowLeft:1,ArrowRight:1,ArrowUp:1,ArrowDown:1,KeyW:1,KeyA:1,KeyS:1,KeyD:1};
    if((KEY_MAP[e.code]===undefined&&!axis[e.code])||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return;
    if(!canInput())return;
    e.preventDefault();e.stopImmediatePropagation();
    if(axis[e.code]){
      if(down)held.add(e.code);else held.delete(e.code);
      const x=Number(held.has('ArrowRight')||held.has('KeyD'))-Number(held.has('ArrowLeft')||held.has('KeyA'));
      const y=Number(held.has('ArrowDown')||held.has('KeyS'))-Number(held.has('ArrowUp')||held.has('KeyW'));
      sources.set('keyboard-stick',stick(x,y,0));
    } else sources.set(`key:${e.code}`,{mask:down?1<<KEY_MAP[e.code]:0});
  }
  window.addEventListener('keydown',e=>key(e,true),true);window.addEventListener('keyup',e=>key(e,false),true);
  for(const button of document.querySelectorAll('[data-button]')){
    button.addEventListener('pointerdown',e=>{if(!canInput())return;e.preventDefault();button.setPointerCapture(e.pointerId);sources.set(`pointer:${e.pointerId}`,{mask:1<<Number(button.dataset.button)});});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>sources.set(`pointer:${e.pointerId}`,null));
    button.addEventListener('contextmenu',e=>e.preventDefault());
  }
  function move(e){const r=stickEl.getBoundingClientRect();sources.set('touch-stick',stick((e.clientX-r.left-r.width/2)/(r.width*.38),(e.clientY-r.top-r.height/2)/(r.height*.38)));}
  stickEl.addEventListener('pointerdown',e=>{if(!canInput()||pointer!==null)return;e.preventDefault();pointer=e.pointerId;stickEl.setPointerCapture(pointer);move(e);});
  stickEl.addEventListener('pointermove',e=>{if(canInput()&&e.pointerId===pointer)move(e);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])stickEl.addEventListener(type,e=>{if(e.pointerId===pointer){pointer=null;sources.set('touch-stick',null);}});
  stickEl.addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  function poll(){sources.set('gamepad',gamepadInput(canInput()?Array.from(navigator.getGamepads?.()||[]).find(p=>p?.mapping==='standard'):null));requestAnimationFrame(poll);}
  requestAnimationFrame(poll);
  return {clear,enable(v){enabled=v;if(!v)clear();},get state(){return sources.state;}};
}
