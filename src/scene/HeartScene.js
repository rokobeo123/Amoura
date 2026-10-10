import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const hash = (n) => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
function heart(i) {
  const u = Math.abs(hash(i * 1.71)) * Math.PI * 2;
  const v = Math.acos(2 * Math.abs(hash(i * 2.31)) - 1);
  const r = Math.pow(Math.abs(hash(i * 3.17)), 0.35);
  const x = (4 * Math.sin(u) - Math.sin(3 * u)) * Math.sin(v) * 0.42;
  const y = 2 * Math.cos(v) * 0.92;
  const z = (4 * Math.cos(u) - Math.cos(2 * u) - 0.5 * Math.cos(3 * u)) * Math.sin(v) * 0.36 + 0.35;
  return new THREE.Vector3(x * r, y * r, z * r);
}

export class HeartScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06070b);
    this.scene.fog = new THREE.FogExp2(0x06070b, 0.035);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0, 0, 8.5);
    this.target = new THREE.Vector3();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    container.append(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.06; this.controls.enablePan = false; this.controls.minDistance = 3; this.controls.maxDistance = 16;
    this.group = new THREE.Group(); this.scene.add(this.group); this.photos = []; this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2(); this.clock = new THREE.Clock(); this.focused = null; this.focusPosition = new THREE.Vector3(); this.focusNormal = new THREE.Vector3(); this.focusCamera = new THREE.Vector3(); this.focusQuaternion = new THREE.Quaternion();
    this.createHeart(4200); this.createDust(900);
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container); this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
    container.addEventListener('pointerup', (event) => this.pick(event));
  }
  createHeart(count) {
    const positions = new Float32Array(count * 3); const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) { const p = heart(i); const o = i * 3; positions[o] = p.x * 4.2; positions[o + 1] = p.y * 4.2; positions[o + 2] = p.z * 4.2; const color = new THREE.Color().setHSL(0.1 + Math.abs(hash(i * 4.2)) * 0.08, 0.35, 0.65 + Math.abs(hash(i * 2.4)) * 0.28); colors[o] = color.r; colors[o + 1] = color.g; colors[o + 2] = color.b; }
    this.heartGeometry = new THREE.BufferGeometry(); this.heartGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); this.heartGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.heartMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 } }, vertexShader: `attribute vec3 color; varying vec3 vColor; uniform float uTime; void main(){vColor=color; vec3 p=position*(1.0+sin(uTime*1.6+position.y*.8)*.035); vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=clamp(3.8*(280.0/-mv.z),1.0,8.0); gl_Position=projectionMatrix*mv;}`, fragmentShader: `varying vec3 vColor; void main(){float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.05,d); gl_FragColor=vec4(vColor*(1.0+a*.65),a);}` });
    this.heart = new THREE.Points(this.heartGeometry, this.heartMaterial); this.group.add(this.heart);
  }
  createDust(count) { const positions = new Float32Array(count * 3); for (let i = 0; i < count * 3; i += 1) positions[i] = (Math.abs(hash(i * 1.13)) - 0.5) * 30; this.dustGeometry = new THREE.BufferGeometry(); this.dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); this.dustMaterial = new THREE.PointsMaterial({ color: 0xd9c99e, size: 0.025, transparent: true, opacity: 0.5 }); this.dust = new THREE.Points(this.dustGeometry, this.dustMaterial); this.scene.add(this.dust); }
  async setPhotos(urls) {
    const loader = new THREE.TextureLoader();
    this.photos.splice(0).forEach((photo) => { this.group.remove(photo); photo.geometry.dispose(); photo.material.map?.dispose(); photo.material.dispose(); });
    const loaded = await Promise.all(urls.map((url) => new Promise((resolve) => loader.load(url, resolve, undefined, () => resolve(null)))));
    loaded.filter(Boolean).forEach((texture, i) => { texture.colorSpace = THREE.SRGBColorSpace; const image = texture.image; const aspect = image.width / Math.max(1, image.height); const card = new THREE.Mesh(new THREE.PlaneGeometry(aspect * 1.25, 1.25), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })); const angle = i * 2.399; const radius = 4.4 + Math.min(urls.length, 12) * 0.12; card.position.set(Math.cos(angle) * radius, Math.sin(i * 1.7) * 1.8, Math.sin(angle) * radius); card.lookAt(0, 0, 0); card.userData.base = card.position.clone(); this.group.add(card); this.photos.push(card); });
  }
  pick(event) { if (!this.photos.length) return; const rect = this.renderer.domElement.getBoundingClientRect(); this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height * 2 - 1)); this.raycaster.setFromCamera(this.pointer, this.camera); const hit = this.raycaster.intersectObjects(this.photos)[0]; this.focused = hit?.object || null; this.photos.forEach((photo) => { photo.material.opacity = this.focused && photo !== this.focused ? 0.42 : 1; }); }
  frame() { const delta = Math.min(this.clock.getDelta(), 0.05); const time = this.clock.elapsedTime; this.heartMaterial.uniforms.uTime.value = time; this.group.rotation.y += delta * 0.035; this.dust.rotation.y -= delta * 0.012; this.photos.forEach((photo, i) => { photo.position.y = photo.userData.base.y + Math.sin(time * 0.5 + i) * 0.08; if (photo === this.focused) { photo.getWorldPosition(this.focusPosition); this.focusQuaternion.copy(photo.getWorldQuaternion(this.focusQuaternion)); this.focusNormal.set(0, 0, -1).applyQuaternion(this.focusQuaternion).normalize(); this.focusCamera.copy(this.focusPosition).addScaledVector(this.focusNormal, 3.4); this.camera.position.lerp(this.focusCamera, 1 - Math.exp(-delta * 4)); this.controls.target.lerp(this.focusPosition, 1 - Math.exp(-delta * 4)); } }); this.controls.update(); this.renderer.render(this.scene, this.camera); }
  resize() { const width = this.container.clientWidth || innerWidth; const height = this.container.clientHeight || innerHeight; this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height, false); }
  dispose() { this.resizeObserver.disconnect(); this.renderer.setAnimationLoop(null); this.heartGeometry.dispose(); this.heartMaterial.dispose(); this.dustGeometry.dispose(); this.dustMaterial.dispose(); this.photos.forEach((photo) => { photo.geometry.dispose(); photo.material.map?.dispose(); photo.material.dispose(); }); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
