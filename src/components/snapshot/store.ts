import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';

/**
 * Thumbnails rendered from the game's own 3D models: dishes on the menu,
 * furniture in the catalogue, the player's portrait. SnapshotHost works
 * through this queue, one picture at a time. Pictures are kept for the session
 * only (in memory, never in localStorage, which holds the saves).
 */

export interface SnapshotJob {
  /** Same key, same picture: change the key when what it shows changes. */
  key: string;
  scene: () => ReactNode;
  /** Fixed camera; otherwise the camera frames whatever the scene draws, looking along `view`. */
  camera?: { position: [number, number, number]; target: [number, number, number]; fov?: number };
  view?: [number, number, number];
  size?: number;
}

const done = new Map<string, string>();
const failed = new Set<string>();
export const queue: SnapshotJob[] = [];
const listeners = new Set<() => void>();
let version = 0;
export const notify = () => { version++; listeners.forEach((l) => l()); };
export const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

function request(job: SnapshotJob) {
  if (done.has(job.key) || failed.has(job.key) || queue.some((j) => j.key === job.key)) return;
  queue.push(job);
  notify();
}

/** The picture for this job: null until it has been rendered (or if WebGL isn't available). */
export function useSnapshot(job: SnapshotJob | null): string | null {
  useSyncExternalStore(subscribe, storeVersion);
  const latest = useRef(job);
  useEffect(() => { latest.current = job; });
  const key = job?.key;
  useEffect(() => { if (key && latest.current) request(latest.current); }, [key]);
  return key ? done.get(key) ?? null : null;
}

export const storeVersion = () => version;

/** Records the finished picture (or that it couldn't be made) and moves on to the next job. */
export function finishJob(job: SnapshotJob, url: string | null) {
  if (queue[0] !== job) return;
  if (url) done.set(job.key, url);
  else failed.add(job.key);
  queue.shift();
  notify();
}
