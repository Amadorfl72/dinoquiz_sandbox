# Logging Endpoint Usage

The LogService provides a `sendLogs()` method to transmit accumulated logs to a backend endpoint.

## Basic Usage

```javascript
const LogService = require('./index').LogService;
const logger = new LogService();

// Log some events
logger.logAppAccess({ locale: 'es' });
logger.logPwaInstallSuccess({ displayMode: 'standalone' });

// Send logs to your backend endpoint
logger.sendLogs('https://your-backend.com/api/logs')
  .then((response) => {
    console.log('Logs sent successfully:', response);
    // Logs are automatically cleared after successful transmission
  })
  .catch((error) => {
    console.error('Failed to send logs:', error);
    // Logs remain in storage for retry
  });
```

## API

### `sendLogs(endpointUrl, options)`

Sends accumulated logs to a backend endpoint via HTTP POST.

**Parameters:**
- `endpointUrl` (string, required): The URL to POST logs to
- `options` (object, optional):
  - `clearOnSuccess` (boolean, default: true): Whether to clear logs after successful transmission
  - `timeout` (number, default: 5000): Request timeout in milliseconds (planned for future)

**Returns:** Promise that resolves with the endpoint response or rejects on error

**Payload Structure:**
```json
{
  "version": "1.0",
  "timestamp": "2026-08-01T12:00:00.000Z",
  "logCount": 2,
  "logs": [
    {
      "version": "1.0",
      "timestamp": "2026-08-01T12:00:00.000Z",
      "eventType": "app_access",
      "requestId": "log_1722515400000_abc123",
      "userAgent": "Mozilla/5.0...",
      "platform": "mobile_ios",
      "metadata": { "locale": "es" }
    }
  ]
}
```

## Options

### `clearOnSuccess: false`

Keep logs after successful transmission (useful for debugging/retention):

```javascript
logger.sendLogs('https://your-backend.com/api/logs', { clearOnSuccess: false })
  .then(() => {
    // Logs still available in localStorage
    const allLogs = logger.getLogs();
  });
```

## Backend Endpoint Requirements

The backend endpoint should:

1. Accept POST requests with `Content-Type: application/json`
2. Return HTTP 200-299 status on success
3. Optionally return JSON in the response body

Example Express.js handler:

```javascript
app.post('/api/logs', (req, res) => {
  const payload = req.body;
  console.log(`Received ${payload.logCount} logs from ${payload.logs[0]?.platform}`);
  
  // Store logs in your database
  saveLogsToDatabase(payload.logs);
  
  res.json({ success: true, processed: payload.logCount });
});
```

## Error Handling

The `sendLogs()` method rejects in these cases:

- `sendLogs requires a valid endpointUrl`: Invalid or missing URL
- `fetch API not available`: fetch() not available in the environment
- `HTTP {status}: {statusText}`: HTTP error responses (4xx, 5xx)
- Network errors: Connection failures, timeouts, etc.

When an error occurs, logs remain in storage for retry attempts.

## Integration Example

Automatic periodic transmission to backend:

```javascript
const logger = resolveLogger();

// Every 30 seconds, send logs if endpoint is available
setInterval(() => {
  const LOGGING_ENDPOINT = process.env.REACT_APP_LOGGING_ENDPOINT;
  if (LOGGING_ENDPOINT && logger.getLogs().length > 0) {
    logger.sendLogs(LOGGING_ENDPOINT).catch(() => {
      // Silently fail - logs stay in storage for next attempt
    });
  }
}, 30000);
```

## Event Types

Logged events include:

- `app_access`: Application loaded
- `service_worker_install`: Service worker installed
- `service_worker_activate`: Service worker activated  
- `manifest_load`: Manifest JSON loaded
- `pwa_install_attempt`: User initiated PWA install
- `pwa_install_success`: PWA installed successfully
- `pwa_install_failure`: PWA installation failed

Each event captures: timestamp, requestId (for tracing), userAgent, detected platform, and custom metadata.

## Diagnostics counters & entries (local-only, never sent by `sendLogs`)

`logSelectorOpen()` / `getSelectorOpenCount()` track a single aggregated tally of how many times the mode selector was opened, separate from the per-occurrence log entries above. This counter is local-only per the product's privacy constraints and is not included in `getLogsPayload()`/`sendLogs()`.

`logModeBlocked(modeId, cause)` / `getModeBlockedLogs()` record a mode-selection attempt blocked by an unmet availability requirement; each entry carries `{ modeId, cause }` (both machine-readable ids, see `src/game/modesCatalog.js`). These entries are stored under their own storage key (`dinoquiz:modeBlockedLogs`), entirely separate from the transmittable log array, so they are never included in `getLogsPayload()`/`sendLogs()`.
