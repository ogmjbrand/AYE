/**
 * A car engine made in the browser with the Web Audio API: no recordings, no
 * downloads. Two detuned low oscillators through a low-pass filter; the pitch
 * and filter rise with road speed and the throttle, so it idles low when you
 * stop and climbs as you pull away.
 */

/** Engine note in hertz at a given speed (m/s) as a share of the car's top speed. */
export function engineHz(speed: number, topSpeed: number): number {
  const share = topSpeed > 0 ? Math.min(1, Math.max(0, Math.abs(speed) / topSpeed)) : 0;
  return 38 + share * 72;
}

/** How loud the engine is (0..1 of its maximum): a steady idle, louder under way. */
export const engineLevel = (speed: number, topSpeed: number) =>
  0.35 + 0.65 * (topSpeed > 0 ? Math.min(1, Math.abs(speed) / topSpeed) : 0);

const MAX_GAIN = 0.07;

export interface Engine {
  /** Follow the car: speed in m/s, the model's top speed. */
  update: (speed: number, topSpeed: number) => void;
  stop: () => void;
}

/** Starts an engine sound, or returns null where the browser has no Web Audio. */
export function startEngine(): Engine | null {
  const AC = typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!AC) return null;
  let ctx: AudioContext;
  try { ctx = new AC(); } catch { return null; }
  const out = ctx.createGain();
  out.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 240;
  filter.Q.value = 2;
  const low = ctx.createOscillator();
  low.type = 'sawtooth';
  const high = ctx.createOscillator();
  high.type = 'square';
  const highGain = ctx.createGain();
  highGain.gain.value = 0.35;
  low.connect(filter);
  high.connect(highGain).connect(filter);
  filter.connect(out).connect(ctx.destination);
  const now = ctx.currentTime;
  low.frequency.setValueAtTime(engineHz(0, 1), now);
  high.frequency.setValueAtTime(engineHz(0, 1) * 2.02, now);
  low.start();
  high.start();
  // Turning the key: a quick rise to idle
  out.gain.linearRampToValueAtTime(MAX_GAIN * engineLevel(0, 1), now + 0.4);
  void ctx.resume().catch(() => undefined);
  let stopped = false;
  return {
    update(speed, topSpeed) {
      if (stopped) return;
      const t = ctx.currentTime;
      const hz = engineHz(speed, topSpeed);
      low.frequency.setTargetAtTime(hz, t, 0.15);
      high.frequency.setTargetAtTime(hz * 2.02, t, 0.15);
      filter.frequency.setTargetAtTime(200 + hz * 4, t, 0.2);
      out.gain.setTargetAtTime(MAX_GAIN * engineLevel(speed, topSpeed), t, 0.2);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setTargetAtTime(0, t, 0.12);
      setTimeout(() => { low.stop(); high.stop(); void ctx.close().catch(() => undefined); }, 600);
    },
  };
}
