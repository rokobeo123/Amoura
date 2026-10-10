const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function nextClick(element) {
  return new Promise((resolve) => {
    element.addEventListener('click', resolve, { once: true });
  });
}

export class StorySequence {
  constructor(root) {
    this.root = root;
    this.build();
  }

  build() {
    this.element = document.createElement('div');
    this.element.className = 'story-root hidden';
    this.element.innerHTML = `
      <div class="story-orbit" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="story-center-text"></div>

      <div class="story-envelope-stage">
        <div class="story-stage-label">A private note / 01</div>
        <button class="story-envelope" type="button" aria-label="Open the sealed envelope">
          <span class="envelope-shadow" aria-hidden="true"></span>
          <span class="envelope-shell">
            <span class="envelope-interior"></span>
            <span class="envelope-letter-slot"><span class="story-mini-letter"><i></i><b></b></span></span>
            <span class="envelope-flap"></span>
            <span class="envelope-front envelope-front-left"></span>
            <span class="envelope-front envelope-front-right"></span>
            <span class="envelope-front envelope-front-bottom"></span>
            <span class="envelope-address"><small>FOR</small><strong></strong><em>with care</em></span>
            <span class="envelope-seal"><span>✦</span></span>
            <span class="envelope-thread" aria-hidden="true"></span>
          </span>
        </button>
        <p class="story-hint"></p>
      </div>

      <div class="story-letter-full hidden">
        <div class="letter-aura" aria-hidden="true"></div>
        <div class="story-letter-card">
          <div class="letter-card-topline"><span>AMOURA / PRIVATE CORRESPONDENCE</span><span>01</span></div>
          <div class="story-letter-header">
            <div class="story-letter-wax">✦</div>
            <div class="story-letter-meta"><div class="story-letter-to"></div><div class="story-letter-from"></div></div>
            <div class="letter-date">for keeps</div>
          </div>
          <div class="story-letter-body"><div class="story-letter-content"></div></div>
          <div class="story-letter-footer"><span>Read slowly</span><span>Close the letter to continue&nbsp; ↗</span></div>
        </div>
      </div>
    `;
    this.root.appendChild(this.element);

    this.centerText = this.element.querySelector('.story-center-text');
    this.envelopeStage = this.element.querySelector('.story-envelope-stage');
    this.envelope = this.element.querySelector('.story-envelope');
    this.miniLetter = this.element.querySelector('.story-mini-letter');
    this.hint = this.element.querySelector('.story-hint');
    this.letterFull = this.element.querySelector('.story-letter-full');
    this.letterCard = this.element.querySelector('.story-letter-card');
    this.letterToEl = this.element.querySelector('.story-letter-to');
    this.letterFromEl = this.element.querySelector('.story-letter-from');
    this.letterContent = this.element.querySelector('.story-letter-content');
    this.addressEl = this.element.querySelector('.envelope-address strong');
  }

  async showCenterText(text) {
    this.centerText.textContent = text;
    this.centerText.classList.add('visible');
    await wait(1700);
    this.centerText.classList.remove('visible');
    await wait(700);
  }

  async playEnvelope(payload) {
    this.letterContent.textContent = payload.message || 'With all my heart.';
    this.letterToEl.textContent = `To: ${payload.to}`;
    this.letterFromEl.textContent = `From: ${payload.from}`;
    this.addressEl.textContent = payload.to;
    this.envelopeStage.classList.add('show');
    this.hint.textContent = 'Break the seal to open';

    await nextClick(this.envelope);
    this.hint.textContent = '';
    this.envelope.classList.add('opening');
    await wait(480);
    this.miniLetter.classList.add('risen');
    await wait(740);
    this.miniLetter.classList.add('departing');
    this.envelope.classList.add('fading');
    await wait(720);
    this.envelopeStage.classList.add('hidden-stage');
    await wait(260);
    await this.showLetterFull();
  }

  async showLetterFull() {
    this.letterFull.classList.remove('hidden');
    await wait(40);
    this.letterFull.classList.add('visible');
    await wait(180);
    this.letterCard.classList.add('visible');
    await new Promise((resolve) => {
      const onBg = (event) => {
        if (!this.letterCard.contains(event.target)) {
          this.letterFull.removeEventListener('click', onBg);
          resolve();
        }
      };
      this.letterFull.addEventListener('click', onBg);
    });
    this.letterCard.classList.remove('visible');
    this.letterFull.classList.remove('visible');
    await wait(650);
    this.letterFull.classList.add('hidden');
  }

  reset() {
    this.centerText.textContent = '';
    this.centerText.classList.remove('visible');
    this.envelopeStage.classList.remove('show', 'hidden-stage');
    this.envelope.classList.remove('opening', 'fading');
    this.miniLetter.classList.remove('risen', 'departing');
    this.hint.textContent = '';
    this.letterFull.classList.remove('visible');
    this.letterFull.classList.add('hidden');
    this.letterCard.classList.remove('visible');
    this.letterContent.textContent = '';
  }

  async play(payload) {
    this.reset();
    this.element.classList.remove('hidden', 'exit');
    requestAnimationFrame(() => this.element.classList.add('active'));
    await wait(350);
    await this.showCenterText(`From ${payload.from}`);
    await this.showCenterText(`For ${payload.to}`);
    await wait(260);
    await this.playEnvelope(payload);
    this.element.classList.add('exit');
    await wait(900);
    this.element.classList.remove('active', 'exit');
    this.element.classList.add('hidden');
  }
}
