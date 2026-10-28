import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useQuality } from './quality';

/**
 * Tone mapping and anti-aliasing for every scene, plus ambient occlusion and
 * bloom on the high tier. Screen-space ambient occlusion darkens creases where
 * surfaces meet (building bases, under buses, kerbs), which grounds the scene.
 *
 * The composer stays mounted on both tiers, and only its optional effects come
 * and go. While a composer is mounted the renderer's own tone mapping is
 * switched off, and every material's shader depends on that setting, so
 * mounting or unmounting the composer (a late lazy load, or the automatic drop
 * to the low tier) would recompile every shader in the scene and freeze the
 * game for seconds. Rendering through the composer also bypasses MSAA, so SMAA
 * (far cheaper than multisampling on integrated GPUs) replaces it.
 */
export default function PostEffects() {
  const { ambientOcclusion } = useQuality();
  return (
    <EffectComposer multisampling={0}>
      {ambientOcclusion ? <N8AO halfRes quality="performance" aoRadius={2.5} distanceFalloff={1} intensity={4} color="#000000" /> : <></>}
      {/* Only what's brighter than white glows: lamps, chandeliers, neon, lit windows */}
      {ambientOcclusion ? <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.55} radius={0.7} /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  );
}
