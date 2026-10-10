import {
  MAX_SHARE_IMAGES,
  buildAdaptiveShareUrl,
  readFileAsDataUrl,
} from '../share/urlCodec.js';

export class BuilderUI {
  constructor(root, { onPreview } = {}) {
    this.root = root;
    this.onPreview = onPreview;
    this.selectedFiles = [];
    this.selectedDataUrls = [];
    this.isGenerating = false;

    this._build();
    this._attachEvents();
  }

  _build() {
    this.element = document.createElement('div');
    this.element.className = 'builder-overlay';
    this.element.innerHTML = `
      <div class="builder-container">
        <header class="builder-header">
          <div class="builder-eyebrow">A M O U R A</div>
          <h1 class="builder-title">Craft a Starlight Keepsake</h1>
          <p class="builder-subtitle">Compose an intimate letter and gather your precious memories into an interactive 3D cosmic heart.</p>
        </header>

        <form class="builder-form" autocomplete="off">
          <div class="form-row two-col">
            <div class="form-group">
              <label class="form-label" for="builder-to">To (Recipient's Name)</label>
              <input
                id="builder-to"
                class="form-input"
                type="text"
                placeholder="e.g. My Beloved, Sarah"
                maxlength="100"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="builder-from">From (Your Name)</label>
              <input
                id="builder-from"
                class="form-input"
                type="text"
                placeholder="e.g. Alexander"
                maxlength="100"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="builder-message">Your Love Letter</label>
            <textarea
              id="builder-message"
              class="form-textarea"
              rows="5"
              placeholder="Write your heartfelt thoughts, shared memories, or romantic vows..."
              maxlength="3000"
            ></textarea>
            <div class="form-meta">
              <span class="char-count" data-char-count>0 / 3000</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">
              <span>Keepsake Photos (Up to ${MAX_SHARE_IMAGES})</span>
              <span class="label-badge">Strict No-Crop</span>
            </label>
            <div class="photo-dropzone" data-dropzone>
              <input
                id="builder-photos"
                class="file-input-hidden"
                type="file"
                accept="image/*"
                multiple
              />
              <div class="dropzone-content">
                <div class="dropzone-icon">
                  <svg viewBox="0 0 24 24" width="28" height="28">
                    <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </div>
                <div class="dropzone-text">
                  <strong>Click to upload photos</strong> or drag & drop here
                </div>
                <div class="dropzone-sub">PNG, JPG, WebP supported. Photos float around the heart in 3D.</div>
              </div>
            </div>

            <!-- Thumbnail Preview Grid -->
            <div class="thumbnail-grid hidden" data-thumbnail-grid></div>
          </div>

          <!-- Actions -->
          <div class="builder-actions">
            <button type="button" class="btn btn-secondary" data-preview-btn>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              <span>Preview Keepsake</span>
            </button>

            <button type="button" class="btn btn-primary" data-generate-btn>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
              </svg>
              <span>Create Keepsake Link</span>
            </button>
          </div>

          <!-- Generated Link Drawer -->
          <div class="generated-link-box hidden" data-link-box>
            <div class="link-box-header">
              <span class="link-ready-text">✨ Your keepsake is ready to share!</span>
            </div>
            <div class="link-input-group">
              <input type="text" class="link-url-input" readonly data-link-input />
              <button type="button" class="btn btn-copy" data-copy-btn>Copy Link</button>
            </div>
            <div class="link-actions-sub">
              <a href="#" target="_blank" rel="noopener noreferrer" class="link-open-btn" data-open-link>Open in New Tab ↗</a>
              <span class="link-note">Anyone with this link can view the keepsake without logging in.</span>
            </div>
          </div>
        </form>
      </div>
    `;

    this.root.appendChild(this.element);

    // References
    this.toInput = this.element.querySelector('#builder-to');
    this.fromInput = this.element.querySelector('#builder-from');
    this.messageInput = this.element.querySelector('#builder-message');
    this.charCountEl = this.element.querySelector('[data-char-count]');
    this.dropzone = this.element.querySelector('[data-dropzone]');
    this.fileInput = this.element.querySelector('#builder-photos');
    this.thumbnailGrid = this.element.querySelector('[data-thumbnail-grid]');
    this.previewBtn = this.element.querySelector('[data-preview-btn]');
    this.generateBtn = this.element.querySelector('[data-generate-btn]');
    this.linkBox = this.element.querySelector('[data-link-box]');
    this.linkInput = this.element.querySelector('[data-link-input]');
    this.copyBtn = this.element.querySelector('[data-copy-btn]');
    this.openLink = this.element.querySelector('[data-open-link]');
  }

  _attachEvents() {
    // Character count
    this.messageInput.addEventListener('input', () => {
      const len = this.messageInput.value.length;
      this.charCountEl.textContent = `${len} / 3000`;
    });

    // File selection via click
    this.dropzone.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      await this._addFiles(files);
      this.fileInput.value = '';
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach((eventName) => {
      this.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        this.dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      this.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        this.dropzone.classList.remove('drag-active');
      });
    });

    this.dropzone.addEventListener('drop', async (e) => {
      const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'));
      await this._addFiles(files);
    });

    // Preview
    this.previewBtn.addEventListener('click', async () => {
      const payload = this.getPayload();
      if (this.onPreview) {
        this.onPreview(payload);
      }
    });

    // Generate Link
    this.generateBtn.addEventListener('click', async () => {
      await this._generateLink();
    });

    // Copy Link
    this.copyBtn.addEventListener('click', async () => {
      const url = this.linkInput.value;
      if (!url) return;

      try {
        await navigator.clipboard.writeText(url);
        this.copyBtn.textContent = 'Copied! ✨';
        this.copyBtn.classList.add('btn-copied');
        setTimeout(() => {
          this.copyBtn.textContent = 'Copy Link';
          this.copyBtn.classList.remove('btn-copied');
        }, 2200);
      } catch (err) {
        console.warn('Clipboard write failed, selecting text instead.', err);
        this.linkInput.select();
      }
    });
  }

  async _addFiles(files) {
    for (const file of files) {
      if (this.selectedDataUrls.length >= MAX_SHARE_IMAGES) break;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        this.selectedFiles.push(file);
        this.selectedDataUrls.push(dataUrl);
      } catch (err) {
        console.warn('Could not read file:', err);
      }
    }
    this._renderThumbnails();
  }

  _renderThumbnails() {
    this.thumbnailGrid.innerHTML = '';
    if (this.selectedDataUrls.length === 0) {
      this.thumbnailGrid.classList.add('hidden');
      return;
    }

    this.thumbnailGrid.classList.remove('hidden');

    this.selectedDataUrls.forEach((dataUrl, idx) => {
      const chip = document.createElement('div');
      chip.className = 'thumb-chip';
      chip.innerHTML = `
        <img src="${dataUrl}" alt="Memory #${idx + 1}" class="thumb-img" />
        <button type="button" class="thumb-remove" title="Remove photo" aria-label="Remove photo">✕</button>
      `;

      chip.querySelector('.thumb-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedFiles.splice(idx, 1);
        this.selectedDataUrls.splice(idx, 1);
        this._renderThumbnails();
      });

      this.thumbnailGrid.appendChild(chip);
    });
  }

  getPayload() {
    return {
      to: this.toInput.value.trim() || 'My Beloved',
      from: this.fromInput.value.trim() || 'Someone who loves you',
      message: this.messageInput.value.trim() || 'Every moment with you is etched forever into my stars.',
      images: this.selectedDataUrls,
    };
  }

  async _generateLink() {
    if (this.isGenerating) return;
    this.isGenerating = true;

    const originalBtnText = this.generateBtn.innerHTML;
    this.generateBtn.disabled = true;
    this.generateBtn.innerHTML = `
      <span class="spinner"></span>
      <span>Compressing Starlight...</span>
    `;

    try {
      const payload = this.getPayload();
      const result = await buildAdaptiveShareUrl(payload, this.selectedFiles);
      
      this.linkInput.value = result.link;
      this.openLink.href = result.link;
      this.linkBox.classList.remove('hidden');

      // Scroll link box smoothly into view
      this.linkBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      alert(err.message || 'Failed to generate link. Please check your photos.');
    } finally {
      this.isGenerating = false;
      this.generateBtn.disabled = false;
      this.generateBtn.innerHTML = originalBtnText;
    }
  }

  show() {
    this.element.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.element.classList.add('active');
    });
  }

  hide() {
    this.element.classList.remove('active');
    setTimeout(() => {
      this.element.classList.add('hidden');
    }, 400);
  }
}
