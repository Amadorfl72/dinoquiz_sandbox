# Structured Logging

## Events

### `best_score_updated`
Emitted when a player achieves a new best score.

**Fields:**
- `event`: Always 'best_score_updated'
- `new_best`: The new best score (number)
- `previous_best`: The previous best score (number)
- `app_version`: Current app version from package.json
- `timestamp`: ISO 8601 timestamp of the event

### `storage_failure`
Emitted when a storage operation fails.

**Fields:**
- `event`: Always 'storage_failure'
- `operation`: The storage operation that failed (string)
- `error_type`: The type of error that occurred (string)
- `app_version`: Current app version from package.json
- `timestamp`: ISO 8601 timestamp of the event

## Privacy Considerations
- No PII (Personally Identifiable Information) is included in these logs
- Scores are anonymized and not tied to individual users
- Storage operations are logged at a high level without exposing sensitive data