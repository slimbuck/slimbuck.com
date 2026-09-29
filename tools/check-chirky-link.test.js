import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../aws/cf-rewrite.js',import.meta.url),'utf8'),context);
test('old Chirky URLs redirect with game, level and repeated query parameters',()=>{
 const request={uri:'/apps/chirky/',querystring:{game:{value:'phosphor-run'},level:{value:'3'},tag:{multiValue:[{value:'a'},{value:'b'}]}}};
 const result=context.handler({request});assert.equal(result.statusCode,301);assert.equal(result.headers.location.value,'https://chirky.org/?game=phosphor-run&level=3&tag=a&tag=b');
 assert.equal(context.handler({request:{uri:'/apps/chirky',querystring:{}}}).headers.location.value,'https://chirky.org/');
 assert.equal(context.handler({request:{uri:'/apps/hasty/',querystring:{}}}).uri,'/apps/hasty/index.html');
});
test('project links to Chirky without an embed',()=>{
 const source=fs.readFileSync(new URL('../content/projects/chirky.md',import.meta.url),'utf8');assert(!/^embed:/m.test(source));assert(source.includes('https://chirky.org/'));
});
