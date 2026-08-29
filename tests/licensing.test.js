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
// CC BY-SA 4.0 | ... |" — column count and order vary by folder (some tables
// have a "Descripción"/"Dinosaurio"/"Modo" column, some don't, one has an
// extra "Fuente" column, and realistic/CREDITS.md even repeats the header
// for a second table further down). Matching per-file text would require
// building a RegExp per filename, so instead every "| ... |" line is parsed
// generically and rows are mapped by column *name* (taken from the nearest
// preceding header row) rather than by position — that's what lets the
// attribution check below target the actual "Autor" cell instead of any
// cell in the row.
function stripAccents(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeHeaderName(cell) {
  return stripAccents(cell).toLowerCase().trim();
}

// Returns one entry per data row: { fileName, byHeader }, where byHeader maps
// normalized column names (e.g. "autor", "licencia", "fuente / obra
// original") to that row's cell text.
function parseCreditEntries(markdown) {
  const lines = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'));

  const entries = [];
  let header = null;

  for (const line of lines) {
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (!cells.some((cell) => cell.length > 0)) continue;
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue; // separator row

    if (normalizeHeaderName(cells[0]) === 'fichero') {
      header = cells.map(normalizeHeaderName);
      continue;
    }

    if (!header) continue; // stray row before any header

    const byHeader = {};
    header.forEach((name, index) => {
      byHeader[name] = cells[index] !== undefined ? cells[index] : '';
    });
    entries.push({ fileName: cells[0], byHeader });
  }

  return entries;
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
        const entries = parseCreditEntries(fs.readFileSync(creditsPath, 'utf8'));

        for (const fileName of listAssetFileNames(absDir)) {
          test(`${fileName} has a CREDITS.md entry with attribution and a compatible license`, () => {
            const entry = entries.find((candidate) => candidate.fileName === fileName);
            expect(entry).toBeDefined();

            // The table must have an "Autor" column at all...
            expect(entry.byHeader).toHaveProperty('autor');
            // ...and this specific file's cell in it must be non-empty. This
            // is the actual attribution: unlike checking "any cell in the
            // row", a filled-in license or description cell can no longer
            // stand in for a missing author (e.g. a row like
            // "| spinosaurus.jpg | Spinosaurus | | CC BY 2.5 | |" must fail
            // even though it has non-empty cells besides the filename).
            const author = entry.byHeader.autor || '';
            expect(author.length).toBeGreaterThan(0);

            const license = entry.byHeader.licencia || '';
            expect(license).toMatch(COMPATIBLE_LICENSE_PATTERN);

            // Licenses that legally require attribution to a named creator
            // (any CC BY variant) are meaningless without a verifiable
            // source: if the table also has a "Fuente" column, this file's
            // source cell must be filled in too. CC0/public-domain rows
            // (DinoQuiz's own original artwork) don't need this, since no
            // external work is being attributed.
            const requiresAttribution = /\bCC[\s-]?BY\b/i.test(license);
            const sourceHeader = Object.keys(entry.byHeader).find((name) => name.startsWith('fuente'));
            if (requiresAttribution && sourceHeader) {
              expect((entry.byHeader[sourceHeader] || '').length).toBeGreaterThan(0);
            }
          });
        }
      }
    });
  }
});
