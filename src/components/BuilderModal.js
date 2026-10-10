import { MAX_IMAGES, normalizeGift, prepareImages, shareUrl } from '../share/urlCodec.js';

export class BuilderModal {
  constructor(root, { onPreview }) {
    this.onPreview = onPreview;
    this.root = root;
    this.files = [];
    this.el = document.createElement('section');
    this.el.className = 'builder';
    this.el.innerHTML = `<div class="builder-inner"><div class="eyebrow">AMOURA / PRIVATE KEEPSAKE</div><h1>Make a little<br><em>world for two.</em></h1><p class="lead">A quiet place for the words and photographs you want someone to keep.</p><form><div class="split"><label>From<input name="from" placeholder="Your name" maxlength="120"></label><label>To<input name="to" placeholder="Their name" maxlength="120"></label></div><label>Letter<textarea name="message" placeholder="Write something they can return to..." maxlength="2400"></textarea></label><label class="dropzone">Photographs <small>up to ${MAX_IMAGES}</small><input name="images" type="file" accept="image/*" multiple><strong>Drop memories here</strong><span data-meta>or choose from your camera roll</span></label><div class="builder-actions"><button class="primary" type="submit">Create share link <b>↗</b></button><button class="secondary" type="button" data-preview>Enter preview</button></div><output></output></form></div><div class="builder-mark"><span>A</span><small>your story<br>will bloom here</small></div></section>`;
    root.append(this.el);
    this.form = this.el.querySelector('form');
    this.output = this.el.querySelector('output');
    this.preview = this.el.querySelector('[data-preview]');
    this.fileInput = this.el.querySelector('input[type=file]');
    this.meta = this.el.querySelector('[data-meta]');
    this.fileInput.addEventListener('change', () => this.setFiles(this.fileInput.files));
    this.form.addEventListener('submit', (event) => this.generate(event));
    this.preview.addEventListener('click', () => this.previewGift());
  }
  setFiles(files) {
    this.files = Array.from(files || []).slice(0, MAX_IMAGES);
    this.meta.textContent = this.files.length ? `${this.files.length} ${this.files.length === 1 ? 'photograph' : 'photographs'} selected` : 'or choose from your camera roll';
  }
  value(images = []) {
    const data = new FormData(this.form);
    return normalizeGift({ from: data.get('from'), to: data.get('to'), message: data.get('message'), images });
  }
  async generate(event) {
    event.preventDefault(); this.busy(true);
    try {
      const images = await prepareImages(this.files, true);
      const link = shareUrl(this.value(images));
      await navigator.clipboard?.writeText(link);
      const input = document.createElement('input'); input.value = link; input.readOnly = true; input.className = 'share-output';
      this.output.replaceChildren(document.createTextNode('Your keepsake is ready. '), input);
    } catch (error) { this.output.textContent = error.message; } finally { this.busy(false); }
  }
  async previewGift() {
    this.busy(true);
    try { await this.onPreview(this.value(await prepareImages(this.files))); }
    catch (error) { this.output.textContent = error.message; } finally { this.busy(false); }
  }
  busy(value) { this.form.querySelectorAll('button').forEach((button) => { button.disabled = value; }); }
  show() { this.el.classList.add('visible'); }
  hide() { this.el.classList.remove('visible'); }
}
