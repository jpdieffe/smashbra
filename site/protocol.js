export const PROTOCOL = 1;
export const ALL_BUTTONS = 65535;
export const NEUTRAL = Object.freeze({mask:0,x:0,y:0});
export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newRoomCode(excluded = new Set()) {
  const size = ROOM_ALPHABET.length;
  const start = crypto.getRandomValues(new Uint16Array(1))[0] % (size * size);
  for (let i=0;i<size*size;i++) {
    const n=(start+i)%(size*size), code=ROOM_ALPHABET[Math.floor(n/size)]+ROOM_ALPHABET[n%size];
    if (!excluded.has(code)) return code;
  }
  throw new Error('No room codes available. Try again shortly.');
}
export function parseRoomCode(value) {
  let code=value.trim();
  if (/^https?:\/\//i.test(code)) {
    try { code=new URLSearchParams(new URL(code).hash.slice(1)).get('room') || ''; } catch { return null; }
  }
  code=code.toUpperCase().replace(/[\s-]/g,'');
  return code.length===2 && [...code].every(c=>ROOM_ALPHABET.includes(c)) ? code : null;
}
export function validInput(data) {
  return data?.type==='input' && Number.isSafeInteger(data.seq) && data.seq>=0 &&
    Number.isInteger(data.mask) && data.mask>=0 && data.mask<=ALL_BUTTONS &&
    [data.x,data.y].every(v=>Number.isInteger(v) && Math.abs(v)<=32767);
}
export function stick(x,y,deadzone=.12) {
  const length=Math.hypot(x,y);
  if (length<=deadzone) return {x:0,y:0};
  const scale=Math.min(1,(length-deadzone)/(1-deadzone))/length;
  return {x:Math.round(x*scale*32767),y:Math.round(y*scale*32767)};
}
export class InputSources {
  constructor(change) { this.sources=new Map(); this.state={...NEUTRAL}; this.change=change; }
  set(id,input) {
    if (!input || !(input.mask||input.x||input.y)) this.sources.delete(id); else this.sources.set(id,input);
    let mask=0,x=0,y=0;
    for (const v of this.sources.values()) { mask|=v.mask||0; if(Math.abs(v.x||0)>Math.abs(x))x=v.x; if(Math.abs(v.y||0)>Math.abs(y))y=v.y; }
    const next={mask:mask&ALL_BUTTONS,x,y};
    if(Object.keys(next).some(k=>next[k]!==this.state[k])) { this.state=next;this.change(next); }
  }
  clear() { this.sources.clear();this.set('clear',null); }
}
export const KEY_MAP={KeyZ:0,KeyX:1,Enter:3,KeyQ:10,KeyE:11,ShiftLeft:12,ShiftRight:12,Space:13};
export function gamepadInput(pad) {
  if(!pad||pad.mapping!=='standard')return {...NEUTRAL};
  let mask=0;
  for(const [index,bit] of Object.entries({0:0,1:1,2:13,3:13,4:12,5:11,6:12,7:11,8:10,9:3}))if(pad.buttons[index]?.pressed)mask|=1<<bit;
  const x=(pad.buttons[15]?.pressed?1:0)-(pad.buttons[14]?.pressed?1:0)||pad.axes[0]||0;
  const y=(pad.buttons[13]?.pressed?1:0)-(pad.buttons[12]?.pressed?1:0)||pad.axes[1]||0;
  return {mask,...stick(x,y)};
}
