import { deflate, inflate } from 'pako';

const SHARE_PARAM = 'gift';
const REMOTE_SHARE_PARAM = 'g';
const REMOTE_API_BASE = 'https://rentry.co/api';
const REMOTE_CHUNK_SIZE = 150000;
const REMOTE_MAX_CHUNKS = 12;
const REMOTE_MAX_ENCODED_LENGTH = REMOTE_CHUNK_SIZE * REMOTE_MAX_CHUNKS;

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

function createError(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

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

function getHashParams(hashValue) {
  const hashRaw = hashValue.startsWith('#') ? hashValue.slice(1) : hashValue;
  const hashQuery = hashRaw.startsWith('?') ? hashRaw.slice(1) : hashRaw;
  return new URLSearchParams(hashQuery);
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

function splitBySize(value, maxChunkSize) {
  const chunks = [];
  for (let index = 0; index < value.length; index += maxChunkSize) {
    chunks.push(value.slice(index, index + maxChunkSize));
  }
  return chunks;
}

function createShareSizeError() {
  return createError(
    'SHARE_LINK_TOO_LARGE',
    'Share link is too large.',
  );
}

function createRemoteSizeError() {
  return createError(
    'SHARE_STORAGE_TOO_LARGE',
    'Gift content is too large to publish. Please use fewer or smaller photos.',
  );
}

function createRemoteCode(length = 24) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  let code = '';
  for (let i = 0; i < randomBytes.length; i += 1) {
    code += alphabet[randomBytes[i] % alphabet.length];
  }
  return code;
}

function encodeObjectToToken(value) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  const compressed = deflate(bytes, { level: 9 });
  return encodeBase64Url(compressed);
}

function decodeObjectFromToken(token) {
  const compressed = decodeBase64Url(token);
  const inflated = inflate(compressed);
  const text = new TextDecoder().decode(inflated);
  return JSON.parse(text);
}

async function postRemoteForm(path, fields) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) {
      continue;
    }
    body.set(key, String(value));
  }

  const response = await fetch(`${REMOTE_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: body.toString(),
  });

  const responseText = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (error) {
    throw createError(
      'REMOTE_SHARE_INVALID_RESPONSE',
      'Remote share service returned an invalid response.',
      error,
    );
  }

  if (!response.ok) {
    throw createError(
      'REMOTE_SHARE_HTTP_ERROR',
      `Remote share service failed (${response.status}).`,
    );
  }

  return parsed;
}

async function createRemoteEntry(text) {
  const editCode = createRemoteCode();
  const result = await postRemoteForm('/new', {
    text,
    edit_code: editCode,
  });

  if (String(result?.status) !== '200') {
    const details = typeof result?.errors === 'string'
      ? result.errors
      : typeof result?.content === 'string'
        ? result.content
        : 'Failed to create remote share.';
    throw createError('REMOTE_SHARE_CREATE_FAILED', details);
  }

  const id = String(result?.url_short || '').trim();
  const returnedCode = String(result?.edit_code || editCode).trim();
  if (!id || !returnedCode) {
    throw createError(
      'REMOTE_SHARE_CREATE_FAILED',
      'Remote share service did not return a valid identifier.',
    );
  }

  return {
    id,
    editCode: returnedCode,
  };
}

async function fetchRemoteEntryText(id, editCode) {
  const result = await postRemoteForm(`/fetch/${encodeURIComponent(id)}`, {
    edit_code: editCode,
  });

  if (String(result?.status) !== '200' || typeof result?.content?.text !== 'string') {
    const details = typeof result?.errors === 'string'
      ? result.errors
      : typeof result?.content === 'string'
        ? result.content
        : 'Failed to load shared gift.';
    throw createError('REMOTE_SHARE_FETCH_FAILED', details);
  }

  return result.content.text;
}

function decodeRemoteShareToken(token) {
  let tokenPayload;
  try {
    tokenPayload = decodeObjectFromToken(token);
  } catch (error) {
    throw createError('REMOTE_SHARE_BAD_TOKEN', 'Invalid remote share token.', error);
  }

  if (
    tokenPayload?.v !== 1
    || typeof tokenPayload?.m !== 'string'
    || typeof tokenPayload?.k !== 'string'
  ) {
    throw createError('REMOTE_SHARE_BAD_TOKEN', 'Remote share token has unsupported format.');
  }

  return tokenPayload;
}

async function buildAdaptivePayloadByEncodedLength(rawPayload, files, maxEncodedLength) {
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
  let encodedGift = encodeGiftData(payload);

  if (encodedGift.length <= maxEncodedLength) {
    return {
      payload,
      encodedGift,
      optimized: false,
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
    encodedGift = encodeGiftData(payload);

    if (encodedGift.length <= maxEncodedLength) {
      return {
        payload,
        encodedGift,
        optimized: true,
      };
    }
  }

  throw createRemoteSizeError();
}

async function resolveRemoteGiftData(token) {
  const remoteRef = decodeRemoteShareToken(token);
  const manifestText = await fetchRemoteEntryText(remoteRef.m, remoteRef.k);

  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch (error) {
    throw createError(
      'REMOTE_SHARE_BAD_MANIFEST',
      'Shared gift manifest could not be parsed.',
      error,
    );
  }

  if (manifest?.v !== 1 || !Array.isArray(manifest?.c) || manifest.c.length < 1) {
    throw createError('REMOTE_SHARE_BAD_MANIFEST', 'Shared gift manifest has invalid format.');
  }

  if (manifest.c.length > REMOTE_MAX_CHUNKS) {
    throw createError('REMOTE_SHARE_BAD_MANIFEST', 'Shared gift has too many chunks.');
  }

  const chunkTexts = await Promise.all(
    manifest.c.map((chunkRef) => {
      if (typeof chunkRef?.i !== 'string' || typeof chunkRef?.k !== 'string') {
        throw createError(
          'REMOTE_SHARE_BAD_MANIFEST',
          'Shared gift chunk reference is invalid.',
        );
      }
      return fetchRemoteEntryText(chunkRef.i, chunkRef.k);
    }),
  );

  const encodedGift = chunkTexts.join('');
  return decodeGiftData(encodedGift);
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
  // Preserve original upload bytes (1:1 quality) for local preview.
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

export async function buildIdShareUrl(
  rawPayload,
  files,
  baseUrl = window.location.href,
) {
  const { payload, encodedGift, optimized } = await buildAdaptivePayloadByEncodedLength(
    rawPayload,
    files,
    REMOTE_MAX_ENCODED_LENGTH,
  );

  const chunks = splitBySize(encodedGift, REMOTE_CHUNK_SIZE);
  if (!chunks.length || chunks.length > REMOTE_MAX_CHUNKS) {
    throw createRemoteSizeError();
  }

  const chunkRefs = [];
  for (const chunkText of chunks) {
    const chunkRef = await createRemoteEntry(chunkText);
    chunkRefs.push({
      i: chunkRef.id,
      k: chunkRef.editCode,
    });
  }

  const manifestText = JSON.stringify({
    v: 1,
    c: chunkRefs,
  });
  const manifestRef = await createRemoteEntry(manifestText);
  const remoteToken = encodeObjectToToken({
    v: 1,
    m: manifestRef.id,
    k: manifestRef.editCode,
  });

  const url = new URL(baseUrl, window.location.origin);
  const hashParams = getHashParams(url.hash);
  hashParams.set(REMOTE_SHARE_PARAM, remoteToken);
  hashParams.delete(SHARE_PARAM);

  url.searchParams.delete(SHARE_PARAM);
  url.searchParams.delete(REMOTE_SHARE_PARAM);
  url.hash = hashParams.toString();

  return {
    link: url.toString(),
    optimized,
    payload,
    remote: true,
    chunks: chunkRefs.length,
  };
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

export async function parseGiftDataFromUrl(urlString) {
  const url = new URL(urlString, window.location.origin);
  const hashParams = getHashParams(url.hash);

  const remoteToken = hashParams.get(REMOTE_SHARE_PARAM) || url.searchParams.get(REMOTE_SHARE_PARAM);
  if (remoteToken) {
    try {
      return await resolveRemoteGiftData(remoteToken);
    } catch (error) {
      console.error('Failed to resolve remote share payload.', error);
      return null;
    }
  }

  const encodedPayload = hashParams.get(SHARE_PARAM) || url.searchParams.get(SHARE_PARAM);
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
  const hashParams = getHashParams(url.hash);
  hashParams.set(SHARE_PARAM, encodeGiftData(rawPayload));
  hashParams.delete(REMOTE_SHARE_PARAM);

  url.searchParams.delete(SHARE_PARAM);
  url.searchParams.delete(REMOTE_SHARE_PARAM);
  url.hash = hashParams.toString();
  return url.toString();
}

