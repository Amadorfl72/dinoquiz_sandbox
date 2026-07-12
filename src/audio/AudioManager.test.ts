import { describe, it, expect, beforeEach } from 'vitest';
import { AudioManager } from './AudioManager';

class FakeAudioElement {
  src = '';
  loop = false;
  paused = true;
  currentTime = 0;
  playCallCount = 0;
  pauseCallCount = 0;

  play(): Promise<void> {
    this.playCallCount += 1;
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.pauseCallCount += 1;
    this.paused = true;
  }
}

function createFakeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

function createManager() {
  const storage = createFakeStorage();
  const manager = new AudioManager({ storage });
  const music = new FakeAudioElement();
  manager.setMusicElement(music as unknown as HTMLAudioElement, 'ambient.mp3');
  return { manager, storage, music };
}

describe('AudioManager', () => {
  beforeEach(() => {
    // Each test builds its own manager/storage instance, nothing global to reset.
  });

  it('starts unmuted by default', () => {
    const { manager } = createManager();
    expect(manager.isMuted()).toBe(false);
  });

  it('toggleMute flips the flag synchronously', () => {
    const { manager } = createManager();
    const result = manager.toggleMute();
    expect(result).toBe(true);
    expect(manager.isMuted()).toBe(true);

    manager.toggleMute();
    expect(manager.isMuted()).toBe(false);
  });

  it('persists the mute flag across instances sharing storage', () => {
    const { manager, storage } = createManager();
    manager.toggleMute();

    const reloaded = new AudioManager({ storage });
    expect(reloaded.isMuted()).toBe(true);
  });

  it('notifies subscribers on mute change', () => {
    const { manager } = createManager();
    const seen: boolean[] = [];
    const unsubscribe = manager.onMuteChange((muted) => seen.push(muted));

    manager.toggleMute();
    manager.toggleMute();
    unsubscribe();
    manager.toggleMute();

    expect(seen).toEqual([true, false]);
  });

  it('pauses currently playing background music when muted', () => {
    const { manager, music } = createManager();
    manager.playMusic();
    expect(music.playCallCount).toBe(1);
    expect(music.paused).toBe(false);

    manager.setMuted(true);
    expect(music.pauseCallCount).toBe(1);
    expect(music.paused).toBe(true);
  });

  it('resumes background music that was playing before mute, on unmute', () => {
    const { manager, music } = createManager();
    manager.playMusic();
    manager.setMuted(true);
    manager.setMuted(false);

    expect(music.playCallCount).toBe(2);
    expect(music.paused).toBe(false);
  });

  it('does not resume music on unmute if it was not playing before mute', () => {
    const { manager, music } = createManager();
    manager.setMuted(true);
    manager.setMuted(false);

    expect(music.playCallCount).toBe(0);
  });

  it('does not start music while muted, but remembers intent to play', () => {
    const { manager, music } = createManager();
    manager.setMuted(true);
    manager.playMusic();
    expect(music.playCallCount).toBe(0);

    manager.setMuted(false);
    expect(music.playCallCount).toBe(1);
  });

  it('suppresses SFX playback while muted', () => {
    const { manager } = createManager();
    manager.setMuted(true);
    // playSfx constructs a new Audio() internally; muted short-circuits before
    // that call, so this only verifies no throw and no state change occurs.
    expect(() => manager.playSfx('correct.mp3')).not.toThrow();
    expect(manager.isMuted()).toBe(true);
  });

  it('setMuted is a no-op when the value does not change', () => {
    const { manager, music } = createManager();
    manager.playMusic();
    manager.setMuted(false);

    expect(music.pauseCallCount).toBe(0);
  });
});
