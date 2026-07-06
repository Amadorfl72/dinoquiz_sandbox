# Runbook: TTI p95 High

## Alert

`FunnelDropRateHigh` sibling alert `TTIP95High` fires when the 95th percentile
Time To Interactive (TTI) is above 2 seconds, sustained for at least 1 hour.

## Impact

Children opening DinoQuiz may wait noticeably longer than expected before the
home screen becomes interactive, hurting the "play in under 2 seconds" goal
(AC-1).

## Investigation steps

1. Check the `TTI p95 Dashboard` (`monitoring/dashboards/tti-p95.json`) for the
   affected time window and confirm the regression.
2. Check whether a recent release increased asset/bundle size (service worker
   cache misses on first load are a common cause).
3. Check device/OS breakdown in crash and device analytics for a correlation
   with older devices or specific browsers.
4. Roll back the most recent deploy if the regression started right after a
   release.

## Mitigation

- Revert or hotfix the offending change.
- If caused by asset bloat, defer/lazy-load non-critical assets.
