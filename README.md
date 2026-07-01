# DinoQuiz

Sandbox repo para el flujo autónomo de TrioForge.
Los agentes crean ramas `feat/...` desde `main` y abren PRs.

**Security Update:** Updated Node.js version to 24 in GitHub Actions workflows to address security vulnerabilities.

**New Feature:** Implemented fun_fact_viewed metric and logging:
- Structured log payload with event, question_id, dino_id, and app_version
- Aggregated metric tracking fun_fact_viewed events
- Comprehensive test coverage
- Input validation for required fields
