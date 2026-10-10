import { deflate, inflate } from 'pako';

export const MAX_SHARE_IMAGES = 36;
export const MAX_URL_LENGTH = 180000;
const PARAM_GIFT = 'gift';
const PARAM_SHORT = 'g';

const IMAGE_PRESETS = [
  { maxEdge: 1600, quality: 0.88 },
  { maxEdge: 1280, quality: 0.82 },
  { maxEdge: 1024, quality: 0.78 },
  { maxEdge: 800, quality: 0.72 },
  { maxEdge: 640, quality: 0.65 },
  { maxEdge: 500, quality: 0.58 },
];

function encodeBase64Url(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(base64UrlStr) {
  let base64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function normalizeGiftPayload(raw) {
  const sanitize = (val, max, fallback) => {
    if (typeof val !== 'string') return fallback;
    const trimmed = val.trim();
    return trimmed ? trimmed.slice(0, max) : fallback;
  };

  const images = Array.isArray(raw?.images)
    ? raw.images.filter((img) => typeof img === 'string' && img.startsWith('data:image/')).slice(0, MAX_SHARE_IMAGES)
    : [];

  return {
    from: sanitize(raw?.from, 120, 'Someone'),
    to: sanitize(raw?.to, 120, 'My Love'),
    message: sanitize(raw?.message, 3000, 'Under the same starry sky, every moment with you is an eternal treasure.'),
    images,
  };
}

export function encodeGiftData(rawPayload) {
  const normalized = normalizeGiftPayload(rawPayload);
  const jsonStr = JSON.stringify(normalized);
  const textBytes = new TextEncoder().encode(jsonStr);
  const compressed = deflate(textBytes, { level: 9 });
  return encodeBase64Url(compressed);
}

export function decodeGiftData(token) {
  try {
    const compressed = decodeBase64Url(token);
    const inflated = inflate(compressed);
    const jsonStr = new TextDecoder().decode(inflated);
    const parsed = JSON.parse(jsonStr);
    return normalizeGiftPayload(parsed);
  } catch (err) {
    console.error('Failed to decode gift token:', err);
    return null;
  }
}

export function parseGiftDataFromUrl(urlString = typeof window !== 'undefined' ? window.location.href : '') {
  if (!urlString) return null;
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const url = new URL(urlString, origin);
    
    // Check search params first
    let token = url.searchParams.get(PARAM_GIFT) || url.searchParams.get(PARAM_SHORT);
    
    // If not found, check hash (e.g. #gift=... or #?gift=...)
    if (!token && url.hash) {
      const hashClean = url.hash.replace(/^#\??/, '');
      const hashParams = new URLSearchParams(hashClean);
      token = hashParams.get(PARAM_GIFT) || hashParams.get(PARAM_SHORT);
    }

    if (token) {
      return decodeGiftData(token);
    }
  } catch (err) {
    console.error('Failed to parse URL payload:', err);
  }
  return null;
}

export function buildShareUrl(rawPayload, baseUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost/') {
  const token = encodeGiftData(rawPayload);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const url = new URL(baseUrl, origin);
  url.searchParams.set(PARAM_GIFT, token);
  url.searchParams.delete(PARAM_SHORT);
  url.hash = '';
  return url.toString();
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function compressImageDataUrl(dataUrl, { maxEdge, quality }) {
  const img = await loadImage(dataUrl);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  if (!width || !height) return dataUrl;

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  let compressed = canvas.toDataURL('image/webp', quality);
  // Fallback to jpeg if browser produced larger or invalid webp
  if (!compressed || compressed.length >= dataUrl.length || !compressed.startsWith('data:image/webp')) {
    const jpeg = canvas.toDataURL('image/jpeg', quality);
    if (jpeg && jpeg.length < dataUrl.length) {
      compressed = jpeg;
    }
  }

  return compressed && compressed.length < dataUrl.length ? compressed : dataUrl;
}

export async function buildAdaptiveShareUrl(
  rawPayload,
  files = [],
  baseUrl = window.location.href,
  maxUrlLength = MAX_URL_LENGTH,
) {
  const selectedFiles = Array.from(files).slice(0, MAX_SHARE_IMAGES);
  const base = normalizeGiftPayload({ ...rawPayload, images: [] });

  let originalImages = [];
  if (selectedFiles.length > 0) {
    originalImages = await Promise.all(selectedFiles.map((file) => readFileAsDataUrl(file)));
  } else if (Array.isArray(rawPayload?.images) && rawPayload.images.length > 0) {
    originalImages = rawPayload.images;
  }

  // Attempt 1: Raw original images
  let currentPayload = { ...base, images: originalImages };
  let url = buildShareUrl(currentPayload, baseUrl);
  if (url.length <= maxUrlLength) {
    return { link: url, optimized: false, payload: currentPayload };
  }

  // Attempt 2..N: Progressive compression presets
  for (const preset of IMAGE_PRESETS) {
    const compressedImages = await Promise.all(
      originalImages.map((dataUrl) => compressImageDataUrl(dataUrl, preset)),
    );

    currentPayload = { ...base, images: compressedImages };
    url = buildShareUrl(currentPayload, baseUrl);
    if (url.length <= maxUrlLength) {
      return { link: url, optimized: true, payload: currentPayload };
    }
  }

  // If still too large, reduce image count until it fits
  let reducedImages = [...currentPayload.images];
  while (reducedImages.length > 3 && url.length > maxUrlLength) {
    reducedImages.pop();
    currentPayload = { ...base, images: reducedImages };
    url = buildShareUrl(currentPayload, baseUrl);
  }

  if (url.length <= maxUrlLength) {
    return { link: url, optimized: true, payload: currentPayload };
  }

  throw new Error('Keepsake size is too large for a direct URL link. Please select fewer or smaller photos.');
}
