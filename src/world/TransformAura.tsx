import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';

const VIOLET = new Color('#9b6bff');
const GOLD = new Color('#f0c67e');
const MOTES = 18;

/**
 * The supernatural form, drawn around the player without changing them: two
 * turning rings of light at the feet and chest, and motes of light rising
 * around the body. It grows in over a second and fades out when you return to
 * human form. Additive, unlit materials only: no lights, so no shader recompiles.
 */
export function TransformAura({ player, active }: { player: PlayerHandle; active: boolean }) {
  const root = useRef<Group>(null);
  const ringLow = useRef<Mesh>(null);
  const ringHigh = useRef<Mesh>(null);
  const motes = useRef<(Mesh | null)[]>([]);
  const strength = useRef(0);
  const seeds = useMemo(() => Array.from({ length: MOTES }, (_, i) => ({ a: (i / MOTES) * Math.PI * 2, r: 0.45 + (i % 3) * 0.12, speed: 0.5 + ((i * 7) % 5) * 0.12, phase: (i * 0.37) % 1 })), []);

  useFrame(({ clock }, dt) => {
    strength.current = Math.max(0, Math.min(1, strength.current + (active ? dt : -dt) * 1.2));
    const k = strength.current;
    const g = root.current;
    if (!g) return;
    g.visible = k > 0.01;
    if (!g.visible) return;
    g.position.set(player.position.x, player.position.y, player.position.z);
    const t = clock.elapsedTime;
    if (ringLow.current) {
      ringLow.current.rotation.z = t * 1.4;
      ringLow.current.scale.setScalar(0.6 + 0.4 * k);
      (ringLow.current.material as MeshBasicMaterial).opacity = 0.55 * k;
    }
    if (ringHigh.current) {
      ringHigh.current.rotation.z = -t * 1.1;
      ringHigh.current.position.y = 1.05 + Math.sin(t * 2) * 0.05;
      ringHigh.current.scale.setScalar((0.6 + 0.4 * k) * 0.8);
      (ringHigh.current.material as MeshBasicMaterial).opacity = 0.35 * k;
    }
    seeds.forEach((s, i) => {
      const m = motes.current[i];
      if (!m) return;
      const life = (t * s.speed * 0.35 + s.phase) % 1;
      const a = s.a + t * 0.8;
      m.position.set(Math.cos(a) * s.r, 0.1 + life * 2, Math.sin(a) * s.r);
      (m.material as MeshBasicMaterial).opacity = k * Math.sin(life * Math.PI) * 0.9;
    });
  });

  return (
    <group ref={root} visible={false}>
      <mesh ref={ringLow} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.75, 48, 1, 0, Math.PI * 1.6]} />
        <meshBasicMaterial color={VIOLET} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ringHigh} position={[0, 1.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.56, 48, 1, 0, Math.PI * 1.3]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {seeds.map((_, i) => (
        <mesh key={i} ref={(m) => { motes.current[i] = m; }}>
          <sphereGeometry args={[0.035, 6, 6]} />
          <meshBasicMaterial color={i % 2 ? GOLD : VIOLET} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
