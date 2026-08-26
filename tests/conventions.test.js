'use strict';

/**
 * CONVENTIONS.md, executable (TrioForge audit, F2.7).
 *
 * The written conventions and the codebase drifted apart for weeks — each new
 * task politely documented the violation instead of failing on it. Prose
 * nobody executes is not a contract; these assertions are. They encode the
 * ARCHITECTURE THE CODE ACTUALLY HAS (no-bundler: implementations under
 * public/scripts loaded as script tags, src/ modules as thin CommonJS
 * re-export shims for Jest), so any branch that reinvents a parallel layout
 * fails here instead of at an unresolvable merge.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('CONVENTIONS.md is enforced, not just written', () => {
  test('every script tag in index.html points at an existing file under public/', () => {
    const html = read('public/index.html');
    const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) {
      const rel = path.join('public', src.replace(/^\//, ''));
      expect(fs.existsSync(path.join(ROOT, rel))).toBe(true);
    }
  });

  test('src/screens modules are re-export shims of public/scripts, never a second implementation', () => {
    const dir = path.join(ROOT, 'src', 'screens');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const body = read(path.join('src', 'screens', file));
      // A shim re-exports the canonical implementation; a parallel
      // implementation is exactly the drift that produced unresolvable merges.
      expect(body).toMatch(/module\.exports\s*=\s*require\('\.\.\/\.\.\/public\/scripts\//);
      const lines = body.split('\n').length;
      expect(lines).toBeLessThan(60); // a shim, not a module that grew a life
    }
  });

  test('i18n DATA lives only under public/i18n (the SW precaches it); src/i18n holds loaders only', () => {
    const srcI18n = path.join(ROOT, 'src', 'i18n');
    const offenders = fs.readdirSync(srcI18n).filter((f) => f.endsWith('.json'));
    expect(offenders).toEqual([]);
    expect(fs.existsSync(path.join(ROOT, 'public', 'i18n', 'es.json'))).toBe(true);
  });

  test('no build/test residue is tracked in the repo', () => {
    for (const junk of ['test-output.txt', 'npm-debug.log', '.trioforge']) {
      expect(fs.existsSync(path.join(ROOT, junk))).toBe(false);
    }
  });

  test('the stylesheet keeps [hidden] effective against author display rules', () => {
    // Any `display:` on a class silently defeats the UA's [hidden] rule; JS
    // then toggles .hidden believing it works while the browser keeps
    // painting (seen live: the rewarded-ad CTA visible before answering).
    const css = read('public/styles/main.css');
    expect(css).toMatch(/\[hidden\]\s*\{\s*display:\s*none\s*!important/);
  });

  test('public/scripts stays flat: no nested layout reinvention', () => {
    const dir = path.join(ROOT, 'public', 'scripts');
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    expect(entries.filter((e) => e.isDirectory())).toEqual([]);
  });
});
