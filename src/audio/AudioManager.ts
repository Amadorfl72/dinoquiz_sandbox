export type MuteChangeListener = (muted: boolean) => void;

export interface AudioManagerOptions {
  storageKey?: string;
  storage?: Storage | null;
}

const DEFAULT_STORAGE_KEY = 'dinoquiz.audio.muted';

/**
 * Wraps HTMLAudio playback for ambient background music and one-shot SFX.
 * A single `muted` flag gates all playback; toggling it is a synchronous,
 * in-memory operation so the UI mute button can react well under 300ms
 * (AC-5, AC-11). Background music is paused/resumed in place rather than
 * reloaded, so unmuting resumes exactly where it left off.
 */
export class AudioManager {
  private muted = false;
  private musicElement: HTMLAudioElement | null = null;
  private musicSrc: string | null = null;
  private wasMusicPlayingBeforeMute = false;
  private readonly listeners = new Set<MuteChangeListener>();
  private readonly storageKey: string;
  private readonly storage: Storage | null;

  constructor(options: AudioManagerOptions = {}) {
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.storage =
      options.storage !== undefined
        ? options.storage
        : typeof window !== 'undefined'
          ? window.localStorage
          : null;
    this.muted = this.readPersistedMute();
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Subscribe to mute state changes. Returns an unsubscribe function. */
  onMuteChange(listener: MuteChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Attach the HTMLAudioElement used for looping background music. */
  setMusicElement(element: HTMLAudioElement, src?: string): void {
    this.musicElement = element;
    if (src) {
      this.musicSrc = src;
    }
  }

  /** Start (or resume) looping background music, unless currently muted. */
  playMusic(src?: string): void {
    if (src) {
      this.musicSrc = src;
    }
    if (!this.musicElement) {
      return;
    }
    if (this.musicSrc && this.musicElement.src !== this.musicSrc) {
      this.musicElement.src = this.musicSrc;
    }
    this.musicElement.loop = true;

    if (this.muted) {
      // Remember intent so unmuting resumes playback automatically.
      this.wasMusicPlayingBeforeMute = true;
      return;
    }
    this.safePlay(this.musicElement);
  }

  /** Fully stop background music (e.g. leaving the app), resetting playback. */
  stopMusic(): void {
    this.wasMusicPlayingBeforeMute = false;
    if (!this.musicElement) {
      return;
    }
    this.musicElement.pause();
    this.musicElement.currentTime = 0;
  }

  /** Play a one-shot answer/feedback sound effect, unless currently muted. */
  playSfx(src: string): void {
    if (this.muted) {
      return;
    }
    const sfx = new Audio(src);
    this.safePlay(sfx);
  }

  /** Flip the mute flag. Returns the new muted state. */
  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Set the mute flag directly, pausing/resuming background music in place. */
  setMuted(value: boolean): void {
    if (this.muted === value) {
      return;
    }
    this.muted = value;
    this.persistMute(value);

    if (this.musicElement) {
      if (value) {
        this.wasMusicPlayingBeforeMute = !this.musicElement.paused;
        this.musicElement.pause();
      } else if (this.wasMusicPlayingBeforeMute) {
        this.safePlay(this.musicElement);
      }
    }

    this.notify();
  }

  private readPersistedMute(): boolean {
    if (!this.storage) {
      return false;
    }
    try {
      return this.storage.getItem(this.storageKey) === 'true';
    } catch {
      return false;
    }
  }

  private persistMute(value: boolean): void {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.setItem(this.storageKey, String(value));
    } catch {
      // Storage unavailable (private browsing, quota exceeded): keep in-memory only.
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.muted);
    }
  }

  private safePlay(element: HTMLAudioElement): void {
    const playResult = element.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {
        // Autoplay can be rejected before a user gesture; safe to ignore.
      });
    }
  }
}

/** Shared singleton used across the app's screens and components. */
export const audioManager = new AudioManager();
