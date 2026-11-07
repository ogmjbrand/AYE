/**
 * Water that looks and moves like water, built on three's physically based material so it gets the
 * scene's real lighting and HDRI reflections, Fresnel and roughness: the shader is extended, not
 * replaced (onBeforeCompile). Added on top:
 *
 * - Waves: a Gerstner sum moving the surface on open water (vfx/waterModel.ts WAVES, the same
 *   numbers the game can float things on), with the normals that go with them.
 * - Detail: layers of scrolling noise in the normals: wind on a pool, flow down a river.
 * - Ripples: rings from where something touched the surface (up to MAX_RIPPLES at once), and on
 *   puddles and pools the rings of raindrops while it rains.
 * - Foam: along pool edges and riverbanks, and the line where the sea meets the shore.
 * - Puddles: soft, irregular edges that fade into the street.
 *
 * Also here: a pool's basin with moving caustics on its floor.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { CircleGeometry, MeshStandardMaterial, PlaneGeometry, type Mesh } from 'three';
import { NOISE_GLSL } from './glsl';
import { useVfx } from './useVfxTier';
import { WAVES, addRipple, packRipples, type Ripple } from './waterModel';
import { createWaterMaterial, type WaterOptions, type WaterUniforms } from './waterMaterial';

export interface WaterSurfaceProps extends WaterOptions {
  position?: readonly [number, number, number];
  rotationY?: number;
  /** Width (x) and length (z) in metres. */
  size: readonly [number, number];
  /** Something wading or swimming in it: tracked each frame, leaving ripples as it moves. */
  wader?: () => { x: number; z: number } | null;
  /** Click or tap the surface to touch it (the effects lab). */
  touchable?: boolean;
  /** An oval (a pond, a fountain basin) filling `size`, instead of a rectangle. */
  round?: boolean;
}

/** A body of water: a pool's surface, a stretch of river, the sea, a puddle. */
export function WaterSurface({ position = [0, 0, 0], rotationY = 0, size, wader, touchable = false, round = false, ...o }: WaterSurfaceProps) {
  const { budget } = useVfx();
  const material = useMemo(() => createWaterMaterial(o, budget),
    // A new material only when what it's built from changes (kind, tier); the rest are uniforms
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [o.kind, o.colour, budget, o.opacity]);
  useEffect(() => () => material.dispose(), [material]);
  // Segments only where the surface really moves (open water on a tier with waves)
  const geometry = useMemo(() => {
    const waves = budget.waterWaves && WAVES[o.kind].length > 0;
    const seg = waves ? Math.min(160, Math.max(8, Math.round(Math.max(size[0], size[1]) * (budget.waterOctaves >= 3 ? 2.5 : 1.5)))) : 1;
    if (round) {
      const g = new CircleGeometry(0.5, 48);
      g.rotateX(-Math.PI / 2);
      g.scale(size[0], 1, size[1]);
      return g;
    }
    const g = new PlaneGeometry(size[0], size[1], seg, seg);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [size, budget.waterWaves, budget.waterOctaves, o.kind, round]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const ripples = useRef<Ripple[]>([]);
  const last = useRef<{ x: number; z: number } | null>(null);
  const mesh = useRef<Mesh>(null);
  // The clock the shader runs on: ripples are timed by it
  const now = useRef(0);
  useFrame(({ clock }) => {
    const m = mesh.current?.material as { userData: { uniforms: WaterUniforms } } | undefined;
    if (!m) return;
    const u = m.userData.uniforms;
    const t = clock.elapsedTime;
    now.current = t;
    u.uTime.value = t;
    u.uRain.value = o.rain ?? 0;
    u.uEdgeFoam.value = o.edgeFoam ?? 0;
    u.uShoreZ.value = o.shoreZ ?? 1e5;
    if (o.flow) u.uFlow.value = [o.flow[0], o.flow[1]];
    const w = wader?.();
    if (w && mesh.current) {
      const p = mesh.current.position;
      const dx = (w.x - p.x) / (size[0] / 2), dz = (w.z - p.z) / (size[1] / 2);
      const inside = round ? dx * dx + dz * dz < 1 : Math.abs(dx) < 1 && Math.abs(dz) < 1;
      if (inside && (!last.current || Math.hypot(w.x - last.current.x, w.z - last.current.z) > 0.6)) {
        ripples.current = addRipple(ripples.current, { x: w.x, z: w.z, at: t, strength: 1 }, budget.ripples);
        last.current = w;
      }
    }
    u.uRipples.value = packRipples(ripples.current);
  });
  const touch = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    ripples.current = addRipple(ripples.current, { x: e.point.x, z: e.point.z, at: now.current, strength: 1.4 }, budget.ripples);
  };
  return (
    <mesh ref={mesh} position={position as [number, number, number]} rotation={[0, rotationY, 0]} geometry={geometry} material={material}
      receiveShadow onPointerDown={touchable ? touch : undefined} />
  );
}

/**
 * A swimming pool: tiled basin, coping round the edge, caustics dancing on the floor, and the
 * water surface with foam at its edges and ripples where someone swims.
 */
export function SwimmingPool({ position = [0, 0, 0], size = [8, 4], depth = 1.4, wader, touchable, rain = 0 }: {
  position?: readonly [number, number, number]; size?: readonly [number, number]; depth?: number;
  wader?: () => { x: number; z: number } | null; touchable?: boolean; rain?: number;
}) {
  const { budget } = useVfx();
  const [w, l] = size;
  const floor = useMemo(() => {
    const m = new MeshStandardMaterial({ color: '#7fc6d6', roughness: 0.35 });
    const u = { uTime: { value: 0 } };
    if (budget.caustics) {
      m.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, u);
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCausticWorld;')
          .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvCausticWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
          uniform float uTime; varying vec3 vCausticWorld;
          ${NOISE_GLSL.replace(/OCTAVES/g, '2')}
          // Bright, wandering lines where light is focused by the moving surface
          float vfxCaustic(vec2 p) {
            float a = vfxNoise(p * 1.6 + vec2(uTime * 0.35, uTime * 0.21));
            float b = vfxNoise(p * 1.6 * 1.13 - vec2(uTime * 0.27, uTime * 0.33) + 4.3);
            return pow(1.0 - abs(a - b), 9.0);
          }`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += vec3(0.75, 0.95, 1.0) * vfxCaustic(vCausticWorld.xz * 1.4) * 0.55;`);
      };
      m.customProgramCacheKey = () => 'aye-pool-caustics';
    }
    m.userData.uniforms = u;
    return m;
  }, [budget.caustics]);
  const tile = useMemo(() => new MeshStandardMaterial({ color: '#e9ecea', roughness: 0.4 }), []);
  useEffect(() => () => { floor.dispose(); tile.dispose(); }, [floor, tile]);
  const floorMesh = useRef<Mesh>(null);
  useFrame(({ clock }) => { const u = (floorMesh.current?.material as MeshStandardMaterial | undefined)?.userData.uniforms as { uTime: { value: number } } | undefined; if (u) u.uTime.value = clock.elapsedTime; });
  const [x, y, z] = position;
  const wall = 0.25;
  return (
    <group position={[x, y, z]}>
      {/* The basin: floor with caustics, tiled walls */}
      <mesh ref={floorMesh} material={floor} position={[0, -depth, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[w, l]} /></mesh>
      {[-1, 1].map((s) => <mesh key={`x${s}`} material={floor} position={[s * w / 2, -depth / 2, 0]} rotation={[0, -s * Math.PI / 2, 0]}><planeGeometry args={[l, depth]} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={`z${s}`} material={floor} position={[0, -depth / 2, s * l / 2]} rotation={[0, s > 0 ? Math.PI : 0, 0]}><planeGeometry args={[w, depth]} /></mesh>)}
      {/* Coping stones round the edge */}
      {[-1, 1].map((s) => <mesh key={`cx${s}`} material={tile} position={[s * (w / 2 + wall / 2), 0.04, 0]} receiveShadow castShadow><boxGeometry args={[wall, 0.1, l + wall * 2]} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={`cz${s}`} material={tile} position={[0, 0.04, s * (l / 2 + wall / 2)]} receiveShadow castShadow><boxGeometry args={[w, 0.1, wall]} /></mesh>)}
      <WaterSurface kind="pool" position={[0, -0.08, 0]} size={[w, l]} edgeFoam={0.015} wader={wader} touchable={touchable} rain={rain} colour="#3aa6bd" opacity={0.78} />
    </group>
  );
}
