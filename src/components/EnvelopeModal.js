const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const click = (el) => new Promise((resolve) => el.addEventListener('click', resolve, { once: true }));

export class EnvelopeModal {
  constructor(root) {
    this.el = document.createElement('section');
    this.el.className = 'ritual hidden';
    this.el.innerHTML = `<div class="ritual-index">AMOURA / THE OPENING</div><div class="ritual-intro"></div><div class="envelope-wrap"><button class="ritual-envelope" aria-label="Open your letter"><span class="envelope-body"></span><span class="ritual-paper"><i></i></span><span class="envelope-flap"></span><span class="envelope-fold left"></span><span class="envelope-fold right"></span><span class="envelope-fold bottom"></span><span class="ritual-address"><small>FOR</small><b></b><em>with care</em></span><span class="wax-seal">✦</span><span class="seal-sparks"></span></button><p class="ritual-hint">Open the letter when you are ready</p></div><article class="parchment hidden"><div class="parchment-meta"><span>AMOURA / PRIVATE CORRESPONDENCE</span><span>01</span></div><header><span class="small-seal">✦</span><div><small class="letter-to"></small><small class="letter-from"></small></div><i>for keeps</i></header><div class="parchment-copy"></div><footer><span>Read slowly</span><span>Click outside to continue ↗</span></footer></article>`;
    root.append(this.el);
    this.intro = this.el.querySelector('.ritual-intro');
    this.envelope = this.el.querySelector('.ritual-envelope');
    this.paper = this.el.querySelector('.ritual-paper');
    this.parchment = this.el.querySelector('.parchment');
  }
  async play(data) {
    this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.el.classList.add('active'));
    this.intro.textContent = `A note from ${data.from}`;
    this.el.querySelector('.ritual-address b').textContent = data.to;
    this.el.querySelector('.letter-to').textContent = `To: ${data.to}`;
    this.el.querySelector('.letter-from').textContent = `From: ${data.from}`;
    this.el.querySelector('.parchment-copy').textContent = data.message;
    await wait(1000);
    await click(this.envelope);
    this.envelope.classList.add('opening');
    await wait(500);
    this.paper.classList.add('rising');
    await wait(250);
    this.envelope.classList.add('receding');
    await wait(800);
    this.parchment.classList.remove('hidden');
    requestAnimationFrame(() => this.parchment.classList.add('visible'));
    await new Promise((resolve) => {
      const fn = (event) => {
        if (!this.parchment.contains(event.target)) {
          this.el.removeEventListener('click', fn);
          resolve();
        }
      };
      this.el.addEventListener('click', fn);
    });
    this.parchment.classList.remove('visible');
    await wait(700);
    this.el.classList.remove('active');
    await wait(700);
    this.el.classList.add('hidden');
  }
}
