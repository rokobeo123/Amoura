import {
  MAX_SHARE_IMAGES,
  buildShareUrl,
  normalizeGiftData,
  prepareImagesFromFiles,
} from '../share/shareData.js';

export class BuilderUI {
  constructor(root, { onPreview }) {
    this.root = root;
    this.onPreview = onPreview;

    this.cachedImageFingerprint = '';
    this.cachedImages = null;

    this.build();
    this.attachEvents();
  }

  build() {
    this.element = document.createElement('div');
    this.element.className = 'builder-overlay';
    this.element.innerHTML = `
      <div class="builder-card">
        <h1 class="builder-title">Heart Bloom Gift</h1>
        <p class="builder-subtitle">Create a romantic link with your photos and letter.</p>

        <div class="builder-grid">
          <div class="builder-field">
            <label for="gift-from">From</label>
            <input id="gift-from" type="text" placeholder="Your name" maxlength="120" />
          </div>
          <div class="builder-field">
            <label for="gift-to">To</label>
            <input id="gift-to" type="text" placeholder="Their name" maxlength="120" />
          </div>
          <div class="builder-field full">
            <label for="gift-message">Letter</label>
            <textarea id="gift-message" placeholder="Write your message..." maxlength="2200"></textarea>
          </div>
          <div class="builder-field full">
            <label for="gift-images">Photos (up to ${MAX_SHARE_IMAGES})</label>
            <input id="gift-images" type="file" accept="image/*" multiple />
            <p class="builder-meta" data-image-meta>No photos selected.</p>
          </div>
        </div>

        <div class="builder-actions">
          <button class="builder-btn" data-generate>Generate Share Link</button>
          <button class="builder-btn ghost" data-preview>Preview Experience</button>
        </div>

        <div class="builder-link hidden" data-link-box>
          <input type="text" readonly data-link-input />
          <button class="builder-copy" data-copy>Copy</button>
          <a href="#" target="_blank" rel="noopener noreferrer" data-open>Open</a>
        </div>
      </div>
    `;

    this.root.appendChild(this.element);

    this.fromInput = this.element.querySelector('#gift-from');
    this.toInput = this.element.querySelector('#gift-to');
    this.messageInput = this.element.querySelector('#gift-message');
    this.imagesInput = this.element.querySelector('#gift-images');
    this.imageMeta = this.element.querySelector('[data-image-meta]');
    this.generateButton = this.element.querySelector('[data-generate]');
    this.previewButton = this.element.querySelector('[data-preview]');
    this.linkBox = this.element.querySelector('[data-link-box]');
    this.linkInput = this.element.querySelector('[data-link-input]');
    this.copyButton = this.element.querySelector('[data-copy]');
    this.openLink = this.element.querySelector('[data-open]');
  }

  attachEvents() {
    this.imagesInput.addEventListener('change', () => {
      const count = this.imagesInput.files ? this.imagesInput.files.length : 0;
      this.imageMeta.textContent = `${Math.min(count, MAX_SHARE_IMAGES)} photo(s) selected.`;
      this.cachedImageFingerprint = '';
      this.cachedImages = null;
    });

    this.generateButton.addEventListener('click', async () => {
      this.setBusy(true);
      this.imageMeta.textContent = this.getPhotoMetaText();
      try {
        const payload = await this.collectPayload();
        const link = buildShareUrl(payload);
        this.linkInput.value = link;
        this.openLink.href = link;
        this.linkBox.classList.remove('hidden');
      } catch (error) {
        console.error('Failed to generate share link.', error);
        this.imageMeta.textContent = 'Failed to generate link. Please try smaller images.';
      } finally {
        this.setBusy(false);
      }
    });

    this.copyButton.addEventListener('click', async () => {
      if (!this.linkInput.value) {
        return;
      }

      try {
        await navigator.clipboard.writeText(this.linkInput.value);
        this.copyButton.textContent = 'Copied';
      } catch (error) {
        console.error('Clipboard copy failed.', error);
        this.linkInput.focus();
        this.linkInput.select();
        this.copyButton.textContent = 'Select & Copy';
      } finally {
        setTimeout(() => {
          this.copyButton.textContent = 'Copy';
        }, 1200);
      }
    });

    this.previewButton.addEventListener('click', async () => {
      if (!this.onPreview) {
        return;
      }

      this.setBusy(true);
      this.imageMeta.textContent = this.getPhotoMetaText();
      try {
        const payload = await this.collectPayload();
        await this.onPreview(payload);
      } catch (error) {
        console.error('Preview failed to start.', error);
        this.imageMeta.textContent = 'Failed to start preview. Please try again.';
      } finally {
        this.setBusy(false);
      }
    });
  }

  setBusy(isBusy) {
    this.generateButton.disabled = isBusy;
    this.previewButton.disabled = isBusy;
  }

  getFileFingerprint() {
    const files = Array.from(this.imagesInput.files || []);
    return files
      .slice(0, MAX_SHARE_IMAGES)
      .map((file) => `${file.name}:${file.size}:${file.lastModified}`)
      .join('|');
  }

  getPhotoMetaText() {
    const count = this.imagesInput.files ? this.imagesInput.files.length : 0;
    return `${Math.min(count, MAX_SHARE_IMAGES)} photo(s) selected.`;
  }

  async getPreparedImages() {
    const fingerprint = this.getFileFingerprint();
    if (fingerprint === this.cachedImageFingerprint && this.cachedImages) {
      return this.cachedImages;
    }

    const images = await prepareImagesFromFiles(this.imagesInput.files);
    this.cachedImageFingerprint = fingerprint;
    this.cachedImages = images;
    return images;
  }

  async collectPayload() {
    const images = await this.getPreparedImages();
    return normalizeGiftData({
      from: this.fromInput.value,
      images,
      message: this.messageInput.value,
      to: this.toInput.value,
    });
  }

  show() {
    this.element.classList.add('visible');
  }

  hide() {
    this.element.classList.remove('visible');
  }
}

