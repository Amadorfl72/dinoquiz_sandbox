'use strict';

/**
 * Privacy audit -- ad SDK / device-advertising-identifier absence
 * (TRIOFSND-119, PRD open_risks: "sin SDK publicitario comportamental",
 * "sin IDFA/GAID"). public/scripts/adsService.js (docs at its top) already
 * explains v1 ships with only a stub `unavailableProvider`; this test makes
 * that guarantee executable instead of trusting the comment stays true.
 */

const fs = require('fs');
const path = require('path');
const { collectProductionJsFiles, ROOT } = require('./collectSourceFiles');
const { rewardedAdService } = require('../../public/scripts/adsService');

// Package names of known ad-network / mobile-attribution SDKs. Checked
// against package.json's dependency keys, not by substring, to avoid
// flagging an unrelated package that happens to contain one of these words.
const AD_TRACKING_PACKAGES = [
  'react-native-google-mobile-ads',
  'react-native-admob',
  'react-native-fbads',
  'expo-ads-admob',
  'react-native-appsflyer',
  'appsflyer-react-native',
  'react-native-adjust',
  'ironsource-mediation',
  'react-native-unity-ads',
  'applovin-max-react-native',
  'react-native-branch',
  'amplitude-js',
  'mixpanel-browser',
  '@segment/analytics-next',
  'react-native-idfa',
  'react-native-advertising-id',
];

// Identifiers/globals a bundled ad or device-fingerprinting SDK would
// introduce. Substring match on purpose: these are meant to catch a global
// object name or API call, wherever it shows up in shipped code.
const AD_TRACKING_IDENTIFIERS = [
  'idfa',
  'gaid',
  'advertisingidentifier',
  'advertisingid',
  'admob',
  'unityads',
  'applovin',
  'ironsource',
  'appsflyer',
  'adjust.',
  'facebookads',
  'fbadssdk',
];

// This audit's own allowlist module intentionally spells out these terms
// (as the denylist it is) -- excluded here so the audit doesn't flag itself.
const AUDIT_DEFINITION_FILES = ['src/services/analytics/approvedEvents.js'];

describe('privacy audit: no advertising SDK, no device/advertising identifiers', () => {
  const files = collectProductionJsFiles().filter(
    (file) => !AUDIT_DEFINITION_FILES.includes(file.relPath)
  );

  test('package.json declares no ad-network or attribution SDK dependency', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    const offenders = declared.filter((name) => AD_TRACKING_PACKAGES.includes(name));
    expect(offenders).toEqual([]);
  });

  test('no shipped .js file references an ad SDK global or IDFA/GAID-style identifier', () => {
    const offenders = [];
    for (const file of files) {
      const lower = file.content.toLowerCase();
      for (const identifier of AD_TRACKING_IDENTIFIERS) {
        if (lower.includes(identifier)) {
          offenders.push(`${file.relPath} references "${identifier}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test('the rewarded-ad seam still defaults to the unavailable (no real SDK) provider', () => {
    expect(rewardedAdService.isAvailable()).toBe(false);
  });

  test('adsService.js only ships the documented no-op provider, not a live SDK integration', () => {
    const adsServiceSource = fs.readFileSync(
      path.join(ROOT, 'public', 'scripts', 'adsService.js'),
      'utf8'
    );
    expect(adsServiceSource).toMatch(/function unavailableProvider/);
    // Guards against someone wiring a second, "real" provider into the same
    // file instead of keeping the single injectable seam the doc comment
    // describes -- exactly one `new RewardedAdService(...)` construction site.
    const constructions = [...adsServiceSource.matchAll(/new RewardedAdService\(/g)];
    expect(constructions.length).toBe(1);
  });
});
