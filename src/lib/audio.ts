// One shared player so recording can pause any speech, and generated audio is cached for replay.
const cache = new Map<string, string>();
let current: HTMLAudioElement | null = null;
const listeners = new Set<() => void>();

export function stopAllAudio() {
  if (current) { current.pause(); current = null; listeners.forEach((l) => l()); }
}
export function onAudioChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function getCached(key: string) { return cache.get(key); }
export function cacheAudio(key: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
  cache.set(key, url);
  return url;
}
export function playUrl(url: string): Promise<void> {
  stopAllAudio();
  const a = new Audio(url);
  current = a;
  listeners.forEach((l) => l());
  return new Promise((resolve, reject) => {
    a.onended = () => { if (current === a) current = null; listeners.forEach((l) => l()); resolve(); };
    a.onerror = () => { if (current === a) current = null; listeners.forEach((l) => l()); reject(new Error("playback_failed")); };
    a.play().catch((e) => { current = null; listeners.forEach((l) => l()); reject(e); });
  });
}
export function isPlaying() { return current !== null; }

/** Encode Float32 mono samples as 16-bit PCM WAV. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) { const s = Math.max(-1, Math.min(1, samples[i] ?? 0)); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  return new Uint8Array(buf);
}
export function toBase64(bytes: Uint8Array) {
  let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
