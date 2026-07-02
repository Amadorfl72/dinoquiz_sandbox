# DinoQuiz

Sandbox repo para el flujo autónomo de TrioForge.
Los agentes crean ramas `feat/...` desde `main` y abren PRs.

## New Features
- Added `fun_fact_viewed` event logging and metric tracking

### Changes
- Added `logFunFactViewed` function in `src/analytics/logger.js` to log the `fun_fact_viewed` event
- Added `incrementMetric` function in `src/analytics/metrics.js` to increment the `fun_fact_viewed` metric
- Updated `QuestionFeedback` component in `src/components/QuestionFeedback.js` to log the event when a fun fact is displayed
- Updated test files `tests/test_analytics.py` and `tests/test_fun_fact_service.py` to reflect the actual implementation