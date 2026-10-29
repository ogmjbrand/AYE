/**
 * Getting into bed: where a sleeper lies on a home bed, and the shape of the
 * duvet drawn over them.
 *
 * Beds are drawn with the headboard on +z (world/PlainBedroom.tsx,
 * world/LuxeBedroom.tsx), so the sleeper lies along z with their head on the
 * pillows and the duvet pulled up to the chest.
 */
import type { Furniture } from './interiors';

/** Top of the mattress for each bed style (matches the drawn beds). */
export function mattressTop(bed: Pick<Furniture, 'style'>): number {
  return bed.style === 'luxe' ? 0.62 : 0.54;
}

/** Top of the bed's own folded duvet, which the drawn-up duvet lies above. */
export function bedSurface(bed: Pick<Furniture, 'style'>): number {
  return bed.style === 'luxe' ? 0.68 : 0.6;
}

export interface SleepPose {
  /** The sleeper's feet, in the room. */
  feet: readonly [number, number, number];
  /** Bed-local z of the feet and of the duvet's top edge (across the chest). */
  feetZ: number;
  chestZ: number;
  /** Bed centre in the room, and its turn about the vertical. */
  centre: readonly [number, number, number];
  heading: number;
}

/** How a person of this height lies in this bed: head on the pillow, feet towards the foot end. */
export function sleepPose(bed: Furniture, heightCm = 170): SleepPose {
  const [, , d] = bed.size;
  const height = heightCm / 100;
  const back = d / 2;
  // Top of the head a hand's width short of the headboard; the tallest have their feet right at the foot of the bed
  const feetZ = Math.max(-d / 2 - 0.04, back - 0.16 - height);
  const chestZ = feetZ + height * 0.71;
  const elevation = bed.elevation ?? 0;
  // The body's back is about 12 cm behind its centre line: it sinks a little into the mattress
  const y = elevation + mattressTop(bed) + 0.07;
  const heading = bed.rotation ?? 0;
  return {
    feet: [bed.at[0] + Math.sin(heading) * feetZ, y, bed.at[1] + Math.cos(heading) * feetZ],
    feetZ,
    chestZ,
    centre: [bed.at[0], elevation, bed.at[1]],
    heading,
  };
}

/**
 * Height of the duvet above the bed's own surface at bed-local (x, z), with
 * the sleeper beneath it: a ridge over the body, higher over the chest and
 * the upturned feet, falling flat to the mattress edges and hanging over the
 * sides and the foot of the bed.
 */
export function duvetHeight(x: number, z: number, w: number, d: number, pose: Pick<SleepPose, 'feetZ' | 'chestZ'>): number {
  const along = (z - pose.feetZ) / (pose.chestZ - pose.feetZ); // 0 at the feet, 1 at the chest
  // Ridge height and width along the body: feet, shins, thighs, hips, chest
  const ridge = along < 0 ? 0.34 * Math.exp(-((along / 0.07) ** 2))
    : along < 0.1 ? 0.34
    : along < 0.2 ? 0.34 - 0.17 * ((along - 0.1) / 0.1)
    : 0.17 + 0.05 * Math.min(1, (along - 0.2) / 0.3);
  const spread = along < 0.5 ? 0.24 : 0.32;
  const lift = 0.02 + ridge * Math.exp(-((x / spread) ** 2));
  // Over the edges it hangs down: sides and the foot end
  const edge = w / 2 - 0.03;
  const overSide = Math.max(0, Math.abs(x) - edge);
  const overFoot = Math.max(0, -d / 2 + 0.03 - z);
  const hang = Math.min(0.32, (overSide + overFoot) * 4);
  return lift * Math.max(0, 1 - (overSide + overFoot) * 8) - hang;
}
