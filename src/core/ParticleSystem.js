import * as THREE from 'three';
import { Particle } from './Particle.js';
import {
  generateHeartPositions,
  generateScatterPositions,
  generatePhotoScatterPositions,
} from './heartDistribution.js';

export const MODE_HEART = 'HEART';
export const MODE_SCATTER = 'SCATTER';

const textureLoader = new THREE.TextureLoader();
const tempColor = new THREE.Color();
const tempWorldQuaternion = new THREE.Quaternion();
const tempInverseWorldQuaternion = new THREE.Quaternion();
const tempCameraLocalQuaternion = new THREE.Quaternion();
const tempFocusLocal = new THREE.Vector3();
const tempPhotoPos = new THREE.Vector3();
const tempWorldScale = new THREE.Vector3();

function computePolaroidFrame(aspect) {
  const portraitMix = THREE.MathUtils.clamp((1 - aspect) / 0.7, 0, 1);
  const landscapeMix = THREE.MathUtils.clamp((aspect - 1) / 1.4, 0, 1);

  // Dynamic frame only: photo content/aspect remains untouched.
  const sideBase = THREE.MathUtils.lerp(0.056, 0.048, landscapeMix);
  const side = THREE.MathUtils.lerp(sideBase, 0.058, portraitMix);
  const top = THREE.MathUtils.lerp(0.054, 0.046, landscapeMix);
  const bottomBase = THREE.MathUtils.lerp(0.145, 0.115, landscapeMix);
  const bottom = THREE.MathUtils.lerp(bottomBase, 0.13, portraitMix);

  const innerW = Math.max(0.2, 1 - side - side);
  const innerH = Math.max(0.2, 1 - top - bottom);

  return {
    left: side,
    right: side,
    top,
    bottom,
    cardAspectFactor: innerH / innerW,
  };
}

function fract(value) {
  return value - Math.floor(value);
}

function hash(seed) {
  return fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453123);
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    textureLoader.load(url, resolve, undefined, reject);
  });
}

function styleForIndex(index) {
  const seed = hash(index * 1.19 + 7.3);

  if (seed < 0.16) {
    return {
      color: new THREE.Color().setHSL(
        0.11 + hash(index * 0.7 + 1.2) * 0.035,
        0.82,
        0.68 + hash(index * 1.9 + 3.4) * 0.08,
      ),
      isKeyParticle: true,
    };
  }

  if (seed < 0.31) {
    return {
      color: new THREE.Color().setHSL(
        0.01 + hash(index * 2.4 + 5.1) * 0.02,
        0.78,
        0.62 + hash(index * 2.7 + 1.8) * 0.09,
      ),
      isKeyParticle: true,
    };
  }

  if (seed < 0.46) {
    return {
      color: new THREE.Color().setHSL(
        0.97 + hash(index * 1.6 + 9.7) * 0.024,
        0.72,
        0.84 + hash(index * 3.2 + 0.4) * 0.1,
      ),
      isKeyParticle: true,
    };
  }

  return {
    color: new THREE.Color().setHSL(
      0.95 + hash(index * 1.4 + 2.2) * 0.05,
      0.7 + hash(index * 2.9 + 7.6) * 0.16,
      0.54 + hash(index * 3.8 + 5.5) * 0.14,
    ),
    isKeyParticle: false,
  };
}

function pickPhotoSlotIndices(positions, textureCount) {
  if (!textureCount) {
    return [];
  }

  // Exactly one particle slot per uploaded photo — no duplication
  const desiredSlots = Math.min(positions.length, textureCount);

  // Weight particles by visibility (forward-facing, spread across the heart)
  const weighted = positions
    .map((position, index) => ({
      index,
      score:
        position.z * 1.4 +
        position.y * 0.18 -
        Math.abs(position.x) * 0.12 +
        (hash(index * 1.91) - 0.5) * 0.45,
    }))
    .sort((a, b) => b.score - a.score);

  const selected = [];
  const stride = Math.max(1, Math.floor(weighted.length / desiredSlots));
  for (let i = 0; i < weighted.length && selected.length < desiredSlots; i += stride) {
    selected.push(weighted[i].index);
  }

  for (let i = 0; i < weighted.length && selected.length < desiredSlots; i += 1) {
    const candidate = weighted[i].index;
    if (!selected.includes(candidate)) {
      selected.push(candidate);
    }
  }

  return selected;
}

function createPhotoAtlas(textures, maxTextureSize = 8192) {
  if (!textures.length) {
    return null;
  }

  const tileCount = textures.length;
  const gridSize = Math.ceil(Math.sqrt(tileCount));
  const maxSourceEdge = textures.reduce((max, texture) => {
    const image = texture.image;
    if (!image) {
      return max;
    }
    return Math.max(max, image.width || 0, image.height || 0);
  }, 0);
  const maxAtlasEdge = Math.max(2048, maxTextureSize);
  const maxCellByAtlas = Math.max(256, Math.floor(maxAtlasEdge / gridSize));
  const desiredCell = Math.max(320, Math.round(maxSourceEdge));
  const maxCellByCount = tileCount <= 4 ? 2048 : tileCount <= 16 ? 1536 : 1024;
  const cellSize = Math.max(256, Math.min(desiredCell, maxCellByAtlas, maxCellByCount));
  const canvas = document.createElement('canvas');
  canvas.width = gridSize * cellSize;
  canvas.height = gridSize * cellSize;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context unavailable for photo atlas.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const tiles = [];

  for (let i = 0; i < tileCount; i += 1) {
    const texture = textures[i];
    const image = texture.image;
    if (!image) {
      continue;
    }

    const col = i % gridSize;
    const row = Math.floor(i / gridSize);
    const x = col * cellSize;
    const y = row * cellSize;
    const gutter = 1;
    const availableWidth = cellSize - gutter * 2;
    const availableHeight = cellSize - gutter * 2;

    const scale = Math.min(
      1,
      availableWidth / Math.max(1, image.width),
      availableHeight / Math.max(1, image.height),
    );
    const drawWidth = Math.max(1, Math.round(image.width * scale));
    const drawHeight = Math.max(1, Math.round(image.height * scale));
    const drawX = x + Math.round((cellSize - drawWidth) * 0.5);
    const drawY = y + Math.round((cellSize - drawHeight) * 0.5);

    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    tiles.push({
      aspect: image.width / Math.max(1, image.height),
      uvOffsetX: drawX / canvas.width,
      uvOffsetY: drawY / canvas.height,
      uvScaleX: drawWidth / canvas.width,
      uvScaleY: drawHeight / canvas.height,
    });
  }

  const atlasTexture = new THREE.CanvasTexture(canvas);
  atlasTexture.colorSpace = THREE.SRGBColorSpace;
  atlasTexture.wrapS = THREE.ClampToEdgeWrapping;
  atlasTexture.wrapT = THREE.ClampToEdgeWrapping;
  atlasTexture.generateMipmaps = false;
  atlasTexture.minFilter = THREE.LinearFilter;
  atlasTexture.magFilter = THREE.LinearFilter;
  // anisotropy applied in createPhotoInstances once we have the value
  atlasTexture.needsUpdate = true;

  return {
    texture: atlasTexture,
    tiles,
  };
}

function createPhotoMaterial(atlasTexture) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      atlasMap: { value: atlasTexture },
    },
    vertexShader: `
      attribute vec2 uvOffset;
      attribute vec2 uvScale;
      attribute vec4 frameInset;
      attribute float alphaFactor;
      attribute vec3 tint;

      varying vec2 vUvLocal;
      varying float vAlpha;
      varying vec3 vTint;
      varying vec2 vUvOff;
      varying vec2 vUvScl;
      varying vec4 vFrameInset;

      void main() {
        vUvLocal = uv;
        vUvOff   = uvOffset;
        vUvScl   = uvScale;
        vFrameInset = frameInset;
        vAlpha   = alphaFactor;
        vTint    = tint;

        vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
        gl_Position   = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform sampler2D atlasMap;

      varying vec2 vUvLocal;   // 0..1 over the whole card
      varying float vAlpha;
      varying vec3 vTint;
      varying vec2 vUvOff;     // atlas tile offset
      varying vec2 vUvScl;     // atlas tile scale
      varying vec4 vFrameInset;

      // ── Helpers ────────────────────────────────────────────────────────────

      // Rounded-rect signed distance (uv in [0,1]², radius in UV units)
      float roundedBoxSDF(vec2 uv, float radius) {
        vec2 q = abs(uv - 0.5) - (0.5 - radius);
        return length(max(q, 0.0)) - radius;
      }

      // Cheap hash-based grain (paper texture)
      float grain(vec2 uv, float scale) {
        vec2 p = floor(uv * scale);
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        float bl = vFrameInset.x;   // left inset
        float br = vFrameInset.y;   // right inset
        float bt = vFrameInset.z;   // top inset
        float bb = vFrameInset.w;   // bottom inset

        // ── Card rounded corners ─────────────────────────────────────────────
        float cardRadius = 0.018;
        float sdf = roundedBoxSDF(vUvLocal, cardRadius);
        float cardAlpha = smoothstep(0.008, -0.004, sdf);

        // ── Photo region mask ────────────────────────────────────────────────
        // UV origin is bottom-left: y=0 bottom, y=1 top.
        float inPhoto = step(bl, vUvLocal.x) *
                        step(br, 1.0 - vUvLocal.x) *
                        step(bb, vUvLocal.y) *
                        step(bt, 1.0 - vUvLocal.y);

        // ── Photo UV → atlas UV (no aspect-ratio distortion) ─────────────────
        // The inner window [bl,1-br]×[bt,1-bb] maps linearly to [0,1]²,
        // then we look up the exact letterboxed region in the atlas.
        vec2 photoUV = clamp(vec2(
          (vUvLocal.x - bl) / max(0.001, 1.0 - bl - br),
          (vUvLocal.y - bb) / max(0.001, 1.0 - bt - bb)
        ), 0.0, 1.0);
        vec4 photo = texture2D(atlasMap, vUvOff + photoUV * vUvScl);

        // ── Inner shadow at photo edges (subtle depth) ────────────────────────
        float photoEdgeX = min(vUvLocal.x - bl, (1.0 - br) - vUvLocal.x);
        float photoEdgeY = min(vUvLocal.y - bb, (1.0 - bt) - vUvLocal.y);
        float photoEdgeDist = min(photoEdgeX, photoEdgeY) * inPhoto;
        float innerShadow = 1.0 - (1.0 - smoothstep(0.0, 0.032, photoEdgeDist)) * 0.16;

        // ── Frame paper color + tint ──────────────────────────────────────────
        // Warm off-white with subtle variation per card
        vec3 paperBase = vec3(0.985, 0.978, 0.958);
        vec3 frameColor = paperBase + vTint * 0.04;

        // Subtle paper grain on the frame border area
        float g = grain(vUvLocal, 420.0) * (1.0 - inPhoto) * 0.022;
        frameColor += vec3(g);

        // Soft vignette on frame edges (gives the card slight depth)
        float edgeDist = min(
          min(vUvLocal.x, 1.0 - vUvLocal.x),
          min(vUvLocal.y, 1.0 - vUvLocal.y)
        );
        float frameVig = 1.0 - (1.0 - smoothstep(0.0, 0.07, edgeDist)) * 0.09;
        frameColor *= frameVig;

        // Bottom border slightly darker for classic Polaroid look
        float bottomRegion =
          (1.0 - inPhoto) *
          (1.0 - smoothstep(bb, bb + 0.028, vUvLocal.y));
        frameColor = mix(frameColor, frameColor * 0.93, bottomRegion * 0.6);

        // ── Composite ────────────────────────────────────────────────────────
        vec3 finalColor = mix(frameColor, photo.rgb * innerShadow, inPhoto);
        gl_FragColor = vec4(finalColor, cardAlpha * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  material.toneMapped = false;
  return material;
}

export async function loadPhotoTextures(imageDataUrls, anisotropy = 1) {
  const loadResults = await Promise.allSettled(
    imageDataUrls.map((url) => loadTexture(url)),
  );

  const textures = [];
  for (const result of loadResults) {
    if (result.status !== 'fulfilled') {
      continue;
    }

    const texture = result.value;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = anisotropy;
    textures.push(texture);
  }

  return textures;
}

export class ParticleSystem {
  constructor(
    mainGroup,
    {
      particleCount = 4200,
      photoTextures = [],
      anisotropy = 1,
      maxTextureSize = 8192,
    } = {},
  ) {
    this.mainGroup = mainGroup;
    this.group = new THREE.Group();
    this.mainGroup.add(this.group);

    this.mode = MODE_HEART;
    this.scatterMix = 0;
    this.focusedParticle = null;
    this.focusedPhotoInstance = -1;
    this.photoTextures = photoTextures;
    this.anisotropy = anisotropy;
    this.maxTextureSize = maxTextureSize;
    this.particles = [];

    this.instanceDummy = new THREE.Object3D();
    this.photoDummy = new THREE.Object3D();

    this.photoMesh = null;
    this.photoMaterial = null;
    this.photoGeometry = null;
    this.photoAtlasTexture = null;
    this.photoInstances = [];
    this.photoInstanceParticleIndices = [];
    this.photoAlphaAttribute = null;
    // Dedicated Fibonacci-sphere positions for each photo in scatter mode
    this.photoScatterPositions = [];

    this.dust = null;
    this.dustGeometry = null;
    this.dustMaterial = null;
    this.dustBasePositions = null;
    this.dustDriftAmplitude = null;
    this.dustDriftSpeed = null;
    this.dustDriftPhase = null;

    const structuredPositions = generateHeartPositions(particleCount, {
      radius: 11.4,
      thickness: 7.2,
    });
    const scatterPositions = generateScatterPositions(structuredPositions);

    this.createParticleInstances(structuredPositions, scatterPositions);
    this.createPhotoInstances(structuredPositions, photoTextures);
    this.createDustField(1200);
  }

  createParticleInstances(structuredPositions, scatterPositions) {
    const count = structuredPositions.length;

    this.particleGeometry = new THREE.IcosahedronGeometry(0.078, 0);
    this.particleMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xff90c6),
      emissiveIntensity: 0.65,
      metalness: 0.8,
      roughness: 0.24,
      vertexColors: true,
    });
    this.particleMesh = new THREE.InstancedMesh(
      this.particleGeometry,
      this.particleMaterial,
      count,
    );
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    this.particleMesh.layers.enable(1); // bloom layer — particles glow
    this.group.add(this.particleMesh);

    for (let i = 0; i < count; i += 1) {
      const style = styleForIndex(i);
      const particle = new Particle({
        baseScale: 0.42 + hash(i * 3.13) * 0.62,
        color: style.color,
        index: i,
        isKeyParticle: style.isKeyParticle,
        posHeart: structuredPositions[i],
        posScatter: scatterPositions[i],
      });

      this.particles.push(particle);
      this.particleMesh.setColorAt(i, style.color);

      this.instanceDummy.position.copy(particle.renderPosition);
      this.instanceDummy.rotation.set(
        particle.rotation.x,
        particle.rotation.y,
        particle.rotation.z,
      );
      this.instanceDummy.scale.setScalar(particle.scale);
      this.instanceDummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.instanceDummy.matrix);
    }

    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  createPhotoInstances(structuredPositions, photoTextures) {
    if (!photoTextures.length) {
      return;
    }

    const slotIndices = pickPhotoSlotIndices(structuredPositions, photoTextures.length);
    if (!slotIndices.length) {
      return;
    }

    const atlas = createPhotoAtlas(photoTextures, this.maxTextureSize);
    if (!atlas || !atlas.tiles.length) {
      return;
    }

    this.photoAtlasTexture = atlas.texture;
    // Apply anisotropy for sharp texture at oblique angles
    this.photoAtlasTexture.anisotropy = this.anisotropy;
    this.photoAtlasTexture.needsUpdate = true;
    const instanceCount = slotIndices.length;

    // Build one dedicated scatter position per photo (Fibonacci sphere, 360°)
    this.photoScatterPositions = generatePhotoScatterPositions(instanceCount);

    this.photoGeometry = new THREE.PlaneGeometry(1, 1);
    const uvOffsetAttribute = new THREE.InstancedBufferAttribute(
      new Float32Array(instanceCount * 2),
      2,
    );
    const uvScaleAttribute = new THREE.InstancedBufferAttribute(
      new Float32Array(instanceCount * 2),
      2,
    );
    const frameInsetAttribute = new THREE.InstancedBufferAttribute(
      new Float32Array(instanceCount * 4),
      4,
    );
    const alphaAttribute = new THREE.InstancedBufferAttribute(
      new Float32Array(instanceCount),
      1,
    );
    const tintAttribute = new THREE.InstancedBufferAttribute(
      new Float32Array(instanceCount * 3),
      3,
    );

    this.photoGeometry.setAttribute('uvOffset', uvOffsetAttribute);
    this.photoGeometry.setAttribute('uvScale', uvScaleAttribute);
    this.photoGeometry.setAttribute('frameInset', frameInsetAttribute);
    this.photoGeometry.setAttribute('alphaFactor', alphaAttribute);
    this.photoGeometry.setAttribute('tint', tintAttribute);

    this.photoMaterial = createPhotoMaterial(this.photoAtlasTexture);
    this.photoMesh = new THREE.InstancedMesh(
      this.photoGeometry,
      this.photoMaterial,
      instanceCount,
    );
    this.photoMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.photoMesh.frustumCulled = false;
    this.photoMesh.renderOrder = 2;
    this.photoMesh.layers.set(0); // keep photos out of bloom-only layer
    this.group.add(this.photoMesh);

    this.photoAlphaAttribute = alphaAttribute;
    this.photoInstanceParticleIndices = new Int32Array(instanceCount);

    for (let i = 0; i < instanceCount; i += 1) {
      const particleIndex = slotIndices[i];
      const particle = this.particles[particleIndex];
      const tile = atlas.tiles[i % atlas.tiles.length];

      const aspect = Math.max(0.05, tile.aspect);
      const frame = computePolaroidFrame(aspect);
      // cardAspect = physical width/height of the full Polaroid card.
      // aspect × frame.cardAspectFactor = aspect × (innerH/innerW)
      // which is the card ratio that preserves the image aspect without distortion.
      const cardAspect = Math.max(0.05, aspect * frame.cardAspectFactor);

      this.photoInstances.push({
        aspect,
        cardAspect,
        instanceId: i,
        particleIndex,
      });
      this.photoInstanceParticleIndices[i] = particleIndex;
      particle.hasPhoto = true;

      uvOffsetAttribute.setXY(i, tile.uvOffsetX, tile.uvOffsetY);
      uvScaleAttribute.setXY(i, tile.uvScaleX, tile.uvScaleY);
      frameInsetAttribute.setXYZW(i, frame.left, frame.right, frame.top, frame.bottom);

      tempColor.setHSL(
        0.94 + hash(i * 0.73 + 1.8) * 0.08,
        0.5,
        0.78,
      );
      tintAttribute.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
      alphaAttribute.setX(i, 0);

      this.photoDummy.position.copy(particle.photoAnchor);
      this.photoDummy.quaternion.identity();
      // cardAspect = physicalWidth / physicalHeight of the full Polaroid card.
      // Scale so height = photoScale and width = photoScale × cardAspect.
      // This preserves the image aspect ratio for ALL orientations.
      const widthScale = particle.photoScale * cardAspect;
      const heightScale = particle.photoScale;
      this.photoDummy.scale.set(
        widthScale,
        heightScale,
        1,
      );
      this.photoDummy.updateMatrix();
      this.photoMesh.setMatrixAt(i, this.photoDummy.matrix);
    }

    uvOffsetAttribute.needsUpdate = true;
    uvScaleAttribute.needsUpdate = true;
    frameInsetAttribute.needsUpdate = true;
    tintAttribute.needsUpdate = true;
    alphaAttribute.needsUpdate = true;
    this.photoMesh.instanceMatrix.needsUpdate = true;
  }

  setMode(mode) {
    this.mode = mode === MODE_SCATTER ? MODE_SCATTER : MODE_HEART;
    if (this.mode === MODE_HEART) {
      this.clearFocus();
    }
  }

  toggleMode() {
    this.setMode(this.mode === MODE_HEART ? MODE_SCATTER : MODE_HEART);
  }

  update(delta, elapsed, camera) {
    const targetMix = this.mode === MODE_SCATTER ? 1 : 0;
    this.scatterMix = THREE.MathUtils.damp(this.scatterMix, targetMix, 3.9, delta);

    this.group.rotation.x = THREE.MathUtils.damp(
      this.group.rotation.x,
      this.mode === MODE_SCATTER ? 0.08 : -0.1,
      2.15,
      delta,
    );
    this.group.rotation.z = THREE.MathUtils.damp(this.group.rotation.z, 0, 2.3, delta);
    this.group.rotation.y += delta * (0.05 + this.scatterMix * 0.045);

    const globalFocusMix = this.focusedParticle ? 1 : 0;
    this.particleMaterial.emissiveIntensity =
      0.64 + Math.sin(elapsed * 0.8) * 0.05 + this.scatterMix * 0.1;

    for (let i = 0; i < this.particles.length; i += 1) {
      const particle = this.particles[i];
      particle.update(delta, elapsed, this.scatterMix, globalFocusMix);

      this.instanceDummy.position.copy(particle.renderPosition);
      this.instanceDummy.rotation.set(
        particle.rotation.x,
        particle.rotation.y,
        particle.rotation.z,
      );
      this.instanceDummy.scale.setScalar(particle.scale * particle.shimmer);
      this.instanceDummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.instanceDummy.matrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;

    this.updatePhotoInstances(camera);
    this.updateDust(delta, elapsed);
  }

  updatePhotoInstances(camera) {
    if (!this.photoMesh || !this.photoInstances.length || !this.photoAlphaAttribute) {
      return;
    }

    this.group.getWorldQuaternion(tempWorldQuaternion);
    tempInverseWorldQuaternion.copy(tempWorldQuaternion).invert();
    tempCameraLocalQuaternion.copy(tempInverseWorldQuaternion).multiply(camera.quaternion);

    const photoCount = this.photoInstances.length;
    const scatterScaleMultiplier = 2.0;
    const scatterCardScale =
      Math.max(0.52, 0.88 - photoCount * 0.007) * scatterScaleMultiplier;

    // Is any photo focused? (used for dimming the rest)
    const anyFocused = this.focusedPhotoInstance >= 0;

    for (const info of this.photoInstances) {
      const particle = this.particles[info.particleIndex];
      const scatterPos = this.photoScatterPositions[info.instanceId];

      // Position: lerp heart anchor → dedicated Fibonacci sphere position
      tempPhotoPos.copy(particle.photoAnchor).lerp(scatterPos, this.scatterMix);

      // Scale: in scatter, cards are larger; focused card gets a gentler boost
      const heartScale = Math.min(2.8, particle.photoScale);
      const focusBoost = 1.0 + particle.focusMix * 0.9;           // 1× → 1.9×
      const targetScatter = Math.min(3.8, scatterCardScale * focusBoost);
      const finalScale = THREE.MathUtils.lerp(heartScale, targetScatter, this.scatterMix);
      // Scale: width = finalScale × cardAspect, height = finalScale.
      // cardAspect encodes the full Polaroid proportions (image aspect + border geometry),
      // so this always produces an undistorted card for any image orientation.
      const widthScale = finalScale * info.cardAspect;
      const heightScale = finalScale;

      this.photoDummy.position.copy(tempPhotoPos);
      this.photoDummy.quaternion.copy(tempCameraLocalQuaternion);
      this.photoDummy.scale.set(
        widthScale,
        heightScale,
        1,
      );
      this.photoDummy.updateMatrix();
      this.photoMesh.setMatrixAt(info.instanceId, this.photoDummy.matrix);

      // Opacity: fade in on scatter, dim unfocused cards when one is selected
      const scatterOpacity = Math.min(1.0, Math.max(0.0, (this.scatterMix - 0.08) / 0.45));
      const baseOpacity = Math.max(particle.photoOpacity, scatterOpacity * 0.97);
      const dimFactor = anyFocused ? THREE.MathUtils.lerp(0.22, 1.0, particle.focusMix) : 1.0;
      this.photoAlphaAttribute.setX(info.instanceId, baseOpacity * dimFactor);
    }

    this.photoMesh.instanceMatrix.needsUpdate = true;
    this.photoAlphaAttribute.needsUpdate = true;
  }

  getInteractivePhotoObjects() {
    return this.photoMesh ? [this.photoMesh] : [];
  }

  focusPhotoFromHit(hit) {
    if (!hit || hit.object !== this.photoMesh || hit.instanceId == null) {
      return;
    }

    const particleIndex = this.photoInstanceParticleIndices[hit.instanceId];
    const particle = this.particles[particleIndex];
    if (!particle) {
      return;
    }

    this.focusedPhotoInstance = hit.instanceId;
    this.setFocusedParticle(particle);
  }

  setFocusedParticle(particle) {
    this.focusedParticle = particle;
    for (const item of this.particles) {
      item.setFocused(item === particle);
    }
  }

  clearFocus() {
    this.focusedParticle = null;
    this.focusedPhotoInstance = -1;
    for (const item of this.particles) {
      item.setFocused(false);
    }
  }

  hasFocusedParticle() {
    return Boolean(this.focusedParticle);
  }

  getFocusedCardSize(target) {
    if (this.focusedPhotoInstance < 0) {
      return null;
    }
    const info = this.photoInstances[this.focusedPhotoInstance];
    if (!info) {
      return null;
    }

    const focusParticle = this.particles[info.particleIndex];
    if (!focusParticle) {
      return null;
    }

    const photoCount = this.photoInstances.length;
    const scatterScaleMultiplier = 2.0;
    const scatterCardScale =
      Math.max(0.52, 0.88 - photoCount * 0.007) * scatterScaleMultiplier;
    const heartScale = Math.min(2.8, focusParticle.photoScale);
    const focusBoost = 1.0 + focusParticle.focusMix * 0.9;
    const targetScatter = Math.min(3.8, scatterCardScale * focusBoost);
    const finalScale = THREE.MathUtils.lerp(heartScale, targetScatter, this.scatterMix);

    const widthScale = finalScale * info.cardAspect;
    const heightScale = finalScale;

    this.group.getWorldScale(tempWorldScale);
    target.set(
      Math.abs(widthScale * tempWorldScale.x),
      Math.abs(heightScale * tempWorldScale.y),
    );
    return target;
  }

  getFocusedWorldPosition(target) {
    if (!this.focusedParticle) {
      return null;
    }

    // In scatter mode, use the actual Fibonacci sphere position of the photo card
    // (not the heart-particle anchor — the card has moved to its gallery slot)
    if (this.scatterMix > 0.05 && this.focusedPhotoInstance >= 0) {
      const scatterPos = this.photoScatterPositions[this.focusedPhotoInstance];
      if (scatterPos) {
        tempFocusLocal.copy(scatterPos);
        return this.group.localToWorld(target.copy(tempFocusLocal));
      }
    }

    this.focusedParticle.getFocusLocalPosition(tempFocusLocal);
    target.copy(tempFocusLocal);
    return this.group.localToWorld(target);
  }

  createDustField(count) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    this.dustBasePositions = new Float32Array(count * 3);
    this.dustDriftAmplitude = new Float32Array(count);
    this.dustDriftSpeed = new Float32Array(count);
    this.dustDriftPhase = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const direction = new THREE.Vector3(
        hash(i * 0.67 + 3.1) * 2 - 1,
        hash(i * 1.11 + 6.2) * 2 - 1,
        hash(i * 1.57 + 9.3) * 2 - 1,
      ).normalize();
      const distance = 8 + hash(i * 2.03 + 2.4) * 18;
      const offset = i * 3;

      const x = direction.x * distance;
      const y = direction.y * distance * 0.86;
      const z = direction.z * distance;

      positions[offset] = x;
      positions[offset + 1] = y;
      positions[offset + 2] = z;
      this.dustBasePositions[offset] = x;
      this.dustBasePositions[offset + 1] = y;
      this.dustBasePositions[offset + 2] = z;

      tempColor.setHSL(
        THREE.MathUtils.lerp(0.95, 0.12, hash(i * 0.83 + 5.9) * 0.42),
        0.56 + hash(i * 1.73 + 4.5) * 0.22,
        0.66 + hash(i * 2.41 + 1.8) * 0.2,
      );
      colors[offset] = tempColor.r;
      colors[offset + 1] = tempColor.g;
      colors[offset + 2] = tempColor.b;

      this.dustDriftAmplitude[i] = 0.05 + hash(i * 3.3 + 7.1) * 0.2;
      this.dustDriftSpeed[i] = 0.18 + hash(i * 2.79 + 0.3) * 0.62;
      this.dustDriftPhase[i] = hash(i * 1.43 + 8.8) * Math.PI * 2;
    }

    this.dustGeometry = new THREE.BufferGeometry();
    this.dustGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    );
    this.dustGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.dustMaterial = new THREE.PointsMaterial({
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.5,
      size: 0.09,
      sizeAttenuation: true,
      transparent: true,
      vertexColors: true,
    });

    this.dust = new THREE.Points(this.dustGeometry, this.dustMaterial);
    this.dust.layers.enable(1); // bloom layer — dust sparkles glow
    this.group.add(this.dust);
  }

  updateDust(delta, elapsed) {
    if (!this.dustGeometry || !this.dust || !this.dustMaterial) {
      return;
    }

    const positions = this.dustGeometry.attributes.position.array;
    for (let i = 0; i < this.dustDriftSpeed.length; i += 1) {
      const offset = i * 3;
      const baseX = this.dustBasePositions[offset];
      const baseY = this.dustBasePositions[offset + 1];
      const baseZ = this.dustBasePositions[offset + 2];
      const amplitude = this.dustDriftAmplitude[i];
      const speed = this.dustDriftSpeed[i];
      const phase = this.dustDriftPhase[i];

      positions[offset] = baseX + Math.sin(elapsed * speed + phase) * amplitude;
      positions[offset + 1] =
        baseY +
        Math.cos(elapsed * speed * 0.79 + phase * 1.11) * amplitude * 0.82;
      positions[offset + 2] =
        baseZ +
        Math.sin(elapsed * speed * 0.92 + phase * 0.67) * amplitude * 0.92;
    }

    this.dustGeometry.attributes.position.needsUpdate = true;
    this.dust.rotation.y += delta * 0.025;
    this.dust.rotation.x = Math.sin(elapsed * 0.08) * 0.05;
    this.dustMaterial.opacity = 0.48 + this.scatterMix * 0.14;
  }

  dispose() {
    this.mainGroup.remove(this.group);

    if (this.particleGeometry) {
      this.particleGeometry.dispose();
    }
    if (this.particleMaterial) {
      this.particleMaterial.dispose();
    }

    if (this.photoGeometry) {
      this.photoGeometry.dispose();
    }
    if (this.photoMaterial) {
      this.photoMaterial.dispose();
    }
    if (this.photoAtlasTexture) {
      this.photoAtlasTexture.dispose();
    }

    for (const texture of this.photoTextures) {
      texture.dispose();
    }

    if (this.dustGeometry) {
      this.dustGeometry.dispose();
    }
    if (this.dustMaterial) {
      this.dustMaterial.dispose();
    }
  }
}
