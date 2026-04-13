import * as THREE from 'three';
import { MODE_HEART, MODE_SCATTER } from './ParticleSystem.js';

const pointerUpScratch = new THREE.Vector2();

export class InteractionController {
  constructor({ camera, controls, domElement }) {
    this.camera = camera;
    this.controls = controls;
    this.domElement = domElement;
    this.particleSystem = null;

    this.pointer = new THREE.Vector2();
    this.pointerDown = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.dragThreshold = 6;
    this.focusMix = 0;
    this.defaultTarget = this.controls.target.clone();
    this.focusWorldPosition = new THREE.Vector3();
    this.focusCardSize = new THREE.Vector2(1, 1);
    this.desiredTarget = this.controls.target.clone();
    this.cameraOffset = new THREE.Vector3();
    this.desiredCameraPosition = new THREE.Vector3();
    this.defaultDistance = this.camera.position.distanceTo(this.controls.target);
    // Focus distance from photo card when one is clicked
    this.focusDistance = 5.6;
    // Additional focus zoom multiplier (1.5 = 1.5x bigger on screen)
    this.focusZoomMultiplier = 1.5;
    // Distance camera moves to when scatter opens (inside the gallery sphere)
    this.scatterCenterDist = 4.4;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);

    this.domElement.addEventListener('pointerdown', this.onPointerDown, {
      passive: true,
    });
    this.domElement.addEventListener('pointerup', this.onPointerUp, {
      passive: true,
    });
  }

  setParticleSystem(particleSystem) {
    this.particleSystem = particleSystem;
    if (!particleSystem) {
      this.focusMix = 0;
      this.controls.target.copy(this.defaultTarget);
      this.controls.minDistance = 6;
      this.controls.maxDistance = 30;
    }
  }

  onPointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    this.pointerDown.set(event.clientX, event.clientY);
  }

  onPointerUp(event) {
    if (event.button !== 0 || !this.particleSystem) {
      return;
    }

    pointerUpScratch.set(event.clientX, event.clientY);
    const clickDistance = this.pointerDown.distanceTo(pointerUpScratch);
    if (clickDistance > this.dragThreshold) {
      return;
    }

    this.handleClick(event);
  }

  handleClick(event) {
    const hit = this.pickPhotoHit(event);
    if (hit) {
      // Clicking a photo card: ensure scatter is open, focus that card
      this.particleSystem.setMode(MODE_SCATTER);
      this.particleSystem.focusPhotoFromHit(hit);
      return;
    }

    if (this.particleSystem.hasFocusedParticle()) {
      // Clear focus first, stay in scatter so gallery remains visible
      this.particleSystem.clearFocus();
      return;
    }

    // Clicking the heart cloud → open scatter gallery
    // Clicking the background while in scatter → return to heart
    if (this.particleSystem.mode === MODE_HEART) {
      this.particleSystem.setMode(MODE_SCATTER);
    } else {
      this.particleSystem.setMode(MODE_HEART);
    }
  }

  pickPhotoHit(event) {
    const photoObjects = this.particleSystem.getInteractivePhotoObjects();
    if (!photoObjects.length) {
      return null;
    }

    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hits = this.raycaster.intersectObjects(photoObjects, false);
    if (!hits.length) {
      return null;
    }

    return hits[0];
  }

  update(delta) {
    if (!this.particleSystem) {
      return;
    }

    const scatterMix = this.particleSystem ? this.particleSystem.scatterMix : 0;
    const hasFocus = this.particleSystem.hasFocusedParticle();
    this.focusMix = THREE.MathUtils.damp(this.focusMix, hasFocus ? 1 : 0, 4.8, delta);

    // Camera target: moves toward focused photo when one is selected
    if (
      hasFocus &&
      this.particleSystem.getFocusedWorldPosition(this.focusWorldPosition)
    ) {
      // Fully lock camera target onto the focused photo card
      this.desiredTarget
        .copy(this.defaultTarget)
        .lerp(this.focusWorldPosition, this.focusMix);
    } else {
      this.desiredTarget.copy(this.defaultTarget);
    }

    this.controls.target.lerp(
      this.desiredTarget,
      1 - Math.exp(-delta * 7),
    );

    // Camera distance:
    //  Heart mode (scatterMix=0) → defaultDistance (~14) — wide view of heart
    //  Scatter mode (scatterMix=1) → scatterCenterDist — inside the gallery sphere
    //  Photo focused → auto-fit distance for the current card size/aspect
    const distBase = THREE.MathUtils.lerp(this.defaultDistance, this.scatterCenterDist, scatterMix);
    let focusFitDistance = this.focusDistance;
    if (hasFocus && this.particleSystem.getFocusedCardSize(this.focusCardSize)) {
      const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
      const fitPadding = 1.18;
      const verticalFitDistance =
        (this.focusCardSize.y * 0.5 * fitPadding) / Math.tan(fovRad * 0.5);
      const horizontalFitDistance =
        (this.focusCardSize.x * 0.5 * fitPadding) /
        (Math.tan(fovRad * 0.5) * Math.max(0.1, this.camera.aspect));
      focusFitDistance = Math.max(this.focusDistance, verticalFitDistance, horizontalFitDistance);
    }
    const zoomedFocusDistance = Math.max(1.2, focusFitDistance / this.focusZoomMultiplier);
    const desiredDistance = THREE.MathUtils.lerp(distBase, zoomedFocusDistance, this.focusMix);

    this.cameraOffset.copy(this.camera.position).sub(this.controls.target);
    if (this.cameraOffset.lengthSq() < 0.0001) {
      this.cameraOffset.set(0, 0, 1);
    }
    this.cameraOffset.normalize().multiplyScalar(desiredDistance);
    this.desiredCameraPosition.copy(this.controls.target).add(this.cameraOffset);
    this.camera.position.lerp(
      this.desiredCameraPosition,
      1 - Math.exp(-delta * 4.8),
    );

    // Allow close approach in scatter / focus; open up in heart mode
    this.controls.minDistance = THREE.MathUtils.lerp(6, 0.8, Math.max(scatterMix, this.focusMix));
    this.controls.maxDistance = THREE.MathUtils.lerp(30, 8, scatterMix);
  }
}

