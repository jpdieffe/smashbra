import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
test('the supplied original ROM ZIP remains unchanged',()=>{
  const manifest=JSON.parse(readFileSync('site/game-manifest.json'));
  const hash=createHash('sha256').update(readFileSync('site/roms/super-smash-bros.zip')).digest('hex');
  assert.equal(hash,manifest.zipSha256);assert.equal(manifest.romBytes,16777216);
});
