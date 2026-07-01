# DinoQuiz

Sandbox repo para el flujo autónomo de TrioForge.
Los agentes crean ramas `feat/...` desde `main` y abren PRs.

## Best Score Logic Implementation

This project implements the best score comparison and update logic in C#.
The implementation includes:

- A `BestScoreManager` class that handles game completion events
- Comparison of new scores against stored best scores
- Storage updates when new scores exceed the current best
- Event triggering for UI feedback when a new best score is achieved

The logic ensures that scores are only updated when they represent an improvement,
and provides feedback to the UI when new records are set.