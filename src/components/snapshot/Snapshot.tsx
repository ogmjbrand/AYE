import { Suspense, useEffect, useRef, useSyncExternalStore } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping, Box3, Vector3, type Camera, type Group, type PerspectiveCamera } from 'three';
import { ErrorBoundary } from '../ErrorBoundary';
import { IndoorEnvironment } from '../../world/IndoorEnvironment';
import { finishJob, queue, storeVersion, subscribe, useSnapshot, type SnapshotJob } from './store';

/** How long one picture may take before it's skipped (software rendering is slow). */
const GIVE_UP_MS = 45_000;

/** Points the camera at the whole of `object`, from the `view` direction. */
function frameObject(camera: Camera, object: Group, view: readonly [number, number, number] = [0.9, 0.75, 1.1]) {
  const box = new Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const cam = camera as PerspectiveCamera;
  const centre = box.getCenter(new Vector3());
  const radius = box.getSize(new Vector3()).length() / 2;
  const dir = new Vector3(...view).normalize();
  const dist = (radius / Math.sin(((cam.fov / 2) * Math.PI) / 180)) * 0.8;
  cam.position.copy(centre).addScaledVector(dir, dist);
  cam.near = dist / 50;
  cam.far = dist * 4;
  cam.lookAt(centre);
  cam.updateProjectionMatrix();
}

function aimCamera(camera: Camera, c: NonNullable<SnapshotJob['camera']>) {
  const cam = camera as PerspectiveCamera;
  cam.position.set(...c.position);
  cam.fov = c.fov ?? 30;
  cam.near = 0.02;
  cam.far = 100;
  cam.lookAt(...c.target);
  cam.updateProjectionMatrix();
}

/** Waits for the scene to load and settle for a few frames, frames it, then reads the pixels back. */
function Capture({ job, target }: { job: SnapshotJob; target: React.RefObject<Group | null> }) {
  const { gl, scene, camera } = useThree();
  const state = useRef({ frames: 0, sent: false });
  useFrame(() => {
    const s = state.current;
    if (s.sent) return;
    s.frames++;
    if (s.frames === 1) {
      if (job.camera) aimCamera(camera, job.camera);
      else if (target.current) frameObject(camera, target.current, job.view);
    }
    if (s.frames < 5) return;
    s.sent = true;
    gl.render(scene, camera);
    let url: string | null;
    try { url = gl.domElement.toDataURL('image/webp', 0.86); } catch { url = null; }
    finishJob(job, url && url.length > 200 ? url : null);
  });
  return null;
}

function Fail({ job }: { job: SnapshotJob }) {
  useEffect(() => { finishJob(job, null); }, [job]);
  return null;
}

/** Builds the scene inside the error boundary, so a broken model only loses its own picture. */
function Scene({ job }: { job: SnapshotJob }) {
  return <>{job.scene()}</>;
}

function Job({ job }: { job: SnapshotJob }) {
  const group = useRef<Group>(null);
  return (
    <ErrorBoundary fallback={<Fail job={job} />}>
      <Suspense fallback={null}>
        <group ref={group}><Scene job={job} /></group>
        <Capture job={job} target={group} />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Mount once. Renders queued snapshots on a hidden canvas, one at a time; the
 * canvas is removed when the queue is empty so it doesn't hold a WebGL context.
 */
export function SnapshotHost() {
  useSyncExternalStore(subscribe, storeVersion);
  const job = queue[0];
  // No WebGL, or a scene that never settles: give up on this picture and move on
  useEffect(() => {
    if (!job) return;
    const id = setTimeout(() => finishJob(job, null), GIVE_UP_MS);
    return () => clearTimeout(id);
  }, [job]);
  if (!job) return null;
  const size = job.size ?? 256;
  return (
    <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, width: size, height: size, pointerEvents: 'none' }}>
      <Canvas
        dpr={1}
        camera={{ position: [0, 1, 3], fov: 30 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <hemisphereLight args={['#fff4e2', '#2a2420', 0.9]} />
        <directionalLight position={[2.5, 4, 3]} intensity={2.4} color="#fff1dc" />
        <directionalLight position={[-3, 2, -2]} intensity={0.9} color="#e8c27a" />
        <IndoorEnvironment mood="boutique" />
        <Job key={job.key} job={job} />
      </Canvas>
    </div>
  );
}

/** A thumbnail image, with a quiet placeholder while it renders. */
export function Snapshot({ job, alt, className = '' }: { job: SnapshotJob; alt: string; className?: string }) {
  const url = useSnapshot(job);
  return url
    ? <img src={url} alt={alt} className={`object-contain ${className}`} draggable={false} />
    : <span role="img" aria-label={alt} className={`block animate-pulse rounded-lg bg-white/5 ${className}`} />;
}
