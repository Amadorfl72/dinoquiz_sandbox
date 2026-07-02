class LocalStorageService {
  static get(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      if (error instanceof DOMException && 
          (error.name === 'QuotaExceededError' || 
           error.name === 'SecurityError')) {
        console.warn('LocalStorage access denied:', error.message);
        return null;
      }
      throw error;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      if (error instanceof DOMException && 
          (error.name === 'QuotaExceededError' || 
           error.name === 'SecurityError')) {
        console.warn('LocalStorage write failed:', error.message);
        return false;
      }
      throw error;
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'SecurityError') {
        console.warn('LocalStorage remove failed:', error.message);
      } else {
        throw error;
      }
    }
  }

  static clear() {
    try {
      localStorage.clear();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'SecurityError') {
        console.warn('LocalStorage clear failed:', error.message);
      } else {
        throw error;
      }
    }
  }
}

export default LocalStorageService;