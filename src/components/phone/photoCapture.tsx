import { useFrame, useThree } from '@react-three/fiber';
import { photoWanted, takePending } from './camera';

const WIDTH = 360;

/** Answers the phone camera: draws a frame and reads it straight back (mounted inside the Canvas). */
export function PhotoCapture() {
  const { gl, scene, camera } = useThree();
  useFrame(() => {
    if (!photoWanted()) return;
    const waiting = takePending();
    let src: string | null;
    try {
      // Read straight after drawing, while the frame is still in the buffer
      gl.render(scene, camera);
      const from = gl.domElement;
      const out = document.createElement('canvas');
      out.width = WIDTH;
      out.height = Math.round((WIDTH * from.height) / Math.max(1, from.width));
      out.getContext('2d')?.drawImage(from, 0, 0, out.width, out.height);
      src = out.toDataURL('image/jpeg', 0.72);
    } catch {
      src = null;
    }
    for (const p of waiting) p(src);
  });
  return null;
}
