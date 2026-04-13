import './styles.css';
import { SceneSetup } from './core/SceneSetup.js';
import {
  MODE_HEART,
  ParticleSystem,
  loadPhotoTextures,
} from './core/ParticleSystem.js';
import { InteractionController } from './core/InteractionController.js';
import { StorySequence } from './story/StorySequence.js';
import { BuilderUI } from './ui/BuilderUI.js';
import { MusicPlayer } from './ui/MusicPlayer.js';
import { parseGiftDataFromUrl } from './share/shareData.js';

const app = document.querySelector('#app');

const sceneHost = document.createElement('div');
sceneHost.className = 'scene-host';
app.appendChild(sceneHost);

const sceneSetup = new SceneSetup(sceneHost);
sceneSetup.start();
sceneSetup.setEnabled(false);

const storySequence = new StorySequence(app);
new MusicPlayer(app);

let particleSystem = null;
let builderUI = null;

const previewBackButton = document.createElement('button');
previewBackButton.type = 'button';
previewBackButton.className = 'preview-back-btn';
previewBackButton.textContent = 'Back to Create';
app.appendChild(previewBackButton);

const interactionController = new InteractionController({
  camera: sceneSetup.camera,
  controls: sceneSetup.controls,
  domElement: sceneSetup.renderer.domElement,
});
interactionController.setParticleSystem(null);

sceneSetup.addUpdateHandler((delta, elapsed) => {
  if (!particleSystem) {
    return;
  }

  particleSystem.update(delta, elapsed, sceneSetup.camera);
  interactionController.update(delta);
});

function setPreviewBackVisible(visible) {
  previewBackButton.classList.toggle('visible', visible);
}

function teardownExperience() {
  sceneSetup.setEnabled(false);
  sceneHost.classList.remove('active');
  interactionController.setParticleSystem(null);

  if (particleSystem) {
    particleSystem.dispose();
    particleSystem = null;
  }
}

previewBackButton.addEventListener('click', () => {
  setPreviewBackVisible(false);
  teardownExperience();
  builderUI.show();
});

async function launchExperience(payload, { isPreview = false } = {}) {
  setPreviewBackVisible(false);
  sceneSetup.setEnabled(false);
  sceneHost.classList.remove('active');

  await storySequence.play(payload);

  if (particleSystem) {
    particleSystem.dispose();
    particleSystem = null;
  }

  const maxAnisotropy = sceneSetup.renderer.capabilities.getMaxAnisotropy();
  const maxTextureSize = sceneSetup.renderer.capabilities.maxTextureSize || 8192;
  const photoTextures = await loadPhotoTextures(payload.images, maxAnisotropy);

  particleSystem = new ParticleSystem(sceneSetup.mainGroup, {
    particleCount: 4200,
    photoTextures,
    anisotropy: maxAnisotropy,
    maxTextureSize,
  });

  particleSystem.setMode(MODE_HEART);
  interactionController.setParticleSystem(particleSystem);

  sceneHost.classList.add('active');
  sceneSetup.setEnabled(true);
  setPreviewBackVisible(isPreview);
}

builderUI = new BuilderUI(app, {
  onPreview: async (payload) => {
    builderUI.hide();
    await launchExperience(payload, { isPreview: true });
  },
});

async function bootstrap() {
  const sharedPayload = await parseGiftDataFromUrl(window.location.href);
  if (sharedPayload) {
    await launchExperience(sharedPayload);
    return;
  }

  builderUI.show();
}

bootstrap();

