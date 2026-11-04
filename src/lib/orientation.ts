/**
 * Phones and tablets play in either orientation: the HUD lays itself out for
 * portrait or landscape (components/HUD.tsx) and follows the screen as it
 * turns. Starting the game (a tap, so the browser allows it) goes full screen
 * where the browser supports it; nothing locks the orientation. Desktop
 * browsers are left alone.
 */
export const isTouchDevice = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

export async function enterFullscreen(): Promise<boolean> {
  if (!isTouchDevice()) return false;
  try {
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) { await root.requestFullscreen({ navigationUI: 'hide' }); return true; }
  } catch { /* full screen refused (iPhone Safari): the game plays in the page */ }
  return false;
}
