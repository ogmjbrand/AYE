import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, LineBasicMaterial, type LineSegments } from 'three';
import { useQuality } from './quality';

/** The box of falling rain around the camera, in metres. */
const SPREAD = 18;
const HEIGHT = 18;
const FALL_SPEED = 16;
const STREAK = 0.9;

interface RainSet { geometry: BufferGeometry; seeds: Float32Array }
const sets = new Map<number, RainSet>();
/** The streak buffers for a quality tier, made once and shared. Seeds are a fixed pseudo-random spread. */
function rainSet(max: number): RainSet {
  let set = sets.get(max);
  if (!set) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(max * 6), 3));
    geometry.setDrawRange(0, 0);
    const seeds = new Float32Array(max * 3);
    let r = 12345;
    for (let i = 0; i < seeds.length; i++) { r = (Math.imul(r, 1103515245) + 12345) >>> 0; seeds[i] = r / 4294967296; }
    set = { geometry, seeds };
    sets.set(max, set);
  }
  return set;
}
const material = new LineBasicMaterial({ color: '#b9c8d8', transparent: true, opacity: 0.45, blending: AdditiveBlending, depthWrite: false, toneMapped: false });

/**
 * Rain falling around the camera as thin streaks, slanted a little by the
 * wind. Always mounted (hidden when dry) so starting to rain never
 * recompiles anything; how many streaks show follows the rain's strength
 * and the quality tier.
 */
export function Rain({ intensity }: { intensity: number }) {
  const quality = useQuality();
  const max = quality.quality === 'low' ? 700 : 1600;
  const lines = useRef<LineSegments>(null);
  const { geometry } = rainSet(max);

  useFrame(({ camera, clock }) => {
    const l = lines.current;
    if (!l) return;
    const { geometry: g, seeds } = rainSet(max);
    const count = Math.round(max * Math.max(0, Math.min(1, intensity)));
    l.visible = count > 0;
    if (!count) return;
    const pos = g.attributes.position.array as Float32Array;
    const t = clock.elapsedTime;
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    for (let i = 0; i < count; i++) {
      const sx = seeds[i * 3], sy = seeds[i * 3 + 1], sz = seeds[i * 3 + 2];
      // Each drop falls through the box and wraps to the top
      const y = HEIGHT - ((sy * HEIGHT + t * FALL_SPEED * (0.85 + sz * 0.3)) % HEIGHT);
      const x = cx + (sx - 0.5) * SPREAD;
      const z = cz + (sz - 0.5) * SPREAD;
      const top = cy - 4 + y;
      const o = i * 6;
      pos[o] = x; pos[o + 1] = top; pos[o + 2] = z;
      pos[o + 3] = x + 0.08; pos[o + 4] = top - STREAK; pos[o + 5] = z + 0.04;
    }
    g.attributes.position.needsUpdate = true;
    g.setDrawRange(0, count * 2);
    material.opacity = 0.35 + 0.35 * intensity;
  });

  return <lineSegments ref={lines} geometry={geometry} material={material} frustumCulled={false} visible={false} />;
}
