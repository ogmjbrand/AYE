/**
 * Weather sound, made in the browser (no audio files): rain as filtered noise that swells with the
 * rain, and thunder that arrives after each flash with the delay the distance gives it (sound
 * travels 343 m a second: three seconds for a strike a kilometre away), louder and sharper when
 * close, a low rumble when far. Indoors everything is muffled through a low-pass filter, the way
 * walls and windows take the high end off.
 *
 * Browsers only allow sound after the player has touched or clicked the page, so nothing plays
 * until then. Pure parts (thunderDelay, thunderLevel) are exported for tests.
 */
export const SPEED_OF_SOUND = 343;

/** Seconds between a flash and its thunder. */
export const thunderDelay = (metres: number) => metres / SPEED_OF_SOUND;

/** How loud thunder is at a distance (0 … 1): close strikes crack, distant ones grumble. */
export const thunderLevel = (metres: number) => Math.max(0.08, Math.min(1, 900 / Math.max(300, metres)));

interface Bed { ctx: AudioContext; rainGain: GainNode; master: GainNode; muffle: BiquadFilterNode; noise: AudioBuffer }
let bed: Bed | null = null;
let unlocked = false;

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = b.getChannelData(0);
  let s = 22222;
  for (let i = 0; i < d.length; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = s / 2147483648 - 1; }
  return b;
}

function ensure(): Bed | null {
  if (bed) return bed;
  if (!unlocked || typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const muffle = ctx.createBiquadFilter();
  muffle.type = 'lowpass';
  muffle.frequency.value = 18000;
  master.connect(muffle).connect(ctx.destination);
  // Rain: looping noise, band-passed to the hiss of drops on hard ground
  const noise = noiseBuffer(ctx, 3);
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 2400;
  band.Q.value = 0.5;
  const rainGain = ctx.createGain();
  rainGain.gain.value = 0;
  src.connect(band).connect(rainGain).connect(master);
  src.start();
  bed = { ctx, rainGain, master, muffle, noise };
  return bed;
}

/** Call once: sound starts after the player's first touch, click or key. */
export function armWeatherAudio() {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    unlocked = true;
    ensure()?.ctx.resume();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

/** The rain's loudness (0 … 1) and whether you're indoors (muffled). */
export function setRainSound(rain: number, indoors: boolean) {
  const b = ensure();
  if (!b) return;
  const t = b.ctx.currentTime;
  b.rainGain.gain.setTargetAtTime(Math.max(0, Math.min(1, rain)) * 0.35, t, 0.8);
  b.muffle.frequency.setTargetAtTime(indoors ? 700 : 18000, t, 0.3);
  b.master.gain.setTargetAtTime(indoors ? 0.6 : 0.9, t, 0.3);
}

/** A thunderclap from a strike `metres` away, starting after its travel time. */
export function playThunder(metres: number) {
  const b = ensure();
  if (!b) return;
  const { ctx } = b;
  const start = ctx.currentTime + thunderDelay(metres);
  const level = thunderLevel(metres);
  const src = ctx.createBufferSource();
  src.buffer = b.noise;
  // Close: a sharp crack with some top end; far: only the low rumble survives the distance
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 120 + 900 * level;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(0.9 * level, start + 0.04 + (1 - level) * 0.5);
  g.gain.exponentialRampToValueAtTime(0.25 * level, start + 1.2);
  g.gain.exponentialRampToValueAtTime(0.001, start + 3.5 + (1 - level) * 2);
  src.connect(lp).connect(g).connect(b.master);
  src.start(start, Math.random() * 2);
  src.stop(start + 6);
}
