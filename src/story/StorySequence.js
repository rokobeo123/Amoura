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
      <div class="story-center-text"></div>

      <div class="story-envelope-stage">
        <div class="story-envelope" role="button" aria-label="Click to open envelope">

          <!-- ── LAYER 1: BACK face (body + pocket tint) ─────────────── -->
          <svg class="story-env-svg story-env-back" viewBox="0 0 460 300" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sg-body" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#f5e8d4"/>
                <stop offset="55%" stop-color="#edd8bc"/>
                <stop offset="100%" stop-color="#e2c8a8"/>
              </linearGradient>
              <linearGradient id="sg-inside" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#d4a880"/>
                <stop offset="100%" stop-color="#c49060"/>
              </linearGradient>
              <linearGradient id="sg-inner-depth" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stop-color="rgba(100,60,20,0.18)"/>
                <stop offset="40%" stop-color="rgba(100,60,20,0)"/>
              </linearGradient>
            </defs>
            <!-- Envelope body background -->
            <rect x="0" y="0" width="460" height="300" rx="14" fill="url(#sg-body)"/>
            <rect x="0" y="0" width="460" height="150" rx="14" fill="url(#sg-inner-depth)"/>
            <!-- Decorative border -->
            <rect x="10" y="10" width="440" height="280" rx="10" fill="none"
              stroke="rgba(160,100,40,0.18)" stroke-width="1"/>
            <rect x="16" y="16" width="428" height="268" rx="8" fill="none"
              stroke="rgba(160,100,40,0.10)" stroke-width="0.5"/>
            <!-- Inside pocket tint -->
            <rect x="0" y="0" width="460" height="300" rx="14" fill="url(#sg-inside)" opacity="0.4"/>
          </svg>

          <!-- ── LAYER 2: LETTER (sandwiched between back and front) ─── -->
          <div class="story-mini-letter-slot">
            <div class="story-mini-letter"></div>
          </div>

          <!-- ── LAYER 3: FRONT face (flaps, seal — covers the letter) ── -->
          <!-- Note: gradient IDs use -f suffix to avoid document-global conflicts -->
          <svg class="story-env-svg story-env-front" viewBox="0 0 460 300" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sg-left-f" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stop-color="#e8d0b0"/>
                <stop offset="100%" stop-color="#d4b890"/>
              </linearGradient>
              <linearGradient id="sg-right-f" x1="100%" y1="50%" x2="0%" y2="50%">
                <stop offset="0%" stop-color="#e8d0b0"/>
                <stop offset="100%" stop-color="#d4b890"/>
              </linearGradient>
              <linearGradient id="sg-bottom-f" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#e0c8a4"/>
                <stop offset="100%" stop-color="#d0b888"/>
              </linearGradient>
              <linearGradient id="sg-flap-f" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#f0dfc0"/>
                <stop offset="100%" stop-color="#ddc898"/>
              </linearGradient>
              <radialGradient id="sg-seal-f" cx="38%" cy="34%">
                <stop offset="0%" stop-color="#f5c87a"/>
                <stop offset="45%" stop-color="#d4922a"/>
                <stop offset="100%" stop-color="#b07010"/>
              </radialGradient>
              <linearGradient id="sg-highlight-f" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
                <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
              </linearGradient>
            </defs>

            <!-- Side flaps (always in front of letter) -->
            <polygon points="0,0 230,178 0,300" fill="url(#sg-left-f)"/>
            <polygon points="0,0 230,178 0,300" fill="rgba(120,70,20,0.06)"/>
            <polygon points="460,0 230,178 460,300" fill="url(#sg-right-f)"/>

            <!-- Bottom flap -->
            <polygon points="0,300 460,300 230,178" fill="url(#sg-bottom-f)"/>
            <line x1="0" y1="300" x2="460" y2="300" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>

            <!-- Crease lines -->
            <line x1="0" y1="0" x2="230" y2="178" stroke="rgba(150,90,30,0.15)" stroke-width="1"/>
            <line x1="460" y1="0" x2="230" y2="178" stroke="rgba(150,90,30,0.15)" stroke-width="1"/>
            <line x1="0" y1="300" x2="230" y2="178" stroke="rgba(150,90,30,0.12)" stroke-width="0.8"/>
            <line x1="460" y1="300" x2="230" y2="178" stroke="rgba(150,90,30,0.12)" stroke-width="0.8"/>

            <!-- Top flap (animated via CSS) -->
            <g class="story-env-flap">
              <polygon points="0,0 460,0 313,136 230,204 147,136" fill="url(#sg-flap-f)"/>
              <line x1="0" y1="0" x2="147" y2="136"
                stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
              <line x1="460" y1="0" x2="313" y2="136"
                stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
              <polygon points="0,0 460,0 313,136 230,204 147,136"
                fill="url(#sg-highlight-f)" opacity="0.6"/>
            </g>

            <!-- Wax seal -->
            <g class="story-env-seal">
              <circle cx="230" cy="198" r="22" fill="url(#sg-seal-f)"/>
              <circle cx="230" cy="198" r="22" fill="none"
                stroke="rgba(255,220,140,0.6)" stroke-width="1.5"/>
              <circle cx="230" cy="198" r="18" fill="none"
                stroke="rgba(255,220,140,0.3)" stroke-width="0.8"/>
              <text x="230" y="203" text-anchor="middle"
                font-family="serif" font-size="13" fill="#5a3008" opacity="0.9">✦</text>
            </g>

            <!-- Top edge highlight -->
            <rect x="0" y="0" width="460" height="3" rx="14" fill="rgba(255,255,255,0.28)"/>
          </svg>

        </div>
        <p class="story-hint"></p>
      </div>

      <!-- Full letter shown after envelope fades -->
      <div class="story-letter-full hidden">
        <div class="story-letter-card">
          <div class="story-letter-header">
            <div class="story-letter-wax">✦</div>
            <div class="story-letter-meta">
              <div class="story-letter-to"></div>
              <div class="story-letter-from"></div>
            </div>
          </div>
          <div class="story-letter-body">
            <div class="story-letter-content"></div>
          </div>
        </div>
      </div>
    `;

    this.root.appendChild(this.element);

    // Refs
    this.centerText    = this.element.querySelector('.story-center-text');
    this.envelopeStage = this.element.querySelector('.story-envelope-stage');
    this.envelope      = this.element.querySelector('.story-envelope');
    this.miniLetter    = this.element.querySelector('.story-mini-letter');
    this.hint          = this.element.querySelector('.story-hint');
    this.letterFull    = this.element.querySelector('.story-letter-full');
    this.letterCard    = this.element.querySelector('.story-letter-card');
    this.letterToEl    = this.element.querySelector('.story-letter-to');
    this.letterFromEl  = this.element.querySelector('.story-letter-from');
    this.letterContent = this.element.querySelector('.story-letter-content');
  }

  // ── TEXT ──────────────────────────────────────────────────────────────────

  async showCenterText(text) {
    this.centerText.textContent = text;
    this.centerText.classList.add('visible');
    await wait(2000);
    this.centerText.classList.remove('visible');
    await wait(950);
  }

  // ── ENVELOPE ──────────────────────────────────────────────────────────────

  async playEnvelope(payload) {
    this.letterContent.textContent = payload.message || 'For you, with all my heart.';
    this.letterToEl.textContent = `To: ${payload.to}`;
    this.letterFromEl.textContent = `From: ${payload.from}`;

    // Show envelope stage
    this.envelopeStage.classList.add('show');
    this.hint.textContent = 'Click the envelope to open';

    // Wait for click
    await nextClick(this.envelope);
    this.hint.textContent = '';

    // 1. Open flap
    this.envelope.classList.add('flap-open');
    await wait(220);

    // 2. Letter rises out from inside without scaling pop
    this.miniLetter.classList.add('risen');
    await wait(520);

    // 3. Envelope fades out, letter floats higher
    this.miniLetter.classList.add('departing');
    this.envelope.classList.add('fading');
    await wait(700);

    // 4. Transition to full letter scene
    this.envelopeStage.classList.add('hidden-stage');
    await wait(200);

    await this.showLetterFull();
  }

  // ── FULL LETTER ────────────────────────────────────────────────────────────

  async showLetterFull() {
    this.letterFull.classList.remove('hidden');
    await wait(50); // allow layout paint
    this.letterFull.classList.add('visible');
    this.letterCard.classList.add('visible');

    // Wait for background click to dismiss
    await new Promise((resolve) => {
      const onBg = (e) => {
        if (!this.letterCard.contains(e.target)) {
          this.letterFull.removeEventListener('click', onBg);
          resolve();
        }
      };
      this.letterFull.addEventListener('click', onBg);
    });

    this.letterFull.classList.remove('visible');
    this.letterCard.classList.remove('visible');
    await wait(600);
    this.letterFull.classList.add('hidden');
  }

  // ── RESET ──────────────────────────────────────────────────────────────────

  reset() {
    this.centerText.textContent = '';
    this.centerText.classList.remove('visible');

    this.envelopeStage.classList.remove('show', 'hidden-stage');
    this.envelope.classList.remove('flap-open', 'fading');
    this.miniLetter.classList.remove('risen', 'departing');
    this.hint.textContent = '';

    this.letterFull.classList.remove('visible');
    this.letterFull.classList.add('hidden');
    this.letterCard.classList.remove('visible');
    this.letterContent.textContent = '';
  }

  // ── PLAY ──────────────────────────────────────────────────────────────────

  async play(payload) {
    this.reset();
    this.element.classList.remove('hidden', 'exit');

    requestAnimationFrame(() => {
      this.element.classList.add('active');
    });

    await wait(350);
    await this.showCenterText(`From: ${payload.from}`);
    await this.showCenterText(`To: ${payload.to}`);
    await wait(300);
    await this.playEnvelope(payload);

    this.element.classList.add('exit');
    await wait(900);
    this.element.classList.remove('active', 'exit');
    this.element.classList.add('hidden');
  }
}
