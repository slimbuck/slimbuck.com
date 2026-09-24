// Verify the actual deployed bytes, including every resource used by each game.
// Usage: node tools/check-chirky.js https://slimbuck.com/
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../dist/apps/chirky/', import.meta.url));
const base = new URL('apps/chirky/', process.argv[2] || 'http://127.0.0.1:8765/');
async function check(file) {
    const response = await fetch(new URL(file, base), { signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, `${file}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.deepEqual(bytes, await fs.readFile(path.join(root, file)), `${file}: deployed bytes differ from build`);
    if (file.endsWith('.wasm')) assert.match(response.headers.get('content-type') || '', /^application\/wasm\b/);
    return bytes;
}
const assets = JSON.parse(await check('assets.json'));
const configs = JSON.parse(await check('configs.json'));
for (const file of assets.filter((name) => name.endsWith('.conf'))) {
    assert.equal(configs[file], await fs.readFile(path.join(root, 'runtime', file), 'utf8'), file);
}
const files = ['index.html', 'player.js', 'style.css',
    ...['launcher', 'phosphor-run', 'rosey-chop', 'hardware-test'].flatMap((id) => [id + '.js', id + '.wasm']),
    ...assets.filter((file) => !file.endsWith('.conf')).map((file) => 'runtime/' + file)];
for (let i = 0; i < files.length; i += 6) await Promise.all(files.slice(i, i + 6).map(check));
console.log(`Chirky verified: ${files.length + 2} public files and ${Object.keys(configs).length} game configurations.`);
