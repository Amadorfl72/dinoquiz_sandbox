'use strict';

/**
 * PRD constraint (Nuevos Modos de Juego): "Las imágenes y audios nuevos deben
 * disponer de licencia compatible y atribución en CREDITS.md." Every
 * asset folder under public/assets/images/ and public/assets/sounds/ (one per
 * new mode: modes/, cards/, and any per-creature audio folder such as
 * oido-jurasico/) already documents its files in a sibling CREDITS.md table.
 * This test walks those folders generically instead of hard-coding filenames,
 * so it also covers assets added by sibling in-flight branches once merged,
 * and fails CI the moment a new image/audio file ships without a matching
 * CREDITS.md row.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ASSET_ROOTS = ['public/assets/images', 'public/assets/sounds'];
const ASSET_EXTENSIONS = new Set([
  '.svg', '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.wav', '.mp3', '.ogg', '.m4a',
]);
// Every existing CREDITS.md in the repo uses one of these (CC0, CC BY, CC
// BY-SA, or an explicit public-domain dedication) — any other wording (e.g.
// "all rights reserved" or no license at all) is not compatible for a PWA
// that ships the asset directly.
const COMPATIBLE_LICENSE_PATTERN = /\bCC0\b|\bCC[\s-]?BY(-SA)?\b|dominio p[uú]blico|public domain/i;

function listSubdirectories(absDir) {
  const dirs = [];
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const child = path.join(absDir, entry.name);
      dirs.push(child);
      dirs.push(...listSubdirectories(child));
    }
  }
  return dirs;
}

function listAssetFileNames(absDir) {
  return fs
    .readdirSync(absDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => ASSET_EXTENSIONS.has(path.extname(name).toLowerCase()));
}

// CREDITS.md rows look like "| trex.jpg | Tyrannosaurus Rex | Nobu Tamura |
// CC BY-SA 4.0 | ... |" — column count varies by folder, but the filename is
// always the first cell, so rows are parsed generically rather than matching
// per-file text (which would require building a RegExp per filename).
function parseCreditRows(markdown) {
  return markdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.some((cell) => cell.length > 0) && !cells.every((cell) => /^:?-+:?$/.test(cell)));
}

describe('every image/audio asset is credited in its folder CREDITS.md', () => {
  const assetDirs = ASSET_ROOTS
    .map((rel) => path.join(ROOT, rel))
    .flatMap((absRoot) => listSubdirectories(absRoot))
    .map((absDir) => ({ absDir, relDir: path.relative(ROOT, absDir) }))
    .filter(({ absDir }) => listAssetFileNames(absDir).length > 0);

  test('the scan itself found at least one credited asset folder', () => {
    expect(assetDirs.length).toBeGreaterThan(0);
  });

  for (const { absDir, relDir } of assetDirs) {
    describe(relDir, () => {
      const creditsPath = path.join(absDir, 'CREDITS.md');
      const creditsExists = fs.existsSync(creditsPath);

      test('has a CREDITS.md documenting its assets', () => {
        expect(creditsExists).toBe(true);
      });

      if (creditsExists) {
        const rows = parseCreditRows(fs.readFileSync(creditsPath, 'utf8'));

        for (const fileName of listAssetFileNames(absDir)) {
          test(`${fileName} has a CREDITS.md entry with attribution and a compatible license`, () => {
            const row = rows.find((cells) => cells[0] === fileName);
            expect(row).toBeDefined();

            // Attribution: some cell besides the filename must carry text
            // (author/creature/mode name) — an all-empty row would be
            // "credited" in name only, with nothing a reader could verify.
            expect(row.slice(1).some((cell) => cell.length > 0)).toBe(true);

            expect(row.join(' | ')).toMatch(COMPATIBLE_LICENSE_PATTERN);
          });
        }
      }
    });
  }
});
