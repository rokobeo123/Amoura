import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Objects on this THREE.Layers index will glow; everything else stays crisp.
export const BLOOM_SCENE_LAYER = 1;

export class SceneSetup {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05010a);
    this.scene.fog = new THREE.FogExp2(0x100417, 0.03);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 220);
    this.camera.position.set(0, 2.6, 14);

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    container.appendChild(this.renderer.domElement);

    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.rotateSpeed = 0.9;
    this.controls.enablePan = false;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 30;
    this.controls.target.set(0, 1, 0);

    // ── Selective-bloom helpers ─────────────────────────────────────────────
    // Camera temporarily set to layer 1 only during bloom pass—
    // photo cards on layer 0 become invisible to the bloom compositor.
    this.bloomLayer = new THREE.Layers();
    this.bloomLayer.set(BLOOM_SCENE_LAYER);
    this.camera.layers.enable(BLOOM_SCENE_LAYER); // camera sees layers 0 + 1

    this.addLights();
    this.applyEnvironmentMap();
    this.createBloomPipeline();

    this.clock = new THREE.Clock();
    this.enabled = false;
    this.updateHandlers = new Set();

    this.loop = this.loop.bind(this);
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  addLights() {
    this.scene.add(new THREE.AmbientLight(0xffd8e8, 0.36));

    const hemi = new THREE.HemisphereLight(0xffd9eb, 0x17051f, 0.82);
    hemi.position.set(0, 12, 0);
    this.scene.add(hemi);

    const key = new THREE.PointLight(0xff97c8, 46, 42, 2);
    key.position.set(6, 6, 8);
    this.scene.add(key);

    const fill = new THREE.PointLight(0x90a0ff, 30, 40, 2);
    fill.position.set(-9, 4.5, -6);
    this.scene.add(fill);

    const rim = new THREE.PointLight(0xffddb2, 38, 35, 2);
    rim.position.set(0, -5.2, 9);
    this.scene.add(rim);

    const back = new THREE.PointLight(0xff5ea7, 24, 32, 2);
    back.position.set(-2, 3, -11);
    this.scene.add(back);
  }

  applyEnvironmentMap() {
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const environment = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.05);
    this.environmentTarget = environment;
    this.scene.environment = environment.texture;
  }

  createBloomPipeline() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const res = new THREE.Vector2(w, h);

    // ── Bloom composer — renders ONLY bloom-layer objects with glow ──────────
    this.bloomComposer = new EffectComposer(this.renderer);
    this.bloomComposer.renderToScreen = false;
    this.bloomComposer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(res, 1.0, 0.9, 0.28);
    this.bloomPass.threshold = 0.28;  // only the brightest particle cores glow
    this.bloomPass.strength  = 0.88;  // romantic but not overwhelming
    this.bloomPass.radius    = 0.62;
    this.bloomComposer.addPass(this.bloomPass);

    // ── Final composer — full scene + bloom overlay ───────────────────────
    const mixPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture:  { value: null },
          bloomTexture: { value: this.bloomComposer.renderTarget2.texture },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          void main() {
            gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv);
          }
        `,
      }),
      'baseTexture',
    );
    mixPass.needsSwap = true;

    this.finalComposer = new EffectComposer(this.renderer);
    this.finalComposer.addPass(new RenderPass(this.scene, this.camera));
    this.finalComposer.addPass(mixPass);
  }

  // ── Selective bloom: camera-layer approach (no material swapping, no flicker) ─
  // Restrict camera to bloom layer only → photo cards (layer 0) disappear.
  _setBloomOnly() {
    this.camera.layers.set(BLOOM_SCENE_LAYER);
  }

  // Restore camera to see every layer (0 – 31).
  _setAllLayers() {
    this.camera.layers.enableAll();
  }

  addUpdateHandler(callback) {
    this.updateHandlers.add(callback);
    return () => {
      this.updateHandlers.delete(callback);
    };
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.controls.enabled = enabled;
    this.renderer.domElement.style.pointerEvents = enabled ? 'auto' : 'none';
  }

  start() {
    this.renderer.setAnimationLoop(this.loop);
  }

  handleResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.bloomComposer.setSize(width, height);
    this.finalComposer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  loop() {
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    if (!this.enabled) {
      return;
    }

    for (const handler of this.updateHandlers) {
      handler(delta, elapsed);
    }
    this.controls.update();

    // Step 1 — bloom pass: camera sees only layer-1 objects → photo cards are invisible
    this._setBloomOnly();
    this.bloomComposer.render();
    this._setAllLayers();

    // Step 2 — full-scene render + bloom composite
    this.finalComposer.render();
  }
}
