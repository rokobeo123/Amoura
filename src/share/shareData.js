import { deflate, inflate } from 'pako';

const SHARE_PARAM = 'gift';
export const MAX_SHARE_IMAGES = 48;

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

