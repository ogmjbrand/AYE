/**
 * How the HUD lays itself out for the screen it's on (components/HUD.tsx).
 * Phones get the compact HUD in either orientation: a slim top bar, goals and
 * the map folded behind buttons, a smaller stick and bar. Desktops and
 * tablets keep the full HUD. Recomputed on every resize and turn.
 */
export interface HudLayout {
  /** A phone-sized screen (narrow, or short in landscape). */
  compact: boolean;
  portrait: boolean;
  /** Minimap diameter in CSS pixels. */
  minimap: number;
  /** Movement stick diameter in CSS pixels. */
  stick: number;
  /** Words under the bottom bar's icons (dropped on short landscape screens, where height is scarce). */
  navLabels: boolean;
  /** Goals start folded behind a button. */
  goalsFolded: boolean;
}

export const COMPACT_WIDTH = 640;
export const COMPACT_HEIGHT = 520;

export function hudLayout(width: number, height: number): HudLayout {
  const portrait = height > width;
  const compact = width < COMPACT_WIDTH || height < COMPACT_HEIGHT;
  return {
    compact,
    portrait,
    minimap: !compact ? 148 : portrait ? 88 : 80,
    stick: !compact ? 128 : portrait ? 112 : 96,
    navLabels: !compact || portrait,
    goalsFolded: compact,
  };
}
