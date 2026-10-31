import {chromium,devices} from '@playwright/test';import {mkdir,writeFile} from 'node:fs/promises';import {createServer} from '../scripts/serve.mjs';
const server=createServer(4191),browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({...devices['Pixel 7'],viewport:{width:844,height:390},deviceScaleFactor:1});await page.goto('http://127.0.0.1:4191/?debug');await page.locator('#solo-button').click();await page.waitForFunction(()=>smash.game.ready,null,{timeout:120000});await page.waitForTimeout(8000);
await page.keyboard.press('Enter',{delay:150});await page.waitForTimeout(2500);await page.keyboard.press('Enter',{delay:150});await page.waitForTimeout(2500);await page.keyboard.press('ArrowDown',{delay:180});await page.waitForTimeout(500);await page.keyboard.press('KeyZ',{delay:160});await page.waitForTimeout(1800);await page.keyboard.press('KeyZ',{delay:160});await page.waitForTimeout(1800);
await page.screenshot({path:'test-results/native-select.png'});
await page.keyboard.down('ArrowUp');await page.waitForTimeout(450);await page.keyboard.up('ArrowUp');
await page.evaluate(()=>smash.game.input(1,{mask:0,x:0,y:-32767}));await page.waitForTimeout(450);await page.evaluate(()=>smash.game.input(1,{mask:0,x:0,y:0}));
await page.screenshot({path:'test-results/native-moved.png'});
}finally{await browser.close();server.close();}