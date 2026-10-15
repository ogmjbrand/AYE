import { EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

/**
 * High tier only: screen-space ambient occlusion darkens creases where
 * surfaces meet (building bases, under buses, kerbs), which grounds the
 * scene. Rendering through the composer bypasses the renderer's own tone
 * mapping and MSAA, so both are re-applied here (SMAA is far cheaper than
 * multisampling on integrated GPUs). The low tier renders directly, as before,
 * and never downloads this module (it is lazy-loaded from App).
 */
export default function PostEffects() {
  return (
    <EffectComposer multisampling={0}>
      <N8AO halfRes quality="performance" aoRadius={2.5} distanceFalloff={1} intensity={4} color="#000000" />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  );
}
