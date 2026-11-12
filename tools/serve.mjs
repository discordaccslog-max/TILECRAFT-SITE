/*
 * A static file server for working on the site locally.
 *
 *   node tools/serve.mjs [port]
 *
 * It serves the repository root the way GitHub Pages does: a request for a
 * directory returns that directory's index.html, and an unknown path returns
 * 404.html with a 404 status. Nothing here is part of the published site.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';

    const target = path.join(root, rel);
    if (!target.startsWith(root)) {
      send(res, 403, Buffer.from('Forbidden'), 'text/plain');
      return;
    }

    let file = target;
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, 'index.html');
    }

    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      const notFound = path.join(root, '404.html');
      if (fs.existsSync(notFound)) {
        send(res, 404, fs.readFileSync(notFound), TYPES['.html']);
      } else {
        send(res, 404, Buffer.from('Not found'), 'text/plain');
      }
      return;
    }

    send(res, 200, fs.readFileSync(file), TYPES[path.extname(file).toLowerCase()]);
  })
  .listen(port, () => {
    console.log('Serving ' + root + ' at http://localhost:' + port + '/');
  });
