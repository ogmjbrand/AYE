/** The phone's own little sounds: a soft key tick and a two-note chime (Web Audio, nothing to download). */
let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (ctx) return ctx;
  const AC = typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!AC) return null;
  try { ctx = new AC(); } catch { return null; }
  return ctx;
}

function beep(freq: number, at: number, length: number, level: number) {
  const a = audio();
  if (!a) return;
  void a.resume().catch(() => undefined);
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(level, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

export const tick = () => beep(1800, 0, 0.04, 0.03);
export const chime = () => { beep(880, 0, 0.25, 0.06); beep(1318, 0.12, 0.35, 0.05); };
export const shutter = () => { beep(2400, 0, 0.03, 0.05); beep(1200, 0.05, 0.06, 0.04); };
