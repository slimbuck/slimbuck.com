import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { validateBundle, verifyPublished } from './check-chirky.js';

async function fixture(t) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'chirky-package-'));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    const files = { 'index.html': '<canvas></canvas>', 'player.js': '// player', 'style.css': '',
        'catalog.json': JSON.stringify({ version: 1, games: [{ id: 'future-game', name: 'Future Game', role: 'game' }] }),
        'assets.json': '["games/future-game/game.conf"]',
        'configs.json': '{"games/future-game/game.conf":"id=future-game"}',
        'runtime/games/future-game/game.conf': 'id=future-game',
        'launcher.js': '// launcher', 'launcher.wasm': 'wasm',
        'future-game.js': '// new game', 'future-game.wasm': 'wasm' };
    const build = { version: 1, sourceCommit: 'a'.repeat(40), sourceDirty: false, files: {} };
    for (const [name, content] of Object.entries(files)) {
        await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
        await fs.writeFile(path.join(root, name), content);
        build.files[name] = createHash('sha256').update(content).digest('hex');
    }
    await fs.writeFile(path.join(root, 'build.json'), JSON.stringify(build));
    return { root, build, save: () => fs.writeFile(path.join(root, 'build.json'), JSON.stringify(build)) };
}

test('new catalog games are required and checked on the deployed site', async t => {
    const { root, build, save } = await fixture(t);
    const bundle = await validateBundle(root);
    assert(bundle.files.has('future-game.wasm'));
    assert(!bundle.files.has('runtime/games/future-game/game.conf'));
    let missing = false, mime = 'application/wasm';
    const server = http.createServer((req, res) => {
        const name = req.url.slice(1), bytes = bundle.files.get(name);
        if (!bytes || (missing && name === 'future-game.wasm')) return res.writeHead(404).end();
        res.writeHead(200, { 'Content-Type': name.endsWith('.wasm') ? mime : 'application/octet-stream' }).end(bytes);
    });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = new URL(`http://127.0.0.1:${server.address().port}/`);
    await verifyPublished(bundle, base);
    missing = true;
    await assert.rejects(verifyPublished(bundle, base), /future-game.wasm: HTTP 404/);
    missing = false; mime = 'text/plain';
    await assert.rejects(verifyPublished(bundle, base));
    delete build.files['future-game.wasm']; await save();
    await assert.rejects(validateBundle(root), /Missing package file: future-game.wasm/);
});

test('dirty, altered and unsafe bundles fail before publication', async t => {
    const { root, build, save } = await fixture(t);
    build.sourceDirty = true; await save();
    await assert.rejects(validateBundle(root), /Commit Chirky/);
    build.sourceDirty = false; build.files['../escape'] = 'a'.repeat(64); await save();
    await assert.rejects(validateBundle(root), /Unsafe package path/);
    delete build.files['../escape']; await save();
    await fs.writeFile(path.join(root, 'future-game.wasm'), 'stale');
    await assert.rejects(validateBundle(root), /build identity mismatch/);
});
