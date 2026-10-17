import { Suspense, useEffect, type RefObject } from 'react';
import { useGLTF } from '@react-three/drei';
import { LoopOnce, type AnimationAction, type AnimationClip, type AnimationMixer, type Object3D } from 'three';
import { assetUrl } from '../lib/assetManifest';
import { gesturesUrl, type Gesture } from '../lib/bodyLanguage';
import type { BodyType } from '../lib/looks';
import { ErrorBoundary } from './ErrorBoundary';
import { withRelaxedHands } from './handPose';

export type GestureActions = Partial<Record<Gesture, AnimationAction>>;

interface GesturesProps {
  body: BodyType;
  mixer: AnimationMixer;
  /** The object the mixer animates (the avatar's group). */
  root: RefObject<Object3D | null>;
  /** The avatar's idle clip, for the relaxed hand in clips without finger poses. */
  idle?: AnimationClip;
  onLoad: (actions: GestureActions) => void;
}

function GestureClips({ body, mixer, root, idle, onLoad }: GesturesProps) {
  const { animations } = useGLTF(assetUrl(gesturesUrl(body)), false, true);
  useEffect(() => {
    const target = root.current;
    if (!target) return;
    const clips = withRelaxedHands(idle ? [idle, ...animations] : animations).filter((c) => c !== idle);
    const actions: GestureActions = {};
    for (const clip of clips) {
      const action = mixer.clipAction(clip, target);
      if (clip.name === 'Wave') {
        action.setLoop(LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      actions[clip.name as Gesture] = action;
    }
    onLoad(actions);
    return () => {
      for (const a of Object.values(actions)) a?.stop();
      onLoad({});
    };
  }, [animations, mixer, root, idle, onLoad]);
  return null;
}

/** Loads the shared gesture clips in the background; the person stands idle until they arrive, or if they can't load. */
export function Gestures(props: GesturesProps) {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <GestureClips {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
