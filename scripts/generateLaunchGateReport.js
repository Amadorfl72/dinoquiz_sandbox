'use strict';

/**
 * Regenerates public/data/launchGateReport.json (TRIOFSND-325).
 *
 * DinoQuiz ships with no bundler and no backend (PRD constraint), so the
 * launch-gate status screen (public/scripts/launchGateScreen.js) cannot
 * evaluate `src/services/launchGate.js`'s ten gates live in a real browser:
 * `evaluateLaunchGates()` transitively requires ~15 CommonJS modules under
 * `src/` that have no `window.DinoQuiz` browser bridge (creature-catalog
 * validation, WCAG contrast math, etc.), and re-implementing all of that
 * logic a second time as browser bridges would duplicate -- and risk
 * drifting from -- the one real rule each gate already tests.
 *
 * Every gate `evaluateLaunchGates()` checks is a property of the shipped
 * CODE/DATA (does creatures.json validate, is every maze solvable, do the
 * theme colors meet WCAG AA...), identical for every device running a given
 * release -- not per-device runtime state. So, like SW_VERSION itself (PRD:
 * "cada modificación del precache debe incrementar SW_VERSION", bumped by
 * hand on every release), the gates report is computed once here, at
 * release time, and committed as static data the browser fetches
 * (public/data/launchGateReport.json, precached like creatures.json/
 * questions.json). `tests/pwa/precache-completeness.test.js` requires it be
 * listed in PRECACHE_URLS; `scripts/generateLaunchGateReport.test.js` fails
 * CI if the committed file drifts from a fresh run of this script.
 *
 * Run after any change that could move a gate's outcome (creature data,
 * round generators, theme colors, PRECACHE_URLS/SW_VERSION...), as part of
 * the same release step that already bumps SW_VERSION by hand:
 *   node scripts/generateLaunchGateReport.js
 *
 * Product goals (src/services/productGoals.js) are NOT part of this report
 * -- unlike the gates, goal approval is genuine per-device runtime state
 * recorded in localStorage, so it is read live in the browser via that
 * module's real `window.DinoQuiz.services.productGoals` bridge instead.
 */

const fs = require('fs');
const path = require('path');

const REPORT_PATH = path.join(__dirname, '../public/data/launchGateReport.json');

/** Pure so scripts/generateLaunchGateReport.test.js can call it without touching disk. */
function buildReport() {
  // service-worker.js calls `self.addEventListener(...)` at module load time;
  // under Jest, jsdom's `self` already aliases `window`, but this script runs
  // under plain Node, which has no `self` global at all.
  if (typeof self === 'undefined') {
    global.self = { addEventListener: function () {} };
  }

  // eslint-disable-next-line global-require
  const { version: candidateVersion } = require('../package.json');
  // eslint-disable-next-line global-require
  const { evaluateLaunchGates } = require('../src/services/launchGate');

  const { pass, gates } = evaluateLaunchGates();
  return { candidateVersion, pass, gates };
}

function main() {
  const report = buildReport();
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  // eslint-disable-next-line no-console
  console.log(`Wrote ${path.relative(process.cwd(), REPORT_PATH)} (pass: ${report.pass})`);
}

if (require.main === module) {
  main();
}

module.exports = { buildReport, REPORT_PATH };
