import * as THREE from 'three';

const TAU = Math.PI * 2;
const EPSILON = 0.000001;
const X_AXIS = new THREE.Vector3(1, 0, 0);

function fract(value) { return value - Math.floor(value); }
function hash(seed) { return fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453123); }

function surfaceHeartPoint(u, v) {
  const sinV = Math.sin(v);

  let x = (4 * Math.sin(u) - Math.sin(3 * u)) * sinV;
  let y = 2 * Math.cos(v);
  let z = 1.2 * (4 * Math.cos(u) - Math.cos(2 * u) - (Math.cos(3 * u) / 2)) * sinV;

  x *= 1.8;
  y *= 4.0;
  z *= 1.6;

  z += 2.5;

  const FINAL_SCALE = 0.0625;
  return new THREE.Vector3(x * FINAL_SCALE, y * FINAL_SCALE, z * FINAL_SCALE);
}

function orientUpright(point) {
  point.applyAxisAngle(X_AXIS, -Math.PI * 0.5);
  return point;
}

export function generateHeartPositions(count, { radius = 1, thickness = 1 } = {}) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const randU = hash(i * 0.754 + 1.23);
    const randV = hash(i * 0.569 + 2.87);
    const randR = hash(i * 0.438 + 4.61);

    const u = randU * TAU;
    const v = Math.acos(1 - 2 * randV);

    const point = surfaceHeartPoint(u, v);
    const r = Math.pow(randR, 0.4);
    point.multiplyScalar(r);

    orientUpright(point);

    positions.push(
      new THREE.Vector3(point.x * radius, point.y * radius, point.z * thickness)
    );
  }
  return positions;
}

export function generateScatterPositions(structuredPositions) {
  const scatterPositions = [];

  for (let i = 0; i < structuredPositions.length; i++) {
    const u = hash(i * 5.12 + 1.1) * 2 - 1;
    const theta = hash(i * 7.89 + 2.2) * TAU;
    const sqrtOneMinusU2 = Math.sqrt(Math.max(0, 1 - u * u));

    const dir = new THREE.Vector3(
      sqrtOneMinusU2 * Math.cos(theta),
      sqrtOneMinusU2 * Math.sin(theta),
      u
    );

    // TĂNG NHẸ: Khoảng cách từ 14 đến 24 đơn vị
    // Mức này to hơn bản cũ (10-18) một chút, đủ để không gian gắn ảnh thoải mái hơn
    // mà không làm các hạt bị bay quá xa.
    const expansionDistance = 14 + hash(i * 1.5) * 10;

    scatterPositions.push(dir.multiplyScalar(expansionDistance));
  }

  return scatterPositions;
}

/**
 * Generates N photo-gallery positions evenly distributed on a sphere
 * using the Fibonacci / golden-angle method (perfect uniform coverage).
 * Radius grows with the square root of count so cards never overlap.
 */
export function generatePhotoScatterPositions(count) {
  if (count === 0) return [];

  const positions = [];
  const goldenAngle = Math.PI * (3.0 - Math.sqrt(5.0)); // ≈ 2.399 rad

  // Sphere radius grows with count but is capped at 9.0.
  // Camera sits at z≈14 so radius 9 keeps front cards ≥5 units away.
  const radius = Math.min(9.0, 7.5 + Math.sqrt(count) * 0.55);

  for (let i = 0; i < count; i++) {
    // y goes from +1 (top) to -1 (bottom), or stays at 0 for a single photo
    const y = count === 1 ? 0.0 : 1.0 - (i / (count - 1)) * 2.0;
    const r = Math.sqrt(Math.max(0.0, 1.0 - y * y));
    const theta = goldenAngle * i;

    positions.push(
      new THREE.Vector3(
        r * Math.cos(theta) * radius,
        y * radius * 0.78,          // slight vertical compression for nicer view
        r * Math.sin(theta) * radius,
      ),
    );
  }

  return positions;
}
