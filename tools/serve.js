// Local preview with the same isolation required by threaded WebAssembly apps.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT || 8772);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf' };

http.createServer((req, res) => {
    try {
        const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        let file = path.resolve(root, '.' + urlPath);
        const relative = path.relative(root, file);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
            res.writeHead(403).end();
            return;
        }
        if (fs.statSync(file).isDirectory()) {
            if (!urlPath.endsWith('/')) {
                res.writeHead(301, { Location: urlPath + '/' }).end();
                return;
            }
            file = path.join(file, 'index.html');
        }
        const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' };
        // Keep blog pages non-isolated so giscus works. Projects also need these
        // headers for threaded games embedded below the project description.
        if (urlPath.startsWith('/apps/') || urlPath.startsWith('/projects/')) {
            headers['Cross-Origin-Opener-Policy'] = 'same-origin';
            headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
        }
        const content = fs.readFileSync(file);
        res.writeHead(200, headers);
        res.end(req.method === 'HEAD' ? undefined : content);
    } catch {
        res.writeHead(404).end('Not found');
    }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}`));
