import './styles/main.css';
import { BuilderModal } from './components/BuilderModal.js';
import { EnvelopeModal } from './components/EnvelopeModal.js';
import { MusicPlayer } from './components/MusicPlayer.js';
import { HeartScene } from './scene/HeartScene.js';
import { readGiftFromUrl } from './share/urlCodec.js';

const app = document.querySelector('#app');
const canvasHost = document.createElement('main');
canvasHost.className = 'heart-canvas';
app.append(canvasHost);
const heart = new HeartScene(canvasHost);
new MusicPlayer(app);
const ritual = new EnvelopeModal(app);
const builder = new BuilderModal(app, { onPreview: (gift) => launch(gift, true) });
const back = document.createElement('button');
back.className = 'back-editor';
back.textContent = '← Back to editor';
app.append(back);

async function launch(gift, preview = false) {
  builder.hide();
  back.classList.toggle('visible', preview);
  await ritual.play(gift);
  await heart.setPhotos(gift.images);
  canvasHost.classList.add('visible');
}

back.addEventListener('click', () => window.location.reload());
const shared = readGiftFromUrl();
if (shared) launch(shared);
else builder.show();
