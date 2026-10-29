import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, Color, DoubleSide, PlaneGeometry, type Group } from 'three';
import { bedFrame, bedSurface, duvetHeight, duvetTop, type Bedtime } from '../lib/bedSleep';

/** How much of the duvet's top edge shows the turned-back sheet. */
const SHEET_FOLD = 0.14;

/**
 * The duvet over someone in a home bed: one soft sheet shaped over a body
 * lying on its side (lib/bedSleep.ts), hanging over the sides and the foot,
 * with the top sheet turned back along its top edge, below the shoulder. It
 * is drawn up from the foot of the bed as you settle, and pushed back down as
 * you get up.
 */
export function SleepingDuvet({ bedtime }: { bedtime: Bedtime }) {
  const { bed, pose } = bedtime;
  const [w, , d] = bed.size;
  const surface = bedSurface(bed);
  const foot = -d / 2 - 0.12;
  const length = pose.coverTo - foot;
  const color = bed.style === 'luxe' ? '#f2ede4' : bed.color;
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(w + 0.22, length, 40, 52);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const duvet = new Color(color);
    const sheet = new Color('#f7f4ee');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i) + length / 2; // 0 at the foot end
      p.setXYZ(i, x, surface + duvetHeight(x, foot + z, w, d, pose), z);
      // The top sheet turned back over the duvet's top edge
      (z > length - SHEET_FOLD ? sheet : duvet).toArray(colors, i * 3);
    }
    g.setAttribute('color', new BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [w, d, length, foot, surface, pose, color]);
  const pull = useRef<Group>(null);

  useFrame(() => {
    const g = pull.current;
    if (!g) return;
    const { cover } = bedFrame(pose, (performance.now() - bedtime.startedAt) / 1000, bedtime.up, bedtime.from);
    g.visible = cover > 0.01;
    // Drawn up from the foot: the sheet stretches from the foot end to its current top edge
    g.scale.z = Math.max(0.01, (duvetTop(pose, d, cover) - foot) / length);
  });

  return (
    <group position={[bed.at[0], bed.elevation ?? 0, bed.at[1]]} rotation={[0, pose.heading, 0]}>
      <group ref={pull} position={[0, 0, foot]} visible={false}>
        <mesh geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.95} side={DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}
