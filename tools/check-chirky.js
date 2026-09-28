// Validate the exported bundle before publishing, then verify the deployed bytes.
// node tools/check-chirky.js --local | node tools/check-chirky.js https://slimbuck.com/
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const safeName = name => typeof name === 'string' && !/[\\:]/.test(name) &&
    name.split('/').every(part => part && part !== '.' && part !== '..');

export async function validateBundle(root) {
    const read = async name => {
        assert(safeName(name), `Unsafe package path: ${name}`);
        let file = root;
        for (const part of name.split('/')) {
            file = path.join(file, part);
            assert(!(await fs.lstat(file)).isSymbolicLink(), `Package link: ${name}`);
        }
        return fs.readFile(file);
    };
    const buildBytes = await read('build.json');
    const build = JSON.parse(buildBytes);
    assert.equal(build.version, 1);
    assert.match(build.sourceCommit, /^[a-f0-9]{40}$/);
    assert.equal(build.sourceDirty, false, 'Commit Chirky and rebuild before publishing');
    assert(build.files && typeof build.files === 'object' && !Array.isArray(build.files));
    assert(!Object.hasOwn(build.files, 'build.json'));
    const bytes = new Map([['build.json', buildBytes]]);
    for (const [file, digest] of Object.entries(build.files)) {
        assert.match(digest, /^[a-f0-9]{64}$/);
        const content = await read(file);
        assert.equal(hash(content), digest, `${file}: build identity mismatch`);
        bytes.set(file, content);
    }
    const json = name => {
        assert(bytes.has(name), `Missing package file: ${name}`);
        return JSON.parse(bytes.get(name));
    };
    const catalog = json('catalog.json');
    assert.equal(catalog.version, 1);
    assert(Array.isArray(catalog.games) && catalog.games.length);
    const ids = catalog.games.map(game => {
        assert.match(game.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        assert.equal(typeof game.name, 'string');
        assert(['game', 'diagnostic'].includes(game.role));
        return game.id;
    });
    assert.equal(new Set(ids).size, ids.length, 'Duplicate catalog game id');
    for (const file of ['index.html', 'player.js', 'style.css',
        ...['launcher', ...ids].flatMap(id => [id + '.js', id + '.wasm'])])
        assert(bytes.has(file), `Missing package file: ${file}`);
    const assets = json('assets.json'), configs = json('configs.json');
    assert(Array.isArray(assets));
    for (const file of assets) {
        assert(safeName(file), `Unsafe asset path: ${file}`);
        assert(bytes.has('runtime/' + file), `Missing runtime asset: ${file}`);
        if (file.endsWith('.conf'))
            assert.equal(configs[file], bytes.get('runtime/' + file).toString('utf8'), `${file}: configuration mismatch`);
    }
    // CDN rules may block .conf URLs; those bytes are transported in configs.json.
    return { build, catalog, configs, files: new Map([...bytes].filter(([file]) => !file.endsWith('.conf'))) };
}

export async function verifyPublished(bundle, base) {
    const files = [...bundle.files];
    async function check([file, expected]) {
        const response = await fetch(new URL(file, base), { signal: AbortSignal.timeout(20000) });
        assert.equal(response.status, 200, `${file}: HTTP ${response.status}`);
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected, `${file}: deployed bytes differ from build`);
        if (file.endsWith('.wasm')) assert.match(response.headers.get('content-type') || '', /^application\/wasm\b/);
    }
    for (let i = 0; i < files.length; i += 6) await Promise.all(files.slice(i, i + 6).map(check));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const root = fileURLToPath(new URL('../dist/apps/chirky/', import.meta.url));
    const bundle = await validateBundle(root);
    if (process.argv[2] !== '--local')
        await verifyPublished(bundle, new URL('apps/chirky/', process.argv[2] || 'http://127.0.0.1:8772/'));
    console.log(`Chirky ${process.argv[2] === '--local' ? 'bundle' : 'deployment'} verified: ${bundle.catalog.games.length} games, ${bundle.files.size} public files, ${Object.keys(bundle.configs).length} configurations. Source: ${bundle.build.sourceCommit}.`);
}
