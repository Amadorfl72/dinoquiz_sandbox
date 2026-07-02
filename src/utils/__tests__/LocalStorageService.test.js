import LocalStorageService from '../LocalStorageService';

describe('LocalStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return null for non-existent key', () => {
      expect(LocalStorageService.get('nonexistent')).toBeNull();
    });

    it('should return parsed value for existing key', () => {
      localStorage.setItem('test', JSON.stringify({ foo: 'bar' }));
      expect(LocalStorageService.get('test')).toEqual({ foo: 'bar' });
    });

    it('should handle QuotaExceededError gracefully', () => {
      const mockError = new DOMException('Quota exceeded', 'QuotaExceededError');
      jest.spyOn(localStorage, 'getItem').mockImplementation(() => { throw mockError; });
      
      expect(LocalStorageService.get('test')).toBeNull();
      expect(console.warn).toHaveBeenCalledWith('LocalStorage access denied:', 'Quota exceeded');
    });
  });

  describe('set', () => {
    it('should store value and return true on success', () => {
      expect(LocalStorageService.set('test', { foo: 'bar' })).toBe(true);
      expect(JSON.parse(localStorage.getItem('test'))).toEqual({ foo: 'bar' });
    });

    it('should handle QuotaExceededError gracefully', () => {
      const mockError = new DOMException('Quota exceeded', 'QuotaExceededError');
      jest.spyOn(localStorage, 'setItem').mockImplementation(() => { throw mockError; });
      
      expect(LocalStorageService.set('test', { foo: 'bar' })).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('LocalStorage write failed:', 'Quota exceeded');
    });
  });

  describe('remove', () => {
    it('should remove existing key', () => {
      localStorage.setItem('test', 'value');
      LocalStorageService.remove('test');
      expect(localStorage.getItem('test')).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all keys', () => {
      localStorage.setItem('test1', 'value1');
      localStorage.setItem('test2', 'value2');
      LocalStorageService.clear();
      expect(localStorage.length).toBe(0);
    });
  });
});