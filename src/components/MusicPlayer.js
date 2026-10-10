const track = { title: 'Nocturne for two — ambient study', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' };

export class MusicPlayer {
  constructor(root) {
    this.el = document.createElement('aside');
    this.el.className = 'music-player';
    this.el.innerHTML = `<button type="button" aria-label="Play music"><span>▶</span></button><div class="music-copy"><small>soundtrack</small><div class="music-marquee"><span>${track.title}</span><span aria-hidden="true">${track.title}</span></div></div><audio preload="metadata" src="${track.url}"></audio>`;
    root.append(this.el);
    this.button = this.el.querySelector('button');
    this.glyph = this.el.querySelector('span');
    this.audio = this.el.querySelector('audio');
    this.button.addEventListener('click', () => this.audio.paused ? this.play() : this.audio.pause());
    this.audio.addEventListener('play', () => { this.el.classList.add('playing'); this.glyph.textContent = 'Ⅱ'; });
    this.audio.addEventListener('pause', () => { this.el.classList.remove('playing'); this.glyph.textContent = '▶'; });
  }
  async play() {
    try { await this.audio.play(); } catch { this.el.classList.remove('playing'); }
  }
}
