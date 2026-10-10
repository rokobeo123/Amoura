export class EnvelopeModal {
  constructor(root) {
    this.root = root;
    this.element = null;
    this.isOpen = false;
    this.onComplete = null;
    this.payload = null;

    this._build();
  }

  _build() {
    this.element = document.createElement('div');
    this.element.className = 'envelope-overlay hidden';
    this.element.innerHTML = `
      <div class="envelope-scene">
        <!-- Stage 1: The Envelope -->
        <div class="envelope-wrap" role="button" tabindex="0" aria-label="Open Keepsake Envelope">
          <div class="envelope">
            <!-- Back pocket & Paper inside -->
            <div class="envelope-back"></div>
            
            <div class="envelope-letter-preview">
              <div class="mini-letter-paper"></div>
            </div>

            <!-- Left & Right Flaps -->
            <div class="envelope-left"></div>
            <div class="envelope-right"></div>
            <!-- Bottom Fold -->
            <div class="envelope-bottom"></div>

            <!-- Top Flap (Opens upwards) -->
            <div class="envelope-top"></div>

            <!-- Wax Seal with Heart -->
            <div class="wax-seal" title="Break seal to open">
              <div class="wax-seal-inner">
                <svg viewBox="0 0 24 24" class="seal-icon">
                  <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
            </div>
          </div>
          
          <div class="envelope-caption">
            <span class="envelope-hint">Tap the golden seal to open</span>
          </div>
        </div>

        <!-- Stage 2: The Unfolded Letter Modal -->
        <div class="letter-modal hidden" role="dialog" aria-modal="true" aria-label="Keepsake Letter">
          <div class="letter-paper">
            <div class="letter-header">
              <span class="letter-kicker">A Sacred Keepsake</span>
              <h2 class="letter-recipient"></h2>
            </div>

            <div class="letter-divider">
              <span class="divider-star">✦</span>
            </div>

            <div class="letter-content"></div>

            <div class="letter-footer">
              <div class="letter-signature">
                <span class="sig-label">With all my heart,</span>
                <span class="sig-name"></span>
              </div>
            </div>

            <button type="button" class="letter-continue-btn" data-continue>
              <span>Explore Starlight Gallery</span>
              <svg viewBox="0 0 24 24" class="btn-arrow" width="18" height="18">
                <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    this.root.appendChild(this.element);

    this.envelopeWrap = this.element.querySelector('.envelope-wrap');
    this.waxSeal = this.element.querySelector('.wax-seal');
    this.letterModal = this.element.querySelector('.letter-modal');
    this.recipientEl = this.element.querySelector('.letter-recipient');
    this.contentEl = this.element.querySelector('.letter-content');
    this.senderEl = this.element.querySelector('.letter-sig-name') || this.element.querySelector('.sig-name');
    this.continueBtn = this.element.querySelector('[data-continue]');

    this._attachEvents();
  }

  _attachEvents() {
    const triggerOpen = () => {
      if (this.isOpen) return;
      this.openEnvelope();
    };

    this.waxSeal.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerOpen();
    });

    this.envelopeWrap.addEventListener('click', () => {
      triggerOpen();
    });

    this.envelopeWrap.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerOpen();
      }
    });

    this.continueBtn.addEventListener('click', () => {
      this.dismiss();
    });
  }

  play(payload, onComplete) {
    this.payload = payload;
    this.onComplete = onComplete;
    this.isOpen = false;

    // Populate letter
    this.recipientEl.textContent = payload?.to ? `Dearest ${payload.to},` : 'To Someone Special,';
    this.contentEl.textContent = payload?.message || 'Every moment shared with you shines brighter than all the stars.';
    this.senderEl.textContent = payload?.from || 'Yours always';

    // Show overlay
    this.element.classList.remove('hidden');
    this.element.classList.remove('fade-out');
    this.envelopeWrap.classList.remove('opened');
    this.letterModal.classList.add('hidden');
    this.letterModal.classList.remove('visible');

    // Trigger entrance animation
    requestAnimationFrame(() => {
      this.element.classList.add('active');
    });
  }

  openEnvelope() {
    this.isOpen = true;
    this.envelopeWrap.classList.add('opened');

    // Burst starlight particles at seal position
    this._burstParticles();

    // After envelope opens, reveal letter modal smoothly
    setTimeout(() => {
      this.letterModal.classList.remove('hidden');
      requestAnimationFrame(() => {
        this.letterModal.classList.add('visible');
      });
    }, 750);
  }

  _burstParticles() {
    const rect = this.waxSeal.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    const count = 28;
    for (let i = 0; i < count; i += 1) {
      const p = document.createElement('div');
      p.className = 'seal-sparkle';
      document.body.appendChild(p);

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const dist = 40 + Math.random() * 85;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;

      p.style.left = `${originX}px`;
      p.style.top = `${originY}px`;
      p.style.transform = `translate(0, 0) scale(1)`;

      requestAnimationFrame(() => {
        p.style.transition = `all ${0.6 + Math.random() * 0.4}s cubic-bezier(0.2, 0.9, 0.3, 1)`;
        p.style.transform = `translate(${tx}px, ${ty}px) scale(0)`;
        p.style.opacity = '0';
      });

      setTimeout(() => {
        if (p.parentNode) p.parentNode.removeChild(p);
      }, 1000);
    }
  }

  dismiss() {
    this.element.classList.add('fade-out');
    setTimeout(() => {
      this.element.classList.add('hidden');
      this.element.classList.remove('active');
      this.element.classList.remove('fade-out');
      if (this.onComplete) {
        this.onComplete();
      }
    }, 600);
  }

  hide() {
    this.element.classList.add('hidden');
    this.element.classList.remove('active');
  }
}
