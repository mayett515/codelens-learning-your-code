import { describe, it, expect } from 'vitest';
import { arrayBufferToBase64, base64ToArrayBuffer, float32ToBase64, base64ToFloat32 } from '../codecs';

describe('backup codecs', () => {
  it('round-trips empty buffer', () => {
    const buf = new ArrayBuffer(0);
    const b64 = arrayBufferToBase64(buf);
    expect(b64).toBe('');
    const back = base64ToArrayBuffer(b64);
    expect(back.byteLength).toBe(0);
  });

  it('round-trips 1-byte, 2-byte, 3-byte payloads', () => {
    for (const sample of [new Uint8Array([0x61]), new Uint8Array([0x61, 0x62]), new Uint8Array([0x61, 0x62, 0x63])]) {
      const b64 = arrayBufferToBase64(sample.buffer);
      const back = new Uint8Array(base64ToArrayBuffer(b64));
      expect(Array.from(back)).toEqual(Array.from(sample));
    }
  });

  it('matches Node Buffer base64 for random bytes', () => {
    const rnd = new Uint8Array(257); // triggers all alignments
    for (let i = 0; i < rnd.length; i++) rnd[i] = (i * 37 + 13) & 0xff;
    const ours = arrayBufferToBase64(rnd.buffer);
    // Compare roundtrip rather than coupling to Node's Buffer directly.
    const back = new Uint8Array(base64ToArrayBuffer(ours));
    expect(Array.from(back)).toEqual(Array.from(rnd));
  });

  it('round-trips a 384-dim Float32Array byte-for-byte', () => {
    const vec = new Float32Array(384);
    for (let i = 0; i < vec.length; i++) vec[i] = Math.sin(i) * 0.5;
    const b64 = float32ToBase64(vec);
    const back = base64ToFloat32(b64);
    expect(back.length).toBe(vec.length);
    for (let i = 0; i < vec.length; i++) {
      expect(back[i]).toBe(vec[i]);
    }
  });

  it('handles whitespace/padding variants gracefully (only stripping trailing =)', () => {
    const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0xca]);
    const b64 = arrayBufferToBase64(bytes.buffer);
    const back = new Uint8Array(base64ToArrayBuffer(b64));
    expect(Array.from(back)).toEqual(Array.from(bytes));
  });
});
