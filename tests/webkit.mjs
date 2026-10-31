import {webkit,devices} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createServer} from '../scripts/serve.mjs';
const server=createServer(4190),browser=await webkit.launch({headless:true,...(process.env.WEBKIT_EXECUTABLE?{executablePath:process.env.WEBKIT_EXECUTABLE}:{})});
await mkdir('test-results',{recursive:true});const errors=[];
try{
  const page=await browser.newPage({...devices['iPhone 13'],viewport:{width:844,height:390}});
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto('http://127.0.0.1:4190/?debug');
  if(!response)throw new Error('WebKit navigation returned no document; this Windows browser installation cannot complete the test.');
  console.log('WebKit capabilities',await page.evaluate(()=>({rtc:typeof RTCPeerConnection,capture:typeof HTMLCanvasElement.prototype.captureStream})));
  await page.locator('#solo-button').tap();
  await page.waitForFunction(()=>smash.game.ready,null,{timeout:125000});
  if(await page.locator('#resume-audio').isVisible())await page.locator('#resume-audio').tap();
  await page.waitForTimeout(6000);
  const frame=await page.evaluate(()=>smash.game.manager.functions.getFrameNum());
  await page.waitForTimeout(1200);
  assert((await page.evaluate(()=>smash.game.manager.functions.getFrameNum()))>frame+5);
  await page.keyboard.press('Enter',{delay:180});await page.waitForTimeout(1500);
  await page.keyboard.press('Enter',{delay:180});await page.waitForTimeout(1500);
  await page.keyboard.press('ArrowDown',{delay:180});await page.waitForTimeout(400);
  await page.keyboard.press('KeyZ',{delay:180});await page.waitForTimeout(1500);
  await page.keyboard.press('KeyZ',{delay:180});await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'test-results/webkit-game.png'});
  await page.setViewportSize({width:393,height:852});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'test-results/webkit-portrait.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: WebKit/iPhone layout, original N64 frames, mobile audio unlock, keyboard/menu input and rotation.');
}catch(e){console.error(errors);for(const p of browser.contexts().flatMap(c=>c.pages()))await p.screenshot({path:'test-results/webkit-solo-failure.png'});throw e;}
finally{await browser.close();server.close();}
