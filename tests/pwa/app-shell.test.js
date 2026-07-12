'use strict';

const { renderMuteToggleButton, MUTE_STORAGE_KEY, readStoredMute, writeStoredMute } = require('../../public/scripts/appShell');
const { getStrings } = require('../../src/i18n');

describe('renderMuteToggleButton', () => {
  let container;
  let mockStorage;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
  });

  afterEach(() => {
    container.remove();
  });

  test('renders a button in the provided container', () => {
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    expect(button).toBeTruthy();
    expect(button.type).toBe('button');
  });

  test('renders the speaker-on icon initially when not muted', () => {
    mockStorage.getItem.mockReturnValue('false');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    expect(button.innerHTML).toContain('viewBox');
    expect(button.classList.contains('app-shell__mute-toggle--unmuted')).toBe(true);
  });

  test('renders the speaker-off icon when muted', () => {
    mockStorage.getItem.mockReturnValue('true');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    expect(button.classList.contains('app-shell__mute-toggle--muted')).toBe(true);
  });

  test('sets correct aria-label for unmuted state', () => {
    mockStorage.getItem.mockReturnValue('false');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Silenciar sonido');
  });

  test('sets correct aria-label for muted state', () => {
    mockStorage.getItem.mockReturnValue('true');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Activar sonido');
  });

  test('sets aria-pressed attribute to reflect unmuted state', () => {
    mockStorage.getItem.mockReturnValue('false');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  test('sets aria-pressed attribute to reflect muted state', () => {
    mockStorage.getItem.mockReturnValue('true');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  test('toggles mute state and storage when button is clicked', () => {
    mockStorage.getItem.mockReturnValue('false');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    
    button.click();
    expect(mockStorage.setItem).toHaveBeenCalledWith(MUTE_STORAGE_KEY, 'true');
  });

  test('updates aria-label when toggled from unmuted to muted', () => {
    mockStorage.getItem.mockReturnValue('false');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    
    button.click();
    expect(button.getAttribute('aria-label')).toBe('Activar sonido');
  });

  test('updates aria-label when toggled from muted to unmuted', () => {
    mockStorage.getItem.mockReturnValue('true');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    
    button.click();
    expect(button.getAttribute('aria-label')).toBe('Silenciar sonido');
  });

  test('updates aria-pressed when toggled from false to true', () => {
    mockStorage.getItem.mockReturnValue('false');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  test('updates aria-pressed when toggled from true to false', () => {
    mockStorage.getItem.mockReturnValue('true');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    
    expect(button.getAttribute('aria-pressed')).toBe('true');
    button.click();
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  test('toggles visual state class from unmuted to muted when clicked', () => {
    mockStorage.getItem.mockReturnValue('false');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    
    expect(button.classList.contains('app-shell__mute-toggle--unmuted')).toBe(true);
    expect(button.classList.contains('app-shell__mute-toggle--muted')).toBe(false);
    
    button.click();
    expect(button.classList.contains('app-shell__mute-toggle--unmuted')).toBe(false);
    expect(button.classList.contains('app-shell__mute-toggle--muted')).toBe(true);
  });

  test('toggles visual state class from muted to unmuted when clicked', () => {
    mockStorage.getItem.mockReturnValue('true');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    
    expect(button.classList.contains('app-shell__mute-toggle--muted')).toBe(true);
    expect(button.classList.contains('app-shell__mute-toggle--unmuted')).toBe(false);
    
    button.click();
    expect(button.classList.contains('app-shell__mute-toggle--muted')).toBe(false);
    expect(button.classList.contains('app-shell__mute-toggle--unmuted')).toBe(true);
  });

  test('invokes onToggle callback with current state when button is clicked', () => {
    const onToggle = jest.fn();
    mockStorage.getItem.mockReturnValue('false');
    renderMuteToggleButton(container, { 
      strings: getStrings('es').muteButton, 
      storage: mockStorage,
      onToggle: onToggle
    });
    const button = container.querySelector('button');
    
    button.click();
    expect(onToggle).toHaveBeenCalledWith(true);
    
    button.click();
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  test('applies correct CSS class for mute toggle button', () => {
    mockStorage.getItem.mockReturnValue('false');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    
    expect(button.classList.contains('app-shell__mute-toggle')).toBe(true);
  });

  test('button has minimum touch target size of 48x48px', () => {
    mockStorage.getItem.mockReturnValue('false');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    const button = container.querySelector('button');
    
    const styles = window.getComputedStyle(button);
    expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(48);
    expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(48);
  });

  test('clears container content before rendering button', () => {
    container.innerHTML = '<div>old content</div>';
    mockStorage.getItem.mockReturnValue('false');
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton, storage: mockStorage });
    
    expect(container.children.length).toBe(1);
    expect(container.querySelector('button')).toBeTruthy();
  });

  test('handles missing storage gracefully and defaults to unmuted', () => {
    renderMuteToggleButton(container, { strings: getStrings('es').muteButton });
    const button = container.querySelector('button');
    
    expect(button).toBeTruthy();
    expect(button.classList.contains('app-shell__mute-toggle--unmuted')).toBe(true);
  });

  test('returns object with root button element and isMuted function', () => {
    mockStorage.getItem.mockReturnValue('false');
    const result = renderMuteToggleButton(container, { 
      strings: getStrings('es').muteButton, 
      storage: mockStorage 
    });
    
    expect(result).toHaveProperty('root');
    expect(result.root instanceof Element).toBe(true);
    expect(typeof result.isMuted).toBe('function');
  });

  test('isMuted function returns current mute state', () => {
    mockStorage.getItem.mockReturnValue('false');
    const result = renderMuteToggleButton(container, { 
      strings: getStrings('es').muteButton, 
      storage: mockStorage 
    });
    
    expect(result.isMuted()).toBe(false);
  });

  test('isMuted function reflects state after toggle', () => {
    mockStorage.getItem.mockReturnValue('false');
    const result = renderMuteToggleButton(container, { 
      strings: getStrings('es').muteButton, 
      storage: mockStorage 
    });
    
    const button = container.querySelector('button');
    button.click();
    expect(result.isMuted()).toBe(true);
    
    button.click();
    expect(result.isMuted()).toBe(false);
  });

  test('uses resolved default strings when none provided', () => {
    mockStorage.getItem.mockReturnValue('false');
    renderMuteToggleButton(container, { storage: mockStorage });
    const button = container.querySelector('button');
    
    expect(button.getAttribute('aria-label')).toBe('Silenciar sonido');
  });

  test('allows multiple toggles without degradation', () => {
    mockStorage.getItem.mockReturnValue('false');
    const result = renderMuteToggleButton(container, { 
      strings: getStrings('es').muteButton, 
      storage: mockStorage 
    });
    const button = container.querySelector('button');
    
    for (let i = 0; i < 5; i++) {
      button.click();
    }
    
    expect(result.isMuted()).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Activar sonido');
  });
});

describe('readStoredMute', () => {
  test('returns false for non-existent key', () => {
    const storage = { getItem: jest.fn().mockReturnValue(null) };
    expect(readStoredMute(storage)).toBe(false);
  });

  test('returns true when stored value is "true"', () => {
    const storage = { getItem: jest.fn().mockReturnValue('true') };
    expect(readStoredMute(storage)).toBe(true);
  });

  test('returns false when stored value is "false"', () => {
    const storage = { getItem: jest.fn().mockReturnValue('false') };
    expect(readStoredMute(storage)).toBe(false);
  });

  test('handles storage errors gracefully and returns false', () => {
    const storage = { 
      getItem: jest.fn().mockImplementation(() => {
        throw new Error('Storage error');
      }) 
    };
    expect(readStoredMute(storage)).toBe(false);
  });
});

describe('writeStoredMute', () => {
  test('writes "true" to storage when muted is true', () => {
    const storage = { setItem: jest.fn() };
    writeStoredMute(true, storage);
    expect(storage.setItem).toHaveBeenCalledWith(MUTE_STORAGE_KEY, 'true');
  });

  test('writes "false" to storage when muted is false', () => {
    const storage = { setItem: jest.fn() };
    writeStoredMute(false, storage);
    expect(storage.setItem).toHaveBeenCalledWith(MUTE_STORAGE_KEY, 'false');
  });

  test('handles storage errors gracefully without throwing', () => {
    const storage = { 
      setItem: jest.fn().mockImplementation(() => {
        throw new Error('Storage error');
      }) 
    };
    expect(() => writeStoredMute(true, storage)).not.toThrow();
  });
});

describe('MUTE_STORAGE_KEY', () => {
  test('is exported with expected value', () => {
    expect(MUTE_STORAGE_KEY).toBe('dinoquiz.audio.muted');
  });
});
