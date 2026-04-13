const DEFAULT_TRACK = {
  title: 'Romantic Bloom — Instrumental',
  url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
};

export class MusicPlayer {
  constructor(root, { track = DEFAULT_TRACK } = {}) {
    this.root = root;
    this.track = { ...DEFAULT_TRACK, ...track };
    this.marqueeFrame = null;

    this.build();
    this.attachEvents();
    this.setTrack(this.track);
    this.updatePlaybackState(false);
  }

  build() {
    this.element = document.createElement('div');
    this.element.className = 'music-player';
    this.element.innerHTML = `
      <button class="music-player-control" type="button" aria-label="Play music">
        <span class="music-player-glyph" aria-hidden="true">▶</span>
      </button>
      <div class="music-player-title-wrap">
        <div class="music-player-title-track">
          <span class="music-player-title music-player-title-primary"></span>
          <span class="music-player-title music-player-title-clone" aria-hidden="true"></span>
        </div>
      </div>
      <audio preload="metadata"></audio>
    `;

    this.root.appendChild(this.element);

    this.controlButton = this.element.querySelector('.music-player-control');
    this.glyph = this.element.querySelector('.music-player-glyph');
    this.titleWrap = this.element.querySelector('.music-player-title-wrap');
    this.titleTrack = this.element.querySelector('.music-player-title-track');
    this.titlePrimary = this.element.querySelector('.music-player-title-primary');
    this.titleClone = this.element.querySelector('.music-player-title-clone');
    this.audio = this.element.querySelector('audio');
  }

  attachEvents() {
    this.controlButton.addEventListener('click', async () => {
      if (this.audio.paused) {
        await this.play();
      } else {
        this.pause();
      }
    });

    this.audio.addEventListener('play', () => this.updatePlaybackState(true));
    this.audio.addEventListener('pause', () => this.updatePlaybackState(false));
    this.audio.addEventListener('ended', () => this.updatePlaybackState(false));
    this.audio.addEventListener('loadedmetadata', () => this.scheduleMarqueeUpdate());
    this.audio.addEventListener('error', () => this.updatePlaybackState(false));

    window.addEventListener('resize', () => this.scheduleMarqueeUpdate(), { passive: true });
  }

  setTrack(track) {
    this.track = { ...DEFAULT_TRACK, ...track };
    this.audio.src = this.track.url;
    this.titlePrimary.textContent = this.track.title;
    this.titleClone.textContent = this.track.title;
    this.scheduleMarqueeUpdate();
  }

  async play() {
    try {
      await this.audio.play();
    } catch (error) {
      console.error('Music playback failed.', error);
      this.updatePlaybackState(false);
    }
  }

  pause() {
    this.audio.pause();
  }

  updatePlaybackState(isPlaying) {
    this.element.classList.toggle('is-playing', isPlaying);
    this.glyph.textContent = isPlaying ? '❚❚' : '▶';
    this.controlButton.setAttribute('aria-label', isPlaying ? 'Pause music' : 'Play music');
  }

  scheduleMarqueeUpdate() {
    if (this.marqueeFrame != null) {
      cancelAnimationFrame(this.marqueeFrame);
    }
    this.marqueeFrame = requestAnimationFrame(() => {
      this.marqueeFrame = null;
      this.updateMarquee();
    });
  }

  updateMarquee() {
    const textWidth = this.titlePrimary.scrollWidth;
    const wrapWidth = this.titleWrap.clientWidth;
    const needsMarquee = textWidth > wrapWidth - 6;

    this.element.classList.toggle('is-marquee', needsMarquee);
    if (!needsMarquee) {
      this.titleTrack.style.removeProperty('--marquee-gap');
      this.titleTrack.style.removeProperty('--marquee-shift');
      this.titleTrack.style.removeProperty('--marquee-duration');
      return;
    }

    const gap = Math.max(26, Math.round(wrapWidth * 0.18));
    const shift = textWidth + gap;
    const duration = Math.max(9, shift / 38);

    this.titleTrack.style.setProperty('--marquee-gap', `${gap}px`);
    this.titleTrack.style.setProperty('--marquee-shift', `${shift}px`);
    this.titleTrack.style.setProperty('--marquee-duration', `${duration}s`);
  }
}

