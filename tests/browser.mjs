import {chromium,webkit,devices} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createServer} from '../scripts/serve.mjs';
import {localSignaling} from './local-signaling.mjs';
const useWebkit=process.env.WEBKIT==='1',publicSignaling=process.env.PUBLIC_SIGNALING==='1';
const port=useWebkit?4189:4188;
const server=createServer(port);
const browser=await (useWebkit?webkit:chromium).launch(useWebkit?{headless:true,...(process.env.WEBKIT_EXECUTABLE?{executablePath:process.env.WEBKIT_EXECUTABLE}:{})}:{channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader']});
const errors=[],failures=[];await mkdir('test-results',{recursive:true});
const base=process.env.SMASHBRA_URL||`http://127.0.0.1:${port}/`;
const name=useWebkit?'webkit':'chrome';
try{
  const device=useWebkit?devices['iPhone 13']:devices['Pixel 7'];
  const host=await browser.newPage({...device,viewport:{width:844,height:390},deviceScaleFactor:1});
  const guest=await browser.newPage({...device,viewport:{width:844,height:390},deviceScaleFactor:1});
  const signaling=localSignaling();
  for(const page of [host,guest]){
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
    if(!publicSignaling)await signaling(page);
  }
  await host.goto(base+'?debug');
  await host.setViewportSize({width:393,height:852});
  await host.screenshot({path:`test-results/${name}-lobby.png`,fullPage:true});
  assert.equal(await host.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await host.setViewportSize({width:844,height:390});
  await host.locator('#host-button').tap();
  await host.waitForFunction(()=>window.smash?.room?.code&&document.querySelector('#room-label').textContent.startsWith('ROOM'),null,{timeout:35000});
  const code=await host.evaluate(()=>smash.room.code);
  await guest.goto(base+`?debug#room=${code}`);assert.equal(await guest.locator('#room-code').inputValue(),code);
  await guest.locator('#join-button').tap();
  await host.waitForFunction(()=>smash.room.accepted,null,{timeout:35000});
  await host.waitForFunction(()=>smash.game.ready,null,{timeout:125000});
  if(await host.locator('#resume-audio').isVisible())await host.locator('#resume-audio').tap();
  await guest.waitForFunction(()=>document.querySelector('video').readyState>=2,null,{timeout:40000});
  await guest.locator('#resume-video').tap();
  await host.waitForTimeout(6000);
  assert.equal(await host.evaluate(()=>getComputedStyle(document.querySelector('.ejs_virtualGamepad_parent')).display),'none');
  for(const page of [host,guest])assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);
  await host.keyboard.press('Enter',{delay:160});await host.waitForTimeout(1800);
  await host.keyboard.press('Enter',{delay:160});await host.waitForTimeout(1800);
  await host.keyboard.press('ArrowDown',{delay:180});await host.waitForTimeout(500);
  await host.keyboard.press('KeyZ',{delay:160});await host.waitForTimeout(1000);
  await host.keyboard.press('KeyZ',{delay:160});await host.waitForTimeout(2000);
  await host.screenshot({path:`test-results/${name}-host.png`});
  await host.keyboard.down('ArrowUp');await host.waitForTimeout(250);await host.keyboard.up('ArrowUp');
  await guest.keyboard.down('ArrowUp');await guest.waitForTimeout(250);await guest.keyboard.up('ArrowUp');
  await host.screenshot({path:`test-results/${name}-cursors.png`});
  await guest.screenshot({path:`test-results/${name}-guest.png`});
  // Real WebRTC controls reach native controller port two, including analog axes.
  await guest.keyboard.down('ArrowRight');await guest.keyboard.down('KeyZ');
  await host.waitForFunction(()=>smash.game.inputs[1].x>30000&&(smash.game.inputs[1].mask&1),null,{timeout:5000});
  await guest.keyboard.up('KeyZ');await guest.keyboard.up('ArrowRight');
  await host.waitForFunction(()=>smash.game.inputs[1].x===0&&smash.game.inputs[1].mask===0);
  const stats=await guest.evaluate(async()=>{
    const report=await smash.room.call.peerConnection.getStats();return [...report.values()].filter(s=>s.type==='inbound-rtp').map(s=>({kind:s.kind,bytes:s.bytesReceived,frames:s.framesDecoded}));
  });
  assert(stats.some(s=>s.kind==='video'&&s.frames>10));assert(stats.some(s=>s.kind==='audio'&&s.bytes>0));
  if(!useWebkit){
    const cdp=await guest.context().newCDPSession(guest),pad=await guest.locator('#stick').boundingBox(),attack=await guest.locator('[data-button="0"]').boundingBox(),jump=await guest.locator('[data-button="13"]').boundingBox();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pad.x+pad.width*.85,y:pad.y+pad.height*.5,id:1},{x:attack.x+attack.width/2,y:attack.y+attack.height/2,id:2},{x:jump.x+jump.width/2,y:jump.y+jump.height/2,id:3}]});
    await host.waitForFunction(()=>smash.game.inputs[1].x>20000&&(smash.game.inputs[1].mask&8193)===8193);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await host.waitForFunction(()=>smash.game.inputs[1].x===0&&smash.game.inputs[1].mask===0);
  }
  // Missing packets must release both analog axes and buttons.
  await guest.keyboard.down('ArrowLeft');await host.waitForFunction(()=>smash.game.inputs[1].x<0);
  await guest.evaluate(()=>{clearInterval(smash.room.timer);smash.room.send=()=>{};});
  await host.waitForFunction(()=>smash.game.inputs[1].x===0,null,{timeout:2500});
  await guest.keyboard.up('ArrowLeft');
  await guest.close();await host.waitForFunction(()=>!smash.room.accepted,null,{timeout:15000});
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  console.log(`PASS ${name}: original N64 game; two phone clients; real WebRTC video/audio; guest analog and buttons; stale-input release; disconnect; no landscape overflow.`,stats);
}catch(e){for(const [i,p] of browser.contexts().flatMap(c=>c.pages()).entries()){console.error(await p.locator('#status').textContent());await p.screenshot({path:`test-results/${name}-failure-${i}.png`});}console.error({errors,failures});throw e;}
finally{await browser.close();server.close();}
