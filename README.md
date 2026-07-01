# DinoQuiz

Sandbox repo para el flujo autónomo de TrioForge.
Los agentes crean ramas `feat/...` desde `main` y abren PRs.

## Node.js Version

This project requires Node.js 24 or later. Node.js 20 is deprecated.

## Question Service

The QuestionService provides:
- Validation of question bank on startup
- Random selection of 10 unique questions per game session
- Fisher-Yates shuffle algorithm for unbiased selection
- Deep copying of questions to prevent modification of original bank

## Security

All GitHub Actions workflows have been updated to use Node.js 24 to address security vulnerabilities.