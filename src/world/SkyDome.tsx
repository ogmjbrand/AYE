import { useMemo } from 'react';
import { BackSide, Color, ShaderMaterial, Vector3 } from 'three';
import type { Lighting } from './timeOfDay';

/**
 * Gradient sky with a soft sun glow. Cheaper and far more controllable than a
 * physical scattering shader; its horizon colour matches the fog so the city
 * fades into the sky.
 */
export function SkyDome({ lighting }: { lighting: Lighting }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        uniforms: {
          zenith: { value: new Color() },
          horizon: { value: new Color() },
          sunColor: { value: new Color() },
          sunDir: { value: new Vector3() },
          sunStrength: { value: 1 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww; // always at the far plane
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 zenith, horizon, sunColor, sunDir;
          uniform float sunStrength;
          varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y, -0.2, 1.0);
            vec3 col = mix(horizon, zenith, pow(max(h, 0.0), 0.55));
            float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
            col += sunColor * (pow(s, 600.0) * 4.0 + pow(s, 12.0) * 0.35) * sunStrength;
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  // Uniforms are plain values on a material owned by this component; updating them each render is intended.
  /* eslint-disable react-hooks/immutability */
  material.uniforms.zenith.value.set(lighting.zenithColor).convertSRGBToLinear();
  material.uniforms.horizon.value.set(lighting.horizonColor).convertSRGBToLinear();
  material.uniforms.sunColor.value.set(lighting.sunColor).convertSRGBToLinear();
  material.uniforms.sunDir.value.set(...lighting.sunDirection);
  material.uniforms.sunStrength.value = lighting.sunDirection[1] > -0.05 ? 1 : 0;
  /* eslint-enable react-hooks/immutability */
  return (
    <mesh material={material} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[1000, 32, 16]} />
    </mesh>
  );
}
