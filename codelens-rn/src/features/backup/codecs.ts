/**
 * Base64 helpers for portable vector <-> string round-trips.
 *
 * React Native's Hermes runtime lacks Node's Buffer, and btoa/atob are not
 * binary-safe. This hand-rolled impl is standards-compliant base64 (RFC 4648)
 * that works in RN, browsers, and Node test environments.
 */

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = new Int16Array(128).fill(-1);
for (let i = 0; i < B64_CHARS.length; i++) B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const len = bytes.length;
  let out = '';
  let i = 0;
  for (; i + 2 < len; i += 3) {
    const triplet = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out +=
      B64_CHARS[(triplet >> 18) & 63] +
      B64_CHARS[(triplet >> 12) & 63] +
      B64_CHARS[(triplet >> 6) & 63] +
      B64_CHARS[triplet & 63];
  }
  const rem = len - i;
  if (rem === 1) {
    const b = bytes[i]!;
    out += B64_CHARS[(b >> 2) & 63] + B64_CHARS[(b << 4) & 63] + '==';
  } else if (rem === 2) {
    const b1 = bytes[i]!;
    const b2 = bytes[i + 1]!;
    out +=
      B64_CHARS[(b1 >> 2) & 63] +
      B64_CHARS[((b1 << 4) | (b2 >> 4)) & 63] +
      B64_CHARS[(b2 << 2) & 63] +
      '=';
  }
  return out;
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.replace(/=+$/, '');
  const len = clean.length;
  const byteLen = Math.floor((len * 3) / 4);
  const out = new Uint8Array(byteLen);
  let p = 0;
  let i = 0;
  for (; i + 3 < len; i += 4) {
    const c0 = B64_LOOKUP[clean.charCodeAt(i)] ?? 0;
    const c1 = B64_LOOKUP[clean.charCodeAt(i + 1)] ?? 0;
    const c2 = B64_LOOKUP[clean.charCodeAt(i + 2)] ?? 0;
    const c3 = B64_LOOKUP[clean.charCodeAt(i + 3)] ?? 0;
    out[p++] = ((c0 << 2) | (c1 >> 4)) & 0xff;
    out[p++] = (((c1 & 15) << 4) | (c2 >> 2)) & 0xff;
    out[p++] = (((c2 & 3) << 6) | c3) & 0xff;
  }
  const rem = len - i;
  if (rem === 2) {
    const c0 = B64_LOOKUP[clean.charCodeAt(i)] ?? 0;
    const c1 = B64_LOOKUP[clean.charCodeAt(i + 1)] ?? 0;
    out[p++] = ((c0 << 2) | (c1 >> 4)) & 0xff;
  } else if (rem === 3) {
    const c0 = B64_LOOKUP[clean.charCodeAt(i)] ?? 0;
    const c1 = B64_LOOKUP[clean.charCodeAt(i + 1)] ?? 0;
    const c2 = B64_LOOKUP[clean.charCodeAt(i + 2)] ?? 0;
    out[p++] = ((c0 << 2) | (c1 >> 4)) & 0xff;
    out[p++] = (((c1 & 15) << 4) | (c2 >> 2)) & 0xff;
  }
  return out.buffer;
}

/** Convenience: Float32Array -> base64 (copies the backing buffer). */
export function float32ToBase64(v: Float32Array): string {
  // Ensure we encode exactly the view's bytes (not the underlying buffer if offset/length differs).
  const copy = new ArrayBuffer(v.byteLength);
  new Uint8Array(copy).set(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
  return arrayBufferToBase64(copy);
}

/** Convenience: base64 -> Float32Array. Returns a fresh array backed by a fresh buffer. */
export function base64ToFloat32(b64: string): Float32Array {
  const buf = base64ToArrayBuffer(b64);
  return new Float32Array(buf);
}
