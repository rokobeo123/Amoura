import { deflate, inflate } from 'pako';

export const MAX_IMAGES = 24;
export const MAX_URL_LENGTH = 180000;
const PRESETS = [1600, 1280, 1024, 896, 768, 640, 512];

const base64UrlEncode = (bytes) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};
const base64UrlDecode = (value) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

export function normalizeGift(value = {}) {
  const text = (input, fallback, max) => typeof input === 'string' && input.trim() ? input.trim().slice(0, max) : fallback;
  return {
    from: text(value.from, 'Someone', 120),
    to: text(value.to, 'Someone special', 120),
    message: text(value.message, 'With all my heart.', 2400),
    images: Array.isArray(value.images) ? value.images.filter((image) => typeof image === 'string').slice(0, MAX_IMAGES) : [],
  };
}

export function encodeGift(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(normalizeGift(value)));
  return base64UrlEncode(deflate(bytes, { level: 9 }));
}

export function decodeGift(token) {
  const text = new TextDecoder().decode(inflate(base64UrlDecode(token)));
  return normalizeGift(JSON.parse(text));
}

export function shareUrl(value, base = window.location.href) {
  const url = new URL(base, window.location.origin);
  const token = encodeGift(value);
  if (token.length > MAX_URL_LENGTH) throw new Error('Your keepsake is too large. Please use fewer or smaller photos.');
  url.search = '';
  url.hash = `gift=${token}`;
  return url.toString();
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}
async function optimize(url, maxEdge) {
  const image = await loadImage(url);
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.82);
}

export async function prepareImages(files, forShare = false) {
  const originals = await Promise.all(Array.from(files || []).slice(0, MAX_IMAGES).map(readFile));
  if (!forShare) return originals;
  for (const edge of [0, ...PRESETS]) {
    const images = edge ? await Promise.all(originals.map((image) => optimize(image, edge))) : originals;
    if (encodeGift({ images }).length <= MAX_URL_LENGTH) return images;
  }
  throw new Error('Images are still too large for a shareable URL.');
}

export function readGiftFromUrl(url = window.location.href) {
  const parsed = new URL(url, window.location.origin);
  const token = parsed.searchParams.get('gift') || new URLSearchParams(parsed.hash.slice(1)).get('gift');
  if (!token) return null;
  try { return decodeGift(token); } catch (error) { console.warn('Invalid gift URL', error); return null; }
}
