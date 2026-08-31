'use strict';

/**
 * Guards public/data/launchGateReport.json against silent drift (TRIOFSND-325):
 * that file is committed, precomputed data (see scripts/generateLaunchGateReport.js's
 * own doc comment for why), so nothing re-runs it automatically the way a
 * live `evaluateLaunchGates()` call would. This fails CI whenever the
 * committed report no longer matches what running the generator right now
 * would produce -- e.g. a creature-data edit, a round-generator change, or a
 * PRECACHE_URLS/SW_VERSION bump landed without also re-running
 * `node scripts/generateLaunchGateReport.js`.
 */

const fs = require('fs');
const { buildReport, REPORT_PATH } = require('../scripts/generateLaunchGateReport');

/**
 * Reduces a report to what the screen actually renders -- `pass`/`fail` per
 * gate -- rather than every diagnostic detail field. Some gates (e.g.
 * `generadores.siluetas`, via shadowGuessRound.generateShadowRound with no
 * seed) pick a fresh random sample on every `evaluateLaunchGates()` call, so
 * a byte-for-byte diff would flag that harmless variation as drift; the
 * pass/fail outcome itself does not vary between runs.
 */
function summarize(report) {
  const gates = {};
  Object.keys(report.gates).forEach((gateId) => {
    gates[gateId] = report.gates[gateId].pass;
  });
  return { candidateVersion: report.candidateVersion, pass: report.pass, gates };
}

describe('generateLaunchGateReport', () => {
  test('public/data/launchGateReport.json matches a fresh run of the generator', () => {
    const committed = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
    const fresh = buildReport();

    expect(summarize(committed)).toEqual(summarize(fresh));
  });

  test('the report includes every gate id launchGate.js defines, each with a boolean pass', () => {
    const { GATE_IDS } = require('../src/services/launchGate');
    const report = buildReport();

    Object.values(GATE_IDS).forEach((gateId) => {
      expect(report.gates[gateId]).toBeDefined();
      expect(typeof report.gates[gateId].pass).toBe('boolean');
    });
    expect(typeof report.pass).toBe('boolean');
    expect(typeof report.candidateVersion).toBe('string');
  });
});
