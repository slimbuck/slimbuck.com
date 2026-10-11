// Threaded WASM needs isolation on both the article and its embedded player.
const base = process.argv[2] || 'https://slimbuck.com/';
for (const path of ['/projects/hasty.html', '/projects/playtracer.html', '/apps/hasty/', '/apps/playtracer/']) {
    const response = await fetch(new URL(path, base));
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    for (const [header, expected] of [
        ['cross-origin-opener-policy', 'same-origin'],
        ['cross-origin-embedder-policy', 'require-corp']
    ]) {
        if (response.headers.get(header) !== expected) {
            throw new Error(`${path}: expected ${header}: ${expected}`);
        }
    }
    await response.body?.cancel();
    console.log(`Embed isolation verified: ${path}`);
}
