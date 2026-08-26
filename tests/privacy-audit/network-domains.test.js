'use strict';

/**
 * Privacy audit -- network traffic (TRIOFSND-119, PRD G7: "evitando...
 * publicidad, tracking individual y transmisión de progreso fuera del
 * dispositivo"). DinoQuiz ships with no backend at all (CONVENTIONS.md), so
 * the only correct answer to "what third-party/tracking domains does the
 * app call?" is zero -- this file asserts that statically instead of trusting
 * it stays true as new screens/services get added.
 *
 * Complements tests/e2e/privacy-network-audit.spec.js, which proves the same
 * thing dynamically (real Chromium, real network layer, a full game played
 * through).
 */

const { collectProductionJsFiles, readRepoFile } = require('./collectSourceFiles');

// Literal absolute URLs a static scan is allowed to see in shipped JS: only
// same-machine fallbacks used for URL *parsing*, never an actual request
// target (see public/scripts/appShell.js's external-link-guard base href).
const ALLOWED_ABSOLUTE_URLS = ['http://localhost/'];

// Known ad-network / individual-tracking domains. Substring match is
// intentional here (unlike the exact-key PII check) because a tracking
// domain can appear as a subdomain, e.g. "pagead2.googlesyndication.com" or
// "connect.facebook.net" -- any occurrence at all is a finding.
const AD_TRACKING_DOMAINS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'google-analytics.com',
  'googletagmanager.com',
  'googletagservices.com',
  'admob.com',
  'facebook.com',
  'facebook.net',
  'fbcdn.net',
  'amazon-adsystem.com',
  'adnxs.com',
  'rubiconproject.com',
  'pubmatic.com',
  'openx.net',
  'criteo.com',
  'taboola.com',
  'outbrain.com',
  'scorecardresearch.com',
  'quantserve.com',
  'comscore.com',
  'mixpanel.com',
  'segment.io',
  'segment.com',
  'amplitude.com',
  'adjust.com',
  'appsflyer.com',
  'branch.io',
  'kochava.com',
  'singular.net',
  'hotjar.com',
  'fullstory.com',
  'unityads.unity3d.com',
  'applovin.com',
  'ironsrc.com',
  'ironsource.com',
  'vungle.com',
  'chartboost.com',
  'tapjoy.com',
  'mopub.com',
  'pangle.io',
  'moloco.com',
  'bytedance.com',
  'tiktok.com',
  'pinterest.com',
  'snapchat.com',
];

function extractAbsoluteUrls(content) {
  return [...content.matchAll(/https?:\/\/[^\s"'`)]+/g)].map((match) => match[0]);
}

describe('privacy audit: no network calls to ad/tracking domains', () => {
  const files = collectProductionJsFiles();

  test('the production source tree is not empty (sanity check for this audit itself)', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  test('no shipped .js file contains an ad/tracking domain, in any form', () => {
    const offenders = [];
    for (const file of files) {
      for (const domain of AD_TRACKING_DOMAINS) {
        if (file.content.toLowerCase().includes(domain)) {
          offenders.push(`${file.relPath} references "${domain}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test('no shipped .js file hardcodes an absolute URL outside the allowlist', () => {
    const offenders = [];
    for (const file of files) {
      for (const url of extractAbsoluteUrls(file.content)) {
        if (!ALLOWED_ABSOLUTE_URLS.includes(url)) {
          offenders.push(`${file.relPath}: ${url}`);
        }
      }
    }
    // Every real network call DinoQuiz makes is a relative fetch('/data/...',
    // '/i18n/...') against its own origin (no backend to call). An absolute
    // URL appearing here is either a new external dependency or a
    // send-logs-style capability that got wired up without review.
    expect(offenders).toEqual([]);
  });

  test('LogService.sendLogs (the only code path that can POST off-device) is never invoked from shipped code', () => {
    const offenders = files.filter((file) => /\.sendLogs\s*\(/.test(file.content));
    // sendLogs() exists as a documented capability (src/services/logging/ENDPOINT_USAGE.md)
    // for a future backend integration, but the PRD (G7, out_of_scope: sin
    // cuentas/sync) forbids transmitting anything off-device today. If this
    // ever fires, a caller started using it -- the manual quarterly audit
    // (README.md) must confirm the destination and consent story before that ships.
    expect(offenders.map((f) => f.relPath)).toEqual([]);
  });

  test('index.html loads every script/stylesheet/icon from the app\'s own origin', () => {
    const html = readRepoFile('public/index.html');
    const srcAttrs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
    const external = srcAttrs.filter((attr) => /^https?:\/\//.test(attr));
    expect(external).toEqual([]);
  });
});
