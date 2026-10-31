import {readdirSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
for(const directory of ['site','scripts','tests'])for(const file of readdirSync(directory)){
  if(!/\.(m?js)$/.test(file))continue;
  const result=spawnSync(process.execPath,['--check',`${directory}/${file}`],{stdio:'inherit'});
  if(result.status)process.exit(result.status);
}
const html=readFileSync('site/index.html','utf8');
for(const [,file] of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))readFileSync(`site/${file}`);
console.log('Syntax and entry-point assets verified.');
