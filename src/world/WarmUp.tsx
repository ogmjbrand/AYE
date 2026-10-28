import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { sceneTextures } from './sceneTextures';

/** Loading counts as finished once nothing new has started for this long. */
const SETTLE_MS = 400;
/** Never hold the player at the door longer than this, even if something keeps loading. */
const MAX_WAIT_MS = 20000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gets a freshly mounted place ready before its first frame is drawn.
 *
 * The first frame of a new scene compiles every material's shader and uploads
 * every texture on the main thread, which freezes the page for seconds on
 * Windows and phones. So while `sceneKey` is new, rendering stops; once its
 * models and textures have loaded, the shaders compile in the background
 * (compileAsync uses the browser's parallel shader compiler where it has one)
 * and the textures upload a few at a time, then rendering resumes. `onReady`
 * lets the page show a "getting ready" card meanwhile.
 */
export function WarmUp({ sceneKey, onReady }: { sceneKey: string; onReady: (ready: boolean) => void }) {
  const { gl, scene, camera, setFrameloop } = useThree();
  useEffect(() => {
    let cancelled = false;
    onReady(false);
    setFrameloop('never');
    (async () => {
      const started = performance.now();
      let quietSince = performance.now();
      // Wait for the place's models, textures and sky to arrive, so they are compiled too
      while (!cancelled && performance.now() - started < MAX_WAIT_MS) {
        await wait(100);
        if (useProgress.getState().active) quietSince = performance.now();
        else if (performance.now() - quietSince >= SETTLE_MS) break;
      }
      if (cancelled) return;
      try {
        await gl.compileAsync(scene, camera);
        const textures = sceneTextures(scene);
        for (let i = 0; i < textures.length && !cancelled; i++) {
          gl.initTexture(textures[i]);
          if (i % 4 === 3) await wait(0);
        }
      } catch {
        // A scene that can't be prepared ahead is still drawn; it just compiles on its first frame
      }
      if (cancelled) return;
      setFrameloop('always');
      onReady(true);
    })();
    return () => { cancelled = true; };
  }, [sceneKey, gl, scene, camera, setFrameloop, onReady]);
  return null;
}
