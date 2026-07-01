# DinoQuiz Event Ingestion (TRIOFSND-35)

Minimal Express backend that receives anonymous `game_completed` events
from the DinoQuiz PWA.

## Endpoint

```
POST /v1/events/game_completed
Content-Type: application/json
```

### Body

| field          | type    | required | notes                          |
|----------------|---------|----------|--------------------------------|
| event_name     | string  | yes      | must be `"game_completed"`     |
| score          | int     | yes      | 0–10                           |
| duration_ms    | int     | yes      | non-negative, sane cap 24h      |
| app_version    | string  | yes      | short, e.g. `"1.0.0"`          |
| timestamp_ms   | int     | no       | epoch ms, ±7 days of server now |
| device         | object  | no       | `os`, `locale`, `screen` only   |

Returns `202 { status: "accepted" }` on success, `400` on validation error.

## Privacy

Per COPPA / GDPR-K the endpoint rejects any field that could carry an
identifier (UUIDs, IDFA/GAID, base64 blobs, unexpected keys). No PII is
stored. Events are intended for aggregation only.

## Run

```bash
npm install
npm start        # production
npm run dev      # auto-reload
npm test         # unit tests
```
