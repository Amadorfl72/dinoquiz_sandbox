# Metrics Ingestion Endpoint

This service provides an endpoint to receive anonymous aggregated metrics like 'game_started' and 'app_open' without PII.

## API Endpoints

### POST /metrics

Record an anonymous metric event.

**Request Body:**
```json
{
  "event": "game_started"
}
```

**Response:**
```json
{
  "success": true
}
```

### GET /metrics/summary

Get a summary of recorded metrics.

**Response:**
```json
{
  "metrics": {
    "game_started": 42,
    "app_open": 100
  }
}
```

## Development

1. Install dependencies:
```bash
npm install express cors
```

2. Start the server:
```bash
node src/app.js
```

## Deployment

This service can be deployed to any Node.js hosting provider. Ensure environment variables are set as needed (e.g., `PORT`).