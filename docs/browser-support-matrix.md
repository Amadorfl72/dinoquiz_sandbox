# DinoQuiz PWA - Minimum Browser Support Matrix (TRIOFSND-140)

DinoQuiz targets tablets used by children 6-8. This matrix defines the
supported install/standalone flow and the fallback behavior for everything
else, per PRD goal of a fully offline, autonomous, child-usable experience.

## Supported install flow (full experience)

| Browser | Platform     | Minimum version policy         | beforeinstallprompt | Standalone launch |
|---------|--------------|---------------------------------|----------------------|--------------------|
| Chrome  | Android tablet | Last 2 major versions          | Yes                  | Yes (display-mode: standalone) |
| Edge    | Windows/Android tablet | Last 2 major versions | Yes                  | Yes (display-mode: standalone) |
| Safari  | iPadOS       | Last 2 major versions          | No (manual Add to Home Screen only) | Yes (navigator.standalone) |

Version floors are tracked in code at `src/pwa/browserSupport.js`
(`MINIMUM_BROWSER_VERSIONS`). Bump them each time a new major ships so the
floor always trails the current release by exactly two majors.

## Fallback tier (in-browser, functional, no install)

Applies when any of the following is true:

- No `navigator.serviceWorker` (older WebView / embedded browser, e.g. an
  in-app browser opened from a messaging app).
- Detected browser/version is below the floor above (older tablet stuck on
  an outdated OS/browser build).
- Browser is unrecognized entirely (kiosk browsers, some embedded WebViews).

Behavior in this tier:

- The app **never blocks gameplay**. All screens (Inicio -> Quiz ->
  Resultados -> Volver a jugar) work fully in a normal browser tab.
- Service worker registration is attempted but wrapped so a failure is
  logged and swallowed, never surfaced to the child.
- A dismissible, low-friction banner (`src/pwa/fallbackBanner.js`) informs
  that the app is running without installation, per COPPA/GDPR-K constraint
  of no forced flows or dark patterns.
- No feature depends on `display-mode: standalone` for correctness; it is
  read-only for analytics/UX purposes.

## Out of scope

- Desktop browsers (product is tablet-first per PRD).
- Firefox for Android (not part of the last-2-versions matrix for v1;
  falls into the functional fallback tier automatically since it lacks
  `beforeinstallprompt`).
