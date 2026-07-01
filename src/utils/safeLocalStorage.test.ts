import { safeLocalStorage } from './safeLocalStorage';

describe('safeLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.spyOn(Storage.prototype, 'setItem');
    jest.spyOn(Storage.prototype, 'getItem');
    jest.spyOn(Storage.prototype, 'removeItem');
    jest.spyOn(Storage.prototype, 'clear');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should set and get items successfully', () => {
    safeLocalStorage.setItem('testKey', 'testValue');
    expect(safeLocalStorage.getItem('testKey')).toBe('testValue');
  });

  it('should remove items successfully', () => {
    safeLocalStorage.setItem('testKey', 'testValue');
    safeLocalStorage.removeItem('testKey');
    expect(safeLocalStorage.getItem('testKey')).toBeNull();
  });

  it('should clear items successfully', () => {
    safeLocalStorage.setItem('testKey', 'testValue');
    safeLocalStorage.clear();
    expect(safeLocalStorage.getItem('testKey')).toBeNull();
  });

  it('should handle QuotaExceededError gracefully on setItem', () => {
    const error = new DOMException('Quota exceeded', 'QuotaExceededError');
    (Storage.prototype.setItem as jest.Mock).mockImplementation(() => {
      throw error;
    });

    expect(() => safeLocalStorage.setItem('testKey', 'testValue')).not.toThrow();
    expect(safeLocalStorage.setItem('testKey', 'testValue')).toBe(false);
  });

  it('should handle SecurityError gracefully on getItem', () => {
    const error = new DOMException('Security error', 'SecurityError');
    (Storage.prototype.getItem as jest.Mock).mockImplementation(() => {
      throw error;
    });

    expect(() => safeLocalStorage.getItem('testKey')).not.toThrow();
    expect(safeLocalStorage.getItem('testKey')).toBeNull();
  });

  it('should handle SecurityError gracefully on removeItem', () => {
    const error = new DOMException('Security error', 'SecurityError');
    (Storage.prototype.removeItem as jest.Mock).mockImplementation(() => {
      throw error;
    });

    expect(() => safeLocalStorage.removeItem('testKey')).not.toThrow();
  });
});
