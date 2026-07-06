const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
};

function contentTypeFor(filePath) {
  if (filePath.endsWith('manifest.json')) {
    return 'application/manifest+json; charset=UTF-8';
  }
  const ext = path.extname(filePath);
  return MIME_TYPES[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent(req.url.split('?')[0]);
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath === '/' ? 'index.html' : safePath);

  fs.stat(filePath, (statErr, stats) => {
    if (!statErr && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        // Single-page navigation fallback: serve index.html for unknown routes
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (indexErr, indexContent) => {
          if (indexErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
          res.end(indexContent);
        });
        return;
      }

      res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
      res.end(content);
    });
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`DinoQuiz static server running at http://localhost:${PORT}`);
  });
}

module.exports = server;
