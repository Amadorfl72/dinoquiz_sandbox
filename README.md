# DinoQuiz Backend

This is the backend for the DinoQuiz PWA. It includes an endpoint for receiving anonymous aggregated metrics.

## Getting Started

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Start the server with `npm start`.

## Endpoints

- **POST /api/metrics**: Receives anonymous aggregated metrics.

## Example Request

```json
{
  "eventType": "game_started",
  "eventData": {
    "timestamp": "2023-10-01T12:00:00Z"
  }
}
```