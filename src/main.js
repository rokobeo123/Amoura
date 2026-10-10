import './styles.css';
import { parseGiftDataFromUrl } from './share/urlCodec.js';
import { HeartScene } from './scene/HeartScene.js';
import { EnvelopeModal } from './components/EnvelopeModal.js';
import { BuilderUI } from './components/BuilderUI.js';
import { MusicPlayer } from './components/MusicPlayer.js';

const app = document.querySelector('#app');

// 1. Scene Host Container for Three.js WebGL
const sceneHost = document.createElement('div');
sceneHost.className = 'scene-host';
app.appendChild(sceneHost);

// 2. Floating "Back to Editor" Button (used during preview)
const backToEditorBtn = document.createElement('button');
backToEditorBtn.type = 'button';
backToEditorBtn.className = 'btn-back-editor';
backToEditorBtn.innerHTML = `
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
  <span>Return to Editor</span>
`;
app.appendChild(backToEditorBtn);

// 3. Floating "Close Focus" Pill (when examining a photo card)
const focusClosePill = document.createElement('button');
focusClosePill.type = 'button';
focusClosePill.className = 'focus-close-pill';
focusClosePill.innerHTML = `
  <span>✕ Close Image Focus</span>
`;
app.appendChild(focusClosePill);

// 4. Initialize Modules
const heartScene = new HeartScene();
heartScene.mount(sceneHost, {
  onCardFocus: (index, isFocused) => {
    focusClosePill.classList.toggle('visible', isFocused);
  },
});

focusClosePill.addEventListener('click', () => {
  heartScene.resetFocus();
});

const envelopeModal = new EnvelopeModal(app);
const musicPlayer = new MusicPlayer(app);

let isPreviewMode = false;

// Function to activate the 3D Cosmic Heart experience
function activate3DScene(payload) {
  sceneHost.classList.add('active');
  if (payload?.images && payload.images.length > 0) {
    heartScene.loadPhotos(payload.images);
  }
  if (isPreviewMode) {
    backToEditorBtn.classList.add('visible');
  }
}

// Function to exit experience back to Builder
function exitExperienceToBuilder() {
  isPreviewMode = false;
  backToEditorBtn.classList.remove('visible');
  focusClosePill.classList.remove('visible');
  sceneHost.classList.remove('active');
  heartScene.resetFocus();
  envelopeModal.hide();
  builderUI.show();
}

backToEditorBtn.addEventListener('click', exitExperienceToBuilder);

// 5. Initialize Builder UI
const builderUI = new BuilderUI(app, {
  onPreview: (payload) => {
    isPreviewMode = true;
    builderUI.hide();
    musicPlayer.enableAutoPlay();

    // Play the envelope opening ceremony -> then reveal 3D scene
    envelopeModal.play(payload, () => {
      activate3DScene(payload);
    });
  },
});

// 6. Bootstrap Application
async function bootstrap() {
  const sharedPayload = parseGiftDataFromUrl(window.location.href);

  if (sharedPayload) {
    // Recipient Flow: Auto-play the romantic keepsake ceremony
    builderUI.hide();
    envelopeModal.play(sharedPayload, () => {
      activate3DScene(sharedPayload);
    });
    musicPlayer.enableAutoPlay();
  } else {
    // Creator Flow: Show the luxury Keepsake Studio
    builderUI.show();
  }
}

bootstrap();
