# Manual QA: Install Flow + Standalone Launch (TRIOFSND-140)

Automated tests cover UA parsing, minimum-version gating, and the fallback
banner (`src/pwa/__tests__/`). Actual install prompts and standalone launch
must be verified by hand on real/emulated tablets, since `beforeinstallprompt`
and `display-mode` behavior cannot be reliably simulated in CI.

## Devices/browsers to cover (last 2 major versions at test time)

- [ ] Chrome N and N-1 on an Android tablet
- [ ] Edge N and N-1 on a Windows or Android tablet
- [ ] Safari on iPadOS N and N-1

## Per-browser checklist

1. Open the app fresh (clear site data first).
2. Confirm the install affordance appears:
   - Chrome/Edge: native install icon in the address bar or the in-app
     "Add to Home Screen" call to action fires `beforeinstallprompt`.
   - Safari: confirm the manual Share -> "Add to Home Screen" path produces
     a home screen icon (no native prompt exists on Safari by design).
3. Complete the install / add-to-home-screen action.
4. Launch the app from the home screen icon and confirm:
   - [ ] It opens without browser chrome (`display-mode: standalone`
     matches, or `navigator.standalone === true` on iPadOS).
   - [ ] All app assets load with the device offline (airplane mode).
   - [ ] Full flow Inicio -> Quiz -> Resultados -> Volver a jugar works
     with no adult assistance needed.

## Fallback tier checklist (older tablets / embedded browsers)

- [ ] An Android tablet on an OS build older than the supported floor (or
  Chrome/Edge below the minimum version): confirm no install prompt is
  forced, the fallback banner renders, and gameplay works fully in-tab.
- [ ] An embedded/in-app browser (e.g. link opened from a chat app) with no
  `beforeinstallprompt` support: confirm the same graceful fallback.
- [ ] Confirm the fallback banner is dismissible and never blocks the quiz
  flow (COPPA/GDPR-K: no dark patterns, no forced modal for a 6-8 year old).

## Sign-off

Record browser name + exact version tested, device model, and pass/fail per
row above in the linked test run. Attach to TRIOFSND-140 before closing.
