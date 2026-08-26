'use strict';

/**
 * Shared file-collection helper for the privacy/network audit suite
 * (tests/privacy-audit/*.test.js, TRIOFSND-119). Not a test itself -- jest's
 * testMatch only picks up `*.test.js`, so this plain module can be
 * `require`d by every audit file without being run on its own.
 *
 * Walks `public/` and `src/` (the only two trees the app ships or tests
 * from, per CONVENTIONS.md) and returns every executable `.js` file,
 * excluding unit tests and fixtures -- the audit cares about what actually
 * runs in the browser/Node, not about test doubles that intentionally
 * exercise disallowed inputs.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

/** Every `.js` file under public/ and src/ that isn't a unit test. */
function collectProductionJsFiles() {
  const files = [...walk(path.join(ROOT, 'public'), []), ...walk(path.join(ROOT, 'src'), [])];
  return files
    .filter((file) => file.endsWith('.js') && !file.endsWith('.test.js'))
    .map((file) => ({
      relPath: path.relative(ROOT, file),
      content: fs.readFileSync(file, 'utf8'),
    }));
}

function readRepoFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

module.exports = { ROOT, collectProductionJsFiles, readRepoFile };
