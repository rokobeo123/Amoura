const DEFAULT_TRACK = {
  title: 'Starlight Reverie — Romantic Instrumental',
  url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
};

export class MusicPlayer {
  constructor(root, { track = DEFAULT_TRACK } = {}) {
    this.root = root;
    this.track = { ...DEFAULT_TRACK, ...track };
    this.isPlaying = false;
    this.audio = null;

    this._build();
    this._attachEvents();
  }

  _build() {
    this.element = document.createElement('div');
    this.element.className = 'music-pill';
    this.element.innerHTML = `
      <button class="music-toggle-btn" type="button" aria-label="Toggle ambient music">
        <span class="music-icon" aria-hidden="true">
          <svg class="icon-play" viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M8 5v14l11-7z"/>
          </svg>
          <svg class="icon-pause hidden" viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </span>
      </button>
      <div class="music-info">
        <div class="music-bars" aria-hidden="true">
          <span class="bar bar-1"></span>
          <span class="bar bar-2"></span>
          <span class="bar bar-3"></span>
        </div>
        <div class="music-marquee">
          <span class="music-title">${this.track.title}</span>
        </div>
      </div>
      <audio preload="auto" loop></audio>
    `;

    this.root.appendChild(this.element);

    this.toggleBtn = this.element.querySelector('.music-toggle-btn');
    this.playIcon = this.element.querySelector('.icon-play');
    this.pauseIcon = this.element.querySelector('.icon-pause');
    this.bars = this.element.querySelector('.music-bars');
    this.audio = this.element.querySelector('audio');
    this.audio.src = this.track.url;
    this.audio.volume = 0.65;
  }

  _attachEvents() {
    this.toggleBtn.addEventListener('click', () => {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    });

    this.audio.addEventListener('play', () => this._updateState(true));
    this.audio.addEventListener('pause', () => this._updateState(false));
    this.audio.addEventListener('ended', () => this._updateState(false));
    this.audio.addEventListener('error', (e) => {
      console.warn('Audio stream error, continuing silently:', e);
      this._updateState(false);
    });

    // Auto-resume audio on first user interaction if enabled
    const onFirstGesture = () => {
      if (!this.isPlaying && this.shouldAutoPlay) {
        this.play();
      }
      window.removeEventListener('pointerdown', onFirstGesture);
    };
    window.addEventListener('pointerdown', onFirstGesture);
  }

  enableAutoPlay() {
    this.shouldAutoPlay = true;
    this.play();
  }

  async play() {
    try {
      await this.audio.play();
      this.isPlaying = true;
      this._updateState(true);
    } catch (err) {
      // Browser blocked autoplay without user gesture
      this.isPlaying = false;
      this._updateState(false);
    }
  }

  pause() {
    this.audio.pause();
    this.isPlaying = false;
    this._updateState(false);
  }

  _updateState(playing) {
    this.isPlaying = playing;
    this.element.classList.toggle('playing', playing);
    this.playIcon.classList.toggle('hidden', playing);
    this.pauseIcon.classList.toggle('hidden', !playing);
  }
}
