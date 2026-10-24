/**
 * The phone's camera: the next frame of the 3D world, read back as a small
 * JPEG. The phone asks for a picture with `takePhoto()`, which resolves with
 * a data URL (or null if the browser won't give the pixels back);
 * <PhotoCapture /> inside the Canvas answers it.
 */
type Pending = (src: string | null) => void;
let pending: Pending[] = [];

export function takePhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    pending.push(resolve);
    // Nothing is drawing (the tab is hidden): give up rather than wait forever
    setTimeout(() => { if (pending.includes(resolve)) { pending = pending.filter((p) => p !== resolve); resolve(null); } }, 3000);
  });
}

/** The requests waiting for the next frame (taken off the queue). */
export function takePending(): Pending[] {
  const out = pending;
  pending = [];
  return out;
}
export const photoWanted = () => pending.length > 0;
