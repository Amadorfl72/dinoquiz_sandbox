export class AudioManager {
  constructor() {
    this.musicMuted = false;
    this.sfxMuted = false;
  }

  muteMusic() {
    this.musicMuted = true;
  }

  unmuteMusic() {
    this.musicMuted = false;
  }

  muteSfx() {
    this.sfxMuted = true;
  }

  unmuteSfx() {
    this.sfxMuted = false;
  }

  muteAll() {
    this.muteMusic();
    this.muteSfx();
  }

  unmuteAll() {
    this.unmuteMusic();
    this.unmuteSfx();
  }

  toggleMuteAll() {
    if (this.isMuted()) {
      this.unmuteAll();
    } else {
      this.muteAll();
    }
    return this.isMuted();
  }

  isMuted() {
    return this.musicMuted && this.sfxMuted;
  }
}
