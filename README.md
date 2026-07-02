# LocalStorage Service

A safe wrapper around localStorage that gracefully handles errors like QuotaExceededError and SecurityError (e.g., in private browsing mode).

## Usage

```javascript
import LocalStorageService from './utils/LocalStorageService';

// Store data
LocalStorageService.set('highScore', 100);

// Retrieve data
const highScore = LocalStorageService.get('highScore'); // 100

// Remove data
LocalStorageService.remove('highScore');

// Clear all data
LocalStorageService.clear();
```

## Error Handling

The service catches and logs the following errors without throwing:
- `QuotaExceededError`: When localStorage is full
- `SecurityError`: When localStorage is disabled (e.g., private mode)

Other errors will propagate normally.