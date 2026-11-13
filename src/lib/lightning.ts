/**
 * When lightning strikes and how bright each flash is: pure, so it can be tested.
 *
 * A strike is two or three return strokes a few tens of milliseconds apart, each flaring and
 * fading, the first the brightest. Strikes come more often the stronger the storm (`thunder`
 * 0 … 1): about every 25 s in a light thunderstorm, every 6 s in a violent one. Distance sets
 * both the brightness and, through the speed of sound, when the thunder arrives.
 */
export interface Strike {
  /** When it strikes (seconds, the scene clock). */
  at: number;
  /** Seconds after each pulse starts, and its strength. */
  pulses: readonly { after: number; strength: number }[];
  /** Metres away, and the compass bearing (radians) it's in. */
  distance: number;
  bearing: number;
  /** Seconds until the next strike can come. */
  gap: number;
}

const PULSE_SECONDS = 0.09;

export function nextStrike(now: number, thunder: number, random: () => number): Strike {
  const k = Math.max(0.05, Math.min(1, thunder));
  const distance = 300 + random() * random() * 6000; // most strikes are a few km off; some close
  const near = Math.max(0.25, Math.min(1, 1200 / distance));
  const count = random() < 0.6 ? 3 : 2;
  const pulses = Array.from({ length: count }, (_, i) => ({ after: i === 0 ? 0 : 0.06 + i * 0.07 + random() * 0.05, strength: near * (i === 0 ? 1 : 0.55 - i * 0.1) }));
  const mean = 25 - 19 * k;
  return { at: now, pulses, distance, bearing: random() * Math.PI * 2, gap: mean * (0.4 + random() * 1.2) };
}

/** How bright the strike's light is at time `t` (0 … 1): sharp flares that fade within a tenth of a second. */
export function strikeBrightness(s: Strike, t: number): number {
  let b = 0;
  for (const p of s.pulses) {
    const dt = t - s.at - p.after;
    if (dt < 0 || dt > PULSE_SECONDS) continue;
    b = Math.max(b, p.strength * (1 - dt / PULSE_SECONDS) ** 2);
  }
  return b;
}
