import * as THREE from 'three';

const tempTarget = new THREE.Vector3();
const tempRadial = new THREE.Vector3();
const EPSILON = 0.000001;

function fract(value) {
  return value - Math.floor(value);
}

function seeded(index, offset) {
  return fract(Math.sin(index * 127.1 + offset * 311.7) * 43758.5453123);
}

export class Particle {
  constructor({
    baseScale,
    color,
    index,
    isKeyParticle = false,
    posHeart,
    posScatter,
  }) {
    this.index = index;
    this.posHeart = posHeart.clone();
    this.posScatter = posScatter.clone();
    this.position = this.posHeart.clone();
    this.renderPosition = this.posHeart.clone();
    this.photoAnchor = this.posHeart.clone();

    this.baseScale = baseScale;
    this.color = color.clone();
    this.isKeyParticle = isKeyParticle;

    this.floatAmplitude = 0.02 + seeded(index, 2.3) * 0.1;
    this.floatSpeed = 0.8 + seeded(index, 4.1) * 1.65;
    this.phase = seeded(index, 5.4) * Math.PI * 2;
    this.lerpSpeed = 4.6 + seeded(index, 8.2) * 2.2;

    this.rotation = new THREE.Vector3(
      seeded(index, 12.1) * Math.PI * 2,
      seeded(index, 13.2) * Math.PI * 2,
      seeded(index, 14.3) * Math.PI * 2,
    );
    this.rotationVelocity = new THREE.Vector3(
      (seeded(index, 10.2) - 0.5) * 1.35,
      (seeded(index, 11.7) - 0.5) * 1.45,
      (seeded(index, 12.8) - 0.5) * 1.35,
    );

    this.focused = false;
    this.focusMix = 0;

    this.scale = baseScale;
    this.shimmer = 1;
    this.photoScale = 0.26;
    this.photoOpacity = 0.52;
    this.hasPhoto = false;
  }

  setFocused(focused) {
    this.focused = focused;
  }

  update(delta, elapsed, scatterMix, globalFocusMix = 0) {
    tempTarget.copy(this.posHeart).lerp(this.posScatter, scatterMix);
    const lerpFactor = 1 - Math.exp(-delta * this.lerpSpeed);
    this.position.lerp(tempTarget, lerpFactor);

    const floatingOffset =
      Math.sin(elapsed * this.floatSpeed + this.phase) *
      this.floatAmplitude *
      (0.35 + scatterMix * 0.7);
    this.renderPosition.set(
      this.position.x,
      this.position.y + floatingOffset,
      this.position.z,
    );

    this.rotation.x += this.rotationVelocity.x * delta;
    this.rotation.y += this.rotationVelocity.y * delta;
    this.rotation.z += this.rotationVelocity.z * delta;

    this.focusMix = THREE.MathUtils.damp(
      this.focusMix,
      this.focused ? 1 : 0,
      6.3,
      delta,
    );

    const pulse =
      1 +
      0.08 * Math.sin(elapsed * (2.1 + this.floatSpeed) + this.phase) +
      0.035 * Math.sin(elapsed * (4.3 + this.floatSpeed * 0.25) + this.phase * 1.7);
    this.scale =
      this.baseScale *
      THREE.MathUtils.lerp(0.98, 1.5, scatterMix) *
      pulse *
      (1 - this.focusMix * 0.2);

    this.shimmer =
      1 +
      (0.08 + (this.isKeyParticle ? 0.06 : 0)) *
        Math.sin(elapsed * (1.5 + this.floatSpeed) + this.phase * 0.7);

    tempRadial.copy(this.position);
    if (tempRadial.lengthSq() < EPSILON) {
      tempRadial.set(
        seeded(this.index, 20.1) * 2 - 1,
        seeded(this.index, 21.1) * 2 - 1,
        seeded(this.index, 22.1) * 2 - 1,
      );
    }
    tempRadial.normalize();

    const photoOffset = THREE.MathUtils.lerp(0.34, 1.05, scatterMix) + this.focusMix * 0.34;
    this.photoAnchor
      .copy(this.renderPosition)
      .addScaledVector(tempRadial, photoOffset);
    this.photoAnchor.y += this.focusMix * 0.1;

    const photoScaleBase = THREE.MathUtils.lerp(0.26, 0.88, scatterMix);
    const focusedScale = photoScaleBase * (1 + this.focusMix * 1.65);
    this.photoScale = Math.min(2.8, focusedScale);

    const scatterShow = Math.min(1.0, Math.max(0.0, (scatterMix - 0.2) / 0.5));
    const unfocusedFade = globalFocusMix * (1 - this.focusMix) * 0.35;
    this.photoOpacity = scatterShow * 0.96 * (1.0 - unfocusedFade);
  }

  getFocusLocalPosition(target) {
    return target.copy(this.photoAnchor);
  }
}

