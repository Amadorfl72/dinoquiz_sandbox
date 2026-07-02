# DinoQuiz

Sandbox repo para el flujo autónomo de TrioForge.
Los agentes crean ramas `feat/...` desde `main` y abren PRs.

## Security Considerations

- All analytics events must be logged using the structured logging format
- No personally identifiable information (PII) should be included in logs
- Analytics events should be validated against a schema before logging