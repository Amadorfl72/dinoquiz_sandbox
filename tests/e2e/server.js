'use strict';

/**
 * Minimal static file server for `public/`, used only by the Playwright
 * e2e tests (see playwright.config.js). DinoQuiz ships without a bundler or
 * a backend, so the real app is "just" the files under public/ served over
 * HTTP — a service worker can't be exercised from a `file://` URL, which is
 * why the jsdom-based tests/pwa/offline-full-game.test.js can't cover it.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '../../public');
const PORT = process.env.PORT || 4173;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
};

function resolveFilePath(pathname) {
  const withoutQuery = pathname.split('?')[0];
  const relative = withoutQuery === '/' ? 'index.html' : withoutQuery.replace(/^\/+/, '');
  const resolved = path.normalize(path.join(PUBLIC_DIR, relative));

  // Never serve a path that escapes PUBLIC_DIR (e.g. via "..").
  if (!resolved.startsWith(PUBLIC_DIR)) {
    return null;
  }
  return resolved;
}

const server = http.createServer((req, res) => {
  const filePath = resolveFilePath(req.url);

  if (!filePath) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const contentType = CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`DinoQuiz static server listening on http://localhost:${PORT}`);
  });
}

module.exports = server;
