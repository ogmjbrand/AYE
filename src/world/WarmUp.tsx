import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { capTexture, sceneTextures } from './sceneTextures';

/** Loading counts as finished once nothing new has started for this long. */
const SETTLE_MS = 400;
/** Most time spent waiting for models and textures to arrive; the rest stream in while you play. */
const MAX_LOAD_MS = 12000;
/** Most time spent compiling shaders ahead; anything left compiles on first use. */
const MAX_COMPILE_MS = 8000;
/** Most time spent uploading textures ahead; the rest upload as they're first drawn. */
const MAX_UPLOAD_MS = 6000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** What the "getting ready" card shows. */
export interface WarmProgress {
  step: 'loading' | 'compiling' | 'uploading';
  /** 0 … 1 across all steps. */
  share: number;
  detail: string;
}

/**
 * Gets a freshly mounted place ready before its first frame is drawn.
 *
 * The first frame of a new scene compiles every material's shader and uploads
 * every texture on the main thread, which freezes the page for seconds on
 * Windows and phones. So while `sceneKey` is new, rendering stops; once its
 * models and textures have loaded, the shaders compile in the background
 * (compileAsync uses the browser's parallel shader compiler where it has one)
 * and the textures upload a few at a time, then rendering resumes.
 *
 * Every step has a time limit, so the card can never stay up for ever: a slow
 * or failed asset only means it is prepared on first use instead. Textures
 * larger than `maxTextureSize` are scaled down first (phones: 1024), which is
 * what kept the card up longest: every resident brings 2048-pixel skin maps.
 * `skip` (a counter) ends the wait at once.
 */
export function WarmUp({ sceneKey, maxTextureSize, skip, onReady, onProgress }: {
  sceneKey: string;
  maxTextureSize: number;
  skip: number;
  onReady: (ready: boolean) => void;
  onProgress?: (p: WarmProgress) => void;
}) {
  const { gl, scene, camera, setFrameloop } = useThree();
  useEffect(() => {
    let cancelled = false;
    let skipped = false;
    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      setFrameloop('always');
      onReady(true);
    };
    skipRef.current = () => { skipped = true; finish(); };
    onReady(false);
    setFrameloop('never');
    (async () => {
      const started = performance.now();
      let quietSince = performance.now();
      // Wait for the place's models, textures and sky to arrive, so they are compiled too
      while (!cancelled && performance.now() - started < MAX_LOAD_MS) {
        await wait(100);
        const p = useProgress.getState();
        if (p.active) quietSince = performance.now();
        else if (performance.now() - quietSince >= SETTLE_MS) break;
        onProgress?.({ step: 'loading', share: 0.5 * Math.min(1, p.total ? p.loaded / p.total : 0), detail: p.total ? `Loading the place · ${p.loaded} of ${p.total} files` : 'Loading the place' });
      }
      if (cancelled) return;
      try {
        onProgress?.({ step: 'compiling', share: 0.55, detail: 'Preparing materials and lighting' });
        await Promise.race([gl.compileAsync(scene, camera), wait(MAX_COMPILE_MS)]);
        if (cancelled) return;
        const textures = sceneTextures(scene);
        const uploadStart = performance.now();
        for (let i = 0; i < textures.length && !cancelled; i++) {
          if (performance.now() - uploadStart > MAX_UPLOAD_MS) break;
          capTexture(textures[i], maxTextureSize);
          gl.initTexture(textures[i]);
          if (i % 4 === 3) {
            onProgress?.({ step: 'uploading', share: 0.6 + 0.4 * ((i + 1) / textures.length), detail: `Preparing textures · ${i + 1} of ${textures.length}` });
            await wait(0);
          }
        }
        // Anything not uploaded ahead is still capped before it's first drawn
        for (const t of textures) capTexture(t, maxTextureSize);
      } catch {
        // A scene that can't be prepared ahead is still drawn; it just compiles on its first frame
      }
      if (!skipped) finish();
    })();
    return () => { cancelled = true; };
  }, [sceneKey, gl, scene, camera, setFrameloop, onReady, onProgress, maxTextureSize]);
  useEffect(() => { if (skip > 0) skipRef.current(); }, [skip]);
  return null;
}

const skipRef = { current: () => {} };
