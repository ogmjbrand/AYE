/**
 * Landscape play on phones and tablets. Starting the game (a tap, so the
 * browser allows it) goes full screen and locks the screen sideways where the
 * browser supports it (Android Chrome and most others). Where it doesn't
 * (iPhone Safari), a "turn your phone" card shows in portrait instead
 * (components/RotateHint.tsx). Desktop browsers are left alone.
 */
export const isTouchDevice = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

type LockableOrientation = ScreenOrientation & { lock?: (o: 'landscape') => Promise<void> };

export async function enterLandscape(): Promise<boolean> {
  if (!isTouchDevice()) return false;
  try {
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
  } catch { /* full screen refused: the rotate card still guides the player */ }
  try {
    const orientation = screen.orientation as LockableOrientation | undefined;
    if (orientation?.lock) { await orientation.lock('landscape'); return true; }
  } catch { /* not supported here (iPhone Safari) */ }
  return false;
}
