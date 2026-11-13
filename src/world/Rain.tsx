import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, LineBasicMaterial, type LineSegments } from 'three';
import { useQuality } from './quality';
import { obstaclesWithVehicles, type Obstacle } from '../lib/world';
import { roofOver } from '../lib/rainCover';

/** The box of falling rain around the camera, in metres. */
const SPREAD = 20;
const HEIGHT = 16;
/** Raindrops fall at about 9 m/s (terminal speed of a 2 mm drop). */
const FALL_SPEED = 9;
/** Streak length: what a drop covers in a camera's exposure, so it reads as falling water. */
const STREAK_SECONDS = 0.09;
/** How much of the wind's speed the drops take on sideways. */
const WIND_DRIFT = 0.8;
/** Solids at least this tall are roofs and canopies the rain stops on (buildings, buses, shelters). */
const ROOF_HEIGHT = 2;

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
const roofs: Obstacle[] = [];

/**
 * Rain falling around the camera as streaks: at a raindrop's real speed, slanted downwind by the
 * actual wind (speed, and the bearing it blows from), as many as the rain is heavy. Drops stop
 * on the roof of anything overhead (buildings, buses, shelters), so it never rains through a roof
 * or inside a doorway. Always mounted (hidden when dry) so starting to rain never recompiles
 * anything; the count follows the rain's strength and the quality tier.
 */
export function Rain({ intensity, windSpeed = 3, windFrom = 220 }: { intensity: number; windSpeed?: number; windFrom?: number }) {
  const quality = useQuality();
  const max = quality.quality === 'low' ? 700 : 2000;
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
    // The wind blows towards (bearing + 180°); +X is east, +Z north
    const to = ((windFrom + 180) * Math.PI) / 180;
    const vx = Math.sin(to) * windSpeed * WIND_DRIFT, vz = Math.cos(to) * windSpeed * WIND_DRIFT;
    // Roofs near the rain box, found once a frame (the broad phase)
    roofs.length = 0;
    for (const o of obstaclesWithVehicles()) {
      if (o.size[1] < ROOF_HEIGHT) continue;
      if (Math.abs(o.position[0] - cx) > SPREAD / 2 + o.size[0] / 2 + 4 || Math.abs(o.position[2] - cz) > SPREAD / 2 + o.size[2] / 2 + 4) continue;
      roofs.push(o);
    }
    const top = cy - 4 + HEIGHT;
    for (let i = 0; i < count; i++) {
      const sx = seeds[i * 3], sy = seeds[i * 3 + 1], sz = seeds[i * 3 + 2];
      const speed = FALL_SPEED * (0.85 + sz * 0.3);
      // How far this drop has fallen through the box (it wraps to the top), and drifted on the wind
      const fallen = (sy * HEIGHT + t * speed) % HEIGHT;
      const secs = fallen / speed;
      const x = cx + (sx - 0.5) * SPREAD + vx * (secs - HEIGHT / speed / 2);
      const z = cz + (sz - 0.5) * SPREAD + vz * (secs - HEIGHT / speed / 2);
      const y = top - fallen;
      const o = i * 6;
      // Under a roof: the drop has landed on it, so draw nothing (a zero-length streak)
      if (roofs.length && y < roofOver(x, z, roofs)) {
        pos[o] = pos[o + 3] = x; pos[o + 1] = pos[o + 4] = -100; pos[o + 2] = pos[o + 5] = z;
        continue;
      }
      pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
      // The streak trails back along the drop's path
      pos[o + 3] = x - vx * STREAK_SECONDS; pos[o + 4] = y + speed * STREAK_SECONDS; pos[o + 5] = z - vz * STREAK_SECONDS;
    }
    g.attributes.position.needsUpdate = true;
    g.setDrawRange(0, count * 2);
    material.opacity = 0.35 + 0.35 * intensity;
  });

  return <lineSegments ref={lines} geometry={geometry} material={material} frustumCulled={false} visible={false} />;
}
