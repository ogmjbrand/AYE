import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Box3, CanvasTexture, Material, SRGBColorSpace, type Group, type Mesh } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { assetUrl } from '../lib/assetManifest';
import { lookById } from '../lib/looks';
import { seatDrop, type Seat } from '../lib/seating';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { withRelaxedHands } from '../components/handPose';
import { Gestures, type GestureActions } from '../components/Gestures';
import { OutfitStyler } from '../components/Avatar';
import type { Slot, Style } from '../lib/fashion';

/** Name tag: their name, their job, and that they're computer-controlled. */
function staffTag(name: string, role: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(12,22,19,0.82)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 144, 36);
  ctx.fill();
  ctx.strokeStyle = 'rgba(217,182,106,0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f1ede6';
  ctx.font = "700 54px Manrope, 'DM Sans', sans-serif";
  ctx.fillText(name, 256, 72);
  ctx.fillStyle = '#d9b66a';
  ctx.font = "500 32px 'DM Sans', sans-serif";
  ctx.fillText(`${role} · computer-controlled`, 256, 122);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export interface NpcProps {
  lookId: string;
  name: string;
  role: string;
  /** Standing spot and heading; ignored while walking a route. */
  x: number;
  z: number;
  facing: number;
  /** Sits on this seat instead of standing. */
  seat?: Seat;
  /** Walks this loop (pausing at each point), e.g. a waiter's round. */
  route?: readonly (readonly [number, number])[];
  /** Talks with their hands now and then (diners chatting, a host greeting). */
  chatty?: boolean;
  /** A uniform: fabrics for their top, bottom and shoes (lib/fashion.ts styles). */
  uniform?: Partial<Record<Slot, Style>>;
  /** Lies face down on a table this high (a spa client), head towards `facing`; centred on x, z. */
  lying?: number;
}

const WALK_SPEED = 1.0;
const PAUSE_SECONDS = 2.2;

function Npc({ lookId, name, role, x, z, facing, seat, route, chatty = false, uniform, lying }: NpcProps) {
  const look = lookById(lookId);
  const { scene, animations } = useGLTF(assetUrl(look.url), false, true);
  const group = useRef<Group>(null);
  const root = useRef<Group>(null);
  // Own copy, with the original clothes (the player may be wearing the same look restyled)
  const figure = useMemo(() => {
    const copy = cloneSkinned(scene);
    copy.position.set(0, 0, 0);
    copy.rotation.set(0, 0, 0);
    copy.scale.set(1, 1, 1);
    copy.updateMatrixWorld(true);
    copy.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      const fresh = (m: Material) => {
        const c = m.clone();
        c.onBeforeCompile = Material.prototype.onBeforeCompile;
        c.customProgramCacheKey = Material.prototype.customProgramCacheKey;
        delete (c.userData as { ayeStyle?: unknown }).ayeStyle;
        return c;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(fresh) : fresh(mesh.material);
    });
    return copy;
  }, [scene]);
  const scale = useMemo(() => {
    const box = new Box3().setFromObject(figure);
    const h = box.max.y - box.min.y;
    return h > 0 ? look.height / h : 1;
  }, [figure, look.height]);
  const clips = useMemo(() => withRelaxedHands(animations), [animations]);
  const { actions, names, mixer } = useAnimations(clips, group);
  const idleName = names.find((n) => /idle|stand/i.test(n)) ?? names[0];
  const walkName = names.find((n) => /walk/i.test(n));
  const idleClip = useMemo(() => clips.find((c) => c.name === idleName), [clips, idleName]);
  const [gestures, setGestures] = useState<GestureActions>({});
  const tag = useMemo(() => staffTag(name, role), [name, role]);
  const current = useRef<string>('');
  const walk = useRef({ leg: 0, t: 0, pause: (name.length % 5) * 0.4, x: route?.[0][0] ?? x, z: route?.[0][1] ?? z, heading: facing });

  useEffect(() => {
    if (walkName) actions[walkName]?.setEffectiveTimeScale(WALK_SPEED / look.walkSpeed);
  }, [actions, walkName, look.walkSpeed]);

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.1);
    let moving = false;
    const w = walk.current;
    if (route && route.length > 1) {
      if (w.pause > 0) w.pause -= step;
      else {
        const [tx, tz] = route[(w.leg + 1) % route.length];
        const dx = tx - w.x;
        const dz = tz - w.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.05) {
          w.leg = (w.leg + 1) % route.length;
          w.pause = PAUSE_SECONDS;
        } else {
          const s = Math.min(d, WALK_SPEED * step);
          w.x += (dx / d) * s;
          w.z += (dz / d) * s;
          const want = Math.atan2(dx, dz);
          w.heading += Math.atan2(Math.sin(want - w.heading), Math.cos(want - w.heading)) * Math.min(1, step * 8);
          moving = true;
        }
      }
      root.current?.position.set(w.x, 0, w.z);
      if (group.current) group.current.rotation.y = w.heading;
    }
    const sitting = !!seat && !!gestures.Sit;
    const talking = chatty && !sitting && lying === undefined && gestures.Talk && Math.floor((mixer.time + name.length * 1.7) / 9) % 3 === 0;
    const want = sitting ? 'Sit' : moving && walkName ? walkName : talking ? 'Talk' : idleName;
    if (want !== current.current) {
      const get = (n: string) => (n === 'Sit' || n === 'Talk' ? gestures[n as 'Sit' | 'Talk'] : actions[n]);
      const to = get(want);
      if (to) {
        to.reset().fadeIn(0.35).play();
        if (current.current) get(current.current)?.fadeOut(0.35);
        current.current = want;
      }
    }
    if (group.current && seat) group.current.position.y = sitting ? seatDrop(seat, look.height) : 0;
  });

  // Seated: the body goes just behind the cushion, facing the way the chair does
  const at = seat ? [seat.x - Math.sin(seat.facing) * 0.08, seat.z - Math.cos(seat.facing) * 0.08] : [x, z];
  const heading = seat ? seat.facing : facing;
  return (
    <group ref={root} position={[at[0], 0, at[1]]}>
      <group ref={group} rotation={[0, heading, 0]}>
        {lying === undefined ? <primitive object={figure} scale={scale} /> : (
          // Feet at the foot of the table, face down into the head rest
          <group position={[0, lying + 0.13, -look.height / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <primitive object={figure} scale={scale} />
          </group>
        )}
      </group>
      {uniform && <OutfitStyler scene={figure} lookId={look.id} styles={uniform} skinTone={0} />}
      <Gestures body={look.body} mixer={mixer} root={group} idle={idleClip} onLoad={setGestures} />
      <sprite position={[0, lying !== undefined ? lying + 0.75 : (seat ? look.height * 0.78 : look.height) + 0.3, 0]} scale={[0.8, 0.25, 1]}>
        <spriteMaterial map={tag} depthWrite={false} transparent />
      </sprite>
    </group>
  );
}

/** A member of staff or a diner. Loads in the background; nothing shows if the model can't load. */
export function VenueNpc(props: NpcProps) {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <Npc {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
