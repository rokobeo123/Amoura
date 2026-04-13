import { deflate, inflate } from 'pako';

const SHARE_PARAM = 'gift';
export const MAX_SHARE_IMAGES = 48;
export const MAX_SHARE_URL_LENGTH = 180000;

const SHARE_IMAGE_PRESETS = [
  { maxEdge: 1600, quality: 0.92 },
  { maxEdge: 1280, quality: 0.88 },
  { maxEdge: 1024, quality: 0.84 },
  { maxEdge: 896, quality: 0.8 },
  { maxEdge: 768, quality: 0.76 },
  { maxEdge: 640, quality: 0.72 },
  { maxEdge: 512, quality: 0.68 },
];

function normalizeText(value, fallback, maxLength) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, maxLength);
}

function encodeBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function createShareSizeError() {
  const error = new Error('Share link is too large.');
  error.code = 'SHARE_LINK_TOO_LARGE';
  return error;
}

async function compressDataUrl(sourceDataUrl, { maxEdge, quality }) {
  const image = await loadImageFromDataUrl(sourceDataUrl);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) {
    return sourceDataUrl;
  }

  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    return sourceDataUrl;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const compressedDataUrl = canvas.toDataURL('image/webp', quality);
  if (!compressedDataUrl || compressedDataUrl.length >= sourceDataUrl.length) {
    return sourceDataUrl;
  }

  return compressedDataUrl;
}

export function normalizeGiftData(raw) {
  const images = Array.isArray(raw?.images)
    ? raw.images.filter((item) => typeof item === 'string').slice(0, MAX_SHARE_IMAGES)
    : [];

  return {
    from: normalizeText(raw?.from, 'Someone', 120),
    to: normalizeText(raw?.to, 'Someone special', 120),
    message: normalizeText(raw?.message, 'With all my heart.', 2200),
    images,
  };
}

export async function prepareImagesFromFiles(files) {
  const selected = Array.from(files || []).slice(0, MAX_SHARE_IMAGES);
  // Preserve original upload bytes (1:1 quality).
  return Promise.all(selected.map((file) => readFileAsDataUrl(file)));
}

function buildShareUrlWithinLimit(rawPayload, baseUrl, maxUrlLength) {
  const link = buildShareUrl(rawPayload, baseUrl);
  return link.length <= maxUrlLength ? link : null;
}

export async function buildAdaptiveShareUrl(
  rawPayload,
  files,
  baseUrl = window.location.href,
  maxUrlLength = MAX_SHARE_URL_LENGTH,
) {
  const selected = Array.from(files || []).slice(0, MAX_SHARE_IMAGES);
  const basePayload = normalizeGiftData({
    ...rawPayload,
    images: [],
  });

  const originalImages = await Promise.all(
    selected.map((file) => readFileAsDataUrl(file)),
  );

  let payload = normalizeGiftData({
    ...basePayload,
    images: originalImages,
  });
  let link = buildShareUrlWithinLimit(payload, baseUrl, maxUrlLength);

  if (link) {
    return {
      link,
      optimized: false,
      payload,
    };
  }

  for (const preset of SHARE_IMAGE_PRESETS) {
    const optimizedImages = await Promise.all(
      originalImages.map((imageDataUrl) => compressDataUrl(imageDataUrl, preset)),
    );

    payload = normalizeGiftData({
      ...basePayload,
      images: optimizedImages,
    });
    link = buildShareUrlWithinLimit(payload, baseUrl, maxUrlLength);

    if (link) {
      return {
        link,
        optimized: true,
        payload,
      };
    }
  }

  throw createShareSizeError();
}

export function encodeGiftData(rawPayload) {
  const payload = normalizeGiftData(rawPayload);
  const json = JSON.stringify(payload);
  const encodedBytes = new TextEncoder().encode(json);
  const compressed = deflate(encodedBytes, { level: 9 });
  return encodeBase64Url(compressed);
}

export function decodeGiftData(encodedPayload) {
  const compressed = decodeBase64Url(encodedPayload);
  const inflated = inflate(compressed);
  const text = new TextDecoder().decode(inflated);
  const payload = JSON.parse(text);
  return normalizeGiftData(payload);
}

export function parseGiftDataFromUrl(urlString) {
  const url = new URL(urlString, window.location.origin);
  const encodedPayload = url.searchParams.get(SHARE_PARAM);
  if (!encodedPayload) {
    return null;
  }

  try {
    return decodeGiftData(encodedPayload);
  } catch (error) {
    console.error('Failed to decode share link payload.', error);
    return null;
  }
}

export function buildShareUrl(rawPayload, baseUrl = window.location.href) {
  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.set(SHARE_PARAM, encodeGiftData(rawPayload));
  return url.toString();
}

