import * as THREE from 'three';

const HEART_POINTS_COUNT = 4500;
const AMBIENT_DUST_COUNT = 700;
const CAMERA_DEFAULT_POS = new THREE.Vector3(0, 1.2, 16.5);
const CAMERA_DEFAULT_LOOKAT = new THREE.Vector3(0, 0.5, 0);

// Helper: generate a soft circular particle sprite texture
function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(245, 230, 200, 0.85)');
  gradient.addColorStop(0.55, 'rgba(235, 190, 160, 0.35)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export class HeartScene {
  constructor() {
    this.container = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.rafId = null;

    // Groups
    this.worldGroup = new THREE.Group();
    this.heartGroup = new THREE.Group();
    this.photoGroup = new THREE.Group();
    this.dustGroup = new THREE.Group();

    // Particle data
    this.heartPoints = null;
    this.basePositions = null;
    this.particlePhases = null;
    this.particleSpeeds = null;
    this.ambientDust = null;
    this.particleTexture = null;

    // Photos
    this.photoCards = [];
    this.loadedTextures = [];
    this.focusedCardIndex = -1;

    // Interaction & Camera
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.targetRotation = { x: 0, y: 0 };
    this.currentRotation = { x: 0, y: 0 };
    this.zoomLevel = 16.5;
    this.targetZoom = 16.5;

    // Camera animation
    this.isFocusTransitioning = false;
    this.cameraStartPos = new THREE.Vector3();
    this.cameraTargetPos = new THREE.Vector3();
    this.lookAtStart = new THREE.Vector3();
    this.lookAtTarget = new THREE.Vector3();
    this.focusTransitionProgress = 0;
    this.currentLookAt = new THREE.Vector3().copy(CAMERA_DEFAULT_LOOKAT);

    // Touch pinch state
    this.initialPinchDistance = 0;

    // Timing
    this.clock = new THREE.Clock();

    // Bind event handlers
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  mount(container, { images = [], onCardFocus = null } = {}) {
    this.container = container;
    this.onCardFocus = onCardFocus;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x06070b, 0.022);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.copy(CAMERA_DEFAULT_POS);
    this.camera.lookAt(CAMERA_DEFAULT_LOOKAT);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 1.2);
    this.scene.add(ambientLight);

    const goldLight = new THREE.PointLight(0xf4e8c1, 3.5, 30);
    goldLight.position.set(0, 2, 8);
    this.scene.add(goldLight);

    const roseLight = new THREE.PointLight(0xf5d0c5, 2.0, 25);
    roseLight.position.set(-5, -2, 5);
    this.scene.add(roseLight);

    // 5. Structure
    this.worldGroup.add(this.heartGroup);
    this.worldGroup.add(this.photoGroup);
    this.worldGroup.add(this.dustGroup);
    this.scene.add(this.worldGroup);

    // 6. Build Components
    this.particleTexture = createParticleTexture();
    this._createHeartParticles();
    this._createAmbientDust();

    if (images.length > 0) {
      this.loadPhotos(images);
    }

    // 7. Event listeners
    this._attachEvents();

    // 8. Animation loop
    this.clock.start();
    this._animate();
  }

  _createHeartParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(HEART_POINTS_COUNT * 3);
    const colors = new Float32Array(HEART_POINTS_COUNT * 3);
    const sizes = new Float32Array(HEART_POINTS_COUNT);

    this.basePositions = new Float32Array(HEART_POINTS_COUNT * 3);
    this.particlePhases = new Float32Array(HEART_POINTS_COUNT);
    this.particleSpeeds = new Float32Array(HEART_POINTS_COUNT);

    const goldColor = new THREE.Color(0xf5e6c8);
    const roseColor = new THREE.Color(0xf8dcd6);
    const whiteColor = new THREE.Color(0xffffff);
    const tempColor = new THREE.Color();

    const scale = 0.32;

    for (let i = 0; i < HEART_POINTS_COUNT; i += 1) {
      // Parametric Heart 3D formula with volumetric interior
      const t = Math.PI * 2 * Math.random();
      // Volume factor: biased toward the outer crust with a soft core
      const v = Math.pow(Math.random(), 0.55);

      const x = 16 * Math.pow(Math.sin(t), 3) * v;
      const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * v;
      // Z depth dispersion depends on Y (fuller near top lobes, tapering at bottom tip)
      const zDepth = (Math.random() - 0.5) * 11.0 * (0.3 + 0.7 * v);

      const px = x * scale;
      const py = (y + 1.5) * scale;
      const pz = zDepth * scale;

      const idx = i * 3;
      positions[idx] = px;
      positions[idx + 1] = py;
      positions[idx + 2] = pz;

      this.basePositions[idx] = px;
      this.basePositions[idx + 1] = py;
      this.basePositions[idx + 2] = pz;

      // Color distribution: warm champagne, soft pearl rose, sparkling white
      const cRand = Math.random();
      if (cRand < 0.5) {
        tempColor.copy(goldColor).lerp(whiteColor, Math.random() * 0.4);
      } else if (cRand < 0.85) {
        tempColor.copy(roseColor).lerp(whiteColor, Math.random() * 0.3);
      } else {
        tempColor.copy(whiteColor);
      }

      colors[idx] = tempColor.r;
      colors[idx + 1] = tempColor.g;
      colors[idx + 2] = tempColor.b;

      sizes[i] = 0.22 + Math.random() * 0.32;
      this.particlePhases[i] = Math.random() * Math.PI * 2;
      this.particleSpeeds[i] = 0.8 + Math.random() * 1.4;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.38,
      map: this.particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.heartPoints = new THREE.Points(geometry, material);
    this.heartGroup.add(this.heartPoints);
  }

  _createAmbientDust() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(AMBIENT_DUST_COUNT * 3);
    const colors = new Float32Array(AMBIENT_DUST_COUNT * 3);

    const dustColor = new THREE.Color(0xf6e5cb);

    for (let i = 0; i < AMBIENT_DUST_COUNT; i += 1) {
      const radius = 6.0 + Math.random() * 14.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const idx = i * 3;
      positions[idx] = radius * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = radius * Math.sin(phi) * Math.sin(theta) + 0.5;
      positions[idx + 2] = radius * Math.cos(phi);

      colors[idx] = dustColor.r;
      colors[idx + 1] = dustColor.g;
      colors[idx + 2] = dustColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.22,
      map: this.particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.ambientDust = new THREE.Points(geometry, material);
    this.dustGroup.add(this.ambientDust);
  }

  async loadPhotos(imageUrls) {
    // Clear existing photo cards
    this._clearPhotos();

    if (!imageUrls || imageUrls.length === 0) return;

    const count = imageUrls.length;
    const loader = new THREE.TextureLoader();

    // Calculate orbital ring coordinates
    const orbitRadius = Math.max(6.8, 5.2 + count * 0.3);

    for (let i = 0; i < count; i += 1) {
      const url = imageUrls[i];
      try {
        const texture = await new Promise((resolve, reject) => {
          loader.load(url, resolve, undefined, reject);
        });

        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        this.loadedTextures.push(texture);

        // SACRED RULE: STRICT NO-CROP / NO-STRETCH
        // Calculate true natural aspect ratio
        const img = texture.image;
        const naturalW = img.naturalWidth || img.width || 1;
        const naturalH = img.naturalHeight || img.height || 1;
        const aspect = naturalW / naturalH;

        // Box envelope bounds: width 2.2, height 2.2
        const boxSize = 2.2;
        let photoW = boxSize;
        let photoH = boxSize;
        if (aspect >= 1) {
          // Landscape: preserve width, scale height
          photoH = boxSize / aspect;
        } else {
          // Portrait: preserve height, scale width
          photoW = boxSize * aspect;
        }

        const cardGroup = new THREE.Group();
        cardGroup.userData = {
          index: i,
          aspect,
          photoWidth: photoW,
          photoHeight: photoH,
          originalScale: new THREE.Vector3(1, 1, 1),
        };

        // 1. Crystal Outer Glass Frame with golden rim
        const framePadding = 0.22;
        const frameW = photoW + framePadding * 2;
        const frameH = photoH + framePadding * 2;

        const frameGeo = new THREE.PlaneGeometry(frameW, frameH);
        const frameMat = new THREE.MeshStandardMaterial({
          color: 0x14161f,
          roughness: 0.15,
          metalness: 0.85,
          transparent: true,
          opacity: 0.82,
          side: THREE.DoubleSide,
        });
        const frameMesh = new THREE.Mesh(frameGeo, frameMat);
        frameMesh.position.z = -0.01;
        cardGroup.add(frameMesh);

        // 2. Luminous border line
        const borderGeo = new THREE.EdgesGeometry(frameGeo);
        const borderMat = new THREE.LineBasicMaterial({
          color: 0xdfbe82,
          transparent: true,
          opacity: 0.65,
          linewidth: 1,
        });
        const borderLines = new THREE.LineSegments(borderGeo, borderMat);
        borderLines.position.z = 0.005;
        cardGroup.add(borderLines);

        // 3. Exact Photo Mesh (NO CROP, NO STRETCH)
        const photoGeo = new THREE.PlaneGeometry(photoW, photoH);
        const photoMat = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
        });
        const photoMesh = new THREE.Mesh(photoGeo, photoMat);
        photoMesh.position.z = 0.01;
        photoMesh.userData = { isPhotoMesh: true, parentGroup: cardGroup };
        cardGroup.add(photoMesh);

        // Orbit placement
        const angle = (i / count) * Math.PI * 2;
        // Mild undulating vertical wave
        const yOffset = Math.sin(angle * 2) * 1.1 + 0.3;
        const xPos = Math.cos(angle) * orbitRadius;
        const zPos = Math.sin(angle) * orbitRadius;

        cardGroup.position.set(xPos, yOffset, zPos);
        // Face naturally toward the center heart, slightly tilted
        cardGroup.lookAt(0, yOffset * 0.4, 0);

        this.photoGroup.add(cardGroup);
        this.photoCards.push(cardGroup);
      } catch (err) {
        console.warn(`Failed to load photo texture #${i}:`, err);
      }
    }
  }

  _clearPhotos() {
    for (const card of this.photoCards) {
      card.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
      this.photoGroup.remove(card);
    }
    this.photoCards = [];

    for (const tex of this.loadedTextures) {
      tex.dispose();
    }
    this.loadedTextures = [];
  }

  // Focus a specific photo card with cinematic camera glide
  focusPhoto(index) {
    if (index < 0 || index >= this.photoCards.length) {
      this.resetFocus();
      return;
    }

    const card = this.photoCards[index];
    this.focusedCardIndex = index;
    this.isFocusTransitioning = true;
    this.focusTransitionProgress = 0;

    this.cameraStartPos.copy(this.camera.position);
    this.lookAtStart.copy(this.currentLookAt);

    // Target position: right in front of the card
    const cardWorldPos = new THREE.Vector3();
    card.getWorldPosition(cardWorldPos);

    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(card.quaternion).normalize();
    // Position camera ~4.2 units in front of the card along its normal
    const targetCameraPos = cardWorldPos.clone().add(normal.multiplyScalar(4.0));

    this.cameraTargetPos.copy(targetCameraPos);
    this.lookAtTarget.copy(cardWorldPos);

    if (this.onCardFocus) {
      this.onCardFocus(index, true);
    }
  }

  resetFocus() {
    if (this.focusedCardIndex === -1 && !this.isFocusTransitioning) return;

    this.focusedCardIndex = -1;
    this.isFocusTransitioning = true;
    this.focusTransitionProgress = 0;

    this.cameraStartPos.copy(this.camera.position);
    this.lookAtStart.copy(this.currentLookAt);

    // Return to default orbit overview
    const returnPos = new THREE.Vector3(
      Math.sin(this.currentRotation.y) * this.targetZoom,
      CAMERA_DEFAULT_POS.y,
      Math.cos(this.currentRotation.y) * this.targetZoom,
    );

    this.cameraTargetPos.copy(returnPos);
    this.lookAtTarget.copy(CAMERA_DEFAULT_LOOKAT);

    if (this.onCardFocus) {
      this.onCardFocus(-1, false);
    }
  }

  _animate() {
    this.rafId = requestAnimationFrame(() => this._animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    // 1. Harmonic Heart Breathing & Subtle Twinkle
    if (this.heartPoints && this.basePositions) {
      const breath = 1.0 + Math.sin(elapsed * 1.5) * 0.038;
      this.heartGroup.scale.set(breath, breath, breath);

      // Micro twinkle on particles
      const positions = this.heartPoints.geometry.attributes.position.array;
      const count = positions.length / 3;

      for (let i = 0; i < count; i += 12) {
        // sampled animation for 60fps performance
        const idx = i * 3;
        const phase = this.particlePhases[i];
        const spd = this.particleSpeeds[i];
        const drift = Math.sin(elapsed * spd + phase) * 0.045;

        positions[idx] = this.basePositions[idx] + drift * 0.4;
        positions[idx + 1] = this.basePositions[idx + 1] + drift * 0.6;
        positions[idx + 2] = this.basePositions[idx + 2] + drift * 0.3;
      }
      this.heartPoints.geometry.attributes.position.needsUpdate = true;
    }

    // 2. Ambient cosmic dust lazy orbit
    if (this.ambientDust) {
      this.dustGroup.rotation.y = elapsed * 0.025;
      this.dustGroup.rotation.x = Math.sin(elapsed * 0.02) * 0.04;
    }

    // 3. Gentle orbit float for photos when not focused
    if (this.focusedCardIndex === -1 && !this.isFocusTransitioning) {
      // Gentle automatic rotation if not actively dragging
      if (!this.isDragging) {
        this.targetRotation.y += 0.002;
      }

      // Smooth damping interpolation
      this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.07;
      this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.07;
      this.zoomLevel += (this.targetZoom - this.zoomLevel) * 0.08;

      // Position camera based on orbit angles
      const phi = this.currentRotation.x;
      const theta = this.currentRotation.y;
      const r = this.zoomLevel;

      this.camera.position.x = r * Math.sin(theta) * Math.cos(phi);
      this.camera.position.y = CAMERA_DEFAULT_LOOKAT.y + r * Math.sin(phi);
      this.camera.position.z = r * Math.cos(theta) * Math.cos(phi);

      this.currentLookAt.copy(CAMERA_DEFAULT_LOOKAT);
      this.camera.lookAt(this.currentLookAt);
    } else if (this.isFocusTransitioning) {
      // 4. Smooth Camera Glide Transition (Cubic easeInOut)
      this.focusTransitionProgress += delta * 1.5;
      const t = Math.min(1.0, this.focusTransitionProgress);
      // Ease in-out cubic
      const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(this.cameraStartPos, this.cameraTargetPos, easeT);
      this.currentLookAt.lerpVectors(this.lookAtStart, this.lookAtTarget, easeT);
      this.camera.lookAt(this.currentLookAt);

      if (t >= 1.0) {
        this.isFocusTransitioning = false;
      }
    }

    // 5. Render
    this.renderer.render(this.scene, this.camera);
  }

  // --- Pointer & Touch Interactions ---
  _attachEvents() {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this._onPointerDown);
    dom.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    dom.addEventListener('wheel', this._onWheel, { passive: true });

    dom.addEventListener('touchstart', this._onTouchStart, { passive: false });
    dom.addEventListener('touchmove', this._onTouchMove, { passive: false });
    dom.addEventListener('touchend', this._onTouchEnd);

    window.addEventListener('resize', this._onResize);
    window.addEventListener('keydown', this._onKeyDown);
  }

  _detachEvents() {
    const dom = this.renderer?.domElement;
    if (dom) {
      dom.removeEventListener('pointerdown', this._onPointerDown);
      dom.removeEventListener('pointermove', this._onPointerMove);
      dom.removeEventListener('wheel', this._onWheel);
      dom.removeEventListener('touchstart', this._onTouchStart);
      dom.removeEventListener('touchmove', this._onTouchMove);
      dom.removeEventListener('touchend', this._onTouchEnd);
    }
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKeyDown);
  }

  _onPointerDown(e) {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.hasMoved = false;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  _onPointerMove(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (!this.isDragging) {
      this._checkHover();
      return;
    }

    const deltaX = e.clientX - this.previousMousePosition.x;
    const deltaY = e.clientY - this.previousMousePosition.y;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      this.hasMoved = true;
    }

    // If focused on an image, dragging pulls back to overview
    if (this.focusedCardIndex !== -1 && this.hasMoved) {
      this.resetFocus();
    }

    this.targetRotation.y += deltaX * 0.005;
    this.targetRotation.x = Math.max(-0.65, Math.min(0.65, this.targetRotation.x + deltaY * 0.004));

    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  _onPointerUp(e) {
    if (!this.isDragging) return;
    this.isDragging = false;

    // Click detected (not dragged)
    if (!this.hasMoved) {
      this._handleClick();
    }
  }

  _checkHover() {
    if (this.photoCards.length === 0 || this.focusedCardIndex !== -1) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.photoGroup.children, true);

    const isHovering = intersects.length > 0;
    document.body.style.cursor = isHovering ? 'pointer' : 'default';
  }

  _handleClick() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.photoGroup.children, true);

    if (intersects.length > 0) {
      let current = intersects[0].object;
      while (current && current.parent && current.parent !== this.photoGroup) {
        current = current.parent;
      }
      if (current && typeof current.userData?.index === 'number') {
        const clickedIndex = current.userData.index;
        if (this.focusedCardIndex === clickedIndex) {
          this.resetFocus();
        } else {
          this.focusPhoto(clickedIndex);
        }
        return;
      }
    }

    // Click on empty space
    if (this.focusedCardIndex !== -1) {
      this.resetFocus();
    }
  }

  _onWheel(e) {
    const zoomDelta = e.deltaY * 0.012;
    this.targetZoom = Math.max(7.5, Math.min(26.0, this.targetZoom + zoomDelta));
    if (this.focusedCardIndex !== -1) {
      this.resetFocus();
    }
  }

  _onTouchStart(e) {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.hasMoved = false;
      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.initialPinchDistance = Math.hypot(dx, dy);
    }
  }

  _onTouchMove(e) {
    if (e.touches.length === 1 && this.isDragging) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        this.hasMoved = true;
      }

      if (this.focusedCardIndex !== -1 && this.hasMoved) {
        this.resetFocus();
      }

      this.targetRotation.y += deltaX * 0.007;
      this.targetRotation.x = Math.max(-0.65, Math.min(0.65, this.targetRotation.x + deltaY * 0.005));
      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);

      if (this.initialPinchDistance > 0) {
        const pinchDelta = (this.initialPinchDistance - dist) * 0.03;
        this.targetZoom = Math.max(7.5, Math.min(26.0, this.targetZoom + pinchDelta));
      }
      this.initialPinchDistance = dist;
    }
  }

  _onTouchEnd(e) {
    if (e.touches.length === 0) {
      this.isDragging = false;
      this.initialPinchDistance = 0;
      if (!this.hasMoved && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        this._handleClick();
      }
    }
  }

  _onKeyDown(e) {
    if (e.key === 'Escape' && this.focusedCardIndex !== -1) {
      this.resetFocus();
    }
  }

  _onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this._detachEvents();
    this._clearPhotos();

    if (this.heartPoints) {
      this.heartPoints.geometry.dispose();
      this.heartPoints.material.dispose();
      this.heartGroup.remove(this.heartPoints);
      this.heartPoints = null;
    }

    if (this.ambientDust) {
      this.ambientDust.geometry.dispose();
      this.ambientDust.material.dispose();
      this.dustGroup.remove(this.ambientDust);
      this.ambientDust = null;
    }

    if (this.particleTexture) {
      this.particleTexture.dispose();
      this.particleTexture = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }

    this.container = null;
    this.scene = null;
    this.camera = null;
  }
}
