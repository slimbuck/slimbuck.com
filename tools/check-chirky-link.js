import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const local=process.argv[2]==='--local';
let page;
if(local)page=await fs.readFile(new URL('../dist/projects/chirky.html',import.meta.url),'utf8');
else {
 const response=await fetch(new URL('projects/chirky.html',process.argv[2]),{signal:AbortSignal.timeout(20000)});
 assert.equal(response.status,200,'Project page must return HTTP 200');page=await response.text();
}
assert.match(page,/href="https:\/\/chirky\.org\/"/);
assert(!/<iframe[^>]*src="[^" ]*chirky/.test(page),'Chirky must be a link, not an embed');
if(local){const names=await fs.readdir(new URL('../dist/apps/chirky/',import.meta.url));assert.deepEqual(names,['index.html']);}
console.log('Chirky external link verified.');
